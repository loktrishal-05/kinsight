"""What-if scenario explorer (issue 37). Inputs are hypotheticals chosen by the caller, so no stored data is read;
the route is role-limited, rate-limited and audited. Every figure is an educational estimate from services.genetics."""
from typing import Annotated, Literal

import yaml
from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from services.agents.render import TEMPLATES
from services.cohort.panel import load_panel
from services.consent import sharing
from services.genetics.scenarios import scenario
from services.lifecycle import nasab

from .auth import secret
from .schemas import Alias, Estimate, Fictional, estimate

Relation = Literal["none", "second_cousins", "first_cousins_once_removed", "first_cousins", "double_first_cousins",
                   "uncle_niece_or_aunt_nephew"]


class OptionView(Fictional):
    id: Alias
    title: str
    changes: str


class ScenarioView(Fictional):
    condition_id: Alias
    inheritance: Literal["AR", "XLR"]
    children: int
    chance_per_pregnancy: Estimate
    chance_at_least_one: Estimate
    partner_carrier_chance: Estimate | None = None
    options: list[OptionView]


def run_scenario(conditions, condition_id, status_a, status_b, relation, children, lang) -> ScenarioView:
    cond = conditions.get(condition_id)
    if cond is None:
        raise HTTPException(404, "Unknown condition")
    try:
        out = scenario(cond, status_a, status_b, nasab.evaluate([relation])["phi"], children)
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    carrier = out["partner_carrier"]
    return ScenarioView.model_validate({
        "condition_id": cond.id, "inheritance": cond.inheritance, "children": children,
        "chance_per_pregnancy": estimate(out["per_pregnancy"], out["formula_id"]),
        "chance_at_least_one": estimate(out["at_least_one"], "at_least_one_of_n"),
        "partner_carrier_chance": None if carrier is None else estimate(carrier, "partner_carrier"),
        "options": [{"id": o["id"], "title": o["title"], "changes": o["changes"]} for o in options(lang)],
        "is_synthetic": True,
    })


def options(lang: str) -> list[dict]:
    path = TEMPLATES / lang / "scenario_options.yaml"
    path = path if path.exists() else TEMPLATES / "en" / "scenario_options.yaml"  # placeholder until reviewed
    return yaml.safe_load(path.read_text(encoding="utf-8"))["options"]


def register(app, *, db_session, roles, limit):
    conditions = {c.id: c for c in load_panel().conditions}

    @app.get("/api/lifecycle/scenario", response_model=ScenarioView)
    def run(
        condition_id: Annotated[str, Query(pattern=r"^[A-Za-z0-9_-]{1,100}$")],
        status_a: Literal["carrier", "not_detected"],
        status_b: Literal["carrier", "not_detected", "untested"],
        relation: Relation = "none",
        children: Annotated[int, Query(ge=1, le=6)] = 1,
        lang: Annotated[str, Query(pattern=r"^[a-z]{2}$")] = "en",
        identity=Depends(roles("person", "counsellor")), db: Session = Depends(db_session),
    ):
        limit(db, identity)
        result = run_scenario(conditions, condition_id, status_a, status_b, relation, children, lang)
        sharing.log_change(db, identity.actor, "scenario", "scenario_run", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return result
