"""A local model can select a tool. Its prose never becomes an answer."""

import json
import os
import re
import time
import unicodedata
from functools import cache
from urllib.parse import urlsplit

import httpx
import yaml

from services.agents.copilot import refusal_reason
from services.cohort.panel import CONFIGS

CONTENT = CONFIGS.parent / "web" / "content"
LANGUAGES = ("en", "ar", "hi", "ta", "te", "kn", "ml")
SCRIPTS = {"hi": r"[ऀ-ॿ]", "ta": r"[஀-௿]", "te": r"[ఀ-౿]", "kn": r"[ಀ-೿]", "ml": r"[ഀ-ൿ]"}
BLOCKS = ("fictional_notice", "carrier_not_disease", "counsellor_available")
COUNSELLOR = re.compile(
    r"^(?:please )?(?:(?:i (?:want|would like|need) to |can i )?talk to a (?:genetic )?"
    r"counsell?or|أريد التحدث إلى مستشار وراثي)[.!?؟]?$", re.IGNORECASE,
)
TOOLS = {
    "get_my_result": "Open the person's own released individual result.",
    "explain_block": "Explain a general reviewed block.",
    "glossary": "Define a term from the glossary.",
    "run_scenario": "Open the educational what-if calculator with user-entered inputs.",
    "my_consents": "Open the person's own consent summary.",
    "next_steps": "Open the next steps for counselling preparation.",
    "add_question_to_prep": "Offer the preparation sheet so the person can confirm and save a question.",
}


@cache
def pack(lang: str) -> dict:
    path = CONTENT / f"{lang if lang in LANGUAGES else 'en'}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def blocked(text: str) -> bool:
    clean = "".join(c for c in unicodedata.normalize("NFKC", text) if unicodedata.category(c) != "Cf").lower()
    return bool(refusal_reason(clean)) or any(
        word and word.lower() in clean
        for lang, script in SCRIPTS.items()
        if re.search(script, clean)
        for label, words in pack(lang)["kin"]["words"].items()
        if label.startswith("guard_")
        for word in words
    )


@cache
def config() -> dict:
    return yaml.safe_load((CONFIGS / "llm.yaml").read_text(encoding="utf-8"))["kin"]


def enabled() -> bool:
    return bool(os.getenv("KIN_LLM_API_KEY") and os.getenv("KIN_LLM_MODEL"))


def choose(history: list[str], text: str, terms: tuple[str, ...]) -> tuple[str, str | None] | None:
    """Validate the tool envelope independently of the model's schema support."""
    try:
        settings = config()
        url = urlsplit(os.getenv("KIN_LLM_URL", settings["url"]))
        if (url.scheme not in {"http", "https"} or url.hostname not in {"127.0.0.1", "::1"}
                or url.username is not None or url.query or url.fragment):
            return None
        enums = {"explain_block": ("id", BLOCKS), "glossary": ("term", terms)}
        tools = []
        for name, description in TOOLS.items():
            properties = {}
            if name in enums:
                key, allowed = enums[name]
                properties[key] = {"type": "string", "enum": allowed}
            tools.append({"type": "function", "function": {
                "name": name, "description": description, "parameters": {
                    "type": "object", "properties": properties, "required": list(properties),
                    "additionalProperties": False,
                },
            }})
        messages = [{"role": "system", "content": "Choose one tool for the last user turn. Never answer with prose."}]
        messages.extend({"role": "user", "content": message} for message in [*history, text])
        body = {"model": os.environ["KIN_LLM_MODEL"], "messages": messages, "tools": tools, "temperature": 0}
        deadline = time.monotonic() + settings["timeout_seconds"]
        with httpx.Client(trust_env=False, timeout=settings["timeout_seconds"]) as client, client.stream(
                "POST", url.geturl(), json=body, headers={"Authorization": f"Bearer {os.environ['KIN_LLM_API_KEY']}"}
        ) as response:
            response.raise_for_status()
            result = bytearray()
            for chunk in response.iter_bytes():
                if time.monotonic() > deadline or len(result) + len(chunk) > 65_536:
                    return None
                result.extend(chunk)
        calls = json.loads(result)["choices"][0]["message"]["tool_calls"]
        if not isinstance(calls, list) or len(calls) != 1 or calls[0]["type"] != "function":
            return None
        function = calls[0]["function"]
        name, arguments = function["name"], json.loads(function["arguments"])
        if name not in TOOLS or not isinstance(arguments, dict):
            return None
        if name in enums:
            key, allowed = enums[name]
            return (name, arguments[key]) if set(arguments) == {key} and arguments[key] in allowed else None
        return (name, None) if not arguments else None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        return None
