import pandas as pd


def process_radiology(radiology_df: pd.DataFrame) -> pd.DataFrame:
    """
    Process radiology data from raw file to final format.

    Note: Raw file already uses MRNO (no renaming needed)

    Args:
        radiology_df: DataFrame from Radiology raw file (uses MRNO)

    Returns:
        DataFrame with processed radiology data (already uses MRNO)
    """
    if radiology_df is None:
        return pd.DataFrame(
            columns=[
                "MRNO",
                "CPT_ID",
                "CPT_NAME",
                "TECHNIQUE",
                "RESULT",
                "CONCLUSION",
                "file_path",
            ]
        )

    # Select columns (MRNO already correct, no renaming needed)
    radiology_final = pd.DataFrame(
        {
            "MRNO": radiology_df["MRNO"],
            "CPT_ID": radiology_df["CPT_ID"],
            "CPT_NAME": radiology_df["CPT"],
            "TECHNIQUE": radiology_df["TECHNIQUE"],
            "RESULT": radiology_df["RESULT"],
            "CONCLUSION": radiology_df["CONCLUSION"],
            "file_path": "",  # Not present in current data
        }
    )

    print(f"Processed {len(radiology_final)} radiology records")
    return radiology_final
