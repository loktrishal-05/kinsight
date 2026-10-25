"""Fixed fictional personas; role/subject claims never come from client input."""

from .policy import Actor

PERSONAS = {
    "person_a": Actor("synthetic-a", "person"),
    "person_b": Actor("synthetic-b", "person"),
    "partner_a": Actor("synthetic-a", "partner"),
    "partner_b": Actor("synthetic-b", "partner"),
    "relative": Actor("synthetic-relative", "relative"),
    "counsellor": Actor("synthetic-counsellor", "counsellor"),
    "analyst": Actor("synthetic-analyst", "analyst"),
    "auditor": Actor("synthetic-auditor", "auditor"),
    "demo_operator": Actor("synthetic-operator", "demo_operator"),
}
