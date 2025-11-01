import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientDetail } from "@/lib/patients";
import jsPDF from "jspdf";

interface MedicalEntry {
  id: string;
  type: "imaging" | "lab" | "note" | "meds" | "symptoms" | "audio";
  date: string;
  content: any;
  audio_file?: {
    file_name: string;
    file_type: string;
    base64_data: string;
    duration: number;
  };
  audio_transcription?: string;
}

interface AIDiagnosisProps {
  entries: MedicalEntry[];
  patientData?: PatientDetail;
}

export const AIDiagnosis = ({ entries, patientData }: AIDiagnosisProps) => {
  const [showAIDiagnosis, setShowAIDiagnosis] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mergedData, setMergedData] = useState<any>(null);

  const generateAIDiagnosis = async () => {
    setIsLoading(true);
    try {
      // Merge session entries into their respective places in the patient data
      const mergedData: any = {
        ...patientData,
      };

      if (patientData) {
        // Initialize lab_report_imgs and audio_transcriptions arrays if they don't exist
        if (!mergedData.lab_report_imgs) {
          mergedData.lab_report_imgs = [];
        }
        if (!mergedData.audio_transcriptions) {
          mergedData.audio_transcriptions = [];
        }

        // Process each entry type and add to appropriate sections
        console.log("Processing entries:", entries);
        entries.forEach((entry) => {
          console.log(`Processing entry type: ${entry.type}`, entry);
          if (entry.type === "meds") {
            // Add to medications array
            mergedData.medications = [
              ...(mergedData.medications || []),
              entry.content,
            ];
          } else if (entry.type === "symptoms") {
            // Add to current_symptoms array
            mergedData.current_symptoms = [
              ...(mergedData.current_symptoms || []),
              ...entry.content.symptoms,
            ];
          } else if (entry.type === "note") {
            // Add to clinical_notes
            if (mergedData.clinical_notes) {
              // Append session note to the summary
              mergedData.clinical_notes.summary = `${
                mergedData.clinical_notes.summary || ""
              }\n\n[Session Entry] ${entry.content.summary}`;
            }
          } else if (entry.type === "imaging") {
            // Add to medical_imagery array
            mergedData.medical_imagery = [
              ...(mergedData.medical_imagery || []),
              {
                id: entry.id,
                name: entry.content.file_name,
                type: "Imaging",
                date: entry.date,
                description: "Session imaging result",
                imagePath: entry.content.base64_data,
              },
            ];
          } else if (entry.type === "lab") {
            // Add to lab_report_imgs array
            mergedData.lab_report_imgs.push({
              id: entry.id,
              file_name: entry.content.file_name,
              file_type: entry.content.file_type,
              base64_data: entry.content.base64_data,
              date: entry.date,
            });
          } else if (entry.type === "audio" && entry.audio_file) {
            // Add to audio_transcriptions array if transcription exists
            if (entry.audio_transcription) {
              console.log("Adding transcription:", entry.audio_transcription);
              mergedData.audio_transcriptions.push(entry.audio_transcription);
            } else {
              console.log("No transcription found for audio entry:", entry.id);
            }
          }
        });
      }

      const response = await fetch("/api/ai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mergedData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI diagnosis");
      }

      const data = await response.json();
      setAiDiagnosis(data.diagnosis);
      setMergedData(mergedData);
      setShowAIDiagnosis(true);
    } catch (error) {
      console.error("Error generating AI diagnosis:", error);
      setAiDiagnosis("Error generating diagnosis. Please try again.");
      setShowAIDiagnosis(true);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    if (!mergedData) {
      console.error("No merged data available for PDF generation");
      return;
    }

    try {
      const doc = new jsPDF();
      let yPosition = 10;
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const lineHeight = 5;
      const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin;

      // Helper function to add text with automatic pagination
      const addText = (
        text: string,
        size: number = 11,
        isBold: boolean = false
      ) => {
        doc.setFontSize(size);
        if (isBold) {
          doc.setFont("helvetica", "bold");
        } else {
          doc.setFont("helvetica", "normal");
        }

        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          if (yPosition + lineHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
      };

      // Title
      addText("MEDICAL REPORT", 16, true);
      yPosition += 3;

      // Patient Information
      addText("PATIENT INFORMATION", 12, true);
      yPosition += 2;
      addText(`Patient ID: ${mergedData.patient_id || "N/A"}`, 10, false);
      addText(
        `Name: ${mergedData.personal_information?.salutation || ""} ${
          mergedData.personal_information?.name || "N/A"
        }`,
        10,
        false
      );
      addText(
        `Age: ${mergedData.personal_information?.age || "N/A"} years`,
        10,
        false
      );
      addText(
        `Gender: ${mergedData.personal_information?.sex || "N/A"}`,
        10,
        false
      );
      addText(
        `Ethnicity: ${mergedData.personal_information?.ethnicity || "N/A"}`,
        10,
        false
      );
      addText(
        `Occupation: ${mergedData.personal_information?.occupation || "N/A"}`,
        10,
        false
      );
      yPosition += 3;

      // Vitals
      if (mergedData.vitals) {
        addText("VITALS", 12, true);
        yPosition += 2;
        addText(
          `Weight: ${mergedData.vitals.weight_kg || "N/A"} kg`,
          10,
          false
        );
        addText(
          `Blood Pressure: ${
            mergedData.vitals.blood_pressure_mmHg || "N/A"
          } mmHg`,
          10,
          false
        );
        addText(
          `Heart Rate: ${mergedData.vitals.heart_rate_bpm || "N/A"} bpm`,
          10,
          false
        );
        addText(`SpO2: ${mergedData.vitals.spo2_percent || "N/A"}%`, 10, false);
        addText(
          `Temperature: ${mergedData.vitals.temperature || "N/A"}°F`,
          10,
          false
        );
        yPosition += 3;
      }

      // Current Symptoms
      if (
        mergedData.current_symptoms &&
        mergedData.current_symptoms.length > 0
      ) {
        addText("CURRENT SYMPTOMS", 12, true);
        yPosition += 2;
        mergedData.current_symptoms.forEach((symptom: string) => {
          addText(`• ${symptom}`, 10, false);
        });
        yPosition += 3;
      }

      // Medications
      if (mergedData.medications && mergedData.medications.length > 0) {
        addText("MEDICATIONS", 12, true);
        yPosition += 2;
        mergedData.medications.forEach(
          (med: {
            name: string;
            dose: string;
            frequency: string;
            indication: string;
          }) => {
            addText(`${med.name} - ${med.dose}, ${med.frequency}`, 10, false);
            addText(`  Indication: ${med.indication}`, 9, false);
          }
        );
        yPosition += 3;
      }

      // Clinical Notes
      if (mergedData.clinical_notes) {
        addText("CLINICAL NOTES", 12, true);
        yPosition += 2;
        if (mergedData.clinical_notes.summary) {
          addText(`Summary: ${mergedData.clinical_notes.summary}`, 10, false);
        }
        if (mergedData.clinical_notes.examination) {
          addText(
            `Examination: ${mergedData.clinical_notes.examination}`,
            10,
            false
          );
        }
        if (mergedData.clinical_notes.assessment) {
          addText(
            `Assessment: ${mergedData.clinical_notes.assessment}`,
            10,
            false
          );
        }
        yPosition += 3;
      }

      // AI Diagnosis
      addText("AI DIAGNOSIS", 12, true);
      yPosition += 2;
      addText(aiDiagnosis, 10, false);
      yPosition += 3;

      // Social Determinants of Health
      if (mergedData.personal_information?.social_determinants) {
        addText("SOCIAL DETERMINANTS OF HEALTH", 12, true);
        yPosition += 2;
        const sdoh = mergedData.personal_information.social_determinants;
        addText(`Smoking Status: ${sdoh.smoking_status || "N/A"}`, 10, false);
        addText(
          `Physical Activity: ${sdoh.physical_activity || "N/A"}`,
          10,
          false
        );
        addText(`Diet: ${sdoh.diet || "N/A"}`, 10, false);
        addText(
          `Access to Healthcare: ${sdoh.access_to_healthcare || "N/A"}`,
          10,
          false
        );
        yPosition += 3;
      }

      // Footer with date
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        margin,
        pageHeight - 5
      );

      // Download the PDF
      const fileName = `medical-report-${mergedData.patient_id || "patient"}-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  return (
    <Card className="h-full flex flex-col pt-0 pb-0 gap-0 z-20">
      {!showAIDiagnosis ? (
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="absolute inset-0 space-y-2 pr-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-10 pr-3">
              <Button
                onClick={generateAIDiagnosis}
                className="h-10 px-4"
                disabled={entries.length === 0}
              >
                <Brain className="h-4 w-4 mr-2" />
                Get AI Diagnosis
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="pr-3 pb-3 flex-1 overflow-y-auto min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
            <p className="text-xs text-foreground text-justify">
              {aiDiagnosis}
            </p>
          </div>
          <div className="flex gap-2 pt-0 shrink-0 pr-3">
            <Button
              onClick={generateAIDiagnosis}
              size="sm"
              disabled={entries.length === 0}
              className="text-xs flex-1"
            >
              <Brain className="h-2 w-2 mr-1" />
              Regenerate
            </Button>
            <Button
              size="sm"
              onClick={downloadReport}
              className="text-xs flex-1"
            >
              <Download className="h-2 w-2 mr-1" />
              Download
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
