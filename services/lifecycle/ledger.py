"""OOB-5 double-entry ledger. Decimal money, idempotent posting, blinded split view, QC refund."""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from . import cfg

CENT = Decimal("0.01")


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(CENT, ROUND_HALF_UP)


@dataclass(frozen=True)
class Entry:
    key: str
    debit: str
    credit: str
    amount: Decimal


@dataclass
class Ledger:
    entries: list[Entry] = field(default_factory=list)

    def post(self, key: str, debit: str, credit: str, amount) -> bool:
        amt = money(amount)
        if amt <= 0:
            raise ValueError("Amount must be positive")
        if any(e.key == key for e in self.entries):
            return False  # idempotent replay
        self.entries.append(Entry(key, debit, credit, amt))
        return True

    def balance(self, account: str) -> Decimal:
        dr = sum((e.amount for e in self.entries if e.debit == account), Decimal(0))
        cr = sum((e.amount for e in self.entries if e.credit == account), Decimal(0))
        return dr - cr

    def balanced(self) -> bool:
        accounts = {x for e in self.entries for x in (e.debit, e.credit)}
        return sum((self.balance(a) for a in accounts), Decimal(0)) == 0


def line(gross, coverage_pct, grant) -> dict:
    gross = money(gross)
    cover = money(gross * Decimal(str(coverage_pct)) / 100)
    grant = min(money(grant), gross - cover)
    return {"gross": gross, "insurer": cover, "grant": grant, "copay": gross - cover - grant}


def settle(ledger: Ledger, invoice: str, lines: list[dict]) -> None:
    for i, ln in enumerate(lines):
        parts = (("ASSET:PATIENT", ln["copay"]), ("ASSET:INSURER", ln["insurer"]), ("ASSET:GRANT", ln["grant"]))
        for k, (debit, amt) in enumerate(parts):
            if amt > 0:
                ledger.post(f"{invoice}:{i}:{k}", debit, "REVENUE:LAB", amt)


def refund(ledger: Ledger, invoice: str, paid_at: float, now: float) -> bool:
    """Reverse the patient's payments if the sample fails QC inside the refund window."""
    if now - paid_at > cfg()["refund_window_hours"] * 3600:
        return False
    for e in [e for e in ledger.entries if e.key.startswith(invoice + ":") and e.debit == "ASSET:PATIENT"]:
        ledger.post("refund:" + e.key, e.credit, e.debit, e.amount)
    return True


def blinded_receipt(lines: list[dict], partner_share) -> dict:
    """What one partner sees: package total and their own share, never the other's lines or card."""
    return {"total": sum((ln["gross"] for ln in lines), Decimal(0)), "your_share": money(partner_share)}
