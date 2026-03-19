from diagnostics.models import Lab, Radiology
from clinical.models import Encounter, Medication

from .models import Patient, Vitals

# TODO: change this to actually use preexisting data fetching functions from other apps


def get_complete_patient_details(mrno: str) -> dict | None:
    """
    Return a single comprehensive dict for the patient identified by *mrno*.

    Returns None if the patient is not found (the view maps this to HTTP 404).

    Response structure
    ------------------
    {
        "patient_id": str,                  # sequential mrno stored in DB
        "personal_information": {
            "name": str,
            "gender": str,
            "dob": str | null,              # ISO date
            "age": int | null,              # derived from dob
            "history": str,                 # free-text medical history
        },
        "vitals": {                         # most recent Vitals record, or {}
            "timestamp": str | null,
            "weight": float | null,
            "weight_unit": str,
            "height": float | null,
            "height_unit": str,
            "blood_pressure": str,          # "<bp_high>/<bp_low> mmHg"
            "temperature": float | null,
            "temperature_unit": str,
            "pulse": float | null,
            "pulse_unit": str,
            "respiratory_rate": float | null,
            "respiratory_rate_unit": str,
        },
        "lab_results": [                    # up to 3 most recent Lab records
            {
                "id": int,
                "cpt_id": str,
                "cpt_name": str,
                "date": str | null,         # ISO date
                "results": dict,            # {test: {result, unit, normal_range}}
            }
        ],
        "radiology_reports": [              # up to 3 most recent Radiology records
            {
                "id": int,
                "cpt_id": str,
                "cpt_name": str,
                "technique": str,
                "result": str,
                "conclusion": str,
                "system_conclusion": str,
                "file_path": str,
                "date": str,                # ISO datetime of record creation
            }
        ],
        "medications": [                    # all Medication records for this patient
            {
                "id": int,
                "medication_name": str,
                "active_agent_name": str,
                "dosage": str,
                "frequency": str,
                "indication": str,
                "prescribed_on": str | null,
                "prescribed_by": str | null,
            }
        ],
        "recent_encounters": [              # last 2 Encounter records
            {
                "id": int,
                "date": str,                # ISO datetime
                "clinician": str | null,
                "notes": str,               # Markdown text
                "symptoms": [
                    {
                        "snomed_cid": str,
                        "snomed_fsn": str,
                        "entity_type": str,
                        "clinician_remarks": str,
                    }
                ],
            }
        ],
        "current_symptoms": [str],          # SNOMED FSNs from the most recent encounter
        "known_medical_history": [str],     # patient.history split by newlines
        "last_visit": str | null,           # ISO datetime of most recent encounter
    }
    """
    # ── Patient lookup ──────────────────────────────────────────────────────
    try:
        patient = Patient.objects.get(mrno=mrno)
    except Patient.DoesNotExist:
        return None

    # ── Fetch related data in as few queries as possible ────────────────────
    latest_vitals: Vitals | None = (
        patient.vitals.order_by("-timestamp").first()
    )

    lab_records = list(
        patient.lab_results.order_by("-invoice_date")[:3]
    )

    radiology_records = list(
        patient.radiology_reports.order_by("-created_at")[:3]
    )

    medications = list(
        patient.medications.select_related(
            "prescribed_by").order_by("-prescribed_on")
    )

    # Last 2 encounters (symptoms will be fetched as needed)
    recent_encounters = list(
        patient.encounters
        .select_related("clinician")
        .order_by("-date")[:2]
    )

    most_recent_encounter: Encounter | None = (
        recent_encounters[0] if recent_encounters else None
    )

    # ── Build sub-dicts ──────────────────────────────────────────────────────

    # Personal information
    personal_information = {
        "name": patient.name,
        "gender": patient.gender,
        "dob": patient.dob.isoformat() if patient.dob else None,
        "age": patient.age,
        "history": patient.history,
    }

    # Vitals (most recent record)
    if latest_vitals:
        v = latest_vitals
        bp_parts = [str(v.bp_high), str(v.bp_low)]
        vitals_data = {
            "timestamp": v.timestamp.isoformat() if v.timestamp else None,
            "weight": v.weight,
            "weight_unit": v.weight_unit,
            "height": v.height,
            "height_unit": v.height_unit,
            "blood_pressure": "/".join(p for p in bp_parts if p != "None"),
            "temperature": v.temperature,
            "temperature_unit": v.temperature_unit,
            "pulse": v.pulse,
            "pulse_unit": v.pulse_unit,
            "respiratory_rate": v.respiratory_rate,
            "respiratory_rate_unit": v.respiratory_rate_unit,
        }
    else:
        vitals_data = {}

    # Lab results (last 3)
    lab_results = [
        {
            "id": lr.id,
            "cpt_id": lr.cpt_id,
            "cpt_name": lr.cpt_name,
            "date": lr.invoice_date.isoformat() if lr.invoice_date else None,
            "results": lr.results,
        }
        for lr in lab_records
    ]

    # Radiology reports (last 3)
    radiology_reports = [
        {
            "id": r.id,
            "cpt_id": r.cpt_id,
            "cpt_name": r.cpt_name,
            "technique": r.technique,
            "result": r.result,
            "conclusion": r.conclusion,
            "system_conclusion": r.system_conclusion,
            "file_path": r.file_path,
            "date": r.created_at.isoformat(),
        }
        for r in radiology_records
    ]

    # Medications (all)
    medications_data = [
        {
            "id": m.id,
            "medication_name": m.medication_name,
            "active_agent_name": m.active_agent_name,
            "dosage": m.dosage,
            "frequency": m.frequency,
            "indication": m.indication,
            "prescribed_on": m.prescribed_on.isoformat() if m.prescribed_on else None,
            "prescribed_by": m.prescribed_by.name if m.prescribed_by else None,
        }
        for m in medications
    ]

    # Recent encounters (last 2) with their symptom lists
    encounters_data = []
    for enc in recent_encounters:
        try:
            symptoms = [
                {
                    "snomed_cid": s.snomed_entity.snomed_cid,
                    "snomed_fsn": s.snomed_entity.fsn,
                    "entity_type": s.snomed_entity.entity_type,
                    "clinician_remarks": s.clinician_remarks,
                }
                for s in enc.symptoms.all()
            ]
        except Exception:
            # If symptoms table doesn't exist, leave empty
            symptoms = []

        encounters_data.append({
            "id": enc.id,
            "date": enc.date.isoformat(),
            "clinician": enc.clinician.name if enc.clinician else None,
            "notes": enc.notes,
            "symptoms": symptoms,
        })

    # Current symptoms — descriptions from the most recent encounter only
    current_symptoms = []
    if most_recent_encounter:
        try:
            current_symptoms = [
                s.description for s in most_recent_encounter.symptoms.all()]
        except Exception:
            # If symptoms table doesn't exist, leave empty
            pass

    # Known medical history — split the history blob into non-empty lines
    known_medical_history = [
        line.strip()
        for line in patient.history.splitlines()
        if line.strip()
    ]

    last_visit = (
        most_recent_encounter.date.isoformat()
        if most_recent_encounter else None
    )

    return {
        "patient_id": patient.mrno,
        "personal_information": personal_information,
        "vitals": vitals_data,
        "lab_results": lab_results,
        "radiology_reports": radiology_reports,
        "medications": medications_data,
        "recent_encounters": encounters_data,
        "current_symptoms": current_symptoms,
        "known_medical_history": known_medical_history,
        "last_visit": last_visit,
    }


