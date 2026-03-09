"""
FMH Data Processor - Main Entry Point

This script processes raw Excel files from FMH and converts them into structured output files.

Raw excel file structures:
Doctor Notes:
{NEW_MRNO (long int), GENDER (Male/Female), DOB(date), AGE(String like 49 Year(s)), NOTES_DATE(datetime), NOTES(string)}

Lab Results:
{PAT_MRNO (long int), GENDER, DOB, AGE, CPT_ID (long int), CPT_NAME(string), TEST(string), RESULT_NUMERIC(float), INVOICE_DATE(datetime)}

Radiology:
{MRNO (long int), GENDER, DOB, AGE, RESULT_DATE(datetime), CPT_ID (long int), CPT(string), CLINICAL_HISTORY(string), TECHNIQUE(string - descriptions of the test), RESULT(string - results seen from the test/image), CONCLUSION(string - expert remarks on the result)}

Vital Signs:
{NEW_MRNO (long int), GENDER, DOB, AGE, WEIGHT (float), WEIGHT_UNIT_ID (string), HEIGHT (float), HEIGHT_UNIT_ID (string), TEMPRATURE (float), TEMPRATURE_UNIT_ID (string), PLUSE (float), PLUSE_UNIT_ID (string), RESPIRATORY_RATE (float), RESPIRATORY_RATE_UNIT_ID (string), BLOOD_PRESSURE_HIGH (float), BLOOD_PRESSURE_LOW (float)}

IMPORTANT NOTES:
    - NEW_MRNO == PAT_MRNO == MRNO (all represent the same unique patient identifier)
    - Different raw files use different column names for the patient ID:
        * Doctor Notes & Vital Signs use: NEW_MRNO
        * Lab Results uses: PAT_MRNO
        * Radiology uses: MRNO
    - All output files standardize this to: MRNO

Final Excel file structure:
Patients.xlsx:
{MRNO, name, gender, dob, age, history}
e.g:
MRNO, name, gender, dob, age, history
19,999,999,999,999, "Male", "28,084", "49 Year(s)", "Known case of right sided renal cell carcinoma, h/o radicle nephrectomy in 2022, now presented with right sided chest pain and shortness of breath on and off for last 6 months. CT abdominopelvic with contrast done on 09-11-2021, shows a focal lesion at upper pole of right kidney ------- possibility of neoplastic process."

Lab_Results.xlsx:
{MRNO, CPT_ID, CPT_NAME, TEST, RESULT_NUMERIC, INVOICE_DATE}
e.g:
MRNO, CPT_ID, CPT_NAME, TEST, RESULT_NUMERIC, INVOICE_DATE
19,199,999,114,348, 001000000000080003, "ELECTROLYTES (Na, K, Cl,HCO3),Serum 	BICARBONATE", 20, 45,990.70
19,199,999,114,348, 001000000000080003, "ELECTROLYTES (Na, K, Cl,HCO3),Serum 	CHLORIDE", 99, 45,990.70

Radiology.xlsx:
{MRNO, CPT_ID, CPT_NAME, TECHNIQUE, RESULT, CONCLUSION, file_path}
e.g:
MRNO, CPT_ID, CPT_NAME, TECHNIQUE, RESULT, CONCLUSION, file_path
19,999,999,999,989, 1,000,000,000,070,488, "C.T. Chest High Resolution  (HR Chest)", "Multiple axial sections were taken through chest without I.V contrast injection (HRCT protocol)", "Breathing motion artifacts limiting the sensitivity of examination. _x000D_",
Extensive areas of ground glass opacification bilaterally in the lung fields with mild smooth interlobular septal thickening in the upper and mid lung zones. No definite area of consolidation. No nodularity. No evidence of bronchiectasis. Normal trachea and major airway. No pleural effusion seen on either side. There is suggestion of cardiomegaly, echocardiographic correlation advised. _x000D_ _x000D_
Images of mediastinal window show no definite mediastinal lymphadenopathy or mass. Small nodal calcification in the precarinal lymphnode. A few sections through upper abdomen show no definite abnormality. No significant skeletal abnormality.","Suggestion of cardiomegaly with extensive areas of ground glass opacification bilaterally in the lung fields with smooth interlobular septal thickening, these changes are concerning for interstitial pulmonary edema. Echocardiographic correlation suggested. No previous imaging is available for comparison. _x000D_ _x000D_ This is an electronically generated report and does not require signature."	

Vital_Signs.xlsx:
{MRNO, timestamp, WEIGHT, WEIGHT_UNIT_ID, HEIGHT, HEIGHT_UNIT_ID, TEMPRATURE, TEMPRATURE_UNIT_ID , PLUSE, PLUSE_UNIT_ID, RESPIRATORY_RATE, RESPIRATORY_RATE_UNIT_ID, BLOOD_PRESSURE_HIGH, BLOOD_PRESSURE_LOW}
e.g:
MRNO, timestamp, WEIGHT, WEIGHT_UNIT_ID, HEIGHT, HEIGHT_UNIT_ID, TEMPRATURE, TEMPRATURE_UNIT_ID , PLUSE, PLUSE_UNIT_ID, RESPIRATORY_RATE, RESPIRATORY_RATE_UNIT_ID, BLOOD_PRESSURE_HIGH, BLOOD_PRESSURE_LOW
19,999,999,999,179, "", "", "kg", "", "cm", "", "103", "C", "116", "/min", "18", "/min", "110", "70"

Encounter.xlsx:
{MRNO,doctor_id, Encounter_date, doctor_notes}
e.g:
MRNO, doctor_id, Encounter_date, doctor_notes
19,999,999,999,999, 45,940.54, "IX: B12 LEVELS, FOLATE/FOLIC ACID LEVELS, RX: TAB. PLASENZYME BD, TAB ITP 50MG OD"

this is the final models that i want to make for my sqlite database in django backend:

patient: id, mrno, gender, dob, age, history
clinician: id, name, title, joining data
radiology: id, mrno, cpt_id, cpt_name, technique, result, conclusion, file_path
encounter: id, mrno, clinician, date, notes (md formatted string)cls
lab: id, mrno, cpt_id, cpt_name, {test: result_numeric}, invoice_date (currently one lab report is shown in multiple rows with each result field of the test as separate row, i want the final database to show a dictionary object of all such tests and their results pairs)
vitals: id, mrno, timestamp, weight, weight_unit_id, height, height_unit_id, temperature, temperature_unit_id, pulse, pulse_unit_id, respiratory_rate, respiratory_rate_unit_id, bp_high, bp_low
medication: id, mrno, prescribed_by (doctor id), prescribed_on (date), active_agent_name, medication_name, dosage, frequency, indication

"""

import os
from utils.file_handler import load_excel, save_excel, ensure_output_directory
from processors.patients_processor import process_patients
from processors.lab_results_processor import process_lab_results
from processors.radiology_processor import process_radiology
from processors.vital_signs_processor import process_vital_signs
from processors.encounter_processor import process_encounters


DOCTOR_NOTES_RAW_PATH: str = "./raw/Doctor_Notes_Shared_051225.xlsx"
LAB_RESULTS_RAW_PATH: str = "./raw/Lab_Reports_Shared_051225.xlsx"
RADIOLOGY_RAW_PATH: str = "./raw/Radiology_CT_Reports_Shared_051225.xlsx"
VITAL_SIGNS_RAW_PATH: str = "./raw/Vital_Signs_Shared_091225.xlsx"
OUTPUT_ROOT_PATH: str = "./output"


def main():
    """
    Main function to orchestrate the data processing pipeline.
    """
    print("=" * 80)
    print("FMH Data Processor - Starting")
    print("=" * 80)

    # Ensure output directory exists
    ensure_output_directory(OUTPUT_ROOT_PATH)

    # Step 1: Load all raw files
    print("\n[Step 1] Loading raw files...")
    doctor_notes_df = load_excel(DOCTOR_NOTES_RAW_PATH)
    lab_results_df = load_excel(LAB_RESULTS_RAW_PATH)
    radiology_df = load_excel(RADIOLOGY_RAW_PATH)
    vital_signs_df = load_excel(VITAL_SIGNS_RAW_PATH)

    # Step 2: Process each dataset
    print("\n[Step 2] Processing data...")

    print("\n  Processing Patients...")
    patients_final = process_patients(
        doctor_notes_df, lab_results_df, radiology_df, vital_signs_df
    )

    print("\n  Processing Lab Results...")
    lab_results_final = process_lab_results(lab_results_df)

    print("\n  Processing Radiology...")
    radiology_final = process_radiology(radiology_df)

    print("\n  Processing Vital Signs...")
    vital_signs_final = process_vital_signs(vital_signs_df)

    print("\n  Processing Encounters...")
    encounters_final = process_encounters(doctor_notes_df)

    # Step 3: Save all processed files
    print("\n[Step 3] Saving output files...")

    save_excel(patients_final, os.path.join(OUTPUT_ROOT_PATH, "Patients.xlsx"))
    save_excel(lab_results_final, os.path.join(OUTPUT_ROOT_PATH, "Lab_Results.xlsx"))
    save_excel(radiology_final, os.path.join(OUTPUT_ROOT_PATH, "Radiology.xlsx"))
    save_excel(vital_signs_final, os.path.join(OUTPUT_ROOT_PATH, "Vital_Signs.xlsx"))
    save_excel(encounters_final, os.path.join(OUTPUT_ROOT_PATH, "Encounter.xlsx"))

    print("\n" + "=" * 80)
    print("FMH Data Processor - Completed Successfully")


if __name__ == "__main__":
    main()
