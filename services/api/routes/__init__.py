"""HTTP routes, one module per feature area. Each module exposes register(app, ...), called from main.create_app."""
from . import (
    cascade,
    fhir_preview,
    kin,
    lab_feed,
    lifecycle,
    pedigree,
    pilot,
    prep,
    refdata,
    referral,
    review,
    scenario,
)

__all__ = ["cascade", "fhir_preview", "kin", "lab_feed", "lifecycle", "pedigree", "pilot", "prep", "refdata", "referral", "review", "scenario"]
