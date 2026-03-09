import pandas as pd
import os
from typing import Optional


def load_excel(file_path: str) -> Optional[pd.DataFrame]:
    """
    Load an Excel file and return as a DataFrame.
    
    Args:
        file_path: Path to the Excel file
        
    Returns:
        DataFrame or None if file doesn't exist
    """
    if not os.path.exists(file_path):
        print(f"Warning: File not found - {file_path}")
        return None
    
    try:
        df = pd.read_excel(file_path)
        print(f"Loaded {file_path}: {len(df)} rows")
        return df
    except Exception as e:
        print(f"Error loading {file_path}: {str(e)}")
        return None


def save_excel(df: pd.DataFrame, output_path: str, sheet_name: str = "Sheet1") -> bool:
    """
    Save a DataFrame to an Excel file.
    
    Args:
        df: DataFrame to save
        output_path: Path to save the Excel file
        sheet_name: Name of the sheet (default: Sheet1)
        
    Returns:
        True if successful, False otherwise
    """
    try:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_excel(output_path, sheet_name=sheet_name, index=False)
        print(f"Saved {output_path}: {len(df)} rows")
        return True
    except Exception as e:
        print(f"Error saving {output_path}: {str(e)}")
        return False


def ensure_output_directory(output_path: str) -> None:
    """
    Ensure the output directory exists.
    
    Args:
        output_path: Path to the output directory
    """
    os.makedirs(output_path, exist_ok=True)
    print(f"Output directory ready: {output_path}")
