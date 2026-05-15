import json
import logging
import sys
from pathlib import Path

# Add the parent directory to sys.path to allow importing diagnosis
sys.path.append(str(Path(__file__).resolve().parent.parent))

from diagnosis.engine import generate_diagnosis

# Configure logging to see RAG retrieval details
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def test_rag_and_diagnosis():
    # Path to a sample patient record
    patient_json_path = Path(r"E:\FYP\MIDAS\data\fake\json\P001.json")
    
    if not patient_json_path.exists():
        print(f"Error: {patient_json_path} not found.")
        return

    print(f"--- Loading patient data from {patient_json_path.name} ---")
    with open(patient_json_path, 'r', encoding='utf-8') as f:
        patient_data = json.load(f)

    print("\n--- Starting Diagnosis Engine (RAG + MedGemma) ---")
    try:
        # Call the diagnosis engine
        # Note: seed_path is hardcoded in rag.py init_store default, 
        # but we can pass it here if needed.
        result = generate_diagnosis(patient_data)
        
        print("\n" + "="*50)
        print("DIAGNOSIS RESULT")
        print("="*50)
        print(f"Diagnosis: {result.get('diagnosis')}")
        print("-" * 30)
        print(f"Reasoning: {result.get('reasoning')}")
        print("="*50)
        
    except Exception as e:
        print(f"\nError during diagnosis: {e}")
        print("\nPossible causes:")
        print("1. Ollama is not running.")
        print("2. MedGemma model is not pulled (ollama pull amsaravi/medgemma-4b-it:q6).")
        print("3. Seed CSV is missing or at the wrong path.")

if __name__ == "__main__":
    test_rag_and_diagnosis()
