import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PatientDetail } from "@/lib/patients";

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

  const generateAIDiagnosis = async () => {
    setIsLoading(true);
    try {
      // Merge session entries into their respective places in the patient data
      const mergedData: any = {
        ...patientData,
      };

      if (patientData) {
        // Initialize lab_report_imgs, audio_file and audio_transcriptions arrays if they don't exist
        if (!mergedData.lab_report_imgs) {
          mergedData.lab_report_imgs = [];
        }
        if (!mergedData.audio_files) {
          mergedData.audio_files = [];
        }
        if (!mergedData.audio_transcriptions) {
          mergedData.audio_transcriptions = [];
        }

        // Process each entry type and add to appropriate sections
        entries.forEach((entry) => {
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
            // Add to audio_files array
            mergedData.audio_files.push({
              id: entry.id,
              file_name: entry.audio_file.file_name,
              file_type: entry.audio_file.file_type,
              base64_data: entry.audio_file.base64_data,
              duration: entry.audio_file.duration,
              date: entry.date,
            });
            
            // Add to audio_transcriptions array if transcription exists
            if (entry.audio_transcription) {
              mergedData.audio_transcriptions.push(entry.audio_transcription);
            }
          }
        });
      }

      // Generate and download JSON file
      const generateJsonFile = (data: any) => {
        try {
          const jsonString = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonString], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
          link.download = `patient_data_${patientData?.patient_id || "unknown"}_${timestamp}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log("JSON file downloaded successfully");
        } catch (error) {
          console.error("Error generating JSON file:", error);
        }
      };

      // Generate and download the merged data JSON
      generateJsonFile(mergedData);

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
      setShowAIDiagnosis(true);
    } catch (error) {
      console.error("Error generating AI diagnosis:", error);
      setAiDiagnosis(
        "Error generating diagnosis. Please try again."
      );
      setShowAIDiagnosis(true);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReport = () => {
    const getEntryDisplay = (entry: MedicalEntry) => {
      switch (entry.type) {
        case "meds":
          return `${entry.content.name} - ${entry.content.dose}, ${entry.content.frequency}`;
        case "symptoms":
          return entry.content.symptoms.join(", ");
        case "note":
          return entry.content.summary;
        case "imaging":
        case "lab":
          return entry.content.file_name;
        case "audio":
          if (entry.audio_transcription) {
            return `Audio recording (${entry.content.duration}s)\nTranscription: ${entry.audio_transcription}`;
          }
          return `Audio recording - ${entry.content.file_name} (${entry.content.duration}s)`;
        default:
          return "Entry";
      }
    };

    const reportContent = `
MEDICAL SESSION REPORT
Date: ${new Date().toLocaleDateString()}

PATIENT ENTRIES:
${entries
  .map(
    (entry) => `
${entry.type.toUpperCase()}:
${getEntryDisplay(entry)}
Date: ${entry.date}
`
  )
  .join("\n")}

AI DIAGNOSIS:
${aiDiagnosis}
    `.trim();

    const blob = new Blob([reportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medical-report-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
