import { NextResponse } from "next/server";

// Define types for the patient detail response
interface FamilyHistory {
  [key: string]: boolean;
}

interface SocialDeterminants {
  [key: string]: string;
}

interface PersonalInformation {
  salutation: string;
  name: string;
  age: number;
  sex: string;
  ethnicity: string;
  occupation: string;
  family_history: FamilyHistory;
  social_determinants: SocialDeterminants;
}

interface Vitals {
  weight_kg: number;
  bmi_estimate: number;
  blood_pressure_mmHg: string;
  heart_rate_bpm: number;
  spo2_percent: number;
  temperature: string;
  blood_glucose: string;
}

interface DifferentialCount {
  Neutrophils: number;
  Lymphocytes: number;
  Monocytes: number;
  Eosinophils: number;
}

interface CBCResults {
  WBC_Count_per_mm3: number;
  RBC_Count_mil_per_mm3: number;
  Hemoglobin_g_per_dL: number;
  Hematocrit_percent: number;
  MCV_fL: number;
  MCH_pg: number;
  MCHC_g_per_dL: number;
  RDW_CV_percent: number;
  Platelet_Count_per_mm3: number;
  Differential_Count_percent: DifferentialCount;
}

interface LabResult {
  date: string;
  results: {
    [key: string]: any;
  };
}

interface ClinicalNotes {
  summary: string;
  examination: string;
  assessment: string;
  plan: string[];
}

interface Medication {
  name: string;
  dose: string;
  frequency: string;
  indication: string;
}

interface Diagnosis {
  probable_conditions: string[];
  treatment_suggestions: string[];
  medical_advice: string[];
}

interface PatientDetail {
  patient_id: string;
  personal_information: PersonalInformation;
  vitals: Vitals;
  lab_results: LabResult[];
  medical_imagery: any[];
  clinical_notes: ClinicalNotes;
  medications: Medication[];
  current_symptoms: string[];
  known_medical_history: string[];
  diagnosis: Diagnosis;
}

