"""Live population allele frequencies from gnomAD v4 (public GraphQL API, no key).

Only a variant id such as 7-117559590-ATCT-A is sent. For a rare recessive allele with frequency q, the carrier share is
2q(1-q). gnomAD is not an Emirati cohort: the Middle Eastern group is shown separately and is a rough guide only.
"""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request

URL = "https://gnomad.broadinstitute.org/api"
DATASET = "gnomad_r4"
TTL_SECONDS = 24 * 3600
MAX_IDS = 20
ID = re.compile(r"^(?:[1-9]|1[0-9]|2[0-2]|X|Y)-\d{1,9}-[ACGT]{1,50}-[ACGT]{1,50}$")
QUERY = ("query($id: String!, $d: DatasetId!) { variant(variantId: $id, dataset: $d) { variant_id "
         "exome { ac an populations { id ac an } } genome { ac an populations { id ac an } } } }")
_cache: dict[str, tuple[float, dict | None]] = {}


class SourceUnavailable(RuntimeError):
    pass


def carrier_share(ac: int, an: int) -> float | None:
    if an <= 0:
        return None
    q = ac / an
    return 2 * q * (1 - q)


def summarise(v: dict | None) -> dict | None:
    """Combine exome and genome counts; report overall and Middle Eastern ('mid') frequency."""
    if not v:
        return None
    parts = [p for p in (v.get("exome"), v.get("genome")) if p]
    ac, an = sum(p["ac"] for p in parts), sum(p["an"] for p in parts)
    mid = [pop for p in parts for pop in p.get("populations", []) if pop["id"] == "mid"]
    mac, man = sum(x["ac"] for x in mid), sum(x["an"] for x in mid)
    return {"allele_count": ac, "allele_number": an, "allele_frequency": ac / an if an else None,
            "carrier_share": carrier_share(ac, an), "middle_eastern_allele_number": man,
            "middle_eastern_carrier_share": carrier_share(mac, man)}


def fetch(ids: list[str], *, opener=urllib.request.urlopen, now=time.time) -> dict[str, dict | None]:
    if not ids or len(ids) > MAX_IDS or any(not ID.match(i) for i in ids):
        raise ValueError("Invalid variant ids")
    out: dict[str, dict | None] = {}
    for i in ids:
        hit = _cache.get(i)
        if hit and now() - hit[0] < TTL_SECONDS:
            out[i] = hit[1]
            continue
        req = urllib.request.Request(URL, json.dumps({"query": QUERY, "variables": {"id": i, "d": DATASET}}).encode(),
                                     {"content-type": "application/json", "user-agent": "kinsight"})
        try:
            with opener(req, timeout=15) as r:
                data = json.load(r)
        except (urllib.error.URLError, TimeoutError, ValueError):
            raise SourceUnavailable("gnomAD is not reachable") from None
        if "data" not in data:
            raise SourceUnavailable("gnomAD returned an error")
        out[i] = summarise((data["data"] or {}).get("variant"))
        _cache[i] = (now(), out[i])
    return out
