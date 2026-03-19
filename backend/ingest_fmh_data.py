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
    --flush        Drop all existing rows before ingesting (idempotent re-run).
    --data-dir <p> Override the default processed-files directory.

Final Models:

1. Patient: id, mrno, gender, dob, age, history
2. Clinician: id, name, title, joining data
3. Radiology: id, mrno, cpt_id, cpt_name, technique, result, conclusion, file_path - this contains any medical images
4. Encounter: id, mrno, clinician, date, notes (md formatted string)
5. Lab: id, mrno, cpt_id, cpt_name, {test: result_numeric}, invoice_date (currently one lab report is shown in multiple rows with each result field of the test as separate row, i want the final database to show a dictionary object of all such tests and their results pairs) - this contains any laboratory test results
6. Vitals: id, mrno, timestamp, weight, weight_unit_id, height, height_unit_id, temperature, temperature_unit_id, pulse, pulse_unit_id, respiratory_rate, respiratory_rate_unit_id, bp_high, bp_low - this contains any patient's vital signs
7. Medication: id, mrno, prescribed_by (doctor id), prescribed_on (date), active_agent_name, medication_name, dosage, frequency, indication
8. SnomedEntity: id, snomed_cid, fsn, umls_cui, entity_type, body_parts - all possible symptoms or findings
9. Symptom: id, name, description, snomed_entity, encounter - this contains any symptoms or findings that were observed during the encounter for patient
"""

import argparse
import os
import sys
from datetime import date
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
# Constants
# ---------------------------------------------------------------------------
DEFAULT_DATA_DIR = BASE_DIR.parent / "data" / "FMH" / "files" / "processed"
BATCH_SIZE = 500

# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------


def _load(path: Path, label: str) -> pd.DataFrame:
    print(f"  Loading {label} from {path} …")
    df = pd.read_excel(path, dtype=str)
    df.columns = [c.strip() for c in df.columns]
    print(f"    → {len(df):,} rows, columns: {list(df.columns)}")
    return df


def _str(val) -> str:
    """Return a clean string, or '' for NaN/None."""
    if val is None:
        return ""
    try:
        if pd.isna(val):
            return ""
    except (TypeError, ValueError):
        pass
    return str(val).strip()


def _mrno(val) -> str:
    """
    Normalise an MRNO value to a canonical string.

    Excel sometimes stores large integer MRNOs in scientific notation
    (e.g. '1.9999999e+13').  We convert through float → int to recover
    the full integer string, then strip any trailing '.0'.
    """
    raw = _str(val)
    if not raw:
        return ""
    try:
        # Handles both plain integers and scientific-notation floats
        return str(int(float(raw)))
    except (ValueError, TypeError):
        return raw


def _float(val) -> float | None:
    """Parse to float; return None for blank / NaN."""
    if val is None:
        return None
    try:
        if pd.isna(val):
            return None
    except (TypeError, ValueError):
        pass
    s = str(val).strip()
    if not s:
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _date(val):
    """Parse to date; return None for blank / NaN."""
    s = _str(val)
    if not s:
        return None
    try:
        return pd.to_datetime(s).date()
    except Exception:
        return None


def _datetime(val):
    """Parse to aware-free datetime; return None for blank / NaN."""
    s = _str(val)
    if not s:
        return None
    try:
        ts = pd.to_datetime(s)
        if ts.tzinfo is not None:
            ts = ts.tz_localize(None)
        return ts.to_pydatetime()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Step 0.5 – Collect raw MRNOs then build sequential mapping
# ---------------------------------------------------------------------------


def collect_raw_mrnos(
    patients_df: pd.DataFrame,
    vitals_df: pd.DataFrame,
    encounter_df: pd.DataFrame,
    lab_df: pd.DataFrame,
    radiology_df: pd.DataFrame,
) -> set[str]:
    """
    Scan every sheet and return the union of all unique, non-empty raw MRNOs
    (normalised through _mrno() to strip scientific notation / whitespace).
    """
    raw_mrnos: set[str] = set()
    for df in (patients_df, vitals_df, encounter_df, lab_df, radiology_df):
        if "MRNO" in df.columns:
            for val in df["MRNO"]:
                m = _mrno(val)
                if m:
                    raw_mrnos.add(m)
    print(f"\n[MRNO Map] {len(raw_mrnos):,} unique raw MRNOs found across all sheets")
    return raw_mrnos


def build_mrno_map(raw_mrnos: set[str]) -> dict[str, str]:
    """
    Assign a stable sequential ID ("1", "2", "3", …) to every raw MRNO.

    Raw MRNOs are sorted before enumeration so the mapping is deterministic
    across repeated runs as long as the source data does not change.

    Returns:
        {raw_mrno_str: sequential_id_str}
        e.g. {"19999999999999": "1", "19999999998888": "2", …}
    """
    mapping = {raw: str(i + 1) for i, raw in enumerate(sorted(raw_mrnos))}
    print(f"[MRNO Map] Sequential IDs assigned: 1 … {len(mapping)}")
    return mapping


# ---------------------------------------------------------------------------
# Step 1 – Patients (covers every MRNO seen in any sheet)
# ---------------------------------------------------------------------------


def ingest_patients(
    patients_df: pd.DataFrame,
    mrno_map: dict[str, str],
) -> dict[str, Patient]:
    """
    Upsert one Patient row per entry in *mrno_map*.

    Patient.mrno stores the sequential ID ("1", "2", …).  MRNOs present in
    Patients.xlsx receive full demographic data; MRNOs found only in other
    sheets get a minimal stub row so FK constraints are satisfied everywhere.

    The 'age' column is intentionally ignored – the model derives it from dob
    via @property.

    Returns:
        {raw_mrno_str: Patient}  ← keyed by the *original* raw MRNO so every
        downstream stage can do a plain dict lookup without needing to know
        the assigned sequential ID.
    """
    print("\n[Patients] Ingesting …")

    # ── Demographic data from Patients.xlsx, keyed by raw MRNO ──────────────
    demographics: dict[str, dict] = {}
    for _, row in patients_df.iterrows():
        raw = _mrno(row.get("MRNO", ""))
        if not raw:
            continue
        gender_raw = _str(row.get("gender") or row.get("GENDER"))
        demographics[raw] = dict(
            name=_str(row.get("name") or row.get("NAME")),
            gender=gender_raw if gender_raw in {"Male", "Female"} else "",
            dob=_date(row.get("dob") or row.get("DOB")),
            history=_str(row.get("history") or row.get("HISTORY")),
        )

    # seq_id → raw MRNO (reverse map, needed to rebuild the return dict)
    seq_to_raw: dict[str, str] = {v: k for k, v in mrno_map.items()}

    # Existing patients in DB are keyed by their stored seq_id (Patient.mrno)
    existing_by_seq: dict[str, Patient] = {p.mrno: p for p in Patient.objects.all()}

    to_create: list[Patient] = []
    to_update: list[Patient] = []

    for raw, seq_id in mrno_map.items():
        data = demographics.get(raw, {})
        kwargs = dict(
            name=data.get("name", ""),
            gender=data.get("gender", ""),
            dob=data.get("dob"),
            history=data.get("history", ""),
        )
        if seq_id in existing_by_seq:
            p = existing_by_seq[seq_id]
            for k, v in kwargs.items():
                setattr(p, k, v)
            to_update.append(p)
        else:
            to_create.append(Patient(mrno=seq_id, **kwargs))

    with transaction.atomic():
        if to_create:
            Patient.objects.bulk_create(to_create, batch_size=BATCH_SIZE)
        if to_update:
            Patient.objects.bulk_update(
                to_update,
                ["name", "gender", "dob", "history"],
                batch_size=BATCH_SIZE,
            )

    # Re-query so every Patient object carries a real DB primary key
    all_patients_by_seq: dict[str, Patient] = {p.mrno: p for p in Patient.objects.all()}
    # Return dict keyed by *raw* MRNO for transparent downstream lookups
    raw_to_patient: dict[str, Patient] = {
        seq_to_raw[seq]: p
        for seq, p in all_patients_by_seq.items()
        if seq in seq_to_raw
    }

    stub_count = len(mrno_map) - len(demographics)
    print(
        f"  → {len(to_create)} created ({stub_count} stubs), "
        f"{len(to_update)} updated  ({len(raw_to_patient)} total)"
    )
    return raw_to_patient


# ---------------------------------------------------------------------------
# Step 2 – Default Clinician
# ---------------------------------------------------------------------------


def ingest_default_clinician() -> Clinician:
    """
    Ensure a single default Clinician exists.  Uses get_or_create so the
    operation is safe on re-runs.
    """
    clinician, created = Clinician.objects.get_or_create(
        name="Dr. Abdul Ghafoor",
        defaults={"title": "Surgeon", "joining_date": date.today()},
    )
    status = "created" if created else "already exists"
    print(f"\n[Clinician] Default clinician '{clinician.name}' {status}")
    return clinician


# ---------------------------------------------------------------------------
# Step 3 – Vitals
# ---------------------------------------------------------------------------


def ingest_vitals(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected:
        MRNO, timestamp,
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
        mrno = _mrno(row.get("MRNO", ""))
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
# Step 4 – Encounters
# ---------------------------------------------------------------------------


def ingest_encounters(
    df: pd.DataFrame,
    patients: dict[str, Patient],
    default_clinician: Clinician,
) -> None:
    """
    Columns expected: MRNO, doctor_id, Encounter_date, doctor_notes

    All encounters are assigned to *default_clinician* (fetched once before
    the loop to avoid N+1 queries).  The raw '_x000D_' carriage-return
    artifacts are stripped from notes.
    """
    print("\n[Encounters] Ingesting …")

    to_create: list[Encounter] = []
    skipped = 0

    for _, row in df.iterrows():
        mrno = _mrno(row.get("MRNO", ""))
        patient = patients.get(mrno)
        if patient is None:
            skipped += 1
            continue

        enc_date = _datetime(row.get("Encounter_date") or row.get("ENCOUNTER_DATE"))
        if enc_date is None:
            skipped += 1
            continue

        notes = _str(row.get("doctor_notes") or row.get("DOCTOR_NOTES")).replace(
            "_x000D_", ""
        )

        to_create.append(
            Encounter(
                patient=patient,
                clinician=default_clinician,
                date=enc_date,
                notes=notes,
            )
        )

    with transaction.atomic():
        Encounter.objects.bulk_create(to_create, batch_size=BATCH_SIZE)

    print(f"  → {len(to_create)} created, {skipped} skipped")


# ---------------------------------------------------------------------------
# Step 5 – Lab Results  (pivot rows → single JSONField per CPT panel)
# ---------------------------------------------------------------------------


def ingest_lab_results(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected: MRNO, CPT_ID, CPT_NAME, TEST, RESULT_NUMERIC, INVOICE_DATE

    Multiple rows sharing (MRNO, CPT_ID, INVOICE_DATE) belong to the same CPT
    panel.  They are collapsed into a single Lab row whose 'results' JSONField
    holds a dict structured as:

        {
            "<TEST_NAME>": {
                "result": <float | null>,
                "unit": "",
                "normal_range": ["", ""]
            },
            ...
        }

    Unit and normal_range are not present in the source data and default to
    empty placeholders for future enrichment.
    """
    print("\n[Lab Results] Ingesting …")

    # Normalise groupby columns in-place
    df = df.copy()
    df["MRNO"] = df["MRNO"].apply(_mrno)
    df["CPT_ID"] = df["CPT_ID"].fillna("").astype(str).str.strip()
    df["INVOICE_DATE"] = df["INVOICE_DATE"].fillna("").astype(str).str.strip()

    skipped = 0
    to_create: list[Lab] = []

    group_cols = ["MRNO", "CPT_ID", "INVOICE_DATE"]
    for (mrno, cpt_id, invoice_date_str), group in df.groupby(group_cols, sort=False):
        patient = patients.get(mrno)
        if patient is None:
            skipped += len(group)
            continue

        cpt_name = ""
        results: dict[str, dict] = {}

        for _, row in group.iterrows():
            test = _str(row.get("TEST"))
            if not test:
                continue
            results[test] = {
                "result": _float(row.get("RESULT_NUMERIC")),
                "unit": "",
                "normal_range": ["", ""],
            }
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

    print(
        f"  → {len(to_create)} Lab records created, "
        f"{skipped} rows skipped (unknown MRNO)"
    )


