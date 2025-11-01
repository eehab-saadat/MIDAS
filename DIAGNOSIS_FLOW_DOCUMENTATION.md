# AI Diagnosis Flow Documentation

## Overview
This document describes the complete flow of the AI diagnosis feature in MIDAS, including the fix that connects the frontend to the MedGemma model via the Flask backend.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ Clicks "Get AI Diagnosis"
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND: ai-diagnosis.tsx                                          │
│  - Merges session entries with patient data                          │
│  - Combines meds, symptoms, clinical notes, imaging, audio           │
│  - POSTs to /api/ai-diagnosis                                        │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ POST Request with JSON payload
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  NEXT.JS API: frontend/app/api/ai-diagnosis/route.ts                │
│  - Receives merged patient data                                      │
│  - Extracts first medical image (lab_report_imgs or medical_imagery) │
│  - Converts base64 image to Blob                                     │
│  - Creates FormData with 'data' (JSON) and 'image' (file)           │
│  - Forwards to Flask backend at http://localhost:5000/diagnose      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ POST FormData
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FLASK BACKEND: backend/app.py                                       │
│  Endpoint: POST /diagnose                                            │
│  - Receives form data with 'data' and 'image'                        │
│  - Parses JSON data using parse_data()                               │
│  - Encodes image to base64 using encode_image_to_base64()           │
│  - Calls generate_diagnosis(data, image_base64)                      │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  UTILITY: backend/utils/parse_json.py                                │
│  - Cleans patient data                                               │
│  - Removes large binary fields (lab_report_imgs, medical_imagery)    │
│  - Keeps audio_transcriptions for context                            │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  UTILITY: backend/utils/diagnose.py                                  │
│  Function: encode_image_to_base64()                                  │
│  - Converts uploaded file to PIL Image                               │
│  - Saves as PNG to BytesIO buffer                                    │
│  - Encodes to base64 string                                          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  UTILITY: backend/utils/diagnose.py                                  │
│  Function: generate_diagnosis(data, image)                           │
│  - Constructs prompt for medical AI assistant                        │
│  - Adds patient data context                                         │
│  - Attaches base64 image                                             │
│  - Sends to Ollama API at http://localhost:11434/api/chat           │
│  - Model: amsaravi/medgemma-4b-it:q6                                 │
│  - Temperature: 0 (deterministic)                                     │
│  - Timeout: 120 seconds                                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ JSON response
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  OLLAMA + MEDGEMMA MODEL                                             │
│  - Analyzes patient data and medical image                           │
│  - Generates diagnosis with detailed reasoning                       │
│  - Returns JSON: {"diagnosis": "...", "reasoning": "..."}           │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │ Response flows back up the chain
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  RESPONSE PARSING                                                     │
│  - Extract JSON from markdown code blocks if present                 │
│  - Parse and validate required fields                                │
│  - Handle errors gracefully                                          │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND DISPLAY                                                     │
│  - Formats diagnosis with reasoning                                  │
│  - Shows in AI Diagnosis card                                        │
│  - Enables PDF download with full report                             │
└──────────────────────────────────────────────────────────────────────┘
```

## Key Changes Made

### 1. Fixed Next.js API Route (`frontend/app/api/ai-diagnosis/route.ts`)

**BEFORE:**
- Returned dummy/mock diagnosis text
- Never called the Flask backend
- No actual AI model involved

**AFTER:**
- Extracts medical image from session data
- Converts base64 to Blob for multipart form data
- Forwards request to Flask backend at `http://localhost:5000/diagnose`
- Returns real diagnosis from MedGemma model
- Proper error handling with informative messages

### 2. Enhanced Flask Backend (`backend/app.py`)

**BEFORE:**
- Minimal logging
- Error message said "Transcription error" (wrong context)

**AFTER:**
- Comprehensive logging at each step
- Proper error messages specific to diagnosis
- Validates data and image presence
- Logs success/failure clearly

### 3. Fixed Data Parser (`backend/utils/parse_json.py`)

**BEFORE:**
- Used `del` which would crash if keys didn't exist
- Removed `audio_transcriptions` (needed for context)

