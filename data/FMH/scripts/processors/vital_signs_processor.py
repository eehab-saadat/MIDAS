import pandas as pd


def process_vital_signs(vital_signs_df: pd.DataFrame) -> pd.DataFrame:
    """
    Process vital signs data from raw file to final format.

    Note: Raw file uses NEW_MRNO, output standardizes to MRNO

    Args:
        vital_signs_df: DataFrame from Vital Signs raw file (uses NEW_MRNO)

    Returns:
        DataFrame with processed vital signs data (standardized to MRNO)
    """
    if vital_signs_df is None:
        print("* No vital signs data found in raw")
        return pd.DataFrame(
            columns=[
                "MRNO",
                "timestamp",
                "WEIGHT",
                "WEIGHT_UNIT_ID",
                "HEIGHT",
                "HEIGHT_UNIT_ID",
                "TEMPRATURE",
                "TEMPRATURE_UNIT_ID",
                "PLUSE",
                "PLUSE_UNIT_ID",
                "RESPIRATORY_RATE",
                "RESPIRATORY_RATE_UNIT_ID",
                "BLOOD_PRESSURE_HIGH",
                "BLOOD_PRESSURE_LOW",
            ]
        )

    # Select and rename columns (NEW_MRNO -> MRNO)
    vital_signs_final = pd.DataFrame(
        {
            "MRNO": vital_signs_df["NEW_MRNO"],
            "timestamp": "",  # Not present in current data
            "WEIGHT": vital_signs_df["WEIGHT"],
            "WEIGHT_UNIT_ID": vital_signs_df["WEIGHT_UNIT_ID"],
            "HEIGHT": vital_signs_df["HEIGHT"],
            "HEIGHT_UNIT_ID": vital_signs_df["HEIGHT_UNIT_ID"],
            "TEMPRATURE": vital_signs_df["TEMPRATURE"],
            "TEMPRATURE_UNIT_ID": vital_signs_df["TEMPRATURE_UNIT_ID"],
            "PLUSE": vital_signs_df["PLUSE"],
            "PLUSE_UNIT_ID": vital_signs_df["PLUSE_UNIT_ID"],
            "RESPIRATORY_RATE": vital_signs_df["RESPIRATORY_RATE"],
            "RESPIRATORY_RATE_UNIT_ID": vital_signs_df["RESPIRATORY_RATE_UNIT_ID"],
            "BLOOD_PRESSURE_HIGH": vital_signs_df["BLOOD_PRESSURE_HIGH"],
            "BLOOD_PRESSURE_LOW": vital_signs_df["BLOOD_PRESSURE_LOW"],
        }
    )

    print(f"Processed {len(vital_signs_final)} vital signs records")
    return vital_signs_final
