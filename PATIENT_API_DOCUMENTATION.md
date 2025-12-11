# Patient API Documentation

This document describes the patient management API endpoints implemented in the MIDAS system.

## Architecture

The system uses a **Next.js API route proxy** that forwards requests to a **Flask backend**:

```
Frontend → Next.js API Routes (/api/patients) → Flask Backend (localhost:5000) → JSON Files (data/)
```

## Flask Backend Endpoints

### Base URL
`http://localhost:5000`

### 1. Get All Patients

**Endpoint:** `GET /patients`

**Description:** Returns a list of all patients with minimal fields for the patients list page.

**Response:**
```json
[
  {
    "patient_id": "P001",
    "personal_information": {
      "salutation": "Mrs",
      "name": "Yasmeen Pervaiz",
      "age": 65,
      "sex": "Female"
    },
    "last_visit": "2025-10-28"
  },
  ...
]
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### 2. Get Patient by ID

**Endpoint:** `GET /patients/<patient_id>`

**Description:** Returns complete patient data for a specific patient.

**Parameters:**
- `patient_id` (path parameter) - The patient ID (e.g., P001, P002)

**Example:** `GET /patients/P001`

**Response:**
```json
{
  "patient_id": "P001",
  "personal_information": {
    "salutation": "Mrs",
    "name": "Yasmeen Pervaiz",
    "age": 65,
    "sex": "Female",
    "ethnicity": "South Asian/punjabi",
    "occupation": "Retired school teacher",
    "family_history": {
      "hypertension": true,
      "osteoarthritis": true
    },
    "social_determinants": {
      "smoking_status": "Non-smoker",
      "physical_activity": "Low to moderate",
      "diet": "Balanced, low in protein",
      "hearing_impairment": "Uses hearing aids",
      "access_to_healthcare": "unknown"
    }
  },
  "vitals": { ... },
  "lab_results": [ ... ],
  "medical_imagery": [ ... ],
  "clinical_notes": { ... },
  "medications": [ ... ],
  "current_symptoms": [ ... ],
  "known_medical_history": [ ... ],
  "diagnosis": { ... },
  "last_visit": "2025-10-28"
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Patient not found
- `500 Internal Server Error` - Server error

---

### 3. Create New Patient

**Endpoint:** `POST /patients`

**Description:** Creates a new patient and saves it as a JSON file in the data directory.

**Request Body:**
```json
{
  "name": "John Doe",
  "salutation": "Mr",
  "age": 45,
  "sex": "Male",
  "email": "john.doe@example.com",
  "phone": "+1-555-0123",
  "smoking_status": "Non-smoker",
  "physical_activity": "Moderate",
  "diet": "Balanced",
  "weight_kg": 75,
  "blood_pressure_mmHg": "120/80",
  "heart_rate_bpm": 72,
  "spo2_percent": 98,
  "temperature": "98.6"
}
```

**Required Fields:**
- `name` (string)
- `age` (integer)
- `sex` (string)

**Optional Fields:**
- `salutation` (string)
- `email` (string)
- `phone` (string)
- `ethnicity` (string)
- `occupation` (string)
- `smoking_status` (string)
- `physical_activity` (string)
- `diet` (string)
- `weight_kg` (number)
- `blood_pressure_mmHg` (string)
- `heart_rate_bpm` (number)
- `spo2_percent` (number)
- `temperature` (string)

**Response:**
Returns the complete patient data with the generated `patient_id`.

**Status Codes:**
- `201 Created` - Patient successfully created
- `400 Bad Request` - Missing required fields or invalid data
- `500 Internal Server Error` - Server error

---

### 4. Update Patient

**Endpoint:** `PUT /patients/<patient_id>`

**Description:** Updates an existing patient's data.

**Parameters:**
- `patient_id` (path parameter) - The patient ID (e.g., P001, P002)

**Request Body:**
Any patient fields to update (partial update supported).

**Example:** `PUT /patients/P001`
```json
{
  "vitals": {
    "blood_pressure_mmHg": "125/82",
    "weight_kg": 68
  }
}
```

**Response:**
Returns the complete updated patient data.

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid data
- `404 Not Found` - Patient not found
- `500 Internal Server Error` - Server error

---

## Next.js API Routes (Frontend)

The frontend uses Next.js API routes that proxy requests to the Flask backend:

### Frontend Endpoints

- `GET /api/patients` → Forwards to Flask `GET /patients`
- `POST /api/patients` → Forwards to Flask `POST /patients`
- `GET /api/patients/[id]` → Forwards to Flask `GET /patients/[id]`
- `PUT /api/patients/[id]` → Forwards to Flask `PUT /patients/[id]`

These endpoints handle the communication between the Next.js frontend and the Flask backend.

---

## Data Storage

Patient data is stored as JSON files in the `data/` directory:
- Format: `P<XXX>.json` (e.g., P001.json, P002.json)
- Auto-incrementing patient IDs
- `last_visit` field is automatically updated on patient creation/modification

---

## Running the Services

### Start Flask Backend
```bash
cd backend
python app.py
```
The Flask server will run on `http://localhost:5000`

### Start Next.js Frontend
```bash
cd frontend
npm run dev
```
The Next.js server will run on `http://localhost:3000`

---

## Error Handling

All endpoints return errors in the following format:
```json
{
  "error": "Error message description"
}
```

Common error scenarios:
- Missing required fields (400)
- Patient not found (404)
- File I/O errors (500)
- Invalid JSON format (400)

---

## Implementation Details

### Backend Structure
- `backend/app.py` - Flask application with patient endpoints
- `backend/utils/patients.py` - Patient data management utilities
  - `get_all_patients()` - Reads all patient JSON files
  - `get_patient_by_id(patient_id)` - Reads specific patient file
  - `create_patient(data)` - Creates new patient JSON file
  - `update_patient(patient_id, data)` - Updates existing patient file

### Frontend Structure
- `app/api/patients/route.ts` - GET all patients, POST new patient
- `app/api/patients/[id]/route.ts` - GET/PUT specific patient
- `frontend/app/page.tsx` - Patients list page
- `frontend/app/patient/page.tsx` - Patient detail page

---

## Testing the API

### Using curl

**Get all patients:**
```bash
curl http://localhost:5000/patients
```

**Get specific patient:**
```bash
curl http://localhost:5000/patients/P001
```

**Create new patient:**
```bash
curl -X POST http://localhost:5000/patients \
  -H "Content-Type: application/json" \
  -d '{"name": "Jane Smith", "age": 35, "sex": "Female"}'
```

**Update patient:**
```bash
curl -X PUT http://localhost:5000/patients/P001 \
  -H "Content-Type: application/json" \
  -d '{"vitals": {"weight_kg": 68}}'
```

