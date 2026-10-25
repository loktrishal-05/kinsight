"""Template renderer (spec section 7). The renderer, not a model, fills slots from CoupleAssessment."""
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel

from services.genetics import CoupleAssessment, Panel

TEMPLATES = Path(__file__).resolve().parents[2] / "templates"
SLOT = "\x00"


class Block(BaseModel):
    block_id: str
    applies_when: dict
    slots: dict[str, dict] = {}
    text: str
    must_include_ids: list[str] = []
    forbidden_ids: list[str] = []
    status: str = "placeholder"


class BlockRef(BaseModel):
    block_id: str
    finding_index: int | None = None
    text_override: str | None = None  # Mode B constrained rewrite only; the verifier gates it


class DraftExplanation(BaseModel):
    language: str
    reading_level: str
    blocks: list[BlockRef]


class RenderedBlock(BaseModel):
    block_id: str
    text: str
    skeleton: str  # text with every slot value replaced by SLOT, for the digit check
    slot_values: list[str]


def load_templates(root: Path = TEMPLATES) -> dict[tuple[str, str], dict[str, Block]]:
    out: dict[tuple[str, str], dict[str, Block]] = {}
    for p in sorted(root.glob("*/*/*.yaml")):
        b = Block.model_validate(yaml.safe_load(p.read_text(encoding="utf-8")))
        out.setdefault((p.parents[1].name, p.parent.name), {})[b.block_id] = b
    return out


def load_glossary(root: Path = TEMPLATES) -> dict:
    return yaml.safe_load((root / "glossary.yaml").read_text(encoding="utf-8"))


def fmt_percent(x: float, lang: str = "en") -> str:
    if x == 0:
        return "0%"
    if x < 0.01:
        return "أقل من 1%" if lang == "ar" else "less than 1%"
    return f"{round(x * 100)}%"


def _source(path: str, assessment: CoupleAssessment, panel: Panel, lang: str, idx: int | None):
    if idx is None:
        raise ValueError("slot needs a finding")
    f = assessment.findings[idx]
    if path == "finding.condition_label":
        c = panel.get(f.condition_id)
        return c.label_ar if lang == "ar" else c.label_en
    if path == "finding.risk_affected":
        return f.risk_affected
    if path.startswith("finding.inputs."):
        return f.inputs[path.split(".", 2)[2]]
    raise ValueError(path)


def slot_value(spec: dict, assessment: CoupleAssessment, panel: Panel, lang: str, idx: int | None) -> str:
    v = _source(spec["source"], assessment, panel, lang, idx)
    return fmt_percent(v, lang) if spec.get("format") == "percent0" else str(v)


def render_block(block: Block, ref: BlockRef, assessment: CoupleAssessment, panel: Panel, lang: str) -> RenderedBlock:
    vals = {k: slot_value(s, assessment, panel, lang, ref.finding_index) for k, s in block.slots.items()}
    text = block.text.format(**vals)
    skeleton = block.text.format(**{k: SLOT for k in vals})
    if ref.text_override is not None:
        text, skeleton = ref.text_override, ref.text_override
        for v in vals.values():
            skeleton = skeleton.replace(v, SLOT)
    return RenderedBlock(block_id=block.block_id, text=text, skeleton=skeleton, slot_values=list(vals.values()))


def render_draft(draft: DraftExplanation, assessment: CoupleAssessment, panel: Panel,
                 templates: dict) -> list[RenderedBlock]:
    tset = templates[(draft.language, draft.reading_level)]
    return [render_block(tset[r.block_id], r, assessment, panel, draft.language) for r in draft.blocks]


def select_blocks(assessment: CoupleAssessment, lang: str, level: str, templates: dict) -> DraftExplanation:
    """Deterministic block choice (Mode A default). A model may replace this via explain_agent's chooser."""
    tset = templates[(lang, level)]
    refs = [BlockRef(block_id="fictional_notice")]
    fs = assessment.findings
    # Many tiny residual figures (related couple, no change found) are summarised once instead of listed one by one.
    residual = [i for i, f in enumerate(fs) if f.formula_id == "ar_both_not_detected"]
    summarise = len(residual) > 2 or (residual and len(residual) < len(fs))
    for i, f in enumerate(fs):
        if summarise and i in residual:
            continue
        for b in tset.values():
            w = b.applies_when
            fid = w.get("formula_id")
            if fid and f.formula_id in ([fid] if isinstance(fid, str) else fid):
                refs.append(BlockRef(block_id=b.block_id, finding_index=i))
    if summarise:
        refs.append(BlockRef(block_id="residual_note"))
    if not fs:
        refs.append(BlockRef(block_id="no_findings"))
    else:
        if any("related_partners" in f.note_codes for f in fs):
            refs.append(BlockRef(block_id="related_note"))
        refs.append(BlockRef(block_id="uncertainty_note"))
    refs += [BlockRef(block_id="carrier_not_disease"), BlockRef(block_id="counsellor_available")]
    if assessment.tier == 3:
        refs.append(BlockRef(block_id="counsellor_review"))
    return DraftExplanation(language=lang, reading_level=level, blocks=refs)
