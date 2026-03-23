# Frontend API Integration

This directory contains all API client services for communicating with the Django REST Framework backend.

## Structure

```
lib/api/
├── client.ts          # Base API client with HTTP methods
├── patients.ts        # Patient endpoints
├── vitals.ts          # Vitals endpoints
├── clinicians.ts      # Clinician endpoints
├── encounters.ts      # Encounter endpoints
├── medications.ts     # Medication endpoints
├── radiology.ts       # Radiology endpoints
├── labs.ts            # Lab results endpoints
└── index.ts           # Central exports

types/
└── api.ts             # TypeScript types for all models
```

## Configuration

Set the API base URL in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Default: `http://localhost:8000/api`

## Usage

### Basic Example

```typescript
import { patientsAPI } from "@/lib/api";

// List all patients
const response = await patientsAPI.list({ page: 1, search: "John" });

// Get a specific patient
const patient = await patientsAPI.get(1);

// Create a patient
const newPatient = await patientsAPI.create({
  mrno: "MR-00123",
  name: "John Doe",
  gender: "Male",
  dob: "1985-04-15",
  history: "No significant past medical history.",
});

// Update a patient
const updated = await patientsAPI.patch(1, { name: "Jane Doe" });

// Delete a patient
await patientsAPI.delete(1);
```

### Get Patient-Related Data

```typescript
// Get all vitals for a patient
const vitals = await patientsAPI.getVitals(1);

// Get all encounters for a patient
const encounters = await patientsAPI.getEncounters(1);

// Get all medications for a patient
const medications = await patientsAPI.getMedications(1);

// Get all radiology reports for a patient
const radiology = await patientsAPI.getRadiology(1);

// Get all lab results for a patient
const labs = await patientsAPI.getLabs(1);
```

### Vitals API

```typescript
import { vitalsAPI } from "@/lib/api";

// List vitals for a specific patient
const vitals = await vitalsAPI.list({ patient: 1 });

// Create a vitals record
const vitals = await vitalsAPI.create({
  patient: 1,
  timestamp: "2025-11-01T09:30:00Z",
  weight: 72.5,
  weight_unit: "kg",
  height: 175.0,
  height_unit: "cm",
  temperature: 37.1,
  temperature_unit: "°C",
  pulse: 78.0,
  pulse_unit: "bpm",
  respiratory_rate: 16.0,
  respiratory_rate_unit: "breaths/min",
  bp_high: 120.0,
  bp_low: 80.0,
});
```

### Encounters API

```typescript
import { encountersAPI } from "@/lib/api";

// List encounters for a specific patient
const encounters = await encountersAPI.list({ patient: 1 });

// Create an encounter
const encounter = await encountersAPI.create({
  patient: 1,
  clinician: 3,
  date: "2025-11-01T10:00:00Z",
  notes: "## Chief Complaint\nPatient presents with chest pain.",
});
```

### Medications API

```typescript
import { medicationsAPI } from "@/lib/api";

// List medications for a specific patient
const medications = await medicationsAPI.list({ patient: 1 });

// Create a medication
const med = await medicationsAPI.create({
  patient: 1,
  prescribed_by: 3,
  prescribed_on: "2025-11-01",
  active_agent_name: "Atorvastatin",
  medication_name: "Lipitor 40mg",
  dosage: "40 mg",
  frequency: "Once daily at bedtime",
  indication: "Hypercholesterolemia",
});
```

### Radiology API

```typescript
import { radiologyAPI } from "@/lib/api";

// List radiology reports for a specific patient
const reports = await radiologyAPI.list({ patient: 1 });

// Create a radiology report
const report = await radiologyAPI.create({
  patient: 1,
  cpt_id: "71046",
  cpt_name: "Chest X-Ray (2 views)",
  technique: "PA and lateral projections of the chest.",
  result: "Lungs are clear. No pleural effusion.",
  conclusion: "No acute cardiopulmonary process.",
  system_conclusion: "Normal chest radiograph.",
  file_path: "/media/radiology/20251101_MR00123_71046.dcm",
});
```

### Lab Results API

```typescript
import { labsAPI } from "@/lib/api";

// List lab results for a specific patient
const labs = await labsAPI.list({ patient: 1 });

// Create a lab result
const lab = await labsAPI.create({
  patient: 1,
  cpt_id: "80053",
  cpt_name: "Comprehensive Metabolic Panel",
  results: {
    SODIUM: 138.0,
    POTASSIUM: 4.1,
    CHLORIDE: 102.0,
    CO2: 24.0,
  },
  invoice_date: "2025-11-01",
});
```

## Common Parameters

### List Endpoints

All list endpoints support:

- `page`: Page number (default: 1)
- `search`: Search term (searches designated fields)
- `ordering`: Sort field, prefix with `-` for descending (e.g., `-date`)

```typescript
// Example
const patients = await patientsAPI.list({
  page: 2,
  search: "Smith",
  ordering: "-dob",
});
```

### Filtering

Related data endpoints support filtering:

```typescript
// Get vitals for specific patient
const vitals = await vitalsAPI.list({ patient: 1 });

// Get encounters for specific clinician
const encounters = await encountersAPI.list({ clinician: 3 });
```

## Error Handling

All API methods throw `APIError` on failure:

```typescript
import { patientsAPI, APIError } from "@/lib/api";

try {
  const patient = await patientsAPI.get(999);
} catch (error) {
  if (error instanceof APIError) {
    console.error(`Error ${error.status}:`, error.message);
    console.error("Details:", error.data);
  }
}
```

### Error Response Format

Validation errors (400) include field-level details:

```typescript
// error.data example
{
  "mrno": ["This field is required."],
  "email": ["Enter a valid email address."]
}
```

## Authentication

TODO: Add authentication token handling when auth endpoints are available.

Currently, the client doesn't include authentication headers. Update `lib/api/client.ts` when auth is implemented:

```typescript
private getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = localStorage.getItem("authToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}
```

## Status Codes

- `200 OK` - Successful GET / PUT / PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource does not exist
- `500 Server Error` - Backend error

## Next Steps

1. Set up `.env.local` with your backend API URL
2. Import and use API services in your components
3. Add error handling and loading states
4. Implement authentication once endpoints are ready
