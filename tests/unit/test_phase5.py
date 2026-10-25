import json
import pathlib

import pytest
import yaml

from services.agents import flags as flagmod
from services.agents.brief import build_brief, resolve
from services.agents.fhir import STATUS, referral_bundle
from services.agents.mode_b import rewrite_block
from services.agents.options import options, values_questions
from services.agents.referral import ReferralState, advance
from services.consent.psi_demo import shared_conditions
from services.genetics import CoupleAssessment

GOLD = [CoupleAssessment(**c["expected"]) for c in
        json.loads((pathlib.Path(__file__).parents[1] / "golden/couples.json").read_text(encoding="utf-8"))]


@pytest.fixture
def flags(tmp_path, monkeypatch):
    def setflags(**kw):
        base = yaml.safe_load(flagmod.FLAGS.read_text())
        p = tmp_path / "flags.yaml"
        p.write_text(yaml.safe_dump({**base, **kw}))
        monkeypatch.setattr(flagmod, "FLAGS", p)
        monkeypatch.setattr(flagmod.enabled, "__defaults__", (p,))
    return setflags


def test_mode_b_rejects_new_digits_and_banned_and_falls_back(flags):
    flags(mode_b_rewrite=True)
    orig = "In each pregnancy there is a 25% chance that a child is affected."
    yes = lambda a, b: True  # noqa: E731
    assert rewrite_block(orig, "en", lambda t: t.replace("In each pregnancy there", "Each time, there"), yes) == \
        ("Each time, there is a 25% chance that a child is affected.", True)
    assert rewrite_block(orig, "en", lambda t: t.replace("25%", "50%"), yes) == (orig, False)       # changed number
    assert rewrite_block(orig, "en", lambda t: t + " It is 1 in 4.", yes) == (orig, False)           # new digit
    assert rewrite_block(orig, "en", lambda t: "You should not marry. 25%", yes) == (orig, False)    # banned
    assert rewrite_block(orig, "en", lambda t: t, lambda a, b: False) == (orig, False)              # judge says no
    assert rewrite_block(orig, "en", lambda t: 1 / 0, yes) == (orig, False)                          # model failure


def test_mode_b_off_by_default():
    assert rewrite_block("x 25%", "en", lambda t: t, lambda a, b: True) == ("x 25%", False)


def test_options_are_equal_and_unscored():
    for lang in ("en", "ar"):
        opts = options(lang)
        assert len(opts) == 5 and all(set(o) == {"id", "title", "text"} for o in opts)
        assert [o["id"] for o in opts] == sorted(o["id"] for o in opts)
        assert not any(k in o for o in opts for k in ("score", "weight", "rank", "recommended"))
        assert len(values_questions(lang)) == 3
    text = json.dumps(options("en")).lower()
    assert not any(w in text for w in ("should", "recommend", "best", "avoid"))


def test_brief_every_statement_resolves_to_an_assessment_field():
    for a in GOLD:
        b = build_brief(a)
        for st in [*b.findings, *b.flags, *b.open_questions]:
            resolve(a, st.source)  # raises if a source does not exist


def test_fhir_statuses_are_valid_r4_and_flag_gated(flags):
    with pytest.raises(PermissionError):
        referral_bundle("c", ReferralState())
    flags(fhir_export=True)
    from datetime import datetime, timezone
    rs = advance(ReferralState(), "counselling_requested", datetime(2026, 11, 1, tzinfo=timezone.utc),
                 yaml.safe_load((pathlib.Path(__file__).parents[2] / "configs/escalation.yaml").read_text()))
    b = referral_bundle("c", rs)
    assert b["resourceType"] == "Bundle" and b["entry"][0]["resource"]["status"] == "active"
    assert set(STATUS.values()) <= {"draft", "active", "on-hold", "revoked", "completed", "entered-in-error", "unknown"}


def test_psi_returns_only_shared_conditions():
    a, b = ["COND_001", "COND_002", "COND_007"], ["COND_002", "COND_007", "COND_020"]
    assert shared_conditions(a, b) == ["COND_002", "COND_007"]
    assert shared_conditions(a, ["COND_030"]) == []
