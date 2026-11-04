import random
from decimal import Decimal

import pytest

from services.lifecycle import ledger, safety, tracking, triage
from services.lifecycle.cascade import CascadeTokens, WhisperQueue
from services.lifecycle.pairing import PairingStore

DAY = 86400


def test_pairing_pin_expiry_limit_and_revoke():
    s = PairingStore()
    p = s.initiate("a", 0)
    assert len(p.pin) == 9
    with pytest.raises(PermissionError):
        s.confirm(p.id, p.pin, "a", 1)          # cannot confirm your own pairing
    with pytest.raises(PermissionError):
        s.confirm(p.id, "000000000" if p.pin != "000000000" else "111111111", "b", 1)
    s.confirm(p.id, p.pin, "b", 2)
    assert s.active(p.id, "a") and s.active(p.id, "b") and not s.active(p.id, "c")
    s.revoke(p.id, "b")
    assert not s.active(p.id, "a")
    late = s.initiate("x", 0)
    with pytest.raises(PermissionError):
        s.confirm(late.id, late.pin, "y", 901)  # expired
    for i in range(2):
        s.initiate("z", i)
    s.initiate("z", 3)
    with pytest.raises(PermissionError):
        s.initiate("z", 4)                       # 4th in 30 days
    s.initiate("z", 31 * DAY)                    # window rolled


def test_cascade_token_single_use_expiry_tamper_and_scope():
    t = CascadeTokens(b"k" * 32)
    tok = t.mint("cah", 0)
    assert t.redeem(tok, 10) == {"condition_id": "cah"}
    for bad in (tok, tok[:-2] + "00", "junk"):
        with pytest.raises(PermissionError):
            t.redeem(bad, 10)
    with pytest.raises(PermissionError):
        t.redeem(t.mint("cah", 0), 86400)


def test_whisper_has_no_link_to_sender_and_jitters():
    q = WhisperQueue()
    rng = random.Random(1)
    vs = [q.enqueue(f"+97150000{i}", "CYP21A2", 0, rng) for i in range(50)]
    assert all(24 * 3600 <= v.send_at <= 72 * 3600 for v in vs)
    assert len({v.send_at for v in vs}) > 40
    assert set(vars(vs[0])) == {"code", "phone_sha256", "gene_family", "send_at", "status"}
    assert "+9715" not in repr(vs[0])
    assert len(q.due(72 * 3600)) == 50 and q.due(72 * 3600) == []


def test_lab_tracker_and_qc_refund():
    s = tracking.Sample("B1")
    for i in range(7):
        tracking.advance(s, i)
    assert s.stage == 8 and tracking.stage_label(s) == "report_signed"
    with pytest.raises(ValueError):
        tracking.advance(s, 9)
    r = tracking.reject(tracking.Sample("B2", stage=4), "hemolysed", 5)
    assert r.qc_failure and tracking.stage_label(r) == "dna_extracted"
    with pytest.raises(ValueError):
        tracking.advance(r, 6)


def test_certificate_countdown_keeps_genetics_permanent():
    assert tracking.certificate_status(0, 10 * DAY)["alert_at"] is None
    assert tracking.certificate_status(0, 31 * DAY)["alert_at"] == 60
    assert tracking.certificate_status(0, 84 * DAY)["alert_at"] == 7
    done = tracking.certificate_status(0, 95 * DAY)
    assert done["expired"] and done["genetic_compatibility"] == "permanent"
    assert tracking.reengagement_due(0, 100 * DAY, set()) is None
    assert tracking.reengagement_due(0, 190 * DAY, set()) == 6
    assert tracking.reengagement_due(0, 190 * DAY, {6}) is None
    assert tracking.referral_stalled(0, 73 * 3600) and not tracking.referral_stalled(0, 71 * 3600)