def get_condensed_patient_details(mrno: str) -> dict | None:
    """
    Return a condensed patient summary (for batch diagnosis inference).
    Includes only essential fields to reduce token usage in LLM calls.
    """
    try:
        patient = Patient.objects.get(mrno=mrno)
    except Patient.DoesNotExist:
        return None

    # Personal info
    personal_info = f"{patient.name}, {patient.gender}, age {patient.age}"

    # Latest vitals (one line)
    latest_vitals = patient.vitals.order_by("-timestamp").first()
    vitals_str = ""
    if latest_vitals:
        bp = f"{latest_vitals.bp_high}/{latest_vitals.bp_low}" if latest_vitals.bp_high else ""
        vitals_str = f"Vitals: {latest_vitals.weight}kg, {bp}mmHg, {latest_vitals.temperature}°C"

    # Latest medications (brief)
    meds = list(patient.medications.order_by("-prescribed_on")[:3])
    meds_str = "; ".join([m.medication_name for m in meds]
                         ) if meds else "No medications"

    # Recent note
    recent_encounters = list(patient.encounters.order_by("-date")[:1])
    notes_str = ""
    if recent_encounters:
        note = recent_encounters[0].notes[:300]  # First 300 chars
        notes_str = f"Latest note: {note}"

    # Medical history (truncated)
    history_lines = [line.strip()
                     for line in patient.history.splitlines() if line.strip()][:3]
    history_str = "; ".join(history_lines) if history_lines else "No history"

    return {
        "mrno": mrno,
        "patient": personal_info,
        "history": history_str,
        "vitals": vitals_str,
        "medications": meds_str,
        "recent_notes": notes_str,
    }


def process_model_response(response: dict) -> dict:
    """
    Process the model response and return the cleaned response
    """
    # TODO: see the generate_diagnosis function in "diagnose.py" file in old-backend for reference
    return response