// Mock data - replace with actual API call or database query
const mockPatientDetails: Record<string, PatientDetail> = {
  P001: {
    patient_id: "P001",
    personal_information: {
      salutation: "Mrs",
      name: "Yasmeen Pervaiz",
      age: 65,
      sex: "Female",
      ethnicity: "South Asian/punjabi",
      occupation: "Retired school teacher",
      family_history: {
        hypertension: true,
        osteoarthritis: true,
      },
      social_determinants: {
        smoking_status: "Non-smoker",
        physical_activity: "Low to moderate (limited by knee stiffness)",
        diet: "Balanced, low in protein",
        hearing_impairment: "Uses hearing aids, recurrent ear infections",
        access_to_healthcare: "unknown",
      },
    },
    vitals: {
      weight_kg: 67,
      bmi_estimate: 26,
      blood_pressure_mmHg: "127/82",
      heart_rate_bpm: 72,
      spo2_percent: 97,
      temperature: "98.6",
      blood_glucose: "Normal",
    },
    lab_results: [
      {
        date: "2025-07-11",
        results: {
          CBC: {
            WBC_Count_per_mm3: 6800,
            RBC_Count_mil_per_mm3: 4.42,
            Hemoglobin_g_per_dL: 13.2,
            Hematocrit_percent: 40,
            MCV_fL: 90,
            MCH_pg: 30,
            MCHC_g_per_dL: 33,
            RDW_CV_percent: 13,
            Platelet_Count_per_mm3: 131000,
            Differential_Count_percent: {
              Neutrophils: 59,
              Lymphocytes: 32,
              Monocytes: 6,
              Eosinophils: 3,
            },
          },
          ESR_mm_per_hr: 6,
        },
      },
      {
        date: "2025-07-12",
        results: {
          Synovial_Fluid: {
            Color: "Light Yellow",
            Appearance: "Transparent",
            WBC_Count: "<5",
            Neutrophils_percent: "--",
            Lymphocytes_percent: "--",
            Gram_Stain: "No Micro-organisms Seen",
            AFB_Stain: "No Acid Fast Bacilli Seen",
            Comments: "Too low for DLC. Please correlate clinically.",
          },
        },
      },
    ],
    medical_imagery: [
      {
        id: "IMG-001",
        name: "Right Knee X-Ray",
        type: "X-Ray",
        date: "2025-07-11",
        description: "Anteroposterior and lateral views of right knee",
        imagePath: "/images/xrays/P001_knee_xray.jpg"
      },
      {
        id: "IMG-002",
        name: "Chest X-Ray",
        type: "X-Ray",
        date: "2025-07-10",
        description: "PA and lateral chest radiographs",
        imagePath: "/images/xrays/P001_cxr.jpeg"
      }
    ],
    clinical_notes: {
      summary:
        "Patient presents with chronic right knee pain, swelling, and stiffness that worsens with activity and prolonged sitting. Reports occasional sensations of something stuck in the knee and difficulty walking after rest.",
      examination:
        "Mild effusion and tenderness over medial joint line of right knee; no signs of acute inflammation or infection.",
      assessment:
        "Likely early-to-moderate osteoarthritis of the right knee; mild hypertension well-controlled.",
      plan: [
        "Recommend knee X-ray to confirm degenerative changes",
        "Consider intra-articular corticosteroid injection if pain persists",
        "Encourage low-impact exercise (swimming, cycling)",
        "Suggest weight management and physiotherapy referral",
        "Continue Nifedipine and monitor blood pressure regularly",
      ],
    },
    medications: [
      {
        name: "Nifedipine",
        dose: "20 mg",
        frequency: "once daily",
        indication: "Hypertension",
      },
      {
        name: "Paracetamol",
        dose: "500 mg",
        frequency: "as needed",
        indication: "Pain relief",
      },
    ],
    current_symptoms: [
      "Right knee pain",
      "Swelling in right knee joint",
      "Leg stiffness and freezing after immobility",
      "Fatigue after moderate activity",
      "Sensation of obstruction in knee joint",
      "Difficulty walking",
      "No fever or systemic infection signs",
    ],
    known_medical_history: [
      "Mild hypertension",
      "Possible osteoarthritis",
      "Recurrent ear infections",
      "Hearing aid user",
    ],
    diagnosis: {
      probable_conditions: [
        "Osteoarthritis (Right Knee)",
        "Mild Hypertension (well-controlled)",
      ],
      treatment_suggestions: [
        "Consider cortisone (intra-articular corticosteroid) injections for pain relief",
        "If symptoms progress or mobility severely limited, evaluate for knee replacement surgery",
      ],
      medical_advice: [
        "Sit with knees at right angles to avoid strain",
        "Do mild daily knee exercises and stretching",
        "Avoid lifting or moving heavy weights",
        "Maintain balanced diet and healthy weight",
      ],
    },
  },
  P002: {
    patient_id: "P002",
    personal_information: {
      salutation: "Mr",
      name: "Eehab Saadat",
      age: 23,
      sex: "Intersex",
      ethnicity: "Sudanese",
      occupation: "University student",
      family_history: {
        asthma: true,
      },
      social_determinants: {
        smoking_status: "Non-smoker",
        physical_activity: "Low",
        diet: "Irregular meals, moderate fast food intake",
        hearing_impairment: "None",
        access_to_healthcare: "Moderate (occasional clinic visits)",
      },
    },
    vitals: {
      weight_kg: 92,
      bmi_estimate: 30,
      blood_pressure_mmHg: "120/80",
      heart_rate_bpm: 84,
      spo2_percent: 92,
      temperature: "98.6",
      blood_glucose: "Unknown",
    },
    lab_results: [
      {
        date: "2025-10-28",
        results: {
          CBC: {
            WBC_Count_per_mm3: 7200,
            RBC_Count_mil_per_mm3: 4.9,
            Hemoglobin_g_per_dL: 14.1,
            Hematocrit_percent: 42,
            MCV_fL: 86,
            MCH_pg: 29,
            MCHC_g_per_dL: 34,
            RDW_CV_percent: 12.5,
            Platelet_Count_per_mm3: 240000,
            Differential_Count_percent: {
              Neutrophils: 56,
              Lymphocytes: 33,
              Monocytes: 7,
              Eosinophils: 4,
            },
          },
          ESR_mm_per_hr: 5,
        },
      },
      {
        date: "2025-10-28",
        results: {
          Allergy_and_Spirometry: {
            FEV1_percent_predicted: 68,
            FVC_percent_predicted: 83,
            FEV1_FVC_ratio: 0.65,
            Peak_Expiratory_Flow_L_min: 310,
            Eosinophil_Count_percent: 8,
            IgE_IU_per_mL: 240,
            Comments:
              "Reduced FEV1 and FEV1/FVC ratio consistent with obstructive airway disease; elevated IgE and eosinophils support allergic asthma diagnosis.",
          },
        },
      },
    ],
    medical_imagery: [
      {
        id: "IMG-001",
        name: "Chest X-ray (CXR)",
        type: "X-ray",
        date: "2025-10-28",
        description: "Possible mild hyperinflation; no consolidation or acute infiltrates noted.",
        imagePath: "/images/xrays/P002_cxr.jpeg",
      },
    ],
    clinical_notes: {
      summary:
        "Patient presents with recurrent shortness of breath, wheezing, and reduced exercise tolerance, exacerbated during smog season or cold weather.",
      examination:
        "On auscultation, expiratory wheezes heard bilaterally; no crackles or rhonchi. Oxygen saturation mildly reduced at 92%.",
      assessment:
        "Likely mild persistent asthma with environmental trigger sensitivity; no acute distress but requires inhaled corticosteroid management.",
      plan: [
        "Continue beclometasone dipropionate inhaler twice daily for maintenance",
        "Prescribe rescue inhaler (short-acting beta-agonist) for acute episodes if not already in use",
        "Encourage avoidance of outdoor exposure during high smog/pollution periods",
        "Recommend spirometry follow-up every 3 months to monitor airway function",
        "Maintain regular physical activity and weight control",
      ],
    },
    medications: [
      {
        name: "Diltiazem Hydrochloride",
        dose: "90 mg",
        frequency: "twice daily",
        indication: "Cardiac rate control / hypertension management",
      },
      {
        name: "Apixaban",
        dose: "5 mg",
        frequency: "twice daily",
        indication: "Anticoagulant therapy",
      },
      {
        name: "Beclometasone Dipropionate",
        dose: "50 micrograms",
        frequency: "twice daily (inhaled)",
        indication: "Asthma control",
      },
    ],
    current_symptoms: [
      "Wheezing sound during breathing",
      "Frequent shortness of breath",
      "Low stamina",
      "Fatigue after climbing stairs or light exertion",
      "Worsened symptoms in smog season",
    ],
    known_medical_history: [
      "Family history of asthma",
      "No known diabetes or cardiac disease",
    ],
    diagnosis: {
      probable_conditions: [
        "Asthma (mild persistent)",
        "Allergic airway inflammation",
      ],
      treatment_suggestions: [
        "Continue beclometasone dipropionate inhaler (corticosteroid) for maintenance",
        "Consider nebulization with Clenil or inhaled corticosteroids during flare-ups",
        "Add long-acting beta-agonist (LABA) if symptoms remain uncontrolled",
        "Use short-acting rescue inhaler (e.g., salbutamol) for acute wheezing episodes",
      ],
      medical_advice: [
        "Avoid exposure to smog, smoke, dust, and pollen",
        "Keep rescue inhaler accessible at all times",
        "Do not smoke or stay near smokers",
        "Use air purifiers indoors during pollution season",
        "Engage in mild regular exercise to improve lung capacity",
        "Follow up with a pulmonologist every 3-6 months for spirometry and treatment adjustment",
      ],
    },
  },
  P003: {
    patient_id: "P003",
    personal_information: {
      salutation: "Mr.",
      name: "PERVAIZ AKHTAR",
      age: 74,
      sex: "Male",
      ethnicity: "South Asian/North Indian",
      occupation: "Retired",
      family_history: {
        diabetes: true,
        hypertension: true,
        cardiovascular_disease: true,
      },
      social_determinants: {
        smoking_status: "Unknown",
        physical_activity: "low",
        diet: "Unknown",
        access_to_healthcare: "Unknown",
      },
    },
    vitals: {
      weight_kg: 72,
      bmi_estimate: 25,
      blood_pressure_mmHg: "130/87",
      heart_rate_bpm: 92,
      spo2_percent: 98,
      temperature: "98.6",
      blood_glucose: "Borderline diabetic",
    },
    lab_results: [
      {
        date: "2025-06-14",
        results: {
          Chemistry_I_Serum: {
            SODIUM: "141 mmol/L",
            POTASSIUM: "3.66 mmol/L",
            CHLORIDE: "106 mmol/L",
            BICARBONATE: "25.8 mmol/L",
            UREA_NITROGEN: "14.18 mg/dL",
            CREATININE: "1.07 mg/dL",
            eGFR: "67.56 mL/min/1.73 m²",
            TOTAL_BILIRUBIN: "0.64 mg/dL",
            ALT: "37 U/L",
            AST: "28 U/L",
            ALKALINE_PHOSPHATASE: "79 U/L",
            GGT: "52 U/L",
            TOTAL_PROTEIN: "6.8 g/dL",
            ALBUMIN: "3.99 g/dL",
            GLOBULIN: "2.77 g/dL",
            A_G_RATIO: "1.44",
          },
          Urine_Routine: {
            Color: "Amber",
            Appearance: "Clear",
            Specific_gravity: "1.019",
            pH: "5",
            Glucose: "Negative",
            Protein: "+++",
            Hemoglobin: "Nil",
            Nitrite: "Negative",
            Leucocyte_esterase: "Negative",
            WBC: "Nil",
            RBC: "Nil",
            Mucous: "+++",
          },
        },
      },
    ],
    medical_imagery: [],
    clinical_notes: {
      summary:
        "74-year-old male with known history of borderline diabetes, hypertension, and asthma presenting with swelling in lower shanks and feet. Clinical labs show significant proteinuria (+++) and mucosuria (+++) on a routine urine examination. Serum electrolytes, liver function, and kidney function tests are within normal ranges.",
      examination:
        "Physical exam details limited, except for vitals and reported swelling in lower extremities.",
      assessment: "Pending further evaluation",
      plan: [
        "Obtain spot urine protein/creatinine ratio for definitive proteinuria assessment",
        "Monitor blood pressure and consider antihypertensive adjustment",
        "Screen for diabetic complications",
      ],
    },
    medications: [
      {
        name: "Bisoprolol",
        dose: "5mg",
        frequency: "daily",
        indication: "BP control (Hypertension)",
      },
      {
        name: "Budesonide + Formoterol Fumarate",
        dose: "100mcg + 6mcg",
        frequency: "twice daily",
        indication: "Asthma control",
      },
    ],
    current_symptoms: [
      "Swelling in lower shanks and feet",
      "frequent urination",
    ],
    known_medical_history: [
      "Borderline diabetic",
      "Hypertension",
      "Asthma",
    ],
    diagnosis: {
      probable_conditions: [
        "Proteinuria / Albuminuria (Possible Diabetic or Hypertensive Nephropathy)",
        "Peripheral Edema (Lower Extremity Swelling)",
        "Controlled Hypertension (On Bisoprolol)",
        "Asthma",
        "Nephrolithiasis (Small Kidney Stone)",
      ],
      treatment_suggestions: [
        "Initiate a Diuretic to reduce lower extremity swelling.",
        "Consider adding an ACE Inhibitor or ARB for renoprotection (kidney protection) and blood pressure control.",
        "High fluid intake and 'Watchful Waiting' for the small kidney stone.",
      ],
      medical_advice: [
        "Obtain a Spot Urine Protein/Creatinine Ratio (UPCR) as the next diagnostic step.",
        "Monitor weight daily to track fluid retention/edema.",
        "Elevate feet above heart level when resting.",
      ],
    },
  },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const patientId = resolvedParams.id.toUpperCase();

    // TODO: Replace this with actual API call to your backend
    // Example: const response = await fetch(`https://your-api.com/patients/${patientId}`);
    // const data = await response.json();

    const patientData = mockPatientDetails[patientId];

    if (!patientData) {
      return NextResponse.json(
        { error: "Patient not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(patientData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient" },
      { status: 500 }
    );
  }
}
