export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  email: string;
  lastVisit: string;
  status: "active" | "inactive";
  image?: string;
}

// New API response types for list endpoint
export interface PersonalInformationList {
  salutation: string;
  name: string;
  age: number;
  sex: string;
}

export interface PatientData {
  patient_id: string;
  personal_information: PersonalInformationList;
  last_visit: string;
}

// Detailed patient response types for [id] endpoint
export interface FamilyHistory {
  hypertension: boolean;
  osteoarthritis: boolean;
  [key: string]: boolean;
}

export interface SocialDeterminants {
  smoking_status: string;
  physical_activity: string;
  diet: string;
  hearing_impairment: string;
  access_to_healthcare: string;
}

export interface PersonalInformationDetail {
  salutation: string;
  name: string;
  age: number;
  sex: string;
  ethnicity: string;
  occupation: string;
  family_history: FamilyHistory;
  social_determinants: SocialDeterminants;
}

export interface Vitals {
  weight_kg: number;
  bmi_estimate: number;
  blood_pressure_mmHg: string;
  heart_rate_bpm: number;
  spo2_percent: number;
  temperature: string;
  blood_glucose: string;
}

export interface LabResult {
  date: string;
  results: {
    [key: string]: any;
  };
}

export interface MedicalImagery {
  id: string;
  name: string;
  type: string;
  date: string;
  description: string;
  imagePath?: string;
}

export interface ClinicalNotes {
  summary: string;
  examination: string;
  assessment: string;
  plan: string[];
}

export interface Medication {
  name: string;
  dose: string;
  frequency: string;
  indication: string;
}

export interface Diagnosis {
  probable_conditions: string[];
  treatment_suggestions: string[];
  medical_advice: string[];
}

export interface PatientDetail {
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

export const mockPatients: Patient[] = [
  {
    id: "PAT-001234",
    name: "John Doe",
    age: 35,
    gender: "Male",
    dob: "January 15, 1990",
    phone: "(555) 123-4567",
    address: "123 Main Street, Anytown, USA 12345",
    email: "john.doe@email.com",
    lastVisit: "2025-10-25",
    status: "active",
  },
  {
    id: "PAT-001235",
    name: "Jane Smith",
    age: 28,
    gender: "Female",
    dob: "March 22, 1997",
    phone: "(555) 234-5678",
    address: "456 Oak Avenue, Somewhere, USA 12346",
    email: "jane.smith@email.com",
    lastVisit: "2025-10-20",
    status: "active",
  },
  {
    id: "PAT-001236",
    name: "Robert Johnson",
    age: 52,
    gender: "Male",
    dob: "July 8, 1973",
    phone: "(555) 345-6789",
    address: "789 Pine Road, Elsewhere, USA 12347",
    email: "robert.johnson@email.com",
    lastVisit: "2025-10-15",
    status: "active",
  },
  {
    id: "PAT-001237",
    name: "Maria Garcia",
    age: 41,
    gender: "Female",
    dob: "November 30, 1984",
    phone: "(555) 456-7890",
    address: "321 Elm Street, Nowhere, USA 12348",
    email: "maria.garcia@email.com",
    lastVisit: "2025-09-28",
    status: "inactive",
  },
  {
    id: "PAT-001238",
    name: "David Wilson",
    age: 63,
    gender: "Male",
    dob: "February 14, 1962",
    phone: "(555) 567-8901",
    address: "654 Maple Drive, Anywhere, USA 12349",
    email: "david.wilson@email.com",
    lastVisit: "2025-10-10",
    status: "active",
  },
];
