import json
import os
from unittest.mock import patch

import httpx
from hypothesis import given
from hypothesis import strategies as st

from services.agents import kin


@given(st.integers())
def test_model_numbers_never_become_tool_data(number):
    def choose(arguments):
        def respond(request):
            assert request.url.host == "127.0.0.1"
            return httpx.Response(200, json={"choices": [{"message": {
                "content": f"The risk is {number}%.",
                "tool_calls": [{"type": "function", "function": {
                    "name": "glossary", "arguments": json.dumps(arguments),
                }}],
            }}]})

        client = httpx.Client(transport=httpx.MockTransport(respond))
        with patch.object(kin.httpx, "Client", return_value=client), patch.dict(os.environ, {
            "KIN_LLM_MODEL": "local-test", "KIN_LLM_API_KEY": "local-fixture",
            "KIN_LLM_URL": "http://127.0.0.1:11434/v1/chat/completions",
        }):
            return kin.choose([], "What is a carrier?", ("carrier",))

    assert choose({"term": "carrier"}) == ("glossary", "carrier")
    assert choose({"term": "carrier", "chance": number}) is None
    assert choose({"term": number}) is None
