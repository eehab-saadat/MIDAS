import json

def parse_data(data):
    """Parse and clean patient data for diagnosis.
    
    Removes image data and medical imagery to reduce payload size,
    but keeps audio transcriptions for clinical context.
    """
    data = json.loads(data)
    
    # Remove large binary data fields that aren't needed for text analysis
    data.pop("lab_report_imgs", None)
    data.pop("medical_imagery", None)
    
    return data

if __name__ == "__main__":
    with open("data/sample_data.json", "r") as f:
        data = f.read()
    parsed_data = parse_data(data)
    print(parsed_data)