# FMH Data Processor

A modular Python application to process raw Excel files from FMH (Fatima Memorial Hospital) and convert them into structured output files for further analysis.

## Project Structure

```
scripts/
├── main.py                          # Main entry point
├── requirements.txt                  # Python dependencies
├── README.md                        # This file
├── raw/                            # Raw input Excel files
│   ├── Doctor_Notes_Shared_051225.xlsx
│   ├── Lab_Reports_Shared_051225.xlsx
│   ├── Radiology_CT_Reports_Shared_051225.xlsx
│   └── Vital_Signs_Shared_091225.xlsx
├── output/                         # Processed output files (generated)
│   ├── Patients.xlsx
│   ├── Lab_Results.xlsx
│   ├── Radiology.xlsx
│   ├── Vital_Signs.xlsx
│   └── Encounter.xlsx
├── processors/                     # Data processing modules
│   ├── __init__.py
│   ├── patients_processor.py
│   ├── lab_results_processor.py
│   ├── radiology_processor.py
│   ├── vital_signs_processor.py
│   └── encounter_processor.py
└── utils/                         # Utility modules
    ├── __init__.py
    └── file_handler.py
```

## Installation

1. Ensure you have Python 3.8 or higher installed
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

Run the main script from the scripts directory:

```bash
python main.py
```

The script will:
1. Load all raw Excel files from the `raw/` directory
2. Process and transform the data according to the specified schemas
3. Save the output files to the `output/` directory

## Input Data Structure

### Raw Files

1. **Doctor Notes** (`Doctor_Notes_Shared_051225.xlsx`)
   - NEW_MRNO, GENDER, DOB, AGE, NOTES_DATE, NOTES

2. **Lab Results** (`Lab_Reports_Shared_051225.xlsx`)
   - PAT_MRNO, GENDER, DOB, AGE, CPT_ID, CPT_NAME, TEST, RESULT_NUMERIC, INVOICE_DATE

3. **Radiology** (`Radiology_CT_Reports_Shared_051225.xlsx`)
   - MRNO, GENDER, DOB, AGE, RESULT_DATE, CPT_ID, CPT, CLINICAL_HISTORY, TECHNIQUE, RESULT, CONCLUSION

4. **Vital Signs** (`Vital_Signs_Shared_091225.xlsx`)
   - NEW_MRNO, GENDER, DOB, AGE, WEIGHT, WEIGHT_UNIT_ID, HEIGHT, HEIGHT_UNIT_ID, TEMPRATURE, TEMPRATURE_UNIT_ID, PLUSE, PLUSE_UNIT_ID, RESPIRATORY_RATE, RESPIRATORY_RATE_UNIT_ID, BLOOD_PRESSURE_HIGH, BLOOD_PRESSURE_LOW

## Output Data Structure

### Processed Files

1. **Patients.xlsx**
   - MRNO, name, gender, dob, age, history
   - Contains unique patients from all raw files

2. **Lab_Results.xlsx**
   - MRNO, CPT_ID, CPT_NAME, TEST, RESULT_NUMERIC, INVOICE_DATE

3. **Radiology.xlsx**
   - MRNO, CPT_ID, CPT_NAME, TECHNIQUE, RESULT, CONCLUSION, file_path

4. **Vital_Signs.xlsx**
   - MRNO, timestamp, WEIGHT, WEIGHT_UNIT_ID, HEIGHT, HEIGHT_UNIT_ID, TEMPRATURE, TEMPRATURE_UNIT_ID, PLUSE, PLUSE_UNIT_ID, RESPIRATORY_RATE, RESPIRATORY_RATE_UNIT_ID, BLOOD_PRESSURE_HIGH, BLOOD_PRESSURE_LOW

5. **Encounter.xlsx**
   - MRNO, doctor_id, Encounter_date, doctor_notes

## Features

- **Modular Design**: Each data type has its own processor module
- **Error Handling**: Graceful handling of missing files and data errors
- **Logging**: Progress tracking and summary statistics
- **Data Consolidation**: Merges patient information from multiple sources
- **Type Safety**: Proper column naming and data type handling

## Notes

- MRNO is the unique patient identifier across all files (NEW_MRNO == PAT_MRNO == MRNO)
- Some fields are left empty as they are not present in the current data (name, timestamp, doctor_id, file_path)
- The script automatically creates the output directory if it doesn't exist

## Troubleshooting

If you encounter errors:
1. Ensure all raw files exist in the `raw/` directory
2. Check that file names match those specified in `main.py`
3. Verify that the Excel files are not corrupted and have the expected columns
4. Make sure you have write permissions for the output directory
