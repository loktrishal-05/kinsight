"""Feature flags from configs/flags.yaml. Unknown flags are off."""
from __future__ import annotations

from pathlib import Path

import yaml

FLAGS = Path(__file__).resolve().parents[2] / "configs" / "flags.yaml"


def enabled(name: str, path: Path = FLAGS) -> bool:
    return bool(yaml.safe_load(path.read_text(encoding="utf-8")).get(name, False))
