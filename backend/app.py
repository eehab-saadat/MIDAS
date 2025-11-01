from flask import Flask, jsonify, request
from flask_cors import CORS
from utils.transcribe import transcribe_audio
from utils.diagnose import generate_diagnosis
from utils.diagnose import encode_image_to_base64
from utils.parse_json import parse_data
import os
import tempfile

app = Flask(__name__)
CORS(app)

@app.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint that returns a simple response."""
    return jsonify({"status": "ok", "message": "pong"}), 200

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """Transcribe audio file to text."""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    audio_file = request.files['audio']
    if audio_file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            audio_file.save(temp_file.name)
            temp_path = temp_file.name
        transcription = transcribe_audio(temp_path)
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
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)