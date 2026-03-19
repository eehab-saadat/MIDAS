import time
import requests
import os
import json
from django.core.management.base import BaseCommand
from clinical.models import SnomedEntity, BodyPart  # Update your_app_name


class Command(BaseCommand):
    help = "Fetches finding sites from Snowstorm API and maps them to BodyParts."

    # 1. Define the Body Parts and their mapping keywords
    MAPPING_RULES = {
        "Head & Face": [
            "head",
            "face",
            "scalp",
            "skull",
            "brain",
            "cranial",
            "cerebral",
            "maxillofacial",
        ],
        "Eyes": ["eye", "retina", "optic", "ocular", "cornea"],
        "Ears, Nose & Throat (ENT)": [
            "ear",
            "nose",
            "nasal",
            "mouth",
            "throat",
            "pharynx",
            "larynx",
            "tongue",
            "sinus",
            "oral",
        ],
        "Neck": ["neck", "cervical", "thyroid", "carotid"],
        "Chest / Thorax": [
            "chest",
            "thorax",
            "thoracic",
            "heart",
            "lung",
            "cardiac",
            "cardiovascular",
            "myocardium",
            "rib",
            "breast",
            "pulmonary",
            "respiratory",
        ],
        "Abdomen": [
            "abdomen",
            "abdominal",
            "stomach",
            "gastric",
            "liver",
            "hepatic",
            "pancreas",
            "intestine",
            "bowel",
            "colon",
            "gastrointestinal",
        ],
        "Pelvis & Groin": [
            "pelvis",
            "pelvic",
            "groin",
            "genital",
            "reproductive",
            "bladder",
            "urinary",
            "renal",
            "kidney",
            "prostate",
            "ovary",
        ],
        "Back & Spine": ["back", "spine", "spinal", "vertebra", "lumbar"],
        "Shoulders & Arms": [
            "shoulder",
            "arm",
            "upper extremity",
            "elbow",
            "forearm",
            "bicep",
        ],
        "Hands & Wrists": ["hand", "wrist", "finger", "thumb", "carpal"],
        "Legs & Thighs": ["leg", "thigh", "lower extremity", "knee", "calf", "femur"],
        "Feet & Ankles": ["foot", "feet", "ankle", "toe", "plantar"],
        "Skin / Systemic": [
            "skin",
            "systemic",
            "blood",
            "immune",
            "whole body",
            "arterial",
            "vascular",
            "lymphatic",
        ],
    }

    def add_arguments(self, parser):
        # Add an optional argument to process ALL records instead of just unmapped ones
        parser.add_argument(
            "--all",
            action="store_true",
            help="Process ALL SNOMED entities, even if they already have mapped body parts. Useful for re-evaluating after updating MAPPING_RULES.",
        )
        # Add a test mode that only processes first 3 entries and outputs to terminal
        parser.add_argument(
            "--test",
            action="store_true",
            help="Test mode: only processes first 3 entries and outputs to terminal instead of database.",
        )

    def handle(self, *args, **kwargs):
        process_all = kwargs["all"]
        test_mode = kwargs["test"]

        if not test_mode:
            self.stdout.write("Initializing Body Parts...")
            self.init_body_parts()

        self.stdout.write("Starting API mapping process...")
        # self.map_symptoms_via_api(process_all, test_mode)

    def init_body_parts(self):
        """Creates the constant Body Parts in the DB if they don't exist."""
        for key, val in self.MAPPING_RULES.items():
            # key == name of the body part and list value in string form == its description
            BodyPart.objects.get_or_create(name=key, description=", ".join(val))
        self.stdout.write(self.style.SUCCESS("Body parts initialized."))

    def get_body_parts_for_term(self, finding_site_term):
        """Matches a SNOMED finding site string to our BodyParts based on keywords."""
        matched_parts = set()
        term_lower = finding_site_term.lower()

        for part_name, keywords in self.MAPPING_RULES.items():
            if any(keyword in term_lower for keyword in keywords):
                matched_parts.add(part_name)

        return list(matched_parts)

    def map_symptoms_via_api(self, process_all, test_mode=False):

        if test_mode:
            # Option C: Run in test mode only for findings with no mapped body parts
            entities_to_process = SnomedEntity.objects.filter(body_parts__isnull=True)[
                :3
            ]
            self.stdout.write(
                self.style.WARNING("TEST MODE: Processing only unmapped findings.")
            )
        elif process_all:
            # Option B: Run for ALL findings
            entities_to_process = SnomedEntity.objects.all()
            self.stdout.write(
                self.style.WARNING("Running in --all mode. Processing ALL findings.")
            )
        else:
            # Option A: Run ONLY for findings with no mapped body parts
            entities_to_process = SnomedEntity.objects.filter(body_parts__isnull=True)
            self.stdout.write(self.style.WARNING("Processing ONLY unmapped findings."))

        total = entities_to_process.count()

        # In test mode, limit to first 3 entries
        self.stdout.write(f"Found {total} symptoms to process.")

        if total == 0:
            return

        session = requests.Session()
        session.headers.update({"User-Agent": "DjangoClinicalBackend/1.0"})

        for index, entity in enumerate(entities_to_process, 1):
            url = f"https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/concepts/{entity.snomed_cid}"

            try:
                # Keep track of terms that don't match our rules for this specific entity
                unmatched_terms: set[str] = set()
                finding_sites: list[str] = []
                response = session.get(url, timeout=10)
                if response.status_code == 200:
                    # mention got response on terminal
                    self.stdout.write(f"Got response 200 for {entity.snomed_cid}")
                    data = response.json()
                    self.stdout.write(
                        f"Data type: {type(data)} - content {str(data)[:25]}"
                    )

                    # Extract active finding sites (typeId: 363698007)
                    for rel in data.get("relationships", []):
                        if rel.get("typeId") == "363698007" and rel.get("active"):
                            target_term = (
                                rel.get("target", {}).get("pt", {}).get("term", "")
                            )
                            if target_term:
                                finding_sites.append(target_term)

                    # Determine matched body parts
                    body_part_names_to_add = set()
                    for site in finding_sites:
                        matched = self.get_body_parts_for_term(site)
                        if matched and len(matched) > 0:
                            body_part_names_to_add.update(matched)

                    if test_mode:
                        # In test mode, just output to terminal
                        self.stdout.write(f"\n--- Entity {index}/{total} ---")
                        self.stdout.write(f"SNOMED CID: {entity.snomed_cid}")
                        self.stdout.write(f"Term: {entity.term}")
                        self.stdout.write(f"Finding Sites: {finding_sites}")
                        self.stdout.write(
                            f"Matched Body Parts: {list(body_part_names_to_add)}"
                        )
                        if not body_part_names_to_add and finding_sites:
                            self.stdout.write(
                                self.style.WARNING(f"Unmatched terms: {finding_sites}")
                            )
                    else:
                        # Normal mode: write to database
                        if body_part_names_to_add:
                            parts_to_add = BodyPart.objects.filter(
                                name__in=body_part_names_to_add
                            )
                            # .add() automatically prevents duplicates in a ManyToMany field
                            entity.body_parts.add(*parts_to_add)
                        else:
                            # If no match is found for this specific snomed entity then add all finding sites to unmatched terms
                            unmatched_terms.update(finding_sites)

                        # Save unmatched terms after each entity to prevent data loss on failure
                        if unmatched_terms:
                            self.save_unmatched_terms(unmatched_terms)

                    if index % 50 == 0:
                        self.stdout.write(f"Processed {index}/{total}...")

                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"API Error {response.status_code} for CID {entity.snomed_cid}"
                        )
                    )

                # Be polite to the API
                time.sleep(0.1)

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Exception on {entity.snomed_cid}: {e}")
                )
                time.sleep(1)  # Back off on error

        if test_mode:
            self.stdout.write(
                self.style.SUCCESS("\nTest complete! No database changes were made.")
            )
        else:
            self.stdout.write(self.style.SUCCESS("Mapping complete!"))

    def save_unmatched_terms(self, unmatched_terms):
        """Appends unmatched terms to a text file for review."""

        file_name = "unmatched_body_part_terms.txt"

        # Read existing terms to prevent duplicates in the file across multiple runs
        existing_terms = set()
        if os.path.exists(file_name):
            with open(file_name, "r", encoding="utf-8") as f:
                existing_terms = set(line.strip() for line in f)

        # Filter out terms we already know about
        new_unmatched = unmatched_terms - existing_terms

        if new_unmatched:
            with open(file_name, "a", encoding="utf-8") as f:
                for term in sorted(new_unmatched):
                    f.write(f"{term}\n")

            self.stdout.write(
                self.style.WARNING(
                    f"Saved {len(new_unmatched)} new unmatched terms to {file_name}"
                )
            )
