# Quick Reference - Patient Page API

## Architecture Overview

```
Patient List Page (/)
├── API: GET /api/patients
└── Displays: List of all patients with search
    └── Click "View Details" → Patient Detail Page

Patient Detail Page (/patient?patient=P001)
├── API: GET /api/patients/[id]
└── Displays: 6 tabs with medical information
    ├── Vitals Tab → VitalsDisplay component
    ├── Medications Tab → MedicationsTable component
    ├── Symptoms Tab → SymptomsDisplay component
    ├── Lab Tab → LabResultsDisplay component
    ├── History Tab → MedicalHistoryDisplay component
    └── Notes Tab → ClinicalNotesDisplay component
    
Right Column: Diagnosis information (DiagnosisDisplay)
```

## Component Hierarchy

### Patient Detail Page (`app/patient/page.tsx`)
```
PatientPage (main component)
├── PatientInfo (left column - personal info)
├── Tabs Navigation
├── Tab Content (dynamic based on selectedTab)
│   ├── VitalsDisplay
│   ├── MedicationsTable
│   ├── SymptomsDisplay
│   ├── LabResultsDisplay
│   ├── MedicalHistoryDisplay
│   └── ClinicalNotesDisplay
├── SessionInstance (right column)
├── AIDiagnosis (right column)
└── DiagnosisDisplay (bottom right - new)
```

## API Response Structure

### GET /api/patients/[id]
```typescript
{
  patient_id: string,
  personal_information: {
    salutation: string,
    name: string,
    age: number,
    sex: string,
    ethnicity: string,
    occupation: string,
    family_history: { [condition]: boolean },
    social_determinants: {
      smoking_status: string,
      physical_activity: string,
      diet: string,
      hearing_impairment: string,
      access_to_healthcare: string
    }
  },
  vitals: {
    weight_kg: number,
    bmi_estimate: number,
    blood_pressure_mmHg: string,
    heart_rate_bpm: number,
    spo2_percent: number,
    temperature: string,
    blood_glucose: string
  },
  lab_results: [{
    date: string,
    results: { [testName]: any }
  }],
  medical_imagery: any[],
  clinical_notes: {
    summary: string,
    examination: string,
    assessment: string,
    plan: string[]
  },
  medications: [{
    name: string,
    dose: string,
    frequency: string,
    indication: string
  }],
  current_symptoms: string[],
  known_medical_history: string[],
  diagnosis: {
    probable_conditions: string[],
    treatment_suggestions: string[],
    medical_advice: string[]
  }
}
```

## File Locations

### API Routes
- `/app/api/patients/route.ts` - List all patients
- `/app/api/patients/[id]/route.ts` - Get patient by ID

### Pages
- `/app/page.tsx` - Patient list (main page)
- `/app/patient/page.tsx` - Patient detail page

### Components
- `/components/patient-info.tsx` - Personal information display
- `/components/vitals-display.tsx` - Vitals display
- `/components/medications-table.tsx` - Medications table
- `/components/clinical-notes-display.tsx` - Clinical notes
- `/components/symptoms-display.tsx` - Symptoms display
- `/components/diagnosis-display.tsx` - Diagnosis display
- `/components/lab-results-display.tsx` - Lab results
- `/components/medical-history-display.tsx` - Medical history

### Types
- `/lib/patients.ts` - All TypeScript interfaces

## How to Modify

### To change API data source:
1. Open `/app/api/patients/[id]/route.ts`
2. Replace mock data fetch with your backend API call:
   ```typescript
   const response = await fetch(`https://your-api.com/patients/${patientId}`);
   const patientData = await response.json();
   ```

### To add a new tab:
1. Create new component in `/components/`
2. Import in `/app/patient/page.tsx`
3. Add TabsTrigger in the tabs section
4. Add conditional rendering in the tab content area

### To customize displayed fields:
1. Edit the individual component files
2. Components are self-contained and easy to modify
3. All use the types from `/lib/patients.ts`

## Testing

To test locally:
1. Navigate to http://localhost:3000
2. Click "View Details" on any patient card
3. The patient detail page will load data from the API
4. Switch between tabs to view different medical information

## Known Limitations

- Mock data currently includes only P001
- To test with different patient IDs, add them to `mockPatientDetails` in `/app/api/patients/[id]/route.ts`
- Lab results display dynamically - nested objects are shown as formatted JSON
