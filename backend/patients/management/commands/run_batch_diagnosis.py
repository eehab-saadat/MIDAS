"""
Django management command: run_batch_diagnosis
==============================================

Runs model inference (via local Ollama or a hosted endpoint) for every
patient currently in the database and writes results to a CSV file.

Usage Guide:
-----------------
    python manage.py run_batch_diagnosis
    python manage.py run_batch_diagnosis --output results/my_run.csv
    python manage.py run_batch_diagnosis --mrno 1 5 12   # subset of patients
    python manage.py run_batch_diagnosis --limit 10      # first N patients

Output CSV columns
------------------
    mrno | diagnosis | reasoning | next_steps | error

The ``error`` column is populated (and the other clinical columns left blank)
when inference fails for a particular patient.
"""

import csv
import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path

import requests
from django.core.management.base import BaseCommand, CommandError

from patients.models import Patient
from patients.utils import get_complete_patient_details

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Inference constants
# ---------------------------------------------------------------------------

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "amsaravi/medgemma-4b-it:q6"

# TODO: set the hosted endpoint URL once the hosted model is available
HOSTED_ENDPOINT: str | None = os.getenv("HOSTED_ENDPOINT")

SYSTEM_PROMPT = (
    "You are an expert medical AI assistant. "
    "Analyze the provided case details to produce a structured clinical assessment. "
    "Format your response EXACTLY as a JSON object wrapped in triple backticks:\n\n"
    "```\n"
    '{"diagnosis": "<primary diagnosis>", '
    '"reasoning": "<evidence-based reasoning>", '
    '"next_steps": "<recommended investigations or management steps>"}\n'
    "```\n\n"
    "Be precise and evidence-based. Return ONLY the JSON object wrapped in triple backticks."
)

CSV_FIELDNAMES = ["mrno", "diagnosis", "reasoning", "next_steps", "error"]

DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parents[5] / "data" / "outputs" / "batch_diagnosis"


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------


def _call_ollama(patient_data_json: str) -> dict:
    """
    Send a single patient's data to the local Ollama instance and return
    the parsed JSON dict with keys: diagnosis, reasoning, next_steps.

    Returns a dict with an ``error`` key on failure.
    """
    message = {
        "role": "user",
        "content": SYSTEM_PROMPT + f"\n\nPatient data:\n{patient_data_json}",
    }
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [message],
        "stream": False,
        "options": {"temperature": 0},
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload, timeout=800)
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot connect to Ollama on localhost:11434"}
    except requests.exceptions.Timeout:
        return {"error": "Ollama request timed out"}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Unexpected request error: {exc}"}

    if response.status_code != 200:
        return {"error": f"Ollama returned HTTP {response.status_code}: {response.text[:200]}"}

    return _parse_model_response(response.json())


def _call_hosted(patient_data_json: str) -> dict:
    """
    TODO: implement hosted model call logic.

    Should POST patient_data_json to HOSTED_ENDPOINT and return a parsed
    dict with keys: diagnosis, reasoning, next_steps (or an ``error`` key).
    """
    raise NotImplementedError("Hosted endpoint inference is not yet implemented.")


def _parse_model_response(raw: dict) -> dict:
    """
    Extract and parse the JSON payload from the model's text response.

    Accepts both markdown-fenced JSON (```...```) and bare JSON objects.
    Returns a dict with keys diagnosis / reasoning / next_steps, or an
    ``error`` key when parsing fails.
    """
    response_text: str = raw.get("message", {}).get("content", "").strip()

    if not response_text:
        return {"error": "Model returned an empty response"}

    # 1. Try to extract from triple-backtick block
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL)
    if fenced:
        json_str = fenced.group(1)
    else:
        # 2. Fallback: find a bare JSON object containing the expected keys
        bare = re.search(r'\{[^{}]*"diagnosis"[^{}]*"reasoning"[^{}]*\}', response_text, re.DOTALL)
        json_str = bare.group(0) if bare else response_text

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as exc:
        return {"error": f"JSON decode error: {exc} — raw: {response_text[:200]}"}

    required = {"diagnosis", "reasoning", "next_steps"}
    missing = required - parsed.keys()
    if missing:
        # Tolerate a missing next_steps (older prompt style) — just leave it blank
        for key in missing:
            parsed[key] = ""
        if "diagnosis" not in parsed or "reasoning" not in parsed:
            return {"error": f"Response missing required fields: {missing}"}

    return parsed