def test_ledger_split_refund_and_idempotency():
    thiqa = ledger.line(2650, 100, 0)
    daman = ledger.line(2650, 80, 265)
    assert (daman["insurer"], daman["grant"], daman["copay"]) == (Decimal("2120.00"), Decimal("265.00"), Decimal("265.00"))
    L = ledger.Ledger()
    ledger.settle(L, "INV1", [thiqa, daman])
    n = len(L.entries)
    ledger.settle(L, "INV1", [thiqa, daman])
    assert len(L.entries) == n and L.balanced()          # replay posts nothing
    assert L.balance("ASSET:PATIENT") == Decimal("265.00")
    assert not ledger.refund(L, "INV1", 0, 3 * 3600)     # outside 2 h
    assert ledger.refund(L, "INV1", 0, 3600)
    assert L.balance("ASSET:PATIENT") == 0 and L.balanced()
    assert ledger.blinded_receipt([thiqa, daman], 265) == {"total": Decimal("5300.00"), "your_share": Decimal("265.00")}
    with pytest.raises(ValueError):
        L.post("x", "a", "b", 0)


G = triage.GeneCall


def het(gene, allele="v1", **kw):
    return G(gene, "AR", "HET", 5, allele=allele, **kw)


def test_triage_shared_gene_multi_gene_and_private_counts():
    out = triage.evaluate([het("CFTR"), het("MEFV")], [het("CFTR"), G("GJB2", "AR", "HOM", 5)], 0.0)
    assert out["shared_genes"] == ["CFTR"] and out["tier"] == 2 and out["rules"][0] == "RULE-01_SINGLE_GENE"
    assert out["private_counts"] == {"a": 0, "b": 1} and "GJB2" not in repr(out["shared_genes"])
    two = triage.evaluate([het("A"), het("B")], [het("A"), het("B")], 0.0)
    assert two["combined_risk_pct"] == 43.75 and "RULE-02_MULTI_GENE" in two["rules"]
    assert triage.combined_risk_pct(3) == 57.81


def test_triage_vus_suppressed_orthogonal_hold_compound_het_pregnancy_and_dcs():
    vus = G("CFTR", "AR", "HET", 3)
    assert triage.evaluate([vus], [vus], 0.0)["tier"] == 1
    hold = triage.evaluate([het("HBB", requires_orthogonal=True)], [het("HBB")], 0.0)
    assert hold["hold_release"] and "RULE-03_ORTHOGONAL_HOLD" in hold["rules"]
    ch = triage.evaluate([het("CFTR", "v1")], [het("CFTR", "v2")], 0.0)
    assert "RULE-05_COMPOUND_HET" in ch["rules"]
    preg = triage.evaluate([het("CFTR")], [het("CFTR")], 0.0, pregnant_days=63)
    assert preg["rules"][0] == "RULE-07_PREGNANCY_WINDOW" and preg["sla_hours"] == 12
    assert triage.evaluate([], [], 0.0625)["rules"] == ["RULE-06_CONSANGUINITY_REFLEX"]
    assert triage.evaluate([], [], 0.0, dcs=40)["tier"] == 2 and triage.evaluate([], [], 0.0, dcs=37.5)["tier"] == 1
    assert triage.evaluate([], [], 0.0, teach_back_failures=2)["tier"] == 2


def test_instruments_reclassification_decoy_tamm_and_break_glass():
    assert safety.dcs_score([0, 4]) == 50.0 and safety.dcs_flag(40) and not safety.dcs_flag(37.5)
    assert safety.low_literacy_dcs(["yes"] * 5 + ["no"] * 5) == 50.0
    with pytest.raises(ValueError):
        safety.dcs_score([5])
    assert safety.pagis_flag(95) and not safety.pagis_flag(96)
    alerts = safety.reclassification({"v1": 3, "v2": 5, "v3": 4}, {"v1": 4, "v2": 3, "v3": 5})
    assert [(a["variant"], a["direction"]) for a in alerts] == [("v1", "upgraded"), ("v2", "downgraded")]
    real, decoy = safety.hash_pin("1234"), safety.hash_pin("9999")
    assert [safety.check_pins(p, real, decoy) for p in ("1234", "9999", "0000")] == ["real", "decoy", "none"]
    att = safety.tamm_attestation("p1", "pcp", 0)
    assert set(att) == safety.TAMM_KEYS and not {"gene", "variant", "compatibility", "risk"} & set(att)
    assert safety.break_glass(["d1", "d2"], "NICU admission")["alert_siem"]
    for who, why in ((["d1"], "x"), (["d1", "d1"], "x"), (["d1", "d2"], " ")):
        with pytest.raises(PermissionError):
            safety.break_glass(who, why)