# ---------------------------------------------------------------------------
# Step 6 – Radiology
# ---------------------------------------------------------------------------


def ingest_radiology(df: pd.DataFrame, patients: dict[str, Patient]) -> None:
    """
    Columns expected:
        MRNO, CPT_ID, CPT_NAME, TECHNIQUE, RESULT, CONCLUSION, file_path

    'system_conclusion' is left blank (populated later by the AI pipeline).
    '_x000D_' carriage-return artifacts are stripped from text fields.
    """
    print("\n[Radiology] Ingesting …")

    to_create: list[Radiology] = []
    skipped = 0

    for _, row in df.iterrows():
        mrno = _mrno(row.get("MRNO", ""))
        patient = patients.get(mrno)
        if patient is None:
            skipped += 1
            continue

        to_create.append(
            Radiology(
                patient=patient,
                cpt_id=_str(row.get("CPT_ID")),
                cpt_name=_str(row.get("CPT_NAME")),
                technique=_str(row.get("TECHNIQUE")).replace("_x000D_", ""),
                result=_str(row.get("RESULT")).replace("_x000D_", ""),
                conclusion=_str(row.get("CONCLUSION")).replace("_x000D_", ""),
                system_conclusion="",
                file_path=_str(row.get("file_path")),
            )
        )

    with transaction.atomic():
        Radiology.objects.bulk_create(to_create, batch_size=BATCH_SIZE)

    print(f"  → {len(to_create)} created, {skipped} skipped (unknown MRNO)")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Ingest processed FMH Excel files into Django DB."
    )
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
    print(f"  Settings : {os.environ.get('DJANGO_SETTINGS_MODULE', 'unknown')}")
    print("=" * 70)

    if args.flush:
        print("\n[FLUSH] Deleting all existing rows …")
        with transaction.atomic():
            Lab.objects.all().delete()
            Radiology.objects.all().delete()
            Encounter.objects.all().delete()
            Clinician.objects.all().delete()
            Vitals.objects.all().delete()
            Patient.objects.all().delete()
        print("  → Done.")

    # ── Step 0: Load all sheets ──────────────────────────────────────────────
    print("\n[Step 0] Loading Excel files …")
    patients_df = _load(data_dir / "Patients.xlsx", "Patients")
    vitals_df = _load(data_dir / "Vital_Signs.xlsx", "Vital Signs")
    encounter_df = _load(data_dir / "Encounter.xlsx", "Encounters")
    lab_df = _load(data_dir / "Lab_Results.xlsx", "Lab Results")
    radiology_df = _load(data_dir / "Radiology.xlsx", "Radiology")

    # ── Step 0.5: Collect raw MRNOs and build sequential map ────────────────
    raw_mrnos = collect_raw_mrnos(
        patients_df, vitals_df, encounter_df, lab_df, radiology_df
    )
    mrno_map = build_mrno_map(raw_mrnos)  # {raw_mrno: "1"/"2"/…}

    # ── Step 1 & 2: Seed independent tables ─────────────────────────────────
    print("\n[Step 1] Ingesting base tables …")
    patients_map = ingest_patients(patients_df, mrno_map)
    default_clinician = ingest_default_clinician()

    # ── Steps 3-6: FK-dependent tables ──────────────────────────────────────
    print("\n[Step 2] Ingesting dependent tables …")
    ingest_vitals(vitals_df, patients_map)
    ingest_encounters(encounter_df, patients_map, default_clinician)
    ingest_lab_results(lab_df, patients_map)
    ingest_radiology(radiology_df, patients_map)

    print("\n" + "=" * 70)
    print("Ingestion complete.")


if __name__ == "__main__":
    main()
