from django.core.management.base import BaseCommand
from patients.models import Patient
from patients.utils import get_complete_patient_details
import csv
import json
from pathlib import Path


class Command(BaseCommand):
    help = "Write all patients data to a CSV file (mrno, patient_details)"

    OUTPUT_FILE_ROOT = Path(__file__).resolve().parent / "../../../../data/Output"

    def add_arguments(self, parser):
        parser.add_argument(
            "--file_name",
            type=str,
            default="all_patients",
            help="Name of output file (without extension)",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit number of patients",
        )

    def handle(self, *args, **kwargs):
        file_name = kwargs["file_name"]
        limit = kwargs["limit"]

        # Ensure output directory exists
        output_dir = self.OUTPUT_FILE_ROOT.resolve()
        output_dir.mkdir(parents=True, exist_ok=True)

        file_path = output_dir / f"{file_name}.csv"

        patients_qs = Patient.objects.order_by("mrno")
        if limit:
            patients_qs = patients_qs[:limit]

        with open(file_path, "w", newline="", encoding="utf-8") as file:
            writer = csv.writer(file)

            # Write header
            writer.writerow(["mrno", "patient_details"])

            for patient in patients_qs:
                patient_data = get_complete_patient_details(patient.mrno)

                if patient_data:
                    writer.writerow(
                        [
                            patient.mrno,
                            json.dumps(
                                patient_data, default=str
                            ),  # serialize dict safely
                        ]
                    )

        self.stdout.write(self.style.SUCCESS(f"Data exported to {file_path}"))
