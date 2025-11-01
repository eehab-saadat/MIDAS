from flask import Flask, jsonify, request
from flask_cors import CORS
from utils.transcribe import transcribe_audio
from utils.patients import get_all_patients, get_patient_by_id, create_patient, update_patient
from utils.diagnose import generate_diagnosis
from utils.diagnose import encode_image_to_base64
from utils.parse_json import parse_data
import os
import tempfile
import logging
import time
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Request logging middleware
@app.before_request
def log_request():
    request.start_time = time.time()
    logger.info(f"{'='*60}")
    logger.info(f"→ REQUEST: {request.method} {request.path}")
    if request.args:
        logger.info(f"  Query Params: {dict(request.args)}")
    if request.method in ['POST', 'PUT', 'PATCH']:
        content_type = request.headers.get('Content-Type', '')
        if 'application/json' in content_type:
            try:
                logger.info(f"  Request Body: {request.get_json()}")
            except:
                logger.info(f"  Request Body: [Could not parse JSON]")
        elif 'multipart/form-data' in content_type:
            logger.info(f"  Form Data: {list(request.files.keys())}")

@app.after_request
def log_response(response):
    if hasattr(request, 'start_time'):
        duration = (time.time() - request.start_time) * 1000  # Convert to ms
        logger.info(f"← RESPONSE: {response.status_code} | Duration: {duration:.2f}ms")
    logger.info(f"{'='*60}\n")
    return response


@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint that returns a simple response."""
    logger.info("Health check requested")
    return jsonify({"status": "ok", "message": "pong"}), 200


@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio file to text."""
    logger.info("Starting audio transcription")
    
    if 'audio' not in request.files:
        logger.warning("No audio file provided in request")
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    if audio_file.filename == '':
        logger.warning("Empty filename provided")
        return jsonify({"error": "Empty filename"}), 400

    try:
        # Save audio to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        
        file_size = os.path.getsize(temp_path)
        logger.info(f"  Audio file saved: {temp_path} (Size: {file_size/1024:.2f}KB)")
        
        # Transcribe
        logger.info("  Processing transcription...")
        transcription = transcribe_audio(temp_path)
        logger.info(f"  ✅ Transcription successful (Length: {len(transcription)} chars)")
        
        # Cleanup
        os.unlink(temp_path)
        
        return jsonify({"transcription": transcription}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/diagnose', methods=['POST'])
def diagnose():
    """Generate diagnosis from text and image."""
    try:
        data_json = request.form.get('data', '')
        if not data_json:
            return jsonify({"error": "No data provided"}), 400
        data = parse_data(data_json)
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"error": "Empty filename"}), 400
        image_base64 = encode_image_to_base64(image_file)
        diagnosis_result = generate_diagnosis(data, image_base64)
        return jsonify(diagnosis_result), 200
    except Exception as e:
        logger.error(f"❌ Transcription error: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/patients', methods=['GET'])
def get_patients():
    """Get all patients with minimal fields for the patients list page."""
    logger.info("Fetching all patients")
    try:
        patients = get_all_patients()
        logger.info(f"  Retrieved {len(patients)} patients")
        for patient in patients:
            logger.debug(f"    - {patient['patient_id']}: {patient['personal_information']['name']}")
        return jsonify(patients), 200
    except Exception as e:
        logger.error(f"Error fetching patients: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/patients/<patient_id>', methods=['GET'])
def get_patient(patient_id):
    """Get complete patient data by patient ID."""
    logger.info(f" Fetching patient: {patient_id}")
    try:
        patient = get_patient_by_id(patient_id)
        if patient is None:
            logger.warning(f"  Patient not found: {patient_id}")
            return jsonify({"error": "Patient not found"}), 404

        logger.info(f"  Retrieved patient: {patient['personal_information']['name']}")
        logger.debug(f"    Age: {patient['personal_information']['age']}, Sex: {patient['personal_information']['sex']}")
        return jsonify(patient), 200
    except Exception as e:
        logger.error(f"Error fetching patient {patient_id}: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/patients', methods=['POST'])
def add_patient():
    """Create a new patient."""
    logger.info("Creating new patient")
    try:
        data = request.get_json()
        if not data:
            logger.warning("No data provided")
            return jsonify({"error": "No data provided"}), 400
        
        logger.info(f"  Patient data received: {data.get('name', 'N/A')}, Age: {data.get('age', 'N/A')}, Sex: {data.get('sex', 'N/A')}")
        
        # Validate required fields
        required_fields = ['name', 'age', 'sex']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            logger.warning(f"  Missing required fields: {', '.join(missing_fields)}")
            return jsonify({"error": f"Missing required field: {missing_fields[0]}"}), 400
        
        new_patient = create_patient(data)
        logger.info(f"  Patient created successfully: {new_patient['patient_id']} - {new_patient['personal_information']['name']}")
        return jsonify(new_patient), 201
    except Exception as e:
        logger.error(f"Error creating patient: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route('/patients/<patient_id>', methods=['PUT'])
def update_patient_endpoint(patient_id):
    """Update an existing patient's data."""
    logger.info(f"Updating patient: {patient_id}")
    try:
        data = request.get_json()
        if not data:
            logger.warning("No data provided")
            return jsonify({"error": "No data provided"}), 400
        
        logger.info(f"  Update fields: {list(data.keys())}")
        
        updated_patient = update_patient(patient_id, data)
        if updated_patient is None:
            logger.warning(f"  Patient not found: {patient_id}")
            return jsonify({"error": "Patient not found"}), 404
        
        logger.info(f"  Patient updated successfully: {updated_patient['personal_information']['name']}")
        return jsonify(updated_patient), 200
    except Exception as e:
        logger.error(f"Error updating patient {patient_id}: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    logger.info("="*60)
    logger.info("🚀 Starting MIDAS Backend Server")
    logger.info(f"   Host: 0.0.0.0")
    logger.info(f"   Port: 5000")
    logger.info(f"   Debug Mode: True")
    logger.info(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("="*60 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
