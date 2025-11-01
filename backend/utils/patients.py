import json
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional

# Get the data directory path
DATA_DIR = Path(__file__).parent.parent.parent / "data"


def get_all_patients() -> List[Dict]:
    """
    Get all patients with minimal fields for the patients list page.
    Returns: List of patient data with patient_id, personal_information, and last_visit
    """
    patients = []
    
    # Get all JSON files in the data directory
    if not DATA_DIR.exists():
        return patients
    
    for file_path in DATA_DIR.glob("P*.json"):
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                patient_data = json.load(f)
                
                # Get file modification time as last_visit if not present in data
                last_visit = patient_data.get('last_visit')
                if not last_visit:
                    # Use file modification time
                    mod_time = os.path.getmtime(file_path)
                    last_visit = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
                
                # Extract minimal fields for list view
                patient_summary = {
                    "patient_id": patient_data.get("patient_id", ""),
                    "personal_information": {
                        "salutation": patient_data.get("personal_information", {}).get("salutation", ""),
                        "name": patient_data.get("personal_information", {}).get("name", ""),
                        "age": patient_data.get("personal_information", {}).get("age", 0),
                        "sex": patient_data.get("personal_information", {}).get("sex", "")
                    },
                    "last_visit": last_visit
                }
                patients.append(patient_summary)
        except Exception as e:
            print(f"Error reading {file_path}: {str(e)}")
            continue
    
    # Sort by last_visit date (most recent first)
    patients.sort(key=lambda x: x['last_visit'], reverse=True)
    
    return patients


def get_patient_by_id(patient_id: str) -> Optional[Dict]:
    """
    Get complete patient data by patient ID.
    Args:
        patient_id: The patient ID (e.g., 'P001')
    Returns:
        Complete patient data dictionary or None if not found
    """
    file_path = DATA_DIR / f"{patient_id}.json"
    
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            patient_data = json.load(f)
            
            # Add last_visit if not present
            if 'last_visit' not in patient_data:
                mod_time = os.path.getmtime(file_path)
                patient_data['last_visit'] = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d')
            
            return patient_data
    except Exception as e:
        print(f"Error reading patient {patient_id}: {str(e)}")
        return None


def create_patient(patient_data: Dict) -> Dict:
    """
    Create a new patient and save to JSON file.
    Args:
        patient_data: Dictionary containing patient information
    Returns:
        Complete patient data with generated patient_id
    """
    # Generate new patient ID
    existing_patients = list(DATA_DIR.glob("P*.json"))
    if existing_patients:
        # Extract numbers from existing patient IDs
        existing_ids = []
        for file_path in existing_patients:
            try:
                patient_num = int(file_path.stem[1:])  # Remove 'P' and convert to int
                existing_ids.append(patient_num)
            except ValueError:
                continue
        next_id = max(existing_ids) + 1 if existing_ids else 1
    else:
        next_id = 1
    
    patient_id = f"P{next_id:03d}"  # Format as P001, P002, etc.
    
    # Create default patient structure
    new_patient = {
        "patient_id": patient_id,
        "personal_information": {
            "salutation": patient_data.get("salutation", ""),
            "name": patient_data.get("name", ""),
            "age": patient_data.get("age", 0),
            "sex": patient_data.get("sex", ""),
            "ethnicity": patient_data.get("ethnicity", "Unknown"),
            "occupation": patient_data.get("occupation", "Unknown"),
            "family_history": patient_data.get("family_history", {}),
            "social_determinants": {
                "smoking_status": patient_data.get("smoking_status", "Unknown"),
                "physical_activity": patient_data.get("physical_activity", "Unknown"),
                "diet": patient_data.get("diet", "Unknown"),
                "hearing_impairment": patient_data.get("hearing_impairment", "None reported"),
                "access_to_healthcare": patient_data.get("access_to_healthcare", "Unknown")
            }
        },
        "vitals": {
            "weight_kg": patient_data.get("weight_kg", 0) if patient_data.get("weight_kg") else 0,
            "bmi_estimate": 0,
            "blood_pressure_mmHg": patient_data.get("blood_pressure_mmHg", ""),
            "heart_rate_bpm": patient_data.get("heart_rate_bpm", 0) if patient_data.get("heart_rate_bpm") else 0,
            "spo2_percent": patient_data.get("spo2_percent", 0) if patient_data.get("spo2_percent") else 0,
            "temperature": patient_data.get("temperature", ""),
            "blood_glucose": "Unknown"
        },
        "lab_results": [],
        "medical_imagery": [],
        "clinical_notes": {
            "summary": "",
            "examination": "",
            "assessment": "",
            "plan": []
        },
        "medications": [],
        "current_symptoms": [],
        "known_medical_history": [],
        "diagnosis": {
            "probable_conditions": [],
            "treatment_suggestions": [],
            "medical_advice": []
        },
        "lab_report_imgs": [],
        "audio_transcriptions": [],
        "summary": "",
        "last_visit": datetime.now().strftime('%Y-%m-%d')
    }
    
    # Save to JSON file
    file_path = DATA_DIR / f"{patient_id}.json"
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(new_patient, f, indent=4)
        return new_patient
    except Exception as e:
        raise Exception(f"Error creating patient file: {str(e)}")


def update_patient(patient_id: str, patient_data: Dict) -> Optional[Dict]:
    """
    Update an existing patient's data.
    Args:
        patient_id: The patient ID (e.g., 'P001')
        patient_data: Dictionary containing updated patient information
    Returns:
        Updated patient data or None if patient not found
    """
    file_path = DATA_DIR / f"{patient_id}.json"
    
    if not file_path.exists():
        return None
    
    try:
        # Read existing data
        with open(file_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
        
        # Merge with new data (keep existing structure)
        existing_data.update(patient_data)
        existing_data['last_visit'] = datetime.now().strftime('%Y-%m-%d')
        
        # Save updated data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4)
        
        return existing_data
    except Exception as e:
        print(f"Error updating patient {patient_id}: {str(e)}")
        return None

