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
    python manage.py run_batch_diagnosis --continue      # resume from last run
    python manage.py run_batch_diagnosis --skip 303 305  # skip problematic patients

Output CSV columns
------------------
    mrno | diagnosis | reasoning | error

The ``error`` column is populated (and the other clinical columns left blank)
when inference fails for a particular patient.

Troubleshooting Hangs:
----------------------
If the script hangs on a specific patient (e.g., patient 303):
    python manage.py run_batch_diagnosis --continue --skip 303
    
The --skip option allows you to skip problematic patients and continue processing.
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
OLLAMA_MODEL = "thiagomoraes/medgemma-4b-it:Q8_0"

# TODO: set the hosted endpoint URL once the hosted model is available
HOSTED_ENDPOINT: str | None = os.getenv("HOSTED_ENDPOINT")

SYSTEM_PROMPT = (
    "You are a concise medical AI assistant. "
    "Analyze the provided case details and provide a brief clinical assessment. "
    "Return your response EXACTLY as a plain JSON object (no markdown, no code fences):\n\n"
    '{"diagnosis": "<primary diagnosis in 1-2 words>", '
    '"reasoning": "<evidence in 1-2 sentences max>"}\n\n'
    "Be extremely concise. Return ONLY the JSON object with no markdown formatting."
)

CSV_FIELDNAMES = ["mrno", "diagnosis", "reasoning", "error"]

DEFAULT_OUTPUT_FILE = Path(__file__).resolve(
).parents[5] / "data" / "outputs" / "batch_diagnosis" / "diagnosis.csv"


# ---------------------------------------------------------------------------
# Inference helpers
# ---------------------------------------------------------------------------


