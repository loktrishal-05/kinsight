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
with gzip.open(D / "couples.jsonl.gz", "rt") as fh:
    couples = [json.loads(x) for x in fh.read().splitlines()]
print("All people and results are fictional.", dict(Counter(c["tier"] for c in couples)), "couples by tier")

# Run the spec demo script (steps 2-9) through the real API, in process and offline.
import os  # noqa: E402

os.environ.update(KINSIGHT_DEMO="1", KINSIGHT_DEMO_AUTH="1",
                  KINSIGHT_TOKEN_SECRET=os.environ.get("KINSIGHT_TOKEN_SECRET", "demo-only-token-secret-32-bytes!!"),
                  KINSIGHT_AUDIT_SALT=os.environ.get("KINSIGHT_AUDIT_SALT", "demo-only-audit-salt-32-bytes!!!!"))
sys.path.insert(0, str(D.parents[1]))
from fastapi.testclient import TestClient  # noqa: E402

from services.api.demo_path import run_demo_path  # noqa: E402
from services.api.main import create_app  # noqa: E402

with TestClient(create_app("sqlite://")) as client:
    run_demo_path(client)
print("demo path OK")
