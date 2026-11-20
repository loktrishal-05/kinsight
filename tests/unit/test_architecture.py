"""Architecture rules (docs/architecture/overview.md, "Layers"). Imports may only point down the layer stack:
api -> workflow (agents, lifecycle, analytics) -> data (cohort, integrations) -> core (genetics, consent).
The genetics engine stays pure: no other KinSight package, no network, no model."""
import ast
from pathlib import Path

import pytest

SERVICES = Path(__file__).resolve().parents[2] / "services"

# package -> the KinSight packages it may import
ALLOWED = {
    "genetics": set(),
    "consent": set(),
    "cohort": {"genetics"},
    "integrations": {"cohort"},
    "lifecycle": {"genetics", "cohort"},
    "agents": {"genetics", "cohort"},
    "analytics": {"consent", "lifecycle"},
    "api": {"genetics", "consent", "cohort", "integrations", "lifecycle", "agents", "analytics"},
}
# third-party modules that would give the engine network or model access
FORBIDDEN_IN_ENGINE = {"httpx", "requests", "urllib", "socket", "anthropic", "langgraph", "sqlalchemy", "fastapi"}


def imports(package: str) -> dict[str, set[str]]:
    """Top-level modules imported by each file of a services package."""
    found: dict[str, set[str]] = {}
    for path in (SERVICES / package).rglob("*.py"):
        names: set[str] = set()
        for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
            if isinstance(node, ast.Import):
                names |= {a.name for a in node.names}
            elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
                names.add(node.module)
        found[str(path.relative_to(SERVICES))] = names
    return found


def test_every_services_package_has_a_rule():
    packages = {p.name for p in SERVICES.iterdir() if p.is_dir() and p.name != "__pycache__"}
    assert packages == set(ALLOWED), packages ^ set(ALLOWED)


@pytest.mark.parametrize("package", sorted(ALLOWED))
def test_imports_only_point_down_the_layers(package):
    bad = []
    for file, names in imports(package).items():
        for name in names:
            parts = name.split(".")
            if parts[0] == "services" and len(parts) > 1 and parts[1] != package and parts[1] not in ALLOWED[package]:
                bad.append(f"{file} imports {name}")
    assert bad == []


def test_the_genetics_engine_has_no_network_database_or_model_dependency():
    bad = [f"{file} imports {name}" for file, names in imports("genetics").items()
           for name in names if name.split(".")[0] in FORBIDDEN_IN_ENGINE]
    assert bad == []
