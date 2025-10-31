import { NextResponse } from "next/server";

// Define the API response type based on your specification
interface PersonalInformation {
  salutation: string;
  name: string;
  age: number;
  sex: string;
}

interface PatientData {
  patient_id: string;
  personal_information: PersonalInformation;
  last_visit: string;
}

// Mock data - replace with actual API call or database query
const mockPatientData: PatientData[] = [
  {
    patient_id: "P001",
    personal_information: {
      salutation: "Mrs",
      name: "Yasmeen Pervaiz",
      age: 65,
      sex: "Female",
    },
    last_visit: "2025-07-11",
  },
  {
    patient_id: "P002",
    personal_information: {
      salutation: "Mr",
      name: "Ahmed Khan",
      age: 45,
      sex: "Male",
    },
    last_visit: "2025-10-15",
  },
  {
    patient_id: "P003",
    personal_information: {
      salutation: "Mrs",
      name: "Fatima Ali",
      age: 52,
      sex: "Female",
    },
    last_visit: "2025-10-20",
  },
];

export async function GET() {
  try {
    // TODO: Replace this with actual API call to your backend
    // Example: const response = await fetch('https://your-api.com/patients');
    // const data = await response.json();

    return NextResponse.json(mockPatientData, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching patients:", error);
    return NextResponse.json(
      { error: "Failed to fetch patients" },
      { status: 500 }
    );
  }
}
