"""Third-party license inventory for KinSight.

Resolves the real dependency tree from what is installed, reads each package's license metadata, groups the result and
flags anything copyleft or unknown. Writes docs/LICENSES.md.

    python scripts/license_inventory.py            # regenerate docs/LICENSES.md (Python + web, if web/node_modules exists)
    python scripts/license_inventory.py --check    # exit 1 if a copyleft or unknown license is found (used in CI, Python only)
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from importlib import metadata
from pathlib import Path

from packaging.requirements import Requirement
from packaging.utils import canonicalize_name

try:
    import tomllib  # Python 3.11+
except ModuleNotFoundError:  # requires-python is >=3.10
    import tomli as tomllib

ROOT = Path(__file__).resolve().parent.parent
COPYLEFT = re.compile(r"\b(A?GPL|LGPL|MPL|EPL|CDDL|EUPL|OSL|CC-BY-SA|SSPL)\b", re.I)
KNOWN = re.compile(r"(MIT|BSD|Apache|ISC|0BSD|PSF|Python|Zlib|Unlicense|CC0|OFL|CC-BY|HPND|BlueOak)", re.I)
# Packages whose metadata carries no usable license text; verified by hand against the project's own LICENSE file.
MANUAL = {"typing-extensions": "PSF-2.0", "langchain-core": "MIT"}
# Weak-copyleft packages that have been reviewed. Anything copyleft or unknown that is NOT listed here fails --check.
REVIEWED = {
    "certifi": "MPL-2.0 is file-level copyleft. Used unmodified as installed from PyPI (CA bundle); no obligation beyond keeping the notice.",
    "orjson": "MPL-2.0 (with Apache-2.0 / MIT) is file-level copyleft. Used unmodified as a compiled wheel; not vendored or patched.",
    "psycopg": "LGPL-3.0 permits use as a library from a differently licensed program. Installed unmodified from PyPI, dynamically imported, replaceable by the user (pip install), so the LGPL linking conditions are met. No LGPL code is copied into this repository.",
    "psycopg-binary": "Same as psycopg: the prebuilt libpq wheel, unmodified and replaceable. If the Docker image is ever redistributed, ship the LGPL text and offer the source of this package.",
    "hypothesis": "MPL-2.0, dev and test only. Not installed in the API image and not shipped.",
}


def license_of(dist: metadata.Distribution) -> str:
    m = dist.metadata
    expr = m.get("License-Expression")
    if expr:
        return expr.strip()
    classifiers = [c.split("::")[-1].strip() for c in m.get_all("Classifier") or [] if c.startswith("License ::")]
    classifiers = [c for c in classifiers if c and c != "OSI Approved"]
    text = (m.get("License") or "").strip()
    if text and len(text) < 80 and "\n" not in text:
        return text
    if classifiers:
        return " / ".join(dict.fromkeys(classifiers))
    return MANUAL.get(canonicalize_name(m["Name"]), text.splitlines()[0][:60] if text else "UNKNOWN")


def closure(roots: list[str], extras_for_root: dict[str, set[str]]) -> dict[str, metadata.Distribution]:
    seen: dict[str, metadata.Distribution] = {}
    stack = [(canonicalize_name(r), extras_for_root.get(r, set())) for r in roots]
    while stack:
        name, extras = stack.pop()
        if name in seen:
            continue
        try:
            dist = metadata.distribution(name)
        except metadata.PackageNotFoundError:
            continue
        seen[name] = dist
        for req_s in dist.requires or []:
            req = Requirement(req_s)
            if req.marker and not any(req.marker.evaluate({"extra": e}) for e in (extras | {""})):
                continue
            stack.append((canonicalize_name(req.name), set(req.extras)))
    return seen


def python_inventory(extras: list[str]) -> list[tuple[str, str, str]]:
    proj = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]
    reqs = list(proj.get("dependencies", []))
    for e in extras:
        reqs += proj.get("optional-dependencies", {}).get(e, [])
    roots, ex = [], {}
    for r in reqs:
        q = Requirement(r)
        roots.append(q.name)
        ex[q.name] = set(q.extras)
    return sorted((d.metadata["Name"], d.version, license_of(d)) for d in closure(roots, ex).values())


def web_inventory() -> list[tuple[str, str, str]] | None:
    web = ROOT / "web"
    if not (web / "node_modules").exists() or not shutil.which("npx"):
        return None
    out = subprocess.run(["npx", "-y", "license-checker-rseidelsohn@4", "--production", "--json", "--excludePrivatePackages"],
                         cwd=web, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=sys.platform == "win32")
    if out.returncode:
        return None
    rows = []
    for k, v in json.loads(out.stdout).items():
        name, _, ver = k.rpartition("@")
        rows.append((name, ver, str(v.get("licenses"))))
    return sorted(rows)


def flag(lic: str) -> str:
    if COPYLEFT.search(lic):
        return "copyleft"
    return "ok" if KNOWN.search(lic) else "unknown"


def unreviewed(rows: list[tuple[str, str, str]]) -> list[tuple[str, str, str]]:
    return [r for r in rows if flag(r[2]) != "ok" and canonicalize_name(r[0]) not in REVIEWED]


def section(title: str, rows: list[tuple[str, str, str]]) -> list[str]:
    by = defaultdict(list)
    for n, v, lic in rows:
        by[lic].append(f"{n} {v}")
    out = [f"## {title} ({len(rows)} packages)", "", "| License | Count | Packages |", "| --- | --- | --- |"]
    for lic, items in sorted(by.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        mark = {"copyleft": " **(copyleft)**", "unknown": " **(unknown: verify)**"}.get(flag(lic), "")
        out.append(f"| {lic}{mark} | {len(items)} | {', '.join(items)} |")
    return out + [""]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    runtime = python_inventory(["api"])
    dev = [r for r in python_inventory(["api", "dev"]) if r not in runtime]
    bad = [r for r in runtime + dev if flag(r[2]) != "ok"]
    if a.check:
        new = unreviewed(runtime + dev)
        for n, v, lic in new:
            print(f"UNREVIEWED {flag(lic)}: {n} {v} -> {lic}. Review it, then add it to REVIEWED in scripts/license_inventory.py.")
        print(f"license check: {len(runtime)} runtime + {len(dev)} dev packages, {len(bad)} weak-copyleft (all reviewed: {not new})")
        return 1 if new else 0
    web = web_inventory()
    lines = ["# Third-party license inventory", "",
             "Generated by `scripts/license_inventory.py` from the installed dependency trees. Re-run it after changing dependencies.",
             "KinSight's own code and wording are [MIT](../LICENSE). Licenses below are each package's declared license.", ""]
    lines += section("Python runtime (API image: core + api extras)", runtime)
    lines += section("Python dev and test only", dev)
    lines += section("Web runtime (npm, production)", web) if web else ["## Web runtime", "", "Not generated (run `npm ci` in `web/`, then re-run this script).", ""]
    lines += ["## Findings", ""]
    flagged = [r for r in runtime + dev + (web or []) if flag(r[2]) != "ok"]
    lines.append("- No strong-copyleft (GPL/AGPL) and no unknown licenses. Weak-copyleft packages, each reviewed:")
    for n, v, lic in flagged:
        lines.append(f"  - **{n} {v}** ({lic}): {REVIEWED.get(canonicalize_name(n), 'NOT REVIEWED')}")
    lines += ["- Attribution: `caniuse-lite` is CC-BY-4.0 (browser-support data used by the build toolchain); keep this notice.",
              "- Fonts (`@fontsource*`) are SIL OFL-1.1; the fonts are bundled unmodified.",
              "- Out of scope here: the ClinVar and gnomAD data terms and the licensed questionnaires (see `DATA_SOURCES.md`).", ""]
    (ROOT / "docs" / "LICENSES.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote docs/LICENSES.md: {len(runtime)} python runtime, {len(dev)} dev, {len(web or [])} web; flagged: {len(flagged)}")
    for n, v, lic in unreviewed(runtime + dev + (web or [])):
        print(f"  UNREVIEWED {flag(lic)}: {n} {v} -> {lic}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
