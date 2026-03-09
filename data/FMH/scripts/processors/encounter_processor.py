import pandas as pd


def process_encounters(doctor_notes_df: pd.DataFrame) -> pd.DataFrame:
    """
    Process encounter data from doctor notes raw file to final format.
    
    Note: Raw file uses NEW_MRNO, output standardizes to MRNO
    
    Args:
        doctor_notes_df: DataFrame from Doctor Notes raw file (uses NEW_MRNO)
        
    Returns:
        DataFrame with processed encounter data (standardized to MRNO)
    """
    if doctor_notes_df is None:
        print("* No doctor notes data found in raw")
        return pd.DataFrame(columns=['MRNO', 'doctor_id', 'Encounter_date', 'doctor_notes'])
    
    # Select and rename columns (NEW_MRNO -> MRNO)
    encounters_final = pd.DataFrame({
        'MRNO': doctor_notes_df['NEW_MRNO'],
        'doctor_id': '',  # Not present in current data
        'Encounter_date': doctor_notes_df['NOTES_DATE'],
        'doctor_notes': doctor_notes_df['NOTES']
    })
    
    print(f"Processed {len(encounters_final)} encounter records")
    return encounters_final
