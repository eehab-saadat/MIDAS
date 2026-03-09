import pandas as pd


def process_lab_results(lab_results_df: pd.DataFrame) -> pd.DataFrame:
    """
    Process lab results data from raw file to final format.
    
    Note: Raw file uses PAT_MRNO, output standardizes to MRNO
    
    Args:
        lab_results_df: DataFrame from Lab Results raw file (uses PAT_MRNO)
        
    Returns:
        DataFrame with processed lab results (standardized to MRNO)
    """
    if lab_results_df is None:
        print("* No lab results data found in raw")
        return pd.DataFrame(columns=['MRNO', 'CPT_ID', 'CPT_NAME', 'TEST', 
                                    'RESULT_NUMERIC', 'INVOICE_DATE'])
    
    # Select and rename columns (PAT_MRNO -> MRNO)
    lab_results_final = pd.DataFrame({
        'MRNO': lab_results_df['PAT_MRNO'],
        'CPT_ID': lab_results_df['CPT_ID'],
        'CPT_NAME': lab_results_df['CPT_NAME'],
        'TEST': lab_results_df['TEST'],
        'RESULT_NUMERIC': lab_results_df['RESULT_NUMERIC'],
        'INVOICE_DATE': lab_results_df['INVOICE_DATE']
    })
    
    print(f"Processed {len(lab_results_final)} lab results")
    return lab_results_final
