# Optional Kin model for the synthetic demo

Kin uses the deterministic assistant by default. Keep `KIN_LLM_MODEL` and
`KIN_LLM_API_KEY` unset and `NEXT_PUBLIC_KIN_LLM=0` for that mode.

To try the optional mode, run a local OpenAI-compatible server with a model that
supports function tools. For example, use the
[Ollama chat completions endpoint](https://docs.ollama.com/api/openai-compatibility).
Keep the server and model in local inference mode. Use fictional questions only.

1. Set `KIN_LLM_MODEL` to the installed local model name and
   `KIN_LLM_API_KEY` to its local key. If the local server ignores
   credentials, use a non-secret local placeholder.
2. Use the endpoint in `configs/llm.yaml` or set `KIN_LLM_URL` to another
   numeric loopback URL in the same network namespace as the API.
3. Run the API with demo auth. Run the web app with
   `NEXT_PUBLIC_MOCK=0`, `NEXT_PUBLIC_KIN_TOOLS=1` and `NEXT_PUBLIC_KIN_LLM=1`.
4. Ask about a glossary term, then ask a follow-up. Open **How I got this**
   under the reply to see the selected tool and its source.

The model receives at most four previous user turns and the current question
after the safety checks. Kin sends no retrieved records, identities, or
previous answers to the model. A model may offer the scenario calculator or
preparation sheet. The person supplies the calculator inputs or explicitly
saves their own question. A malformed or unavailable tool choice falls back
to the existing deterministic answer. Model output never supplies answer text,
risk values, or link destinations.

The added interface text for Indic locales uses the English fallback pending
translation review. The multilingual guard uses the existing language packs.
