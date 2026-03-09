import pandas as pd
from typing import List


def process_patients(
    doctor_notes_df: pd.DataFrame,
    lab_results_df: pd.DataFrame,
    radiology_df: pd.DataFrame,
    vital_signs_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Process and consolidate patient data from all raw files.

    Args:
        doctor_notes_df: DataFrame from Doctor Notes file
        lab_results_df: DataFrame from Lab Results file
        radiology_df: DataFrame from Radiology file
        vital_signs_df: DataFrame from Vital Signs file

    Returns:
        DataFrame with consolidated patient information
    """
    all_patients = []

    # Collect patients from Doctor Notes (NEW_MRNO)
    if doctor_notes_df is not None:
        patients_dn = doctor_notes_df[["NEW_MRNO", "GENDER", "DOB", "AGE"]].copy()
        patients_dn.rename(columns={"NEW_MRNO": "MRNO"}, inplace=True)
        all_patients.append(patients_dn)

    # Collect patients from Lab Results (PAT_MRNO)
    if lab_results_df is not None:
        patients_lr = lab_results_df[["PAT_MRNO", "GENDER", "DOB", "AGE"]].copy()
        patients_lr.rename(columns={"PAT_MRNO": "MRNO"}, inplace=True)
        all_patients.append(patients_lr)

    # Collect patients from Radiology (MRNO - already correct)
    if radiology_df is not None:
        patients_rad = radiology_df[["MRNO", "GENDER", "DOB", "AGE"]].copy()
        all_patients.append(patients_rad)

    # Collect patients from Vital Signs (NEW_MRNO)
    if vital_signs_df is not None:
        patients_vs = vital_signs_df[["NEW_MRNO", "GENDER", "DOB", "AGE"]].copy()
        patients_vs.rename(columns={"NEW_MRNO": "MRNO"}, inplace=True)
        all_patients.append(patients_vs)

    # Concatenate all patient data
    if not all_patients:
        return pd.DataFrame(columns=["MRNO", "name", "gender", "dob", "age", "history"])

    patients_combined = pd.concat(all_patients, ignore_index=True)

    # Remove duplicates, keeping the first occurrence
    patients_unique = patients_combined.drop_duplicates(subset=["MRNO"], keep="first")

    # Create history from radiology clinical history
    history_dict = {}
    if radiology_df is not None and "CLINICAL_HISTORY" in radiology_df.columns:
        for _, row in radiology_df.iterrows():
            mrno = row["MRNO"]
            if mrno not in history_dict and pd.notna(row.get("CLINICAL_HISTORY")):
                history_dict[mrno] = row["CLINICAL_HISTORY"]

    # Create final patient DataFrame
    patients_final = pd.DataFrame(
        {
            "MRNO": patients_unique["MRNO"],
            "name": "",  # Not present in current data
            "gender": patients_unique["GENDER"],
            "dob": patients_unique["DOB"],
            "age": patients_unique["AGE"],
            "history": patients_unique["MRNO"].map(history_dict).fillna(""),
        }
    )

    print(f"Processed {len(patients_final)} unique patients")
    return patients_final
