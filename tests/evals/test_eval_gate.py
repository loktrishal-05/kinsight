from services.agents.eval import golden_couples, run_eval


def test_fidelity_gate_on_40_couples():
    assert len(golden_couples()) == 40
    r = run_eval()
    langs = {lg for lg, _ in __import__("services.agents.render", fromlist=["x"]).load_templates()}
    assert r["drafts"] == 40 * len(langs) * 2  # every couple, in every language, at both reading levels
    assert r["numeric_fidelity"] == 1.0 and r["block_conformity"] == 1.0 and r["banned_phrases"] == 0, r
