"""make demo: offline smoke of the demo cohort (checksums, tier mix). Grows with each phase."""
import gzip
import hashlib
import json
import pathlib
import sys
from collections import Counter

D = pathlib.Path(__file__).resolve().parents[1] / "data" / "demo"
m = json.loads((D / "manifest.json").read_text())
for name, want in m["sha256"].items():
    p = (D / "sim_truth" if name == "sim_truth" else D) / f"{name}.jsonl.gz"
    if hashlib.sha256(p.read_bytes()).hexdigest() != want:
        sys.exit(f"checksum mismatch: {name} (run make cohort)")
couples = [json.loads(x) for x in gzip.open(D / "couples.jsonl.gz", "rt").read().splitlines()]
print("All people and results are fictional.", dict(Counter(c["tier"] for c in couples)), "couples by tier")
