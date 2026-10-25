"""Cohort-side tables (spec section 4). sim_truth lives in its own schema and metadata: evaluation only."""
from __future__ import annotations

from sqlalchemy import JSON, Boolean, Float, ForeignKey, Integer, MetaData, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TruthBase(DeclarativeBase):
    metadata = MetaData(schema="sim")  # separate schema; the API database role gets no grant on it


class Synthetic:
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")


class Person(Synthetic, Base):
    __tablename__ = "person"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)  # alias uuid
    sex_at_birth: Mapped[str] = mapped_column(String(8))
    language: Mapped[str] = mapped_column(String(2))
    reading_level: Mapped[str] = mapped_column(String(10))
    age_band: Mapped[str] = mapped_column(String(10))


class Relationship(Synthetic, Base):
    __tablename__ = "relationship"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(12))
    a_id: Mapped[str] = mapped_column(ForeignKey("person.id"))
    b_id: Mapped[str] = mapped_column(ForeignKey("person.id"))
    confidence: Mapped[str] = mapped_column(String(10))


class ScreeningResult(Synthetic, Base):
    __tablename__ = "screening_result"
    person_id: Mapped[str] = mapped_column(ForeignKey("person.id"), primary_key=True)
    condition_id: Mapped[str] = mapped_column(String(12), primary_key=True)
    status: Mapped[str] = mapped_column(String(12))
    panel_version: Mapped[str] = mapped_column(String(32))
    reported_at: Mapped[str | None] = mapped_column(String(32), nullable=True)


class CoupleAssessment(Synthetic, Base):
    __tablename__ = "couple_assessment"
    couple_id: Mapped[str] = mapped_column(String(16), primary_key=True)
    person_a: Mapped[str] = mapped_column(ForeignKey("person.id"))
    person_b: Mapped[str] = mapped_column(ForeignKey("person.id"))
    shared_conditions: Mapped[list] = mapped_column(JSON)
    risk_per_pregnancy: Mapped[float] = mapped_column(Float)
    inbreeding_f: Mapped[float] = mapped_column(Float)
    tier: Mapped[int] = mapped_column(Integer)
    engine_version: Mapped[str] = mapped_column(String(16))
    computed_at: Mapped[str | None] = mapped_column(String(32), nullable=True)


class Case(Synthetic, Base):
    __tablename__ = "case_record"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    couple_id: Mapped[str] = mapped_column(ForeignKey("couple_assessment.couple_id"))
    status: Mapped[str] = mapped_column(String(24))
    tier: Mapped[int] = mapped_column(Integer)


class CaseEvent(Synthetic, Base):
    __tablename__ = "case_event"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    case_id: Mapped[str] = mapped_column(ForeignKey("case_record.id"))
    to_state: Mapped[str] = mapped_column(String(32))
    owner: Mapped[str] = mapped_column(String(24))
    due_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    evidence_code: Mapped[str | None] = mapped_column(String(64), nullable=True)


class ComprehensionCheck(Synthetic, Base):
    __tablename__ = "comprehension_check"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    assessment_id: Mapped[str] = mapped_column(String(16))
    language: Mapped[str] = mapped_column(String(2))
    reading_level: Mapped[str] = mapped_column(String(10))
    questions: Mapped[list] = mapped_column(JSON)
    answers: Mapped[list] = mapped_column(JSON)
    passed: Mapped[bool] = mapped_column(Boolean)


class SimTruth(Synthetic, TruthBase):
    __tablename__ = "sim_truth"
    person_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    condition_id: Mapped[str] = mapped_column(String(12), primary_key=True)
    genotype: Mapped[str] = mapped_column(String(4))
