import csv
import re
from django.core.management.base import BaseCommand
from clinical.models import SnomedEntity  # Update 'your_app_name'
from clinical.constants import SnomedEntityType


class Command(BaseCommand):
    help = "Loads SNOMED CT concepts from a pipe-delimited text file into the database."

    def add_arguments(self, parser):
        # This allows us to pass the file path in the terminal
        parser.add_argument(
            "file_path", type=str, help="Path to the SNOMED-CT-list.txt file"
        )

    def get_entity_type(self, fsn):
        """
        Helper function to extract the semantic tag from the FSN.
        Example: 'Hypertensive disorder (disorder)' -> returns 'finding'
        """
        # Regex to find the text inside the last set of parentheses
        match = re.search(r"\(([^)]+)\)$", fsn.strip())
        if match:
            tag = match.group(1).lower()
            if tag in ["disorder", "finding", "symptom"]:
                return SnomedEntityType.FINDING.value
            elif tag == "procedure":
                return SnomedEntityType.PROCEDURE.value
            elif tag in ["body structure", "morphologic abnormality"]:
                return SnomedEntityType.BODY_STRUCTURE.value

        # Default fallback
        return SnomedEntityType.OTHER.value

    def handle(self, *args, **kwargs):
        file_path = kwargs["file_path"]
        self.stdout.write(self.style.WARNING(f"Starting ingestion from {file_path}..."))

        entities_to_create = []

        try:
            with open(file_path, mode="r", encoding="utf-8") as file:
                # Use the csv reader with a pipe delimiter
                reader = csv.DictReader(file, delimiter="|")

                for row in reader:
                    # Extract the necessary fields based on the header names
                    cid = row.get("SNOMED_CID", "").strip()
                    fsn = row.get("SNOMED_FSN", "").strip()
                    cui = row.get("UMLS_CUI", "").strip()

                    # Skip empty rows or rows without a CID
                    if not cid:
                        continue

                    # Determine the entity type from the FSN
                    entity_type = self.get_entity_type(fsn)

                    # Create the model instance in memory (NOT saved to DB yet)
                    entity = SnomedEntity(
                        snomed_cid=cid,
                        fsn=fsn,
                        umls_cui=cui if cui != "NULL" else None,
                        entity_type=entity_type,
                    )
                    entities_to_create.append(entity)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Parsed {len(entities_to_create)} rows. Writing to database..."
                )
            )

            # Bulk create pushes all instances to the database in batches, making it blazing fast.
            # ignore_conflicts=True ensures that if you run the script twice, it won't crash on duplicate CIDs.
            SnomedEntity.objects.bulk_create(
                entities_to_create, batch_size=1000, ignore_conflicts=True
            )

            self.stdout.write(
                self.style.SUCCESS("Successfully loaded SNOMED entities!")
            )

        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An error occurred: {str(e)}"))
