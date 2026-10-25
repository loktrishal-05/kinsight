"""Adapters own engine validation, reviewed wording, release gates and graph resumes.

No default adapter fabricates a result. Operations are fixed by routes, never by
user text. Implementations must use the supplied SQLAlchemy transaction for data
writes, including deletion, so a failed request can roll back safely.
"""

from typing import Protocol

from sqlalchemy.orm import Session


class Unavailable(RuntimeError):
    pass


class Backend(Protocol):
    async def invoke(
        self, operation: str, subject: str, payload: dict | None, session: Session
    ) -> dict | list: ...

    async def delete_person(self, subject: str, session: Session) -> None: ...


class UnwiredBackend:
    async def invoke(
        self, operation: str, subject: str, payload: dict | None, session: Session
    ) -> dict | list:
        raise Unavailable("Service adapter is not connected")

    async def delete_person(self, subject: str, session: Session) -> None:
        # This adapter stores no genetics, relationships, checkpoints or result content.
        return None
