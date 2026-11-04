"""Live ClinVar lookup (NCBI E-utilities, public, no key needed; NCBI_API_KEY raises the rate limit if set).

Only ClinVar variation ids leave the system. No person, family or result data is ever sent.
Answers are cached briefly so a screen refresh does not hit NCBI again.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
TTL_SECONDS = 3600
MAX_IDS = 50
# ClinVar germline classification text -> the 1..5 scale used by safety.reclassification
CLASSES = {"benign": 1, "likely benign": 2, "uncertain significance": 3, "likely pathogenic": 4, "pathogenic": 5}
_cache: dict[str, tuple[float, dict]] = {}


class SourceUnavailable(RuntimeError):
    pass


def _class_of(text: str) -> int | None:
    t = text.lower().strip()
    if t.startswith("pathogenic/likely pathogenic"):
        return 5
    return CLASSES.get(t)  # conflicting, drug response etc. return None: no class, no alert


def fetch(ids: list[str], *, opener=urllib.request.urlopen, now=time.time) -> dict[str, dict]:
    """Current ClinVar class for each variation id: {id: {"acmg_class": int|None, "label": str, "last_evaluated": str}}."""
    if not ids or len(ids) > MAX_IDS or any(not i.isdigit() or len(i) > 12 for i in ids):
        raise ValueError("Invalid variation ids")
    fresh = {i: v for i in ids if (c := _cache.get(i)) and now() - c[0] < TTL_SECONDS for v in [c[1]]}
    missing = [i for i in ids if i not in fresh]
    if missing:
        params = {"db": "clinvar", "id": ",".join(missing), "retmode": "json", "tool": "kinsight"}
        if os.environ.get("NCBI_API_KEY"):
            params["api_key"] = os.environ["NCBI_API_KEY"]
        try:
            with opener(URL + "?" + urllib.parse.urlencode(params), timeout=10) as r:
                result = json.load(r)["result"]
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError):
            raise SourceUnavailable("ClinVar is not reachable") from None
        for i in missing:
            g = (result.get(i) or {}).get("germline_classification") or {}
            fresh[i] = {"acmg_class": _class_of(g.get("description", "")), "label": g.get("description", ""),
                        "last_evaluated": g.get("last_evaluated", "")}
            _cache[i] = (now(), fresh[i])
    return {i: fresh[i] for i in ids}
