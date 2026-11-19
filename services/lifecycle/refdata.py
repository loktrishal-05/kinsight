"""Live public reference data for a gene or a variant (issue 33): MedlinePlus Genetics, ClinGen gene validity and
Ensembl VEP. Only a gene symbol or an HGVS variant leaves the system, checked by the patterns below; no person,
family or result data is ever sent. Each answer carries its provenance and is cached for 24 hours."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape

TTL_SECONDS = 86_400
GENE = re.compile(r"[A-Z][A-Z0-9-]{0,14}")
HGVS = re.compile(r"(NM|NC|ENST)_?[0-9]{4,15}(\.[0-9]{1,3})?:[cgnp]\.[A-Za-z0-9_>+*()-]{1,60}")
MEDLINEPLUS = "https://medlineplus.gov/download/genetics/gene/{gene}.json"
CLINGEN = "https://search.clinicalgenome.org/api/validity"
VEP = "https://rest.ensembl.org/vep/human/hgvs/{hgvs}"
_cache: dict[str, tuple[float, object]] = {}


class SourceUnavailable(RuntimeError):
    pass


def _get(url: str, *, opener, headers: dict | None = None) -> object:
    """GET JSON with a timeout and one retry; any failure becomes SourceUnavailable (the UI shows a fallback)."""
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "KinSight/0.1", **(headers or {})})  # noqa: S310  fixed https URLs above
    for attempt in range(2):
        try:
            with opener(request, timeout=10) as r:
                return json.load(r)
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            if attempt or (isinstance(error, urllib.error.HTTPError) and error.code < 500):
                raise SourceUnavailable(url.split("/")[2]) from None
    raise SourceUnavailable(url.split("/")[2])


def _cached(key: str, now, load):
    hit = _cache.get(key)
    if hit and now() - hit[0] < TTL_SECONDS:
        return hit[1]
    value = load()
    _cache[key] = (now(), value)
    return value


def _provenance(source: str, url: str, version: str | None, now) -> dict:
    return {"source": source, "version": version, "url": url,
            "fetched_at": datetime.fromtimestamp(now(), timezone.utc).isoformat()}


def medlineplus(gene: str, *, opener=urllib.request.urlopen, now=time.time) -> dict:
    """Plain-language summary of what the gene does, from MedlinePlus Genetics (NLM)."""
    if not GENE.fullmatch(gene):
        raise ValueError("Invalid gene symbol")

    def load():
        data = _get(MEDLINEPLUS.format(gene=gene.lower()), opener=opener)
        texts = {t["text"]["text-role"]: t["text"]["html"] for t in data.get("text-list", []) if "text" in t}
        summary = unescape(re.sub(r"<[^>]+>", " ", texts.get("function", ""))).split("  ")[0].strip()
        page = data.get("ghr-page") or f"https://medlineplus.gov/genetics/gene/{gene.lower()}/"
        return {"gene": gene, "name": data.get("name", ""), "summary": re.sub(r"\s+", " ", summary)[:800],
                "provenance": _provenance("MedlinePlus Genetics", page, data.get("reviewed"), now)}

    return _cached(f"mlp:{gene}", now, load)


def clingen(gene: str, *, opener=urllib.request.urlopen, now=time.time) -> dict:
    """ClinGen gene-disease validity curations for one gene. The public list is fetched once a day and filtered here."""
    if not GENE.fullmatch(gene):
        raise ValueError("Invalid gene symbol")
    rows = _cached("clingen:all", now, lambda: _get(CLINGEN, opener=opener).get("rows", []))
    found = [{"disease": r.get("disease_name", "").strip(), "inheritance": r.get("moi"), "classification": r.get("classification"),
              "released": r.get("released"), "expert_panel": r.get("ep")} for r in rows if r.get("symbol") == gene]
    return {"gene": gene, "curations": found,
            "provenance": _provenance("ClinGen gene-disease validity", f"https://search.clinicalgenome.org/kb/genes?search={gene}", None, now)}


def vep(hgvs: str, *, opener=urllib.request.urlopen, now=time.time) -> dict:
    """Predicted consequence of a variant from Ensembl VEP (most severe term and the affected gene)."""
    if not HGVS.fullmatch(hgvs):
        raise ValueError("Invalid HGVS notation")

    def load():
        url = VEP.format(hgvs=urllib.parse.quote(hgvs, safe=":._>+*()-")) + "?content-type=application/json"
        data = _get(url, opener=opener, headers={"Content-Type": "application/json"})
        first = data[0] if isinstance(data, list) and data else {}
        genes = sorted({t.get("gene_symbol") for t in first.get("transcript_consequences", []) if t.get("gene_symbol")})
        return {"variant": hgvs, "consequence": first.get("most_severe_consequence"), "genes": genes,
                "provenance": _provenance("Ensembl VEP", f"https://rest.ensembl.org/vep/human/hgvs/{hgvs}", None, now)}

    return _cached(f"vep:{hgvs}", now, load)
