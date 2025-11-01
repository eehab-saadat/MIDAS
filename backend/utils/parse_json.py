import json

def parse_data(data):
    data = json.loads(data)
    del data["lab_report_imgs"]
    del data["medical_imagery"]
    del data["audio_transcriptions"]
    return data

if __name__ == "__main__":
    with open("data/sample_data.json", "r") as f:
        data = f.read()
    parsed_data = parse_data(data)
    print(parsed_data)