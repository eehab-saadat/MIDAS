from .models import Patient, Vitals
from diagnostics.models import Lab, Radiology
from clinical.models import Clinician, Encounter, Medication

def get_patient_details(mrno: str) -> dict:
    '''
    '''
