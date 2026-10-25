"""Pedigree model and validation (spec section 5). Pure: no I/O."""
from __future__ import annotations

from dataclasses import dataclass, field

from .models import Confidence, Sex


class PedigreeError(ValueError):
    pass


@dataclass
class Pedigree:
    sex: dict[str, Sex] = field(default_factory=dict)
    birth: dict[str, int] = field(default_factory=dict)  # optional birth year/rank; parent must be earlier
    # child -> {"father": (id, conf), "mother": (id, conf)}
    _parents: dict[str, dict[str, tuple[str, Confidence]]] = field(default_factory=dict)

    def add_person(self, pid: str, sex: Sex, birth: int | None = None) -> None:
        self.sex[pid] = sex
        if birth is not None:
            self.birth[pid] = birth

    def add_parent(self, child: str, parent: str, confidence: Confidence = "known") -> None:
        """Add a parent_of edge, rejecting anything that breaks the pedigree rules."""
        if child not in self.sex or parent not in self.sex:
            raise PedigreeError("unknown person")
        if child == parent:
            raise PedigreeError("self-parenting")
        role = "father" if self.sex[parent] == "male" else "mother"
        slots = self._parents.setdefault(child, {})
        if role in slots and slots[role][0] != parent:
            raise PedigreeError(f"{child} already has a {role}")  # also blocks a third parent
        if child in self.birth and parent in self.birth and self.birth[parent] >= self.birth[child]:
            raise PedigreeError("impossible age order")
        if self._is_ancestor(child, parent):
            raise PedigreeError("cycle")
        slots[role] = (parent, confidence)

    def _is_ancestor(self, anc: str, of: str) -> bool:
        stack, seen = [of], set()
        while stack:
            p = stack.pop()
            if p == anc:
                return True
            if p in seen:
                continue
            seen.add(p)
            stack += [x for x, _ in self._parents.get(p, {}).values()]
        return False

    def parents(self, pid: str, use_uncertain: bool = False) -> tuple[str | None, str | None]:
        s = self._parents.get(pid, {})
        ok = lambda r: s[r][0] if r in s and (use_uncertain or s[r][1] != "uncertain") else None
        return ok("father"), ok("mother")

    def has_uncertain_edges(self) -> bool:
        return any(c == "uncertain" for s in self._parents.values() for _, c in s.values())

    def depth(self, pid: str, use_uncertain: bool = False, _memo: dict | None = None) -> int:
        """Longest path from a founder; ancestors always have strictly smaller depth."""
        memo = {} if _memo is None else _memo
        if pid not in memo:
            ps = [p for p in self.parents(pid, use_uncertain) if p]
            memo[pid] = 1 + max(self.depth(p, use_uncertain, memo) for p in ps) if ps else 0
        return memo[pid]
