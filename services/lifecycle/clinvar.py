"""Live ClinVar lookup (NCBI E-utilities, public, no key needed; NCBI_API_KEY raises the rate limit if set).

Only ClinVar variation ids leave the system. No person, family or result data is ever sent.
Answers are cached briefly so a screen refresh does not hit NCBI again.
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
TTL_SECONDS = 86_400
MAX_IDS = 50
VARIATION_ID = re.compile(r"[0-9]{1,12}")
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
    if not ids or len(ids) > MAX_IDS or any(not VARIATION_ID.fullmatch(i) for i in ids):
        raise ValueError("Invalid variation ids")
    fresh = {i: v for i in ids if (c := _cache.get(i)) and now() - c[0] < TTL_SECONDS for v in [c[1]]}
    missing = [i for i in ids if i not in fresh]
    if missing:
        params = {"db": "clinvar", "id": ",".join(missing), "retmode": "json", "tool": "kinsight"}
        if os.environ.get("NCBI_API_KEY"):
            params["api_key"] = os.environ["NCBI_API_KEY"]
        try:
            with opener(URL + "?" + urllib.parse.urlencode(params), timeout=10) as r:
                data = json.load(r)
            result = data["result"]
            if data.get("error") or not isinstance(result, dict) or result.get("error"):
                raise SourceUnavailable("ClinVar returned an error")
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError, TypeError):
            raise SourceUnavailable("ClinVar did not return a usable response") from None
        fetched = now()
        for i in missing:
            g = (result.get(i) or {}).get("germline_classification") or {}
            fresh[i] = {"acmg_class": _class_of(g.get("description", "")), "label": g.get("description", ""),
                        "last_evaluated": g.get("last_evaluated", "")}
            fresh[i]["provenance"] = {
                "source": "NCBI ClinVar", "version": (result.get(i) or {}).get("accession_version"),
                "fetched_at": datetime.fromtimestamp(fetched, timezone.utc).isoformat(),
                "url": f"https://www.ncbi.nlm.nih.gov/clinvar/variation/{i}/",
            }
            _cache[i] = (fetched, fresh[i])
    return {i: fresh[i] for i in ids}
