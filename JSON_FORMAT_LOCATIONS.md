# JSON Input and Output Format Definitions

## Overview

This document outlines where the input JSON and final JSON formats are defined and transformed throughout the MIDAS application.

---

## 1. Frontend Type Definitions

### Location: `frontend/lib/patients.ts`

This TypeScript file defines the main interfaces for patient data:

#### Core Interfaces:

**`PatientData`** (List endpoint response)

```typescript
{
  patient_id: string;
  personal_information: PersonalInformationList;
  last_visit: string;
}
```

**`PersonalInformationList`** (For listing)

```typescript
{
  salutation: string;
  name: string;
  age: number;
  sex: string;
}
```

**`PatientDetail`** (Complete patient record - GET /api/patients/{id})

```typescript
{
  patient_id: string;
  personal_information: PersonalInformationDetail;
  vitals: Vitals;
  lab_results: LabResult[];
  medical_imagery: MedicalImagery[];
  clinical_notes: ClinicalNotes;
  medications: Medication[];
  current_symptoms: string[];
  known_medical_history: string[];
  diagnosis: Diagnosis;
}
```

**`PersonalInformationDetail`** (Comprehensive personal info)

```typescript
{
  salutation: string;
  name: string;
  age: number;
  sex: string;
  ethnicity: string;
  occupation: string;
  family_history: FamilyHistory;
  social_determinants: SocialDeterminants;
}
```

**`SocialDeterminants`** (SDOH data)

```typescript
{
  smoking_status: string;
  physical_activity: string;
  diet: string;
  hearing_impairment: string;
  access_to_healthcare: string;
}
```

**`Vitals`**

```typescript
{
  weight_kg: number;
  bmi_estimate: number;
  blood_pressure_mmHg: string;
  heart_rate_bpm: number;
  spo2_percent: number;
  temperature: string;
  blood_glucose: string;
}
```

**`Medication`**

```typescript
{
  name: string;
  dose: string;
  frequency: string;
  indication: string;
}
```

**`ClinicalNotes`**

```typescript
{
  summary: string;
  examination: string;
  assessment: string;
  plan: string[];
}
```

**`Diagnosis`**

```typescript
{
  probable_conditions: string[];
  treatment_suggestions: string[];
  medical_advice: string[];
}
```

---

## 2. Backend Data Processing

### Location: `backend/utils/parse_json.py`

This module **removes sensitive/large data** from the input JSON before sending to AI:

```python
def parse_data(data):
    data = json.loads(data)
    del data["lab_report_imgs"]        # Removes image data
    del data["medical_imagery"]        # Removes medical imagery
    del data["audio_transcriptions"]   # Removes audio transcriptions
    return data
```

**Purpose:** The parsed data is sent to the AI diagnosis endpoint with medical imaging and audio removed to focus on clinical data.

---

## 3. AI Diagnosis Generation

### Location: `backend/utils/diagnose.py`

This module generates a diagnosis from the processed patient data.

**Input to AI:**

- Processed patient JSON (from `parse_json.py`) - without images/audio
- Medical image (as base64)

**Output Format from AI:**

```json
{
  "diagnosis": "<AI generated diagnosis>",
  "reasoning": "<detailed reasoning from the model>"
}
```

**AI Model Details:**

- Model: `amsaravi/medgemma-4b-it:q6`
- Running on: Ollama (local)
- Response: Structured JSON with diagnosis and reasoning

---

## 4. Frontend Session Data Transformation

### Location: `frontend/components/ai-diagnosis.tsx`

This component merges session entries with patient data to create a **final comprehensive JSON**.

#### Merge Process:

1. **Start with:** Base patient data from API
2. **Add session entries** (from `SessionInstance` component):

   - Medications
   - Symptoms
   - Clinical notes
   - Medical imagery
   - Lab report images
   - Audio transcriptions

3. **Final merged JSON structure:**

```typescript
{
  ...originalPatientData,
  medications: [...originalMeds, ...sessionMeds],
  current_symptoms: [...originalSymptoms, ...sessionSymptoms],
  medical_imagery: [...originalImaging, ...sessionImaging],
  lab_report_imgs: [...originalLabReports, ...sessionLabReports],
  audio_transcriptions: [...originalTranscriptions, ...sessionTranscriptions],
  clinical_notes: {
    summary: "original summary\n\n[Session Entry] new session entry",
    ...otherNotes
  }
}
```

#### Key State Variable:

```typescript
const [mergedData, setMergedData] = useState<any>(null);
```

---

## 5. PDF Generation

### Location: `frontend/components/ai-diagnosis.tsx` - `downloadReport()` function

**Input:**

- `mergedData` (final JSON from step 4)
- `aiDiagnosis` (string from AI model)

**Output:** Formatted PDF containing:

- Medical Report Header
- Patient Information
- Vitals
- Current Symptoms
- Medications
- Clinical Notes
- AI Diagnosis
- Social Determinants of Health
- Generation timestamp

**PDF Filename Format:**

```
medical-report-{patient_id}-{YYYY-MM-DD}.pdf
```