**AFTER:**
- Uses `pop()` with default values for safe removal
- Keeps `audio_transcriptions` for clinical context
- Only removes large binary data (`lab_report_imgs`, `medical_imagery`)

### 4. Enhanced Diagnosis Utility (`backend/utils/diagnose.py`)

**BEFORE:**
- Basic functionality
- Minimal error handling
- No detailed logging

**AFTER:**
- Comprehensive logging throughout the process
- Timeout handling (120 seconds)
- Better error messages
- Logs model calls, response parsing, and results
- Handles multiple JSON formats from model response

## Data Flow Example

### Request Payload Structure

```json
{
  "patient_id": "P001",
  "personal_information": {
    "name": "John Doe",
    "age": 45,
    "sex": "Male",
    "ethnicity": "Caucasian"
  },
  "vitals": {
    "blood_pressure_mmHg": "140/90",
    "heart_rate_bpm": 78,
    "temperature": 98.6,
    "spo2_percent": 97
  },
  "current_symptoms": [
    "chest pain",
    "shortness of breath"
  ],
  "medications": [
    {
      "name": "Aspirin",
      "dose": "81mg",
      "frequency": "Daily"
    }
  ],
  "clinical_notes": {
    "summary": "Patient presents with chest discomfort..."
  },
  "audio_transcriptions": [
    "Patient reports pain radiating to left arm..."
  ],
  "lab_report_imgs": [
    {
      "file_name": "chest_xray.jpg",
      "file_type": "image/jpeg",
      "base64_data": "iVBORw0KGgoAAAANSUhEUg..."
    }
  ]
}
```

### FormData Sent to Flask

```
data: '{"patient_id":"P001","personal_information":{...},"vitals":{...}}'
image: <Blob: image/jpeg>
```

### Response from MedGemma

```json
{
  "diagnosis": "Possible acute coronary syndrome",
  "reasoning": "Based on the clinical presentation of chest pain with radiation to the left arm, combined with the patient's age and cardiovascular risk factors visible in the imaging, there is concern for acute coronary syndrome. The ECG changes and troponin levels would be critical for definitive diagnosis. Immediate cardiology consultation is recommended."
}
```

### Final Response to Frontend

```json
{
  "success": true,
  "diagnosis": "DIAGNOSIS: Possible acute coronary syndrome\n\nREASONING:\nBased on the clinical presentation...\n\nGenerated: 11/1/2025, 10:30:00 AM",
  "raw_diagnosis": "Possible acute coronary syndrome",
  "raw_reasoning": "Based on the clinical presentation..."
}
```

## Configuration

### Environment Variables

```bash
# Frontend (.env.local or environment)
FLASK_BACKEND_URL=http://localhost:5000

# Backend (implicit, hardcoded)
OLLAMA_URL=http://localhost:11434/api/chat
MODEL=amsaravi/medgemma-4b-it:q6
```

## Prerequisites

1. **Ollama Running**: Must be running on `localhost:11434`
   ```bash
   ollama serve
   ```

2. **MedGemma Model**: Must be pulled
   ```bash
   ollama pull amsaravi/medgemma-4b-it:q6
   ```

3. **Flask Backend Running**: Must be running on port 5000
   ```bash
   cd backend
   python app.py
   ```

4. **Next.js Frontend Running**: Must be running on port 3000
   ```bash
   cd frontend
   npm run dev
   ```

## Error Handling

### No Medical Image
- **Status**: 400 Bad Request
- **Message**: "Unable to generate diagnosis: No medical image provided. Please add a medical image to the session."

### Ollama Not Running
- **Status**: 500 Internal Server Error
- **Message**: "Unable to connect to Ollama. Make sure Ollama is running locally on port 11434."

### Request Timeout
- **Status**: 500 Internal Server Error
- **Message**: "Request timed out. The model may be processing. Please try again."

### Invalid Model Response
- **Status**: 500 Internal Server Error
- **Message**: "Invalid response format: missing 'diagnosis' or 'reasoning' field"

## Logging

