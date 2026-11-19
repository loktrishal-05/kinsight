"""Copy the reviewed question banks into the web mock: python scripts/export_prep_bank.py"""
import json
from pathlib import Path

import yaml

root = Path(__file__).resolve().parents[1]
out = {lang: yaml.safe_load((root / f"templates/{lang}/prep_questions.yaml").read_text(encoding="utf-8")) for lang in ("en", "ar")}
(root / "web/lib/fixtures/prep_bank.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
