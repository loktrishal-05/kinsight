"""Teach-back quiz (spec section 7): questions only from the reviewed bank; keys derived from the assessment."""
from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel

from services.genetics import CoupleAssessment

from .render import TEMPLATES, fmt_percent

N_QUESTIONS = 5
DISTRACTORS = (0.0, 0.25, 0.5, 1.0)  # generic round figures, never presented as the couple's own result


class Option(BaseModel):
    id: str
    text: str


class Question(BaseModel):
    id: str
    text: str
    options: list[Option]


class Quiz(BaseModel):
    questions: list[Question]
    key: dict[str, str]  # question id -> option id; server side only, never sent to the client


class QuizResult(BaseModel):
    correct: int
    total: int
    passed: bool
    missed: list[str]


def load_bank(root: Path = TEMPLATES) -> list[dict]:
    return yaml.safe_load((root / "quiz_bank.yaml").read_text(encoding="utf-8"))["questions"]


def build_quiz(assessment: CoupleAssessment, lang: str, bank: list[dict] | None = None) -> Quiz:
    bank = bank or load_bank()
    figure = next((f.risk_affected for f in assessment.findings if f.risk_affected is not None), None)
    qs, key = [], {}
    for q in bank:
        if q.get("derived"):
            if figure is None:
                continue
            right = fmt_percent(figure, lang)
            others = [fmt_percent(d, lang) for d in DISTRACTORS]
            texts = [right] + [t for t in dict.fromkeys(others) if t != right][:2]
        else:
            texts = [o[lang] for o in q["options"]]  # bank lists the correct option first
        order = sorted(range(len(texts)), key=lambda i: (i * 7 + len(q["id"])) % len(texts) * 10 + i)
        opts = [Option(id="abc"[n], text=texts[i]) for n, i in enumerate(order)]
        key[q["id"]] = next(o.id for o, i in zip(opts, order) if i == 0)
        qs.append(Question(id=q["id"], text=q["text"][lang], options=opts))
    derived = [q for q in qs if q.id == "q_chance_value"]  # keep the engine-derived question when present
    qs = [q for q in qs if q not in derived][:N_QUESTIONS - len(derived)] + derived
    return Quiz(questions=qs, key={q.id: key[q.id] for q in qs})


def grade(quiz: Quiz, answers: dict[str, str], pass_min: int) -> QuizResult:
    missed = [q.id for q in quiz.questions if answers.get(q.id) != quiz.key[q.id]]
    ok = len(quiz.questions) - len(missed)
    return QuizResult(correct=ok, total=len(quiz.questions), passed=ok >= min(pass_min, len(quiz.questions)),
                      missed=missed)