def _run_inference(patient_data: dict) -> dict:
    """
    Route inference to the hosted endpoint if available, otherwise fall
    back to the local Ollama instance.

    Returns a dict with keys diagnosis / reasoning / next_steps, or an
    ``error`` key on failure.
    """
    patient_data_json = json.dumps(patient_data)

    if HOSTED_ENDPOINT:
        # TODO: remove the fallback once the hosted endpoint is stable
        try:
            return _call_hosted(patient_data_json)
        except NotImplementedError:
            logger.warning("Hosted endpoint not implemented — falling back to Ollama")

    return _call_ollama(patient_data_json)


# ---------------------------------------------------------------------------
# Management command
# ---------------------------------------------------------------------------


class Command(BaseCommand):
    help = (
        "Run batch model inference for all (or selected) patients and write "
        "diagnoses to a CSV file for performance evaluation."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help=(
                "Path for the output CSV file. "
                "Defaults to data/batch_diagnosis/diagnosis_<timestamp>.csv "
                "relative to the repo root."
            ),
        )
        parser.add_argument(
            "--mrno",
            nargs="+",
            type=str,
            default=None,
            metavar="MRNO",
            help="Run inference only for the specified MRNOs (space-separated).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            metavar="N",
            help="Cap the number of patients processed (useful for dry-runs).",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.0,
            metavar="SECONDS",
            help="Pause between consecutive inference calls (default: 0).",
        )

    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        output_path = self._resolve_output_path(options["output"])
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # ── Build patient queryset ──────────────────────────────────────
        qs = Patient.objects.order_by("mrno")

        if options["mrno"]:
            qs = qs.filter(mrno__in=options["mrno"])

        if options["limit"]:
            qs = qs[: options["limit"]]

        total = qs.count()
        if total == 0:
            raise CommandError("No patients match the given criteria.")

        self.stdout.write(f"Patients to process : {total}")
        self.stdout.write(f"Output              : {output_path}\n")

        # ── Run inference and stream to CSV ────────────────────────────
        succeeded = 0
        failed = 0
        start_time = time.monotonic()

        with open(output_path, "w", newline="", encoding="utf-8") as csv_file:
            writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDNAMES)
            writer.writeheader()

            for idx, patient in enumerate(qs, start=1):
                mrno = patient.mrno
                row = {"mrno": mrno, "diagnosis": "", "reasoning": "", "next_steps": "", "error": ""}

                patient_data = get_complete_patient_details(mrno)
                if patient_data is None:
                    row["error"] = "Patient data not found"
                    writer.writerow(row)
                    failed += 1
                    logger.warning("Patient %s: data not found", mrno)
                    continue

                result = _run_inference(patient_data)

                if "error" in result:
                    row["error"] = result["error"]
                    failed += 1
                    logger.error("Patient %s: inference failed — %s", mrno, result["error"])
                else:
                    row["diagnosis"] = result.get("diagnosis", "")
                    row["reasoning"] = result.get("reasoning", "")
                    row["next_steps"] = result.get("next_steps", "")
                    succeeded += 1

                writer.writerow(row)

                # Flush after every row so partial results are not lost on
                # interrupt (large batches may run for hours)
                csv_file.flush()

                if idx % 10 == 0 or idx == total:
                    elapsed = time.monotonic() - start_time
                    self.stdout.write(f"  [{idx}/{total}] elapsed {elapsed:.0f}s")

                if options["delay"] > 0:
                    time.sleep(options["delay"])

        elapsed_total = time.monotonic() - start_time
        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone — {succeeded} succeeded, {failed} failed "
                f"({elapsed_total:.1f}s total)"
            )
        )
        self.stdout.write(f"CSV saved to: {output_path}")

    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_output_path(raw: str | None) -> Path:
        if raw:
            return Path(raw).resolve()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return DEFAULT_OUTPUT_DIR / f"diagnosis_{timestamp}.csv"
