"""Short-lived HMAC tokens for explicitly enabled fictional demo personas."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from dataclasses import dataclass

from services.consent.policy import Actor
from services.consent.roles import PERSONAS
from services.consent.settings import settings


def secret(variable: str) -> bytes:
    value = os.environ.get(variable, "").encode()
    if len(value) < 32:
        raise RuntimeError(f"{variable} must contain at least 32 bytes")
    return value


def encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode()


def decode(value: str) -> bytes:
    return base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)


@dataclass(frozen=True)
class Identity:
    actor: Actor
    token_id: str
    expires_at: int


def issue_token(persona: str) -> str:
    if os.environ.get("KINSIGHT_DEMO_AUTH") != "1":
        raise PermissionError("Demo authentication is disabled")
    if persona not in PERSONAS:
        raise ValueError("Unknown demo persona")
    now = int(time.time())
    claims = {
        "persona": persona,
        "iat": now,
        "exp": now + settings().token_ttl_seconds,
        "jti": secrets.token_hex(16),
        "aud": "kinsight-demo",
    }
    payload = encode(json.dumps(claims, sort_keys=True, separators=(",", ":")).encode())
    signature = encode(
        hmac.new(secret("KINSIGHT_TOKEN_SECRET"), payload.encode(), hashlib.sha256).digest()
    )
    return f"{payload}.{signature}"


def verify_token(token: str) -> Identity:
    key = secret("KINSIGHT_TOKEN_SECRET")
    try:
        if len(token) > 2048:
            raise ValueError
        payload, signature = token.split(".")
        expected = hmac.new(key, payload.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(decode(signature), expected):
            raise ValueError
        claims = json.loads(decode(payload))
        if set(claims) != {"persona", "iat", "exp", "jti", "aud"}:
            raise ValueError
        now = time.time()
        if (
            type(claims["iat"]) is not int
            or type(claims["exp"]) is not int
            or not claims["iat"] <= now < claims["exp"]
            or not 0 < claims["exp"] - claims["iat"] <= settings().token_ttl_seconds
            or claims["aud"] != "kinsight-demo"
            or type(claims["jti"]) is not str
            or len(claims["jti"]) != 32
        ):
            raise ValueError
        return Identity(PERSONAS[claims["persona"]], claims["jti"], claims["exp"])
    except (ValueError, KeyError, TypeError, UnicodeError) as exc:
        raise ValueError("Invalid or expired token") from exc
