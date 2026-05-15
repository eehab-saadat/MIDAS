"""Core diagnosis logic: prompt construction, Ollama call, response parsing.

Changes from original
---------------------
*   `generate_diagnosis` now calls `rag.retrieve_similar_cases` to fetch the
    2 most similar seed cases before building the prompt.
*   `_build_fewshot_block` formats those cases as labelled examples.
*   The system prompt now explicitly instructs the model to learn from the
    provided examples and mirror their output format.
*   All other behaviour (Ollama endpoint, response parsing, error handling)
    is unchanged so existing callers need no modification.
"""

import json
import logging
import os
import re

import requests
from dotenv import load_dotenv

from .rag import _patient_to_text, retrieve_similar_cases

# Load environment variables from .env file
load_dotenv()

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Ollama configuration
# ---------------------------------------------------------------------------

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "amsaravi/medgemma-4b-it:q6")

# ---------------------------------------------------------------------------
# Prompt templates
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are an expert medical AI assistant. "
    "Below you will find two real-world similar cases with their confirmed "
    "diagnoses, followed by a new patient case for you to analyse.\n\n"
    "Use the example cases as a reference for reasoning style and output "
    "format, but base your diagnosis solely on the evidence in the new case.\n\n"
    "Format your response EXACTLY as follows, wrapped in triple backticks:\n\n"
    "```\n"
    '{"diagnosis": "<diagnosis>", "reasoning": "<detailed reasoning>"}\n'
    "```\n\n"
    "Be precise, evidence-based, and explain your reasoning clearly. "
    "Return ONLY the JSON object wrapped in triple backticks."
)

_EXAMPLE_TEMPLATE = """\
--- Similar Case {n} (reference only — do NOT copy the diagnosis blindly) ---
Patient Summary:
{summary}

Confirmed Output:
```
{output_json}
```"""

_QUERY_TEMPLATE = """\
--- New Patient (provide your diagnosis for this case) ---
{summary}

Patient Record (full JSON):
{patient_json}"""


# ---------------------------------------------------------------------------
# Few-shot block builder
# ---------------------------------------------------------------------------

def _build_fewshot_block(examples: list[dict]) -> str:
    """
    Render *examples* (from the RAG store) into a labelled few-shot block.

    Each example contributes:
    - a condensed patient summary (same encoder as the vector store)
    - the confirmed diagnosis + reasoning JSON
    """
    blocks: list[str] = []
    for n, ex in enumerate(examples, start=1):
        summary = ex.get("text") or _patient_to_text(ex["patient_data"])
        output = json.dumps(
            {"diagnosis": ex["diagnosis"], "reasoning": ex["reasoning"]},
            ensure_ascii=False,
        )
        blocks.append(
            _EXAMPLE_TEMPLATE.format(n=n, summary=summary, output_json=output)
        )
    return "\n\n".join(blocks)


# ---------------------------------------------------------------------------
# Response parser (unchanged from original)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_diagnosis(
    patient_data: dict,
    *,
    seed_path: str = r"E:\FYP\MIDAS\data\Output\seed.csv",
    num_examples: int = 2,
) -> dict:
    """
    Send *patient_data* to MedGemma via Ollama and return a parsed diagnosis.

    RAG pipeline
    ------------
    1.  ``retrieve_similar_cases`` queries the vector store and returns the
        *num_examples* most similar seed cases.
    2.  Those cases are rendered into a few-shot block prepended to the prompt.
    3.  The full patient JSON is appended as the query case.

    Parameters
    ----------
    patient_data : dict
        The incoming patient record (P001-style JSON).
    seed_path : str
        Path to seed.csv.  The vector store is a singleton and is only
        built once per process lifetime.
    num_examples : int
        Number of retrieved examples to include in the prompt (default 2).

    Returns
    -------
    dict
        ``{"diagnosis": "...", "reasoning": "..."}``

    Raises
    ------
    requests.HTTPError
        On a non-2xx response from Ollama.
    ValueError
        When the model output cannot be parsed.
    """
    # ── Step 1: RAG retrieval ─────────────────────────────────────────────
    try:
        examples = retrieve_similar_cases(
            patient_data,
            k=num_examples,
            seed_path=seed_path,
        )
        log.info(
            "RAG retrieved %d example(s): %s",
            len(examples),
            [f"mrno={e['mrno']} dx={e['diagnosis']!r}" for e in examples],
        )
    except Exception as exc:  # never let RAG failure block diagnosis
        log.warning("RAG retrieval failed (%s); proceeding without examples.", exc)
        examples = []

    # ── Step 2: Build prompt ──────────────────────────────────────────────
    parts: list[str] = [SYSTEM_PROMPT]

    if examples:
        parts.append("\n\n=== SIMILAR CASES FOR REFERENCE ===\n")
        parts.append(_build_fewshot_block(examples))

    parts.append("\n\n=== QUERY CASE ===\n")

    if patient_data and any(patient_data.values()):
        query_summary = _patient_to_text(patient_data)
        parts.append(
            _QUERY_TEMPLATE.format(
                summary=query_summary,
                patient_json=json.dumps(patient_data, ensure_ascii=False, indent=2),
            )
        )
    else:
        parts.append(
            "Note: Limited patient data available. "
            "Please provide a general assessment based on the examples above."
        )

    content = "".join(parts)

    # ── Step 3: Ollama call ───────────────────────────────────────────────
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [{"role": "user", "content": content}],
        "stream": False,
        "options": {"temperature": 0},
    }

    resp = requests.post(OLLAMA_URL, json=payload, timeout=(10, 600))
    resp.raise_for_status()
    return _parse_response(resp.json())