The system provides comprehensive logging at multiple levels:

### Frontend (Browser Console)
```
=== AI DIAGNOSIS API REQUEST ===
Patient Data with Session Entries:
{ patient_id: "P001", ... }
================================
Calling Flask backend at: http://localhost:5000/diagnose
Using lab report image: chest_xray.jpg
```

### Backend (Flask Logs)
```
2025-11-01 10:30:00 [INFO] __main__ - ============================================================
2025-11-01 10:30:00 [INFO] __main__ - → REQUEST: POST /diagnose
2025-11-01 10:30:00 [INFO] __main__ - Starting AI diagnosis generation
2025-11-01 10:30:00 [INFO] __main__ - Parsing patient data...
2025-11-01 10:30:00 [INFO] __main__ - Processing image: medical-image.jpg
2025-11-01 10:30:00 [INFO] diagnose - Image encoded to base64 (size: 123456 chars)
2025-11-01 10:30:00 [INFO] diagnose - Calling MedGemma model: amsaravi/medgemma-4b-it:q6
2025-11-01 10:30:00 [INFO] diagnose - Ollama URL: http://localhost:11434/api/chat
2025-11-01 10:30:00 [INFO] diagnose - Sending request to Ollama...
2025-11-01 10:30:45 [INFO] diagnose - ✅ Received response from Ollama
2025-11-01 10:30:45 [INFO] diagnose - Response length: 1234 chars
2025-11-01 10:30:45 [INFO] diagnose - Found JSON in markdown code block
2025-11-01 10:30:45 [INFO] diagnose - ✅ Successfully parsed diagnosis: Possible acute coronary syndrome...
2025-11-01 10:30:45 [INFO] __main__ - ✅ Diagnosis generated successfully
2025-11-01 10:30:45 [INFO] __main__ - ← RESPONSE: 200 | Duration: 45234.56ms
```

## Testing the Flow

### 1. Test with Existing Patient
1. Navigate to a patient page
2. Add medical imaging to session (lab report or imaging)
3. Add clinical notes, symptoms, or audio transcriptions
4. Click "Get AI Diagnosis"
5. Wait for MedGemma to process (typically 30-60 seconds)
6. View diagnosis and reasoning

### 2. Test Error Handling
- **No Image**: Try diagnosis without uploading an image
- **Ollama Down**: Stop Ollama and try diagnosis
- **Invalid Data**: Test with malformed patient data

### 3. Verify Backend Connection
Check Flask logs to ensure the request reaches the backend:
```bash
cd backend
python app.py
# Look for "→ REQUEST: POST /diagnose" in logs
```

## Future Enhancements

1. **Multiple Images**: Support analyzing multiple medical images
2. **Model Selection**: Allow choosing different AI models
3. **Streaming**: Stream diagnosis as it's generated
4. **History**: Save diagnosis history for each patient
5. **Confidence Scores**: Include confidence levels from the model
6. **Differential Diagnosis**: Support multiple possible diagnoses ranked by likelihood

## Troubleshooting

### "Failed to generate AI diagnosis"
- Ensure Flask backend is running
- Check `FLASK_BACKEND_URL` environment variable
- Verify network connectivity

### "Unable to connect to Ollama"
- Start Ollama: `ollama serve`
- Check if running: `curl http://localhost:11434`
- Verify port 11434 is not blocked

### "No medical image found"
- Upload at least one medical image in the session
- Check that image was uploaded successfully
- Verify image is visible in the session entries

### Slow Performance
- MedGemma model typically takes 30-60 seconds
- Check system resources (CPU/RAM/GPU)
- Consider using a smaller model for testing
- Verify Ollama is using GPU if available

## Summary

The diagnosis feature now properly integrates the frontend with the MedGemma AI model:

✅ **Frontend** → Collects and merges session data  
✅ **Next.js API** → Forwards to Flask backend  
✅ **Flask Backend** → Processes and validates data  
✅ **MedGemma Model** → Generates AI diagnosis  
✅ **Response Chain** → Returns diagnosis to user  

All components now work together seamlessly with comprehensive logging and error handling!

