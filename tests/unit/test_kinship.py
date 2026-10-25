import pytest

from services.genetics import Pedigree, PedigreeError, inbreeding, kinship


def fam(*people):
    p = Pedigree()
    for pid, sex in people:
        p.add_person(pid, sex)
    return p


def sibs(p, child, f, m):
    p.add_parent(child, f)
    p.add_parent(child, m)


def cousins(p, tag, depth):
    """Two lines descending `depth` generations from a shared couple; returns the two tips."""
    p.add_person(f"{tag}F", "male"); p.add_person(f"{tag}M", "female")
    tips = []
    for side, sex in (("x", "male"), ("y", "female")):
        prev = (f"{tag}F", f"{tag}M")
        for g in range(depth):
            pid = f"{tag}{side}{g}"
            p.add_person(pid, sex)
            sibs(p, pid, *prev)
            if g < depth - 1:  # spouse is a founder
                sp = f"{tag}{side}{g}sp"
                p.add_person(sp, "female" if sex == "male" else "male")
                prev = (pid, sp) if sex == "male" else (sp, pid)
        tips.append(pid)
    return tips


def test_first_cousins():
    p = Pedigree(); a, b = cousins(p, "c", 2)
    assert 2 * kinship(p, a, b) == pytest.approx(1 / 8)  # relationship r
    p.add_person("kid", "male"); sibs(p, "kid", a, b)
    assert inbreeding(p, "kid") == pytest.approx(1 / 16)


def test_second_cousins():
    p = Pedigree(); a, b = cousins(p, "s", 3)
    p.add_person("kid", "male"); sibs(p, "kid", a, b)
    assert inbreeding(p, "kid") == pytest.approx(1 / 64)


def test_full_siblings():
    p = fam(("f", "male"), ("m", "female"), ("s", "male"), ("d", "female"), ("k", "male"))
    sibs(p, "s", "f", "m"); sibs(p, "d", "f", "m"); sibs(p, "k", "s", "d")
    assert inbreeding(p, "k") == pytest.approx(1 / 4)


def test_half_siblings():
    p = fam(("f", "male"), ("m1", "female"), ("m2", "female"), ("s", "male"), ("d", "female"), ("k", "male"))
    sibs(p, "s", "f", "m1"); sibs(p, "d", "f", "m2")
    p.add_person("sx", "male")  # keep sexes right: child of half sibs needs male+female
    sibs(p, "k", "s", "d")
    assert inbreeding(p, "k") == pytest.approx(1 / 8)


def test_uncle_niece():
    p = fam(("gf", "male"), ("gm", "female"), ("u", "male"), ("par", "male"), ("sp", "female"),
            ("niece", "female"), ("k", "male"))
    sibs(p, "u", "gf", "gm"); sibs(p, "par", "gf", "gm"); sibs(p, "niece", "par", "sp"); sibs(p, "k", "u", "niece")
    assert inbreeding(p, "k") == pytest.approx(1 / 8)


def test_double_first_cousins():
    # two brothers marry two sisters; their children are double first cousins
    p = fam(("gf1", "male"), ("gm1", "female"), ("gf2", "male"), ("gm2", "female"),
            ("b1", "male"), ("b2", "male"), ("s1", "female"), ("s2", "female"),
            ("c1", "male"), ("c2", "female"), ("k", "male"))
    sibs(p, "b1", "gf1", "gm1"); sibs(p, "b2", "gf1", "gm1")
    sibs(p, "s1", "gf2", "gm2"); sibs(p, "s2", "gf2", "gm2")
    sibs(p, "c1", "b1", "s1"); sibs(p, "c2", "b2", "s2"); sibs(p, "k", "c1", "c2")
    assert inbreeding(p, "k") == pytest.approx(1 / 8)


def test_unrelated_and_founders():
    p = fam(("a", "male"), ("b", "female"), ("k", "male"))
    sibs(p, "k", "a", "b")
    assert inbreeding(p, "k") == 0 and inbreeding(p, "a") == 0 and kinship(p, "a", "b") == 0


def test_uncertain_edges_ignored_by_default():
    p = fam(("f", "male"), ("m", "female"), ("s", "male"), ("d", "female"))
    sibs(p, "s", "f", "m"); p.add_parent("d", "f", "uncertain"); p.add_parent("d", "m", "uncertain")
    assert p.has_uncertain_edges()
    assert kinship(p, "s", "d") == 0
    assert kinship(p, "s", "d", use_uncertain=True) == pytest.approx(0.25)


def test_validation_rejects():
    p = fam(("a", "male"), ("b", "male"), ("m", "female"), ("c", "female"))
    with pytest.raises(PedigreeError): p.add_parent("a", "a")           # self-parenting
    p.add_parent("c", "a"); p.add_parent("c", "m")
    with pytest.raises(PedigreeError): p.add_parent("c", "b")           # third parent / two fathers
    with pytest.raises(PedigreeError): p.add_parent("a", "c")           # cycle (c is a's child) -- c female => mother of a
    q = Pedigree(); q.add_person("p", "male", birth=2000); q.add_person("k", "female", birth=1990)
    with pytest.raises(PedigreeError): q.add_parent("k", "p")           # impossible age order
