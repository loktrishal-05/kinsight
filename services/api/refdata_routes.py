"""Live reference data for the counsellor (issue 33). Only the gene symbol or HGVS variant typed into the tool is
sent to the public sources; each source that is down is named so the screen can say so instead of failing."""
from typing import Annotated

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session

from services.consent import sharing
from services.lifecycle import refdata

from .auth import secret


def register(app, *, db_session, roles, limit):
    @app.get("/api/lifecycle/reference")
    def reference(
        gene: Annotated[str, Query(pattern=refdata.GENE.pattern)],
        variant: Annotated[str | None, Query(max_length=90)] = None,
        identity=Depends(roles("counsellor")), db: Session = Depends(db_session),
    ):
        limit(db, identity)
        if variant and not refdata.HGVS.fullmatch(variant):
            raise HTTPException(422, "Use HGVS notation, for example NM_000492.4:c.1521_1523del")
        out: dict = {"gene": gene, "unavailable": []}
        lookups = [("medlineplus", lambda: refdata.medlineplus(gene)), ("clingen", lambda: refdata.clingen(gene))]
        if variant:
            lookups.append(("vep", lambda: refdata.vep(variant)))
        for name, call in lookups:
            try:
                out[name] = call()
            except refdata.SourceUnavailable:
                out[name] = None
                out["unavailable"].append(name)
        sharing.log_change(db, identity.actor, "reference", "reference_looked_up", secret("KINSIGHT_AUDIT_SALT"))
        db.commit()
        return {**out, "is_synthetic": False}
