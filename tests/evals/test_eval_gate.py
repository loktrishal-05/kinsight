from services.agents.eval import golden_couples, run_eval


def test_fidelity_gate_on_40_couples():
    assert len(golden_couples()) == 40
    r = run_eval()
    assert r["drafts"] == 160
    assert r["numeric_fidelity"] == 1.0 and r["block_conformity"] == 1.0 and r["banned_phrases"] == 0, r
