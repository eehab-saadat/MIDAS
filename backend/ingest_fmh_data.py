"""
FMH Data Ingestion Script
=========================
Reads the five processed Excel files produced by data/FMH/scripts/main.py and
bulk-loads them into the Django / SQLite database via the ORM.

Expected processed file layout (relative to this script's directory):
    ../data/FMH/files/processed/Patients.xlsx
    ../data/FMH/files/processed/Vital_Signs.xlsx
    ../data/FMH/files/processed/Encounter.xlsx
    ../data/FMH/files/processed/Lab_Results.xlsx
    ../data/FMH/files/processed/Radiology.xlsx

Run from the backend/ directory:
    python ingest_fmh_data.py

Optional flags:
    --flush   Drop all existing rows before ingesting (idempotent re-run).
    --data-dir <path>   Override the default processed-files directory.
"""

import argparse
import os
import sys
from pathlib import Path

import django
import pandas as pd

# ---------------------------------------------------------------------------
# Bootstrap Django
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")
django.setup()

from django.db import transaction  # noqa: E402 – must come after django.setup()

from patients.models import Patient, Vitals  # noqa: E402
from clinical.models import Clinician, Encounter  # noqa: E402
from diagnostics.models import Lab, Radiology  # noqa: E402

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DEFAULT_DATA_DIR = BASE_DIR.parent / "data" / "FMH" / "files" / "processed"

BATCH_SIZE = 500


def _load(path: Path, label: str) -> pd.DataFrame:
    print(f"  Loading {label} from {path} …")
    df = pd.read_excel(path, dtype=str)
    df.columns = [c.strip() for c in df.columns]
    print(f"    → {len(df):,} rows, columns: {list(df.columns)}")
    return df


def _str(val) -> str:
    """Return a clean string, or '' for NaN/None."""
    if pd.isna(val):
        return ""
    return str(val).strip()


def _float(val) -> float | None:
    """Parse to float, return None if blank/NaN."""
    if pd.isna(val) or str(val).strip() == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _date(val):
    """Parse to date, return None if blank/NaN."""
    if pd.isna(val) or str(val).strip() == "":
        return None
    try:
        return pd.to_datetime(val).date()
    except Exception:
        return None


def _datetime(val):
    """Parse to datetime, return None if blank/NaN."""
    if pd.isna(val) or str(val).strip() == "":
        return None
    try:
        ts = pd.to_datetime(val)
        # Make timezone-naive (SQLite does not store tz)
        if ts.tzinfo is not None:
            ts = ts.tz_localize(None)
        return ts.to_pydatetime()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Stage 1 – Patients
# ---------------------------------------------------------------------------

def ingest_patients(df: pd.DataFrame) -> dict[str, Patient]:
    """
    Upserts Patient rows.

    Columns expected: MRNO, name, gender, dob, history
    (The 'age' column is ignored – the model derives it via @property.)
    """
    print("\n[Patients] Ingesting …")

    patients_by_mrno: dict[str, Patient] = {}
    to_create: list[Patient] = []
    to_update: list[Patient] = []

    existing = {p.mrno: p for p in Patient.objects.all()}

    for _, row in df.iterrows():
        mrno = _str(row.get("MRNO"))
        if not mrno:
            continue

        gender_raw = _str(row.get("gender") or row.get("GENDER"))
        gender = gender_raw if gender_raw in {"Male", "Female"} else ""

        kwargs = dict(
            name=_str(row.get("name") or row.get("NAME")),
            gender=gender,
            dob=_date(row.get("dob") or row.get("DOB")),
            history=_str(row.get("history") or row.get("HISTORY")),
        )

        if mrno in existing:
            p = existing[mrno]
            for k, v in kwargs.items():
                setattr(p, k, v)
            to_update.append(p)
        else:
            p = Patient(mrno=mrno, **kwargs)
            to_create.append(p)

        patients_by_mrno[mrno] = p

    with transaction.atomic():
        if to_create:
            Patient.objects.bulk_create(to_create, batch_size=BATCH_SIZE)
        if to_update:
            Patient.objects.bulk_update(
                to_update, ["name", "gender", "dob", "history"], batch_size=BATCH_SIZE
            )

    # Refresh so all objects have PKs (bulk_create may not populate them on older Django)
    patients_by_mrno = {p.mrno: p for p in Patient.objects.all()}
    print(f"  → {len(to_create)} created, {len(to_update)} updated")
    return patients_by_mrno


# ---------------------------------------------------------------------------
# Stage 2 – Vitals
# ---------------------------------------------------------------------------

