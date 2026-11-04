"""FR-024 scoring only; licensed instrument item wording is deliberately absent."""
from . import cfg


def mmic(knowledge_correct: int, knowledge_total: int, attitude: str, acted: bool) -> dict:
    c = cfg()["measures"]
    if (type(knowledge_correct) is not int or type(knowledge_total) is not int
            or not 0 <= knowledge_correct <= knowledge_total <= c["max_knowledge_items"] or knowledge_total == 0
            or attitude not in {"favourable", "unfavourable"} or type(acted) is not bool):
        raise ValueError("Invalid MMIC input")
    good = knowledge_correct / knowledge_total >= c["knowledge_cutoff_ratio"]
    consistent = (attitude == "favourable") == acted
    return {"informed": good and consistent,
            "dimension_flags": {"good_knowledge": good, "attitude_behaviour_consistent": consistent}}


def gcos24(answers: list[int]) -> int:
    c = cfg()["measures"]
    if len(answers) != c["gcos_items"] or any(type(a) is not int or not c["gcos_min"] <= a <= c["gcos_max"] for a in answers):
        raise ValueError("Invalid GCOS answers")
    return sum(answers)


def gcos24_gain(pre: list[int], post: list[int]) -> int:
    return gcos24(post) - gcos24(pre)
