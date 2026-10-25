import json
import pathlib

import pytest

from services.agents.render import (
    BlockRef,
    load_templates,
    render_draft,
    select_blocks,
)
from services.agents.verify import load_wording, verify
from services.cohort.panel import load_panel
from services.genetics import CoupleAssessment

PANEL, TPL, WORD = load_panel(), load_templates(), load_wording()
GOLD = [CoupleAssessment(**c["expected"]) for c in
        json.loads((pathlib.Path(__file__).parents[1] / "golden/couples.json").read_text(encoding="utf-8"))]
SETS = [(lg, lv) for lg in ("en", "ar") for lv in ("basic", "standard")]


@pytest.mark.parametrize("lang,level", SETS)
def test_good_drafts_pass_on_all_golden_couples(lang, level):
    for a in GOLD:
        d = select_blocks(a, lang, level, TPL)
        r = verify(d, a, PANEL, TPL, WORD)
        assert r.ok, (a.couple_id, [f.formula_id for f in a.findings], r.errors)


def both_carrier():
    return next(a for a in GOLD if any(f.formula_id == "ar_both_carrier" for f in a.findings))


def bad(mutate):
    a = both_carrier(); d = select_blocks(a, "en", "standard", TPL); mutate(d, a)
    return verify(d, a, PANEL, TPL, WORD)


def test_rendered_number_is_engine_number():
    a = both_carrier(); d = select_blocks(a, "en", "standard", TPL)
    assert any("25%" in rb.text for rb in render_draft(d, a, PANEL, TPL))


def test_seeded_bad_drafts_rejected():
    def unknown(d, a): d.blocks.append(BlockRef(block_id="invented_block"))
    def drop_mandatory(d, a): d.blocks[:] = [b for b in d.blocks if b.block_id != "counsellor_review"]
    def drop_carrier(d, a): d.blocks[:] = [b for b in d.blocks if b.block_id != "carrier_not_disease"]
    def wrong_finding(d, a): d.blocks[1].finding_index = 99
    def changed_number(d, a): d.blocks[1].text_override = d.blocks[1].text_override or \
        "Both of you carry a change linked to this condition. There is a 10% chance a child is affected."
    def banned(d, a): d.blocks[1].text_override = "You should not marry. 25% chance."
    def digit_outside(d, a): d.blocks[1].text_override = "In 2 of 8 pregnancies, 25% chance a child is affected."
    def uncovered(d, a): d.blocks[:] = [b for b in d.blocks if b.finding_index is None]
    for m in (unknown, drop_mandatory, drop_carrier, wrong_finding, changed_number, banned, digit_outside, uncovered):
        assert not bad(m).ok, m.__name__


def test_long_sentence_fails_readability():
    def mut(d, a):
        vals = render_draft(d, a, PANEL, TPL)[1].slot_values
        d.blocks[1].text_override = ("Notwithstanding epidemiological heterogeneity, interdisciplinary consultation regarding "
                                     "pathophysiological characterization is unquestionably recommended for " + " ".join(vals))
    r = bad(mut)
    assert not r.ok and any(e.startswith("readability") for e in r.errors)


def test_every_template_text_has_no_banned_phrase_or_digit():
    import re
    for (lg, _), tset in TPL.items():
        for b in tset.values():
            assert not re.search(r"\d", b.text), b.block_id
            assert not any(p in b.text.lower() for p in WORD["banned"][lg]), b.block_id
