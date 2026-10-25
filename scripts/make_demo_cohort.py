"""make cohort: rebuild data/demo from configs. Offline, deterministic."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from services.cohort.generate import generate
from services.cohort.panel import load_cohort_config, load_panel, load_rules

m = generate(load_cohort_config(), load_panel(), load_rules(), ROOT / "data" / "demo")
print(json.dumps({k: m[k] for k in ("seed", "counts", "achieved_consanguinity_share", "mean_inbreeding_f")}, indent=1))