def _call_ollama(patient_data_json: str) -> dict:
    """
    Send a single patient's data to the local Ollama instance and return
    the parsed JSON dict with keys: diagnosis, reasoning.

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
        # Use separate connect and read timeouts: 10s to connect, 120s to read response
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=(10, 120),
            # Add retries for transient failures
        )
    except requests.exceptions.ConnectionError:
        return {"error": "Cannot connect to Ollama on localhost:11434"}
    except requests.exceptions.Timeout as exc:
        return {"error": f"Ollama request timed out ({type(exc).__name__})"}
    except requests.exceptions.RequestException as exc:
        return {"error": f"Request error: {exc}"}
    except Exception as exc:  # noqa: BLE001
        return {"error": f"Unexpected error: {exc}"}

    if response.status_code != 200:
        return {"error": f"Ollama returned HTTP {response.status_code}: {response.text[:200]}"}

    return _parse_model_response(response.json())


def _call_hosted(patient_data_json: str) -> dict:
    """
    TODO: implement hosted model call logic.

    Should POST patient_data_json to HOSTED_ENDPOINT and return a parsed
    dict with keys: diagnosis, reasoning (or an ``error`` key).
    """
    raise NotImplementedError(
        "Hosted endpoint inference is not yet implemented.")


def _parse_model_response(raw: dict) -> dict:
    """
    Extract and parse the JSON payload from the model's text response.

    Accepts both markdown-fenced JSON (```...```) and bare JSON objects.
    Returns a dict with keys diagnosis / reasoning, or an
    ``error`` key when parsing fails.
    """
    response_text: str = raw.get("message", {}).get("content", "").strip()

    if not response_text:
        return {"error": "Model returned an empty response"}

    # 1. Try to extract from triple-backtick block
    fenced = re.search(
        r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL)
    if fenced:
        json_str = fenced.group(1)
    else:
        # 2. Fallback: find a bare JSON object containing the expected keys
        bare = re.search(
            r'\{[^{}]*"diagnosis"[^{}]*"reasoning"[^{}]*\}', response_text, re.DOTALL)
        json_str = bare.group(0) if bare else response_text

    try:
        parsed = json.loads(json_str)
    except json.JSONDecodeError as exc:
        return {"error": f"JSON decode error: {exc} — raw: {response_text[:200]}"}

    required = {"diagnosis", "reasoning"}
    missing = required - parsed.keys()
    if missing:
        return {"error": f"Response missing required fields: {missing}"}

    return parsed


def _run_inference(patient_data: dict) -> dict:
    """
    Route inference to the hosted endpoint if available, otherwise fall
    back to the local Ollama instance.

    Returns a dict with keys diagnosis / reasoning, or an
    ``error`` key on failure.
    """
    patient_data_json = json.dumps(patient_data)

    if HOSTED_ENDPOINT:
        # TODO: remove the fallback once the hosted endpoint is stable
        try:
            return _call_hosted(patient_data_json)
        except NotImplementedError:
            logger.warning(
                "Hosted endpoint not implemented — falling back to Ollama")

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
                "Defaults to data/outputs/batch_diagnosis/diagnosis.csv"
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
            "--skip",
            nargs="+",
            type=str,
            default=None,
            metavar="MRNO",
            help="Skip the specified MRNOs (space-separated, useful for problematic patients).",
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
        parser.add_argument(
            "--continue",
            action="store_true",
            dest="continue_from_last",
            help="Continue from where the last run left off (skip processed patients).",
        )

    # ------------------------------------------------------------------

    def handle(self, *args, **options):
        output_path = self._resolve_output_path(options["output"])
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # ── Load processed patients if continuing ──────────────────────────
        processed_mrnos = set()
        if options["continue_from_last"] and output_path.exists():
            try:
                with open(output_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    processed_mrnos = {row["mrno"]
                                       for row in reader if row["mrno"]}
                self.stdout.write(
                    f"Continuing from last run. Skipping {len(processed_mrnos)} processed patients.\n")
            except Exception as exc:
                self.stdout.write(self.style.WARNING(
                    f"Could not read existing file: {exc}\n"))

        # ── Build patient queryset ──────────────────────────────────────
        qs = Patient.objects.order_by("mrno")

        if options["mrno"]:
            qs = qs.filter(mrno__in=options["mrno"])

        # Skip already processed patients
        if processed_mrnos:
            qs = qs.exclude(mrno__in=processed_mrnos)

        # Skip problematic patients
        skip_mrnos = set(options.get("skip") or [])
        if skip_mrnos:
            qs = qs.exclude(mrno__in=skip_mrnos)
            self.stdout.write(
                f"Skipping {len(skip_mrnos)} problematic patients: {', '.join(skip_mrnos)}\n")

        if options["limit"]:
            qs = qs[: options["limit"]]

        total = qs.count()
        if total == 0:
            if processed_mrnos:
                self.stdout.write(self.style.SUCCESS(
                    "All patients already processed!"))
            else:
                raise CommandError("No patients match the given criteria.")
            return

        self.stdout.write(f"Patients to process : {total}")
        self.stdout.write(f"Output              : {output_path}\n")

        # ── Run inference and stream to CSV ────────────────────────────
        succeeded = 0
        failed = 0
        start_time = time.monotonic()

        # Determine if we're appending or creating new file
        file_mode = "a" if (
            options["continue_from_last"] and output_path.exists()) else "w"

        try:
            with open(output_path, file_mode, newline="", encoding="utf-8") as csv_file:
                writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDNAMES)
                # Only write header if creating new file
                if file_mode == "w":
                    writer.writeheader()

                for idx, patient in enumerate(qs, start=1):
                    mrno = patient.mrno
                    row = {"mrno": mrno, "diagnosis": "",
                           "reasoning": "", "error": ""}

                    self.stdout.write(
                        f"[{idx}/{total}] Processing patient {mrno}...", ending=" ")
                    self.stdout.flush()

                    patient_data = get_complete_patient_details(mrno)
                    if patient_data is None:
                        row["error"] = "Patient data not found"
                        writer.writerow(row)
                        failed += 1
                        logger.warning("Patient %s: data not found", mrno)
                        self.stdout.write(self.style.WARNING(
                            "ERROR: data not found"))
                        continue

                    result = _run_inference(patient_data)

                    if "error" in result:
                        row["error"] = result["error"]
                        failed += 1
                        logger.error("Patient %s: inference failed — %s",
                                     mrno, result["error"])
                        self.stdout.write(self.style.ERROR(
                            f"ERROR: {result['error']}"))
                    else:
                        row["diagnosis"] = result.get("diagnosis", "")
                        row["reasoning"] = result.get("reasoning", "")
                        succeeded += 1
                        self.stdout.write(self.style.SUCCESS("OK"))

                    writer.writerow(row)

                    # Flush after every row so partial results are not lost on
                    # interrupt (large batches may run for hours)
                    csv_file.flush()

                    if idx % 10 == 0 or idx == total:
                        elapsed = time.monotonic() - start_time
                        rate = idx / elapsed if elapsed > 0 else 0
                        self.stdout.write(
                            f"  [{idx}/{total}] elapsed {elapsed:.0f}s, "
                            f"rate {rate:.2f} patients/sec\n")

                    if options["delay"] > 0:
                        time.sleep(options["delay"])

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("\n\nInterrupted by user."))
            elapsed_total = time.monotonic() - start_time
            self.stdout.write(
                self.style.SUCCESS(
                    f"Progress — {succeeded} succeeded, {failed} failed "
                    f"({elapsed_total:.1f}s elapsed)"
                )
            )
            self.stdout.write(f"CSV saved to: {output_path}")
            self.stdout.write("\nTo resume processing, run:")
            self.stdout.write(
                f"  python manage.py run_batch_diagnosis --continue --output {output_path}\n")
            return

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
        return DEFAULT_OUTPUT_FILE
