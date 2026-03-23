import time, os, json, csv
from django.core.management.base import BaseCommand
from patients.models import Patient
from clinical.models import Encounter
import google.generativeai as genai
from google.generativeai import GenerationConfig

# TODO: configure API in env file


class Command(BaseCommand):
    help = "Generate GT for all patients"


def handle(self, *args, **kwargs):
    # Initialize the model (using Gemini 1.5 Pro for best reasoning)
    model = genai.GenerativeModel("gemini-1.5-pro")

    output_file = "ground_truth.csv"
    patients = Patient.objects.all()

    with open(output_file, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["mrno", "gt_diagnosis", "gt_icd_codes"])

        for patient in patients:
            # Get the most recent encounter for the patient
            latest_encounter = (
                Encounter.objects.filter(clinician__mrno=patient)
                .order_by("-date")
                .first()
            )

            notes = (
                latest_encounter.notes
                if latest_encounter
                else "No encounter notes available."
            )
            history = patient.history if patient.history else "No history available."
            # Assuming SDOH is part of the history field, adjust if it's a separate field.

            prompt = f"""
                You are an expert medical diagnostician. Based on the following patient history and recent encounter notes, provide a concise diagnosis and a list of up to 10 likely ICD-10 codes.
                
                Patient History (including SDOH): {history}
                Recent Encounter Notes: {notes}
                
                Return the response STRICTLY as a JSON object in the following format, with no markdown formatting or extra text:
                {{
                    "gt_diagnosis": "short string explaining the problem",
                    "ICD_codes": ["A0101", "A0109"]
                }}
                """

            try:
                # Force JSON output for reliable parsing
                response = model.generate_content(
                    prompt,
                    generation_config=GenerationConfig(
                        response_mime_type="application/json"
                    ),
                )

                data = json.loads(response.text)
                gt_diagnosis = data.get("gt_diagnosis", "")
                gt_icd_codes = json.dumps(
                    data.get("ICD_codes", [])
                )  # Save list as a JSON string in CSV

                writer.writerow([patient.mrno, gt_diagnosis, gt_icd_codes])
                self.stdout.write(
                    self.style.SUCCESS(f"Successfully processed mrno: {patient.mrno}")
                )

                # Optional: small sleep to respect API rate limits
                time.sleep(1)

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Error processing mrno {patient.mrno}: {e}")
                )

    self.stdout.write(self.style.SUCCESS(f"Ground truth saved to {output_file}"))
