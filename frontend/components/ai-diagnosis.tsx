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

      // Update patient data with merged session entries
      const patientId = mergedData.patient_id;
      if (patientId) {
        try {
          const updateResponse = await fetch(`/api/patients/${patientId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(mergedData),
          });

          if (!updateResponse.ok) {
            console.warn(
              "Failed to update patient data:",
              updateResponse.status
            );
            // Continue anyway, as this is not critical to generating the diagnosis
          } else {
            console.log("Patient data updated successfully");
          }
        } catch (error) {
          console.warn("Error updating patient data:", error);
          // Continue anyway, as this is not critical to generating the diagnosis
        }
      }

      const response = await fetch("/api/ai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mergedData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.error || data.diagnosis || "Failed to generate AI diagnosis";
        throw new Error(errorMessage);
      }

      setAiDiagnosis(data.diagnosis || "No diagnosis available.");
      setMergedData(mergedData);
      setShowAIDiagnosis(true);
    } catch (error) {
      console.error("Error generating AI diagnosis:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Error generating diagnosis. Please ensure the backend server is running and Ollama is available.";
      setAiDiagnosis(`Error: ${errorMessage}`);
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
      const secondaryColor = [231, 76, 60]; // Red

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

      // Helper function to add image
      const addImage = (imgData: string, title: string, width: number = 80) => {
        if (yPosition + width + 5 > pageHeight - 10) {
          doc.addPage();
          yPosition = margin;
        }
        try {
          const xPos = pageWidth / 2 - width / 2;
          doc.addImage(imgData, "JPEG", xPos, yPosition, width, width * 0.75);
          yPosition += width * 0.75 + 2;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(title, pageWidth / 2, yPosition, { align: "center" });
          yPosition += lineHeight + 2;
        } catch (error) {
          console.error("Error adding image:", error);
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
      addKeyValuePair("Patient ID", mergedData.patient_id || "N/A");
      addKeyValuePair(
        "Name",
        `${mergedData.personal_information?.salutation || ""} ${
          mergedData.personal_information?.name || "N/A"
        }`
      );
      addKeyValuePair(
        "Age",
        `${mergedData.personal_information?.age || "N/A"} years`
      );
      addKeyValuePair("Gender", mergedData.personal_information?.sex || "N/A");
      addKeyValuePair(
        "Ethnicity",
        mergedData.personal_information?.ethnicity || "N/A"
      );
      addKeyValuePair(
        "Occupation",
        mergedData.personal_information?.occupation || "N/A"
      );
      yPosition += sectionGap;

      // --- VITALS ---
      if (mergedData.vitals) {
        addSectionHeader("VITAL SIGNS");
        addKeyValuePair("Weight", `${mergedData.vitals.weight_kg || "N/A"} kg`);
        addKeyValuePair("BMI", `${mergedData.vitals.bmi_estimate || "N/A"}`);
        addKeyValuePair(
          "Blood Pressure",
          `${mergedData.vitals.blood_pressure_mmHg || "N/A"} mmHg`
        );
        addKeyValuePair(
          "Heart Rate",
          `${mergedData.vitals.heart_rate_bpm || "N/A"} bpm`
        );
        addKeyValuePair("SpO₂", `${mergedData.vitals.spo2_percent || "N/A"}%`);
        addKeyValuePair(
          "Temperature",
          `${mergedData.vitals.temperature || "N/A"}°F`
        );
        addKeyValuePair(
          "Blood Glucose",
          mergedData.vitals.blood_glucose || "N/A"
        );
        yPosition += sectionGap;
      }

      // --- CURRENT SYMPTOMS ---
      if (
        mergedData.current_symptoms &&
        mergedData.current_symptoms.length > 0
      ) {
        addSectionHeader("CURRENT SYMPTOMS");
        mergedData.current_symptoms.forEach((symptom: string) => {
          addText(`  • ${symptom}`, 9, false);
        });
        yPosition += sectionGap;
      }

      // --- MEDICATIONS ---
      if (mergedData.medications && mergedData.medications.length > 0) {
        addSectionHeader("MEDICATIONS");
        mergedData.medications.forEach(
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
      if (mergedData.clinical_notes) {
        addSectionHeader("CLINICAL NOTES");
        if (mergedData.clinical_notes.summary) {
          addKeyValuePair("Summary", mergedData.clinical_notes.summary);
        }
        if (mergedData.clinical_notes.examination) {
          addKeyValuePair("Examination", mergedData.clinical_notes.examination);
        }
        if (mergedData.clinical_notes.assessment) {
          addKeyValuePair("Assessment", mergedData.clinical_notes.assessment);
        }
        if (
          mergedData.clinical_notes.plan &&
          mergedData.clinical_notes.plan.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Plan:", margin + 1, yPosition);
          yPosition += lineHeight;
          mergedData.clinical_notes.plan.forEach((item: string) => {
            addText(`  • ${item}`, 9, false);
          });
        }
        yPosition += sectionGap;
      }

      // --- MEDICAL IMAGERY ---
      if (mergedData.medical_imagery && mergedData.medical_imagery.length > 0) {
        addSectionHeader("MEDICAL IMAGERY");
        mergedData.medical_imagery.forEach(
          (img: {
            id: string;
            name: string;
            type: string;
            date: string;
            description: string;
            imagePath?: string;
          }) => {
            if (img.imagePath) {
              addImage(img.imagePath, `${img.name} (${img.date})`);
            }
          }
        );
        yPosition += sectionGap;
      }

      // --- LAB REPORTS ---
      if (mergedData.lab_report_imgs && mergedData.lab_report_imgs.length > 0) {
        addSectionHeader("LAB REPORTS");
        mergedData.lab_report_imgs.forEach(
          (lab: {
            id: string;
            file_name: string;
            base64_data: string;
            date: string;
          }) => {
            if (lab.base64_data) {
              addImage(lab.base64_data, `${lab.file_name} (${lab.date})`);
            }
          }
        );
        yPosition += sectionGap;
      }

      // --- AI DIAGNOSIS ---
      addSectionHeader("AI DIAGNOSIS");
      addText(aiDiagnosis, 9, false);
      yPosition += sectionGap;

      // --- KNOWN MEDICAL HISTORY ---
      if (
        mergedData.known_medical_history &&
        mergedData.known_medical_history.length > 0
      ) {
        addSectionHeader("MEDICAL HISTORY");
        mergedData.known_medical_history.forEach((item: string) => {
          addText(`  • ${item}`, 9, false);
        });
        yPosition += sectionGap;
      }

      // --- DIAGNOSIS DETAILS ---
      if (mergedData.diagnosis) {
        addSectionHeader("DIAGNOSIS & RECOMMENDATIONS");
        if (
          mergedData.diagnosis.probable_conditions &&
          mergedData.diagnosis.probable_conditions.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Probable Conditions:", margin + 1, yPosition);
          yPosition += lineHeight;
          mergedData.diagnosis.probable_conditions.forEach((cond: string) => {
            addText(`  • ${cond}`, 9, false);
          });
        }
        if (
          mergedData.diagnosis.treatment_suggestions &&
          mergedData.diagnosis.treatment_suggestions.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Treatment Suggestions:", margin + 1, yPosition);
          yPosition += lineHeight;
          mergedData.diagnosis.treatment_suggestions.forEach((sug: string) => {
            addText(`  • ${sug}`, 9, false);
          });
        }
        if (
          mergedData.diagnosis.medical_advice &&
          mergedData.diagnosis.medical_advice.length > 0
        ) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          if (yPosition + lineHeight > pageHeight - 10) {
            doc.addPage();
            yPosition = margin;
          }
          doc.text("Medical Advice:", margin + 1, yPosition);
          yPosition += lineHeight;
          mergedData.diagnosis.medical_advice.forEach((advice: string) => {
            addText(`  • ${advice}`, 9, false);
          });
        }
      }

      // --- SOCIAL DETERMINANTS OF HEALTH ---
      if (mergedData.personal_information?.social_determinants) {
        addSectionHeader("SOCIAL DETERMINANTS OF HEALTH");
        const sdoh = mergedData.personal_information.social_determinants;
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