def test_clinvar_parse_cache_and_errors():
    import io
    import json
    import urllib.error

    from services.lifecycle import clinvar

    clinvar._cache.clear()
    body = {"result": {"uids": ["1", "2", "3"],
                       "1": {"germline_classification": {"description": "Pathogenic", "last_evaluated": "2020/01/01 00:00"}},
                       "2": {"germline_classification": {"description": "Uncertain significance"}},
                       "3": {"germline_classification": {"description": "Conflicting classifications of pathogenicity"}}}}
    calls = []

    def opener(url, timeout):
        calls.append(url)
        return io.StringIO(json.dumps(body))

    out = clinvar.fetch(["1", "2", "3"], opener=opener)
    assert [out[i]["acmg_class"] for i in "123"] == [5, 3, None]
    clinvar.fetch(["1", "2"], opener=opener)
    assert len(calls) == 1 and "id=1%2C2%2C3" in calls[0] and "tool=kinsight" in calls[0]   # cached on the second call
    for bad in ([], ["x"], ["1; drop"], [str(i) for i in range(51)]):
        with pytest.raises(ValueError):
            clinvar.fetch(bad, opener=opener)

    def down(url, timeout):
        raise urllib.error.URLError("offline")

    clinvar._cache.clear()
    with pytest.raises(clinvar.SourceUnavailable):
        clinvar.fetch(["9"], opener=down)


def test_gnomad_summary_validation_cache_and_errors():
    import io
    import json
    import urllib.error

    from services.lifecycle import gnomad

    gnomad._cache.clear()
    variant = {"exome": {"ac": 90, "an": 1000, "populations": [{"id": "mid", "ac": 2, "an": 100}, {"id": "nfe", "ac": 80, "an": 800}]},
               "genome": {"ac": 10, "an": 1000, "populations": [{"id": "mid", "ac": 0, "an": 100}]}}
    calls = []

    def opener(req, timeout):
        calls.append(req)
        return io.StringIO(json.dumps({"data": {"variant": variant}}))

    out = gnomad.fetch(["7-117559590-ATCT-A"], opener=opener)["7-117559590-ATCT-A"]
    assert out["allele_count"] == 100 and out["allele_number"] == 2000 and out["allele_frequency"] == 0.05
    assert round(out["carrier_share"], 4) == 0.0950              # 2q(1-q)
    assert out["middle_eastern_allele_number"] == 200 and round(out["middle_eastern_carrier_share"], 4) == 0.0198
    gnomad.fetch(["7-117559590-ATCT-A"], opener=opener)
    assert len(calls) == 1                                        # cached
    assert gnomad.carrier_share(0, 0) is None
    for bad in ([], ["x"], ["7-1-A-C; drop"], ["Z-1-A-C"], ["1-1-A-C"] * 21):
        with pytest.raises(ValueError):
            gnomad.fetch(bad, opener=opener)

    def down(req, timeout):
        raise urllib.error.URLError("offline")

    gnomad._cache.clear()
    with pytest.raises(gnomad.SourceUnavailable):
        gnomad.fetch(["1-1-A-C"], opener=down)
    gnomad._cache.clear()
    assert gnomad.fetch(["1-1-A-C"], opener=lambda r, timeout: io.StringIO('{"data":{"variant":null}}')) == {"1-1-A-C": None}
