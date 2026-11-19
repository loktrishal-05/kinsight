"""Extended-family cascade screening (issue 38). Pure: no I/O.

A relative's chance of carrying the same recessive change as the person is r + (1 - r)c, where r = 2 phi is the
coefficient of relationship from the kinship engine and c the population carrier frequency. That gives the textbook
1/2, 1/4 and 1/8 by degree, adds the extra shared ancestry of a consanguineous family automatically, and is the same
form as the partner prior in assess._ar. The partner is screened as a couple, so is left out here."""
from __future__ import annotations

import math
from collections.abc import Set as AbstractSet
from typing import Any

from .kinship import kinship
from .pedigree import Pedigree


def relation(ped: Pedigree, proband: str, other: str) -> str:
    """A plain relation word from the parent links, for display only (the chance comes from kinship, not this)."""
    def parents(pid: str) -> set[str]:
        return {x for x in ped.parents(pid) if x}

    mine = parents(proband)
    if other in mine:
        return "parent"
    if proband in parents(other):
        return "child"
    if mine & parents(other):
        return "sibling"
    if other in {g for p in mine for g in parents(p)}:
        return "grandparent"
    if any(parents(p) & parents(other) for p in mine):
        return "aunt_uncle"
    if any(any(parents(p) & parents(q) for p in mine) for q in parents(other)):
        return "cousin"
    return "relative"


def relatives(ped: Pedigree, proband: str, carrier_frequency: float, partners: AbstractSet[str] = frozenset(),
              min_r: float = 0.125) -> list[dict[str, Any]]:
    """Blood relatives with r >= min_r (third degree), closest first, ties by id."""
    out = []
    for other in sorted(ped.sex):
        if other == proband or other in partners:
            continue
        r = 2 * kinship(ped, proband, other)
        if r < min_r - 1e-12:
            continue
        out.append({"id": other, "relation": relation(ped, proband, other), "r": r,
                    "degree": max(1, min(3, round(-math.log2(r)))) if r < 1 else 1,
                    "chance": r + (1 - r) * carrier_frequency})
    return sorted(out, key=lambda x: (-x["r"], x["id"]))