def ingest_vitals(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected: MRNO, timestamp,
                      WEIGHT, WEIGHT_UNIT_ID,
                      HEIGHT, HEIGHT_UNIT_ID,
                      TEMPRATURE, TEMPRATURE_UNIT_ID,
                      PLUSE, PLUSE_UNIT_ID,
                      RESPIRATORY_RATE, RESPIRATORY_RATE_UNIT_ID,
                      BLOOD_PRESSURE_HIGH, BLOOD_PRESSURE_LOW
    """
    print("\n[Vitals] Ingesting …")

    to_create: list[Vitals] = []
    skipped = 0

    for _, row in df.iterrows():
        mrno = _str(row.get("MRNO"))
        patient = patients.get(mrno)
        if patient is None:
            skipped += 1
            continue

        to_create.append(
            Vitals(
                patient=patient,
                timestamp=_datetime(row.get("timestamp") or row.get("TIMESTAMP")),
                weight=_float(row.get("WEIGHT")),
                weight_unit=_str(row.get("WEIGHT_UNIT_ID")),
                height=_float(row.get("HEIGHT")),
                height_unit=_str(row.get("HEIGHT_UNIT_ID")),
                temperature=_float(row.get("TEMPRATURE") or row.get("TEMPERATURE")),
                temperature_unit=_str(
                    row.get("TEMPRATURE_UNIT_ID") or row.get("TEMPERATURE_UNIT_ID")
                ),
                pulse=_float(row.get("PLUSE") or row.get("PULSE")),
                pulse_unit=_str(row.get("PLUSE_UNIT_ID") or row.get("PULSE_UNIT_ID")),
                respiratory_rate=_float(row.get("RESPIRATORY_RATE")),
                respiratory_rate_unit=_str(row.get("RESPIRATORY_RATE_UNIT_ID")),
                bp_high=_float(row.get("BLOOD_PRESSURE_HIGH")),
                bp_low=_float(row.get("BLOOD_PRESSURE_LOW")),
            )
        )

    with transaction.atomic():
        Vitals.objects.bulk_create(to_create, batch_size=BATCH_SIZE)

    print(f"  → {len(to_create)} created, {skipped} skipped (unknown MRNO)")


# ---------------------------------------------------------------------------
# Stage 3 – Encounters
# ---------------------------------------------------------------------------

def ingest_encounters(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected: MRNO, doctor_id, Encounter_date, doctor_notes

    doctor_id is a raw numeric string from the source data; we attempt to
    look up or create a matching Clinician row keyed by that id-as-name.
    """
    print("\n[Encounters] Ingesting …")

    clinicians: dict[str, Clinician] = {}
    to_create: list[Encounter] = []
    skipped = 0

    for _, row in df.iterrows():
        mrno = _str(row.get("MRNO"))
        patient = patients.get(mrno)
        if patient is None:
            skipped += 1
            continue

        doctor_id_raw = _str(row.get("doctor_id"))
        clinician = None
        if doctor_id_raw:
            if doctor_id_raw not in clinicians:
                clinician_obj, _ = Clinician.objects.get_or_create(
                    name=doctor_id_raw,
                    defaults={"title": "Surgeon", "name": "Abdul Ghafoor", "joining_date": None},
                )
                clinicians[doctor_id_raw] = clinician_obj
            clinician = clinicians[doctor_id_raw]

        enc_date = _datetime(row.get("Encounter_date") or row.get("ENCOUNTER_DATE"))
        if enc_date is None:
            skipped += 1
            continue
        
        # for each doc_notes entry, remove all occurances of "_x000D_" from the string
        doc_notes:str = _str(row.get("doctor_notes") or row.get("DOCTOR_NOTES"))
        doc_notes = doc_notes.replace("_x000D_", "")
        to_create.append(
            Encounter(
                patient=patient,
                clinician=clinician,
                date=enc_date,
                notes=doc_notes,
            )
        )

    with transaction.atomic():
        Encounter.objects.bulk_create(to_create, batch_size=BATCH_SIZE)

    print(f"  → {len(to_create)} created, {skipped} skipped")


# ---------------------------------------------------------------------------
# Stage 4 – Lab Results  (pivot multiple rows → single JSONField per CPT)
# ---------------------------------------------------------------------------

def ingest_lab_results(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected: MRNO, CPT_ID, CPT_NAME, TEST, RESULT_NUMERIC, INVOICE_DATE

    The raw/processed data contains one row per individual test within a CPT
    panel.  We group by (MRNO, CPT_ID, INVOICE_DATE) and collapse the test
    rows into a single JSON dict stored on Lab.results.
    """
    print("\n[Lab Results] Ingesting …")

    skipped = 0
    to_create: list[Lab] = []

    group_cols = ["MRNO", "CPT_ID", "INVOICE_DATE"]
    # Coerce types for groupby
    df["MRNO"] = df["MRNO"].fillna("").astype(str).str.strip()
    df["CPT_ID"] = df["CPT_ID"].fillna("").astype(str).str.strip()
    df["INVOICE_DATE"] = df["INVOICE_DATE"].fillna("").astype(str).str.strip()

    for (mrno, cpt_id, invoice_date_str), group in df.groupby(group_cols, sort=False):
        patient = patients.get(mrno)
        if patient is None:
            skipped += len(group)
            continue

        # Build {test_name: result_numeric} dict from grouped rows
        results: dict[str, float | None] = {}
        cpt_name = ""
        for _, row in group.iterrows():
            test = _str(row.get("TEST"))
            val = _float(row.get("RESULT_NUMERIC"))
            if test:
                results[test] = val
            if not cpt_name:
                cpt_name = _str(row.get("CPT_NAME"))

        to_create.append(
            Lab(
                patient=patient,
                cpt_id=cpt_id,
                cpt_name=cpt_name,
                results=results,
                invoice_date=_date(invoice_date_str),
            )
        )

    with transaction.atomic():
        Lab.objects.bulk_create(to_create, batch_size=BATCH_SIZE)

    print(f"  → {len(to_create)} Lab records created, {skipped} rows skipped (unknown MRNO)")


# ---------------------------------------------------------------------------
# Stage 5 – Radiology
# ---------------------------------------------------------------------------

def ingest_radiology(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected: MRNO, CPT_ID, CPT_NAME, TECHNIQUE, RESULT, CONCLUSION, file_path
    """
    print("\n[Radiology] Ingesting …")

    to_create: list[Radiology] = []
    skipped = 0

    for _, row in df.iterrows():
        mrno = _str(row.get("MRNO"))
        patient = patients.get(mrno)
        if patient is None:
            skipped += 1
            continue

        to_create.append(
            Radiology(
                patient=patient,
                cpt_id=_str(row.get("CPT_ID")),
                cpt_name=_str(row.get("CPT_NAME")),
                technique=_str(row.get("TECHNIQUE")),
                result=_str(row.get("RESULT")),
                conclusion=_str(row.get("CONCLUSION")),
                file_path=_str(row.get("file_path") or row.get("FILE_PATH")),
            )
        )

    with transaction.atomic():
        Radiology.objects.bulk_create(to_create, batch_size=BATCH_SIZE)

    print(f"  → {len(to_create)} created, {skipped} skipped (unknown MRNO)")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest processed FMH Excel files into Django DB.")
    parser.add_argument(
        "--flush",
        action="store_true",
        help="Delete all existing rows before ingesting (safe re-run).",
    )
    parser.add_argument(
        "--data-dir",
        default=str(DEFAULT_DATA_DIR),
        help=f"Directory containing processed Excel files (default: {DEFAULT_DATA_DIR})",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    if not data_dir.is_dir():
        sys.exit(f"ERROR: data directory not found: {data_dir}")

    print("=" * 70)
    print("FMH Data Ingestion")
    print(f"  Data dir : {data_dir}")
    print(f"  Database : {os.environ.get('DJANGO_SETTINGS_MODULE', 'unknown settings')}")
    print("=" * 70)

    if args.flush:
        print("\n[FLUSH] Deleting existing rows …")
        with transaction.atomic():
            from diagnostics.models import Lab, Radiology  # noqa: F811
            from clinical.models import Encounter, Clinician  # noqa: F811
            from patients.models import Vitals, Patient  # noqa: F811
            Lab.objects.all().delete()
            Radiology.objects.all().delete()
            Encounter.objects.all().delete()
            Clinician.objects.all().delete()
            Vitals.objects.all().delete()
            Patient.objects.all().delete()
        print("  → Done.")

    print("\n[Step 1] Loading Excel files …")
    patients_df = _load(data_dir / "Patients.xlsx", "Patients")
    vitals_df = _load(data_dir / "Vital_Signs.xlsx", "Vital Signs")
    encounter_df = _load(data_dir / "Encounter.xlsx", "Encounters")
    lab_df = _load(data_dir / "Lab_Results.xlsx", "Lab Results")
    radiology_df = _load(data_dir / "Radiology.xlsx", "Radiology")

    print("\n[Step 2] Ingesting …")
    patients_map = ingest_patients(patients_df)
    ingest_vitals(vitals_df, patients_map)
    ingest_encounters(encounter_df, patients_map)
    ingest_lab_results(lab_df, patients_map)
    ingest_radiology(radiology_df, patients_map)

    print("\n" + "=" * 70)
    print("Ingestion complete.")


if __name__ == "__main__":
    main()