---

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GET /api/patients/{id}  ──→  Load PatientDetail               │
│         ↓                                                        │
│  display in PatientInfo.tsx (TypeScript interfaces)            │
│         ↓                                                        │
│  SessionInstance collects:                                      │
│  - Medications, Symptoms, Notes, Images, Audio                 │
│         ↓                                                        │
│  AIDiagnosis.tsx merges data:                                  │
│  - Combine session entries with patient data                   │
│  - Create merged JSON                                           │
│         ↓                                                        ↓
└─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /api/ai-diagnosis  ← receives merged JSON                │
│         ↓                                                        │
│  parse_json.py:                                                 │
│  - Remove lab_report_imgs, medical_imagery, audio_transcr.     │
│         ↓                                                        │
│  diagnose.py:                                                   │
│  - Send parsed data + base64 image to Ollama                   │
│  - Generate AI diagnosis                                        │
│         ↓                                                        ↓
│  Return: { "diagnosis": "...", "reasoning": "..." }            │
└─────────────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND - PDF EXPORT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  downloadReport():                                              │
│  - Input: mergedData + aiDiagnosis                             │
│  - Generate PDF with:                                           │
│    • Patient info from mergedData                              │
│    • Vitals from mergedData                                    │
│    • AI diagnosis from response                                │
│  - Save as: medical-report-{id}-{date}.pdf                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Key Transformation Points

| Location                            | Input                          | Output                                     | Purpose                      |
| ----------------------------------- | ------------------------------ | ------------------------------------------ | ---------------------------- |
| `patients.ts`                       | N/A                            | TypeScript Interfaces                      | Define type contracts        |
| `parse_json.py`                     | Full patient JSON              | Reduced JSON (no images)                   | Prepare data for AI analysis |
| `diagnose.py`                       | Reduced JSON + base64 image    | `{"diagnosis": "...", "reasoning": "..."}` | Generate AI diagnosis        |
| `ai-diagnosis.tsx`                  | Patient data + session entries | Merged comprehensive JSON                  | Combine all patient data     |
| `ai-diagnosis.tsx` (downloadReport) | Merged JSON + diagnosis        | PDF document                               | Export formatted report      |

---

## 8. JSON Evolution Through System

### Stage 1: Initial Patient Data (from API/database)

```json
{
  "patient_id": "P002",
  "personal_information": { ... },
  "vitals": { ... },
  ...
  "lab_report_imgs": [],
  "audio_transcriptions": []
}
```

### Stage 2: Parsed for AI (backend)

```json
{
  "patient_id": "P002",
  "personal_information": { ... },
  "vitals": { ... },
  ...
  // lab_report_imgs, medical_imagery, audio_transcriptions REMOVED
}
```

### Stage 3: After Session Entry Merge (frontend)

```json
{
  "patient_id": "P002",
  "personal_information": { ... },
  "vitals": { ... },
  ...
  "medications": [...originalMeds, ...newSessionMeds],
  "current_symptoms": [...original, ...sessionSymptoms],
  "medical_imagery": [...original, ...sessionImages],
  "lab_report_imgs": [...original, ...sessionLabImages],
  "audio_transcriptions": [...original, ...sessionTranscriptions],
  "clinical_notes": {
    "summary": "original\n\n[Session Entry] new"
  }
}
```

### Stage 4: PDF Export

```
MEDICAL REPORT
==============
Patient Information: [from mergedData]
Vitals: [from mergedData]
...
AI Diagnosis: [from aiDiagnosis response]
Generated on: [timestamp]
```

---

## 9. Configuration Files

### Frontend Type Safety: `frontend/lib/patients.ts`

- Defines all TypeScript interfaces
- Used across components for type checking
- Ensures consistency with backend response

### Backend Data Processing: `backend/utils/parse_json.py`

- Configurable deletion of fields
- Currently removes: `lab_report_imgs`, `medical_imagery`, `audio_transcriptions`
- Can be modified to include/exclude different fields

### AI Configuration: `backend/utils/diagnose.py`

- Model: `amsaravi/medgemma-4b-it:q6`
- URL: `http://localhost:11434/api/chat`
- Temperature: 0 (deterministic output)

---

## 10. API Endpoints

| Endpoint             | Method | Input      | Output                                     | File               |
| -------------------- | ------ | ---------- | ------------------------------------------ | ------------------ |
| `/api/patients`      | GET    | None       | `PatientData[]`                            | Frontend API route |
| `/api/patients/{id}` | GET    | patient_id | `PatientDetail`                            | Frontend API route |
| `/api/ai-diagnosis`  | POST   | mergedData | `{"diagnosis": "...", "reasoning": "..."}` | Backend app.py     |

---

## Summary

- **Input JSON Definition**: `frontend/lib/patients.ts` (TypeScript interfaces)
- **Data Transformation**: `backend/utils/parse_json.py` (remove sensitive data)
- **AI Processing**: `backend/utils/diagnose.py` (generate diagnosis)
- **Final JSON Creation**: `frontend/components/ai-diagnosis.tsx` (merge session + patient data)
- **PDF Export**: `frontend/components/ai-diagnosis.tsx` (format and download)
