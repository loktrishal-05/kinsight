"""Copilot guard (P5-4): deterministic, read-only, consent-filtered. User text is untrusted input.

No model is called: intents are matched by rules, answers come only from approved text (the caller's own verified
explanation blocks, the glossary, and the consent summary). Anything about other people, decisions, clinical advice,
bulk data, or attempts to change the rules is refused with a fixed message.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

REFUSALS = {
    "en": "I can only help with your own result. I cannot share other people's information, give medical advice, "
          "or tell you what to decide. A genetic counsellor can talk this through with you.",
    "ar": "أستطيع المساعدة في نتيجتك أنت فقط. لا أستطيع مشاركة معلومات الآخرين أو تقديم نصيحة طبية أو إخبارك بما تقرر. "
          "يمكن لمستشار وراثي مناقشة ذلك معك.",
}
MAX_LEN = 2000
BIDI = {0x200E: None, 0x200F: None}  # direction marks

# (code, patterns). Order matters: injection and bulk checks come first.
RULES: list[tuple[str, re.Pattern]] = [(c, re.compile(p, re.IGNORECASE)) for c, p in [
    ("injection", r"ignore (all |any |the )?(previous|prior|above|your)|system prompt|developer mode|jailbreak|"
                  r"you are now|act as|pretend|reveal (your|the) (instructions|prompt|rules)|override|disregard|"
                  r"<\s*/?\s*(system|tool)|\[\s*tool\s*\]|call get_|تجاهل|تعليمات النظام|تصرف ك"),
    ("bulk", r"\b(export|download|dump|everyone|all (users|people|patients|results|data)|list of|database|csv|json)\b|"
             r"كل (المستخدمين|الأشخاص|النتائج|البيانات)|تصدير|قاعدة البيانات"),
    ("other_person", r"\b(partner|husband|wife|fianc[a-z]*|spouse|brother|sister|mother|father|mom|dad|cousin|uncle|aunt|"
                     r"relative|neighbou?r|friend|him|his|her|hers|their|other person|someone else|who else|anyone else|another couple|other couple|other people|my (son|daughter|child))\b|"
                     r"شريك|زوجي|زوجتي|خطيب|أخي|أختي|أمي|أبي|ابن عمي|قريب|جار|صديق|شخص آخر"),
    ("decision", r"\b(should (i|we)|must (i|we)|decide|yes or no|marry\w*|marriage|wedding|divorce|break up|cancel|have (a )?(baby|babies|"
                r"children|kids)|get pregnant|abort|terminate|advise|recommend|what would you do|is it safe to|"
                r"is it ok(ay)? to|go ahead)\b|هل (أتزوج|نتزوج|ننجب|نلغي)|تزوج|زواج|طلاق|أنصحني|توصي|إجهاض"),
    ("clinical", r"\b(diagnos|treat(ment)?|cure|medic(ine|ation)|drug|dose|symptom|therapy|surgery|prescri)\w*|"
                 r"تشخيص|علاج|دواء|أعراض|جرعة"),
]]
ALLOWED = {
    "explain_result": r"\b(my result|what does (it|this) mean|explain|meaning|understand|carrier|what was found)\b|نتيجتي|ماذا تعني|اشرح|حامل",
    "consents": r"\b(consent|share|sharing|revoke|who can see|access)\b|موافقة|مشاركة|من يستطيع",
    "term": r"\b(what is|what does .* mean|define)\b|ما هو|ما معنى",
}


@dataclass
class Answer:
    text: str
    refused: bool
    code: str  # reason or intent, for the audit event (never the user's text)
    sources: list[str]


def _norm(text: str) -> str:
    return unicodedata.normalize("NFKC", text)[:MAX_LEN].translate(BIDI)


def answer(text: str, lang: str, own_blocks: list[str], glossary: dict, consents: list[str]) -> Answer:
    """own_blocks and consents come from the caller's consent-filtered reads; nothing else is reachable here."""
    t = _norm(text)
    for code, pat in RULES:
        if pat.search(t):
            return Answer(REFUSALS.get(lang, REFUSALS["en"]), True, code, [])
    low = t.lower()
    for term, tr in glossary.items():
        if term != "status" and isinstance(tr, dict) and tr.get("en", "").lower() in low and re.search(ALLOWED["term"], low, re.IGNORECASE):
            return Answer(tr[lang], False, "term", [f"glossary:{term}"])
    if re.search(ALLOWED["consents"], t, re.IGNORECASE):
        return Answer(" ".join(consents) or ("You are not sharing anything." if lang == "en" else "أنت لا تشارك أي شيء."),
                      False, "consents", ["consents"])
    if re.search(ALLOWED["explain_result"], t, re.IGNORECASE) and own_blocks:
        return Answer(" ".join(own_blocks), False, "explain_result", ["explanation"])
    msg = ("I can explain your own result in plain words, explain a term, or show who you share with."
           if lang == "en" else "أستطيع شرح نتيجتك بكلمات بسيطة أو شرح مصطلح أو عرض من تشارك معهم.")
    return Answer(msg, False, "help", [])
