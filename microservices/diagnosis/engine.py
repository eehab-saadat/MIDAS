"""Core diagnosis logic: prompt construction, Ollama call, response parsing."""

import json
import re

import requests

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "thiagomoraes/medgemma-4b-it:Q8_0"

SYSTEM_PROMPT = (
    "You are an expert medical AI assistant. "
    "Analyze the provided case details and the medical image (if any) "
    "to suggest a probable diagnosis with detailed reasoning. "
    "Format your response EXACTLY as follows, wrapped in triple backticks:\n\n"
    "```\n"
    '{"diagnosis": "<diagnosis>", "reasoning": "<detailed reasoning>"}\n'
    "```\n\n"
    "Be precise, evidence-based, and explain your reasoning clearly. "
    "Return ONLY the JSON object wrapped in triple backticks."
)


def _parse_response(raw: dict) -> dict:
    """Extract ``{diagnosis, reasoning}`` from an Ollama chat response."""
    text: str = raw.get("message", {}).get("content", "").strip()
    if not text:
        raise ValueError("Model returned an empty response")

    # 1. Triple-backtick fenced JSON
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        json_str = match.group(1)
    else:
        # 2. Bare JSON containing the expected keys
        match = re.search(r'\{.*"diagnosis".*"reasoning".*\}', text, re.DOTALL)
        json_str = match.group(0) if match else text

    parsed = json.loads(json_str)
    if "diagnosis" not in parsed or "reasoning" not in parsed:
        raise ValueError("Response missing 'diagnosis' or 'reasoning' field")
    return parsed


def generate_diagnosis(patient_data: dict) -> dict:
    """Send *patient_data* to MedGemma via Ollama and return parsed diagnosis.

    Returns ``{"diagnosis": "...", "reasoning": "..."}``.
    Raises on connection / timeout / parse errors (caller handles).
    """
    content = SYSTEM_PROMPT
    if patient_data and any(patient_data.values()):
        content += (
            "\n\nThe following json depicts relevant information "
            f"about the case: {json.dumps(patient_data)}"
        )
    else:
        content += (
            "\n\nNote: Limited patient data available. "
            "Please provide a general assessment."
        )

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": content}],
        "stream": False,
        "options": {"temperature": 0},
    }

    resp = requests.post(OLLAMA_URL, json=payload, timeout=(10, 600))
    resp.raise_for_status()
    return _parse_response(resp.json())
