// app/patient/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { PatientInfo } from "@/components/patient-info";
import { VitalsDisplay } from "@/components/vitals-display";
import { MedicationsTable } from "@/components/medications-table";
import { SymptomsDisplay } from "@/components/symptoms-display";
import { DiagnosisDisplay } from "@/components/diagnosis-display";
import { LabAssetsTable } from "@/components/lab-assets-table";
import { MedicalHistoryDisplay } from "@/components/medical-history-display";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AssetsTable } from "@/components/assets-table";
import { AiSummary } from "@/components/ai-summary";
import { PreviousSessionsTable } from "@/components/previous-sessions-table";
import { SDOHForm } from "@/components/sdoh-form";
import { SessionInstance } from "@/components/session-instance";
import { AIDiagnosis } from "@/components/ai-diagnosis";
import Link from "next/link";
import { PatientDetail } from "@/lib/patients";
import { getCurrentUser, type User } from "@/lib/auth";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";

interface MedicalEntry {
  id: string;
  type: "imaging" | "lab" | "note" | "meds" | "symptoms" | "audio";
  date: string;
  content: any;
}

export default function PatientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient");

  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [patientData, setPatientData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("vitals");
  const [entries, setEntries] = useState<MedicalEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    setIsCheckingAuth(false);
  }, [router]);

  // Set mounted flag
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch patient data from API
  useEffect(() => {
    if (!isMounted) return;

    const fetchPatientData = async () => {
      if (!patientId) {
        setError("No patient ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // For demo patient, use mock data
        if (patientId === "demo") {
          const mockData: PatientDetail = {
            patient_id: "P001",
            personal_information: {
              name: "John Patient",
              salutation: "Mr",
              age: 45,
              sex: "Male",
              ethnicity: "Caucasian",
              occupation: "Software Engineer",
              family_history: {
                hypertension: true,
                osteoarthritis: false,
              },
              social_determinants: {
                smoking_status: "Non-smoker",
                physical_activity: "Moderate (3-4 times per week)",
                diet: "Balanced",
                hearing_impairment: "None",
                access_to_healthcare: "Good",
              },
            },
            vitals: {
              weight_kg: 75,
              bmi_estimate: 24.5,
              blood_pressure_mmHg: "120/80",
              heart_rate_bpm: 72,
              spo2_percent: 98,
              temperature: "37.0",
              blood_glucose: "95 mg/dL",
            },
            medications: [
              {
                name: "Lisinopril",
                dose: "10mg",
                frequency: "Once daily",
                indication: "Hypertension",
              },
              {
                name: "Atorvastatin",
                dose: "20mg",
                frequency: "Once daily",
                indication: "High Cholesterol",
              },
            ],
            current_symptoms: [
              "Mild headache",
              "Fatigue",
              "Occasional dizziness",
            ],
            known_medical_history: [
              "Hypertension (2015)",
              "High Cholesterol (2018)",
            ],
            lab_results: [
              {
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                results: {
                  cholesterol: "180 mg/dL",
                  glucose: "95 mg/dL",
                  hdl: "50 mg/dL",
                  ldl: "110 mg/dL",
                },
              },
            ],
            medical_imagery: [
              {
                id: "IMG001",
                name: "Chest X-ray",
                type: "X-ray",
                date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                description: "Normal findings",
              },
            ],
            clinical_notes: {
              summary: "45-year-old male with well-controlled hypertension",
              examination: "BP 120/80, HR 72, no significant findings",
              assessment: "Stable hypertension and hyperlipidemia",
              plan: [
                "Continue current medications",
                "Recheck BP in 3 months",
                "Maintain exercise routine",
              ],
            },
            diagnosis: {
              probable_conditions: ["Hypertension - Controlled", "Elevated Cholesterol"],
              treatment_suggestions: [
                "Continue statin therapy",
                "Maintain dietary modifications",
              ],
              medical_advice: [
                "Continue current medications",
                "Regular exercise 3-4 times weekly",
                "Reduce sodium intake",
              ],
            },
            last_visit: new Date().toISOString(),
          };
          
          setPatientData(mockData);
          setError(null);
          setLoading(false);
          return;
        }
        
        // For real patients, fetch from API
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient data");
        }
        const data: PatientDetail = await response.json();
        setPatientData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching patient:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch patient"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, isMounted]);

  if (isCheckingAuth || loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-red-500">
          Error: {error || "Patient not found"}
        </div>
      </div>
    );
  }

  // Check if user is authorized to access this page
  if (!user) {
    return null;
  }

  // Patients can only view this page, no editing
  const isPatient = user.role === "patient";
  const isDoctor = user.role === "doctor";

  const downloadReport = () => {
    if (!patientData) {
      console.error("No patient data available for PDF generation");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      let yPosition = 15;
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 12;
      const lineHeight = 5.5;
      const maxWidth = pageWidth - 2 * margin;
      const sectionGap = 4;
      const primaryColor = [41, 128, 185]; // Blue

      // Helper function to add text with automatic pagination
      const addText = (
        text: string,
        size: number = 10,
        isBold: boolean = false,
        color: number[] = [0, 0, 0]
      ) => {
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        if (isBold) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
        }

        const lines = doc.splitTextToSize(text, maxWidth - 2);
        lines.forEach((line: string) => {
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin + 1, yPosition);
          yPosition += lineHeight;
        });
      };

      // Helper function to add section header with background
      const addSectionHeader = (title: string) => {
        if (yPosition + 2 > pageHeight - 10) {
          doc.addPage();
          yPosition = margin;
        }
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(margin, yPosition - 3.5, maxWidth, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(title, pageWidth / 2, yPosition + 1, { align: "center" });
        yPosition += sectionGap + 4;
        doc.setTextColor(0, 0, 0);
      };

      // Helper function to add two-column key-value pairs
      const addKeyValuePair = (
        key: string,
        value: string,
        indent: number = 0
      ) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        const keyWidth = 40;
        const indentOffset = indent * 3;
        doc.text(key + ":", margin + indentOffset, yPosition);
        doc.setFont("helvetica", "normal");
        const valueText = doc.splitTextToSize(
          value,
          maxWidth - keyWidth - indentOffset - 2
        );
        doc.text(
          valueText[0] || "",
          margin + keyWidth + indentOffset,
          yPosition
        );
        yPosition += lineHeight;
        if (valueText.length > 1) {
          valueText.slice(1).forEach((line: string) => {
            doc.text(line, margin + keyWidth + indentOffset, yPosition);
            yPosition += lineHeight;
          });
        }
      };

      // --- HEADER ---
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 12, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("MIDAS", pageWidth / 2, 4, { align: "center" });
      doc.setFontSize(18);
      doc.text("MEDICAL REPORT", pageWidth / 2, 10, { align: "center" });
      yPosition = 15;

      // --- PATIENT INFORMATION ---
      addSectionHeader("PATIENT INFORMATION");
      addKeyValuePair("Patient ID", patientData.patient_id || "N/A");
      addKeyValuePair(
        "Name",
        `${patientData.personal_information?.salutation || ""} ${
          patientData.personal_information?.name || "N/A"
        }`
      );
      addKeyValuePair(
        "Age",
        `${patientData.personal_information?.age || "N/A"} years`
      );
      addKeyValuePair("Gender", patientData.personal_information?.sex || "N/A");
      addKeyValuePair(
        "Ethnicity",
        patientData.personal_information?.ethnicity || "N/A"
      );
      addKeyValuePair(
        "Occupation",
        patientData.personal_information?.occupation || "N/A"
      );
      yPosition += sectionGap;

      // --- VITALS ---
      if (patientData.vitals) {
        addSectionHeader("VITAL SIGNS");
        addKeyValuePair("Weight", `${patientData.vitals.weight_kg || "N/A"} kg`);
        addKeyValuePair("BMI", `${patientData.vitals.bmi_estimate || "N/A"}`);
        addKeyValuePair(
          "Blood Pressure",
          `${patientData.vitals.blood_pressure_mmHg || "N/A"} mmHg`
        );
        addKeyValuePair(
          "Heart Rate",
          `${patientData.vitals.heart_rate_bpm || "N/A"} bpm`
        );
        addKeyValuePair("SpO₂", `${patientData.vitals.spo2_percent || "N/A"}%`);
        addKeyValuePair(
          "Temperature",
          `${patientData.vitals.temperature || "N/A"}°F`
        );
        addKeyValuePair(
          "Blood Glucose",
          patientData.vitals.blood_glucose || "N/A"
        );
        yPosition += sectionGap;
      }

      // --- CURRENT SYMPTOMS ---
      if (
        patientData.current_symptoms &&
        patientData.current_symptoms.length > 0
      ) {
        addSectionHeader("CURRENT SYMPTOMS");
        patientData.current_symptoms.forEach((symptom: string) => {
          addText(`  • ${symptom}`, 9, false);
        });
        yPosition += sectionGap;
      }

      // --- MEDICATIONS ---
      if (patientData.medications && patientData.medications.length > 0) {
        addSectionHeader("MEDICATIONS");
        patientData.medications.forEach(
          (med: {
            name: string;
            dose: string;
            frequency: string;
            indication: string;
          }) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            if (yPosition + lineHeight > pageHeight - 10) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(`${med.name}`, margin + 1, yPosition);
            yPosition += lineHeight;
            addKeyValuePair("Dose", med.dose, 1);
            addKeyValuePair("Frequency", med.frequency, 1);
            addKeyValuePair("Indication", med.indication, 1);
            yPosition += 1;
          }
        );
        yPosition += sectionGap;
      }

      // --- CLINICAL NOTES ---
      if (patientData.clinical_notes) {
        addSectionHeader("CLINICAL NOTES");
        if (patientData.clinical_notes.summary) {
          addKeyValuePair("Summary", patientData.clinical_notes.summary);
        }
        if (patientData.clinical_notes.examination) {
          addKeyValuePair("Examination", patientData.clinical_notes.examination);
        }
        if (patientData.clinical_notes.assessment) {
          addKeyValuePair("Assessment", patientData.clinical_notes.assessment);
        }
        if (
          patientData.clinical_notes.plan &&
          patientData.clinical_notes.plan.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Plan:", margin + 1, yPosition);
          yPosition += lineHeight;
          patientData.clinical_notes.plan.forEach((item: string) => {
            addText(`  • ${item}`, 9, false);
          });
        }
        yPosition += sectionGap;
      }

      // --- KNOWN MEDICAL HISTORY ---
      if (
        patientData.known_medical_history &&
        patientData.known_medical_history.length > 0
      ) {
        addSectionHeader("MEDICAL HISTORY");
        patientData.known_medical_history.forEach((item: string) => {
          addText(`  • ${item}`, 9, false);
        });
        yPosition += sectionGap;
      }

      // --- LAB RESULTS ---
      if (patientData.lab_results && patientData.lab_results.length > 0) {
        addSectionHeader("LAB RESULTS");
        patientData.lab_results.forEach(
          (lab: { date: string; results: Record<string, any> }) => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            if (yPosition + lineHeight > pageHeight - 10) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(`Date: ${new Date(lab.date).toLocaleDateString()}`, margin + 1, yPosition);
            yPosition += lineHeight;
            Object.entries(lab.results).forEach(([key, value]) => {
              addKeyValuePair(key, String(value), 1);
            });
            yPosition += 2;
          }
        );
        yPosition += sectionGap;
      }

      // --- DIAGNOSIS ---
      if (patientData.diagnosis) {
        addSectionHeader("DIAGNOSIS & RECOMMENDATIONS");
        if (
          patientData.diagnosis.probable_conditions &&
          patientData.diagnosis.probable_conditions.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Probable Conditions:", margin + 1, yPosition);
          yPosition += lineHeight;
          patientData.diagnosis.probable_conditions.forEach((cond: string) => {
            addText(`  • ${cond}`, 9, false);
          });
        }
        if (
          patientData.diagnosis.treatment_suggestions &&
          patientData.diagnosis.treatment_suggestions.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Treatment Suggestions:", margin + 1, yPosition);
          yPosition += lineHeight;
          patientData.diagnosis.treatment_suggestions.forEach((sug: string) => {
            addText(`  • ${sug}`, 9, false);
          });
        }
        if (
          patientData.diagnosis.medical_advice &&
          patientData.diagnosis.medical_advice.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Medical Advice:", margin + 1, yPosition);
          yPosition += lineHeight;
          patientData.diagnosis.medical_advice.forEach((advice: string) => {
            addText(`  • ${advice}`, 9, false);
          });
        }
      }

      // --- SOCIAL DETERMINANTS OF HEALTH ---
      if (patientData.personal_information?.social_determinants) {
        addSectionHeader("SOCIAL DETERMINANTS OF HEALTH");
        const sdoh = patientData.personal_information.social_determinants;
        addKeyValuePair("Smoking Status", sdoh.smoking_status || "N/A");
        addKeyValuePair("Physical Activity", sdoh.physical_activity || "N/A");
        addKeyValuePair("Diet", sdoh.diet || "N/A");
        addKeyValuePair(
          "Access to Healthcare",
          sdoh.access_to_healthcare || "N/A"
        );
        if (sdoh.hearing_impairment) {
          addKeyValuePair(
            "Hearing Impairment",
            sdoh.hearing_impairment || "N/A"
          );
        }
      }

      // --- FOOTER ---
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.setFont("helvetica", "italic");
        doc.text(
          `Generated on ${new Date().toLocaleString()}`,
          margin,
          pageHeight - 5
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - margin - 20,
          pageHeight - 5
        );
      }

      // Download the PDF
      const fileName = `medical-report-${patientData.patient_id || "patient"}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  const greyBoxClasses =
    "bg-muted rounded-lg flex items-center justify-center p-[0.5vh] text-foreground text-sm";
  const blackBackgroundClasses =
    "bg-transparent rounded-lg flex items-center justify-center p-[0.5vh] text-white text-sm";

  return (
    <div
      className="h-screen w-screen px-[1vw] py-[1vh] text-foreground relative overflow-hidden"
      style={{
        backgroundImage: "url('/anatomy-bg.png')",
        backgroundSize: "auto 150vh",
        backgroundPosition: "center 1vh",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Main Grid Container */}
      <div className="grid gap-0 grid-template-rows-[5vh_60vh_35vh] h-full">
        {/* Top Header Section */}
        <div className="col-span-full rounded-lg h-[5vh] flex items-center justify-between text-foreground text-lg mb-1">
          <div className="flex items-center">
            {!isPatient && (
              <Link
                href="/"
                className="bg-card rounded-full p-1 mr-4 border hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            )}
            <div>
              <div className="text-sm">{isPatient ? "My Diagnosis Results" : "Patient Details"}</div>
              {/* <div className="text-sm">NRN: 123456789</div> */}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && <UserMenu />}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-0 auto-rows-fr h-[59vh]">
          {/* Left Box (span 1 col on small, span 1 md, span 1 lg) */}
          <div className="col-span-full md:col-span-1 flex flex-col mr-1">
            <div className="flex-12 mb-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
              <PatientInfo personalInfo={patientData.personal_information} />
            </div>
            <div className="flex-1 bg-card rounded-tl-lg rounded-tr-lg p-[0.5vh]">
              <Tabs
                value={selectedTab}
                onValueChange={setSelectedTab}
                className="w-full h-full"
              >
                <TabsList className="grid w-full grid-cols-6 text-xs">
                  <TabsTrigger className=" text-xs" value="ai-summary">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="vitals">
                    Vitals
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="medications">
                    Meds
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="symptoms">
                    Symptoms
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="lab">
                    Assets
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="history">
                    History
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Center Black Area (span 1 col on small, span 1 md, span 1 lg) */}
          <div
            className={`${blackBackgroundClasses} col-span-full md:col-span-1 lg:col-span-1 mr-1 mb-1`}
          ></div>

          {/* Right Box (span 1 col on small, span 1 md, span 1 lg) */}
          {!isPatient && (
            <div className="col-span-full md:col-span-1 gap-0">
              <Card className="h-[59vh] p-3 mb-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
                <SessionInstance entries={entries} setEntries={setEntries} />
              </Card>
              <Card className="h-[33.5vh] p-3 pr-0 z-10 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
                <AIDiagnosis entries={entries} patientData={patientData} />
              </Card>
            </div>
          )}
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 auto-rows-fr mt-0 h-[33.5vh]">
          {/* Bottom Left Large Box (span 1 col on small, span 1 md, span 2 lg) */}
          <Card className="rounded-tl-none col-span-full md:col-span-1 lg:col-span-2 mr-1 h-full p-0">
            <CardContent className="h-full p-0">
              {selectedTab === "vitals" && (
                <VitalsDisplay vitals={patientData.vitals} />
              )}
              {selectedTab === "medications" && (
                <MedicationsTable medications={patientData.medications} />
              )}
              {selectedTab === "symptoms" && (
                <SymptomsDisplay symptoms={patientData.current_symptoms} />
              )}
              {selectedTab === "lab" && (
                <LabAssetsTable
                  labResults={patientData.lab_results}
                  clinicalNotes={patientData.clinical_notes}
                  medicalImagery={patientData.medical_imagery}
                />
              )}
              {selectedTab === "history" && (
                <MedicalHistoryDisplay
                  medicalHistory={patientData.known_medical_history}
                />
              )}
              {selectedTab === "ai-summary" && <AiSummary summary={patientData.summary} />}
            </CardContent>
          </Card>

          {/* Bottom Right Box */}
          {/* <Card className="rounded-tl-none col-span-full md:col-span-1 lg:col-span-1 h-full p-0 mr-1">
            <CardContent className="h-full p-0">
              <DiagnosisDisplay diagnosis={patientData.diagnosis} />
            </CardContent>
          </Card> */}
        </div>

        {/* Floating Download Button - Only visible to patients */}
        {isPatient && (
          <Button
            onClick={downloadReport}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 bg-primary hover:bg-primary/90 flex items-center justify-center"
            size="icon"
            title="Download Medical Report"
          >
            <Download className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
