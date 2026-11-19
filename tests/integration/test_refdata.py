"""Live reference data, tested on recorded responses: only a gene symbol or HGVS variant goes out, every fact has
provenance, a source that is down falls back gracefully, and the nightly ClinVar check opens one review task."""
import io
import json
from pathlib import Path
from urllib.error import URLError

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from scripts.nightly_reclassify import run
from services.api.demo_path import _h
from services.api.main import create_app
from services.lifecycle import refdata
from services.lifecycle.store import LifecycleBase, ReviewItem

FIX = Path(__file__).resolve().parents[1] / "fixtures" / "refdata"


class Recorder:
    """Stands in for urllib: answers from recorded fixtures and remembers every URL that would have gone out."""

    def __init__(self, down: set[str] = frozenset()):
        self.urls: list[str] = []
        self.down = down

    def __call__(self, request, timeout=None):
        url = request.full_url if hasattr(request, "full_url") else request
        self.urls.append(url)
        host = url.split("/")[2]
        if host in self.down:
            raise URLError("down")
        name = ("medlineplus_cftr.json" if "medlineplus" in host else "clingen_validity.json" if "clinicalgenome" in host
                else "vep_cftr_f508del.json" if "ensembl" in host else "clinvar_7105.json")
        return io.BytesIO((FIX / name).read_bytes())


@pytest.fixture(autouse=True)
def fresh_cache():
    refdata._cache.clear()
    yield
    refdata._cache.clear()


def test_each_source_returns_facts_with_provenance():
    rec = Recorder()
    m = refdata.medlineplus("CFTR", opener=rec)
    assert "CFTR gene provides instructions" in m["summary"] and m["provenance"]["source"] == "MedlinePlus Genetics"
    c = refdata.clingen("CFTR", opener=rec)
    assert c["curations"][0]["classification"] == "Definitive" and c["curations"][0]["inheritance"] == "AR"
    v = refdata.vep("NM_000492.4:c.1521_1523del", opener=rec)
    assert v["consequence"] == "inframe_deletion" and "CFTR" in v["genes"]
    for fact in (m, c, v):
        assert set(fact["provenance"]) == {"source", "version", "url", "fetched_at"}


def test_only_a_gene_symbol_or_variant_ever_leaves_the_system():
    rec = Recorder()
    refdata.medlineplus("CFTR", opener=rec)
    refdata.clingen("CFTR", opener=rec)
    refdata.vep("NM_000492.4:c.1521_1523del", opener=rec)
    for url in rec.urls:
        assert "synthetic" not in url and "@" not in url and "person" not in url
    for bad in ("synthetic-a", "Jane Doe", "cftr; DROP", "COND_001 carrier", "../etc"):
        with pytest.raises(ValueError):
            refdata.medlineplus(bad, opener=rec)
    with pytest.raises(ValueError):
        refdata.vep("Jane Doe c.1521", opener=rec)


def test_answers_are_cached_for_a_day():
    rec = Recorder()
    clock = [1_800_000_000.0]
    refdata.medlineplus("CFTR", opener=rec, now=lambda: clock[0])
    refdata.medlineplus("CFTR", opener=rec, now=lambda: clock[0] + 3600)
    assert len(rec.urls) == 1
    refdata.medlineplus("CFTR", opener=rec, now=lambda: clock[0] + 90_000)
    assert len(rec.urls) == 2


def test_route_falls_back_per_source_and_is_counsellor_only(monkeypatch):
    monkeypatch.setenv("KINSIGHT_TOKEN_SECRET", "synthetic-only-token-secret-32-bytes")
    monkeypatch.setenv("KINSIGHT_AUDIT_SALT", "synthetic-only-audit-salt-32-bytes")
    monkeypatch.setenv("KINSIGHT_DEMO_AUTH", "1")
    rec = Recorder(down={"rest.ensembl.org"})
    monkeypatch.setattr(refdata.urllib.request, "urlopen", rec)
    for f in (refdata.medlineplus, refdata.clingen, refdata.vep):
        monkeypatch.setattr(f, "__kwdefaults__", {**f.__kwdefaults__, "opener": rec})
    with TestClient(create_app("sqlite://")) as client:
        h = _h(client, "counsellor")
        r = client.get("/api/lifecycle/reference", params={"gene": "CFTR", "variant": "NM_000492.4:c.1521_1523del"}, headers=h).json()
        assert r["medlineplus"]["name"] and r["clingen"]["curations"] and r["vep"] is None and r["unavailable"] == ["vep"]
        assert client.get("/api/lifecycle/reference", params={"gene": "CFTR"}, headers=_h(client, "person_a")).status_code == 403
        assert client.get("/api/lifecycle/reference", params={"gene": "Jane Doe"}, headers=h).status_code == 422


def test_nightly_check_on_recorded_clinvar_opens_one_review_task(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'n.db'}")
    LifecycleBase.metadata.create_all(engine)
    body = (FIX / "clinvar_7105.json").read_bytes()
    opener = lambda *_a, **_k: io.BytesIO(body)  # noqa: E731
    with Session(engine) as db:
        for _ in range(2):  # running twice still leaves one open task
            alerts = run(db, opener)
        items = db.scalars(select(ReviewItem).where(ReviewItem.kind == "reclassification")).all()
    assert alerts == [{"variant": "7105", "from": 3, "to": 5, "direction": "upgraded", "needs_clinician_review": True}]
    assert [i.ref for i in items] == ["variant:7105"]
    assert json.loads(body)["result"]["7105"]["germline_classification"]["description"] == "Pathogenic"
