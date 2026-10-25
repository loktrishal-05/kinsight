"""Private partner check (P5-7): UNAUDITED DEMO of commutative-encryption PSI on synthetic condition ids.

Honest-but-curious server model. Each partner blinds the hash of their carried condition ids with a secret exponent;
each partner re-blinds the other's set; the relaying server sees only blinded values. Only the shared conditions are
recovered. Not production cryptography: the group is Z_p* for the Mersenne prime 2**521 - 1 with hashed-and-squared
elements, there is no side-channel hardening, and it cannot produce the one-carrier or relatedness-adjusted figures
of the engine. Behind the private_partner_check flag.
"""
from __future__ import annotations

import hashlib
import secrets

P = 2**521 - 1  # prime; demo group only
UNAUDITED = "UNAUDITED DEMO: not production cryptography; reports shared conditions only."


def _h(x: str) -> int:
    d = int.from_bytes(hashlib.sha512(x.encode()).digest() * 2, "big") % P
    return pow(d, 2, P)  # square into the quadratic residues


def _key() -> int:
    return secrets.randbelow(P - 3) + 2


def blind(items: list[str], key: int) -> list[int]:
    """Runs in each partner's browser/client: H(x)^key."""
    return [pow(_h(x), key, P) for x in items]


def reblind(blinded: list[int], key: int) -> list[int]:
    """Second partner raises the other's blinded values to their own key. Order is kept so the owner can map back."""
    return [pow(v, key, P) for v in blinded]


def shared_conditions(items_a: list[str], items_b: list[str]) -> list[str]:
    """What partner A learns: only the items in both sets. The relaying server sees blinded values and no keys."""
    ka, kb = _key(), _key()
    to_b = blind(items_a, ka)             # A -> server -> B
    to_a = blind(items_b, kb)             # B -> server -> A
    a_items_double = reblind(to_b, kb)    # B -> server -> A: H(x)^(ab), same order as A's list
    b_items_double = set(reblind(to_a, ka))  # A computes H(y)^(ba) for B's items
    return sorted(x for x, z in zip(items_a, a_items_double) if z in b_items_double)
