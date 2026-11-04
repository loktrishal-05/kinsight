"""OOB-4 synthetic pedigrees with unrelated founders and known parent edges.

Each cousin loop shares a founder couple; paths to partners have depths 2/2
(first), 3/3 (second), or 2/3 (once removed). Avuncular paths are 1/2.
Double first cousins share both paternal and maternal grandparent couples.
Multiple loops occupy distinct ancestor branches in one pedigree where possible.
"""
from itertools import product

from services.genetics.kinship import inbreeding, kinship
from services.genetics.pedigree import Pedigree

from . import cfg

RELATIONS = {"none", "second_cousins", "first_cousins_once_removed", "first_cousins",
             "double_first_cousins", "uncle_niece_or_aunt_nephew"}
DEPTHS = {"second_cousins": (3, 3), "first_cousins_once_removed": (2, 3),
          "first_cousins": (2, 2), "uncle_niece_or_aunt_nephew": (1, 2)}


def _pedigree(loops: list[str]) -> Pedigree:
    ped = Pedigree()
    for pid, sex in (("a", "male"), ("b", "female"), ("child", "female")):
        ped.add_person(pid, sex)
    ped.add_parent("child", "a")
    ped.add_parent("child", "b")
    used = {"a": [], "b": []}
    for i, relation in enumerate(sorted(loops, key=lambda r: sum(DEPTHS[r]))):
        for sex in ("male", "female"):
            ped.add_person(f"g{i}{sex}", sex)
        for partner, depth in zip(("a", "b"), DEPTHS[relation]):
            # Prefix-free paths reserve both parents of a shared-ancestor branch.
            path = next(("".join(bits) for bits in product("01", repeat=depth - 1)
                         if not any("".join(bits).startswith(p) or p.startswith("".join(bits))
                                    for p in used[partner])), None)
            if path is None:
                raise ValueError("Overlapping ancestor branches need explicit parent edges")
            used[partner].append(path)
            child = partner
            for step, bit in enumerate(path):
                pid = partner + path[:step + 1]
                if pid not in ped.sex:
                    ped.add_person(pid, "male" if bit == "0" else "female")
                    ped.add_parent(child, pid)
                child = pid
            for sex in ("male", "female"):
                ped.add_parent(child, f"g{i}{sex}")
    return ped


def evaluate(relations: list[str]) -> dict:
    if len(relations) > cfg()["nasab"]["max_loops"] or any(r not in RELATIONS for r in relations):
        raise ValueError("Invalid relations")
    loops = [r for r in relations if r != "none"]
    expanded = [part for r in loops for part in (["first_cousins"] * 2 if r == "double_first_cousins" else [r])]
    try:
        ped = _pedigree(expanded)
    except ValueError:
        # shortcut: ambiguous branches report the maximum template; collect explicit parent edges to combine these loops.
        strongest = max(loops, key=lambda r: evaluate([r])["f"])
        result = evaluate([strongest])
        return {**result, "warnings": ["ambiguous_loops_maximum_reported"]}
    label = "none" if not loops else loops[0] if len(loops) == 1 else "multiple_loops"
    return {"f": inbreeding(ped, "child"), "phi": kinship(ped, "a", "b"), "label_key": label, "warnings": []}
