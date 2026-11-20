"""Kinship for a family tree being drawn in the editor (issue 39). The tree is the caller's own draft, so no stored
data is read; the number comes from the engine (services/genetics/kinship.py), never from the browser."""
from typing import Annotated, Literal

from fastapi import Depends, HTTPException
from pydantic import Field
from sqlalchemy.orm import Session

from services.consent import sharing
from services.genetics.kinship import kinship
from services.genetics.pedigree import PedigreeError

from ..auth import secret
from ..schemas import Alias, PedigreePerson, RelationshipInput, StrictModel
from .cascade import build


class KinshipRequest(StrictModel):
    people: Annotated[list[PedigreePerson], Field(min_length=2, max_length=200)]
    relationships: Annotated[list[RelationshipInput], Field(max_length=400)]
    a: Alias
    b: Alias


class KinshipView(StrictModel):
    phi: float
    related: bool
    is_synthetic: Literal[True] = True


def register(app, *, db_session, roles, limit):
    @app.post("/api/lifecycle/kinship", response_model=KinshipView)
    def relatedness(body: KinshipRequest, identity=Depends(roles("person", "relative")), db: Session = Depends(db_session)):
        limit(db, identity)
        ids = {p.id for p in body.people}
        if body.a not in ids or body.b not in ids or any(e.a_id not in ids or e.b_id not in ids for e in body.relationships):
            raise HTTPException(422, "Every relationship must join two people in the tree")
        try:
            ped, _ = build([p.model_dump() for p in body.people], [e.model_dump() for e in body.relationships])
        except PedigreeError as error:  # cycles, a third parent, a parent younger than the child
            raise HTTPException(422, f"This family tree is not possible: {error}") from None
        phi = kinship(ped, body.a, body.b)
        sharing.log_change(db, identity.actor, "kinship", "kinship_evaluated", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return {"phi": phi, "related": phi > 0, "is_synthetic": True}
