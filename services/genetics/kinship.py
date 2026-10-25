"""Kinship recursion and inbreeding coefficient (spec section 5). Pure."""
from __future__ import annotations

from .pedigree import Pedigree


class _Calc:
    def __init__(self, ped: Pedigree, use_uncertain: bool):
        self.ped, self.u = ped, use_uncertain
        self.memo: dict[tuple[str, str], float] = {}
        self.depths: dict[str, int] = {}

    def depth(self, p: str) -> int:
        return self.ped.depth(p, self.u, self.depths)

    def k(self, i: str | None, j: str | None) -> float:
        if i is None or j is None:
            return 0.0  # missing parent = unrelated founder
        if self.depth(i) < self.depth(j) or (self.depth(i) == self.depth(j) and i > j):
            i, j = j, i  # i is the later-born (deeper); key is order-independent
        key = (i, j)
        if key in self.memo:
            return self.memo[key]
        f, m = self.ped.parents(i, self.u)
        if i == j:
            v = 0.5 * (1 + self.k(f, m))
        elif f is None and m is None:
            v = 0.0
        else:
            v = 0.5 * (self.k(f, j) + self.k(m, j))
        self.memo[key] = v
        return v


def kinship(ped: Pedigree, a: str, b: str, use_uncertain: bool = False) -> float:
    return _Calc(ped, use_uncertain).k(a, b)


def inbreeding(ped: Pedigree, person: str, use_uncertain: bool = False) -> float:
    f, m = ped.parents(person, use_uncertain)
    return kinship(ped, f, m, use_uncertain) if f and m else 0.0
