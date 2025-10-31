import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MedicalEntry {
  id: string;
  type: "imaging" | "lab" | "note";
  title: string;
  content: string | File;
  date: string;
}

interface AIDiagnosisProps {
  entries: MedicalEntry[];
}

export const AIDiagnosis = ({ entries }: AIDiagnosisProps) => {
  const [showAIDiagnosis, setShowAIDiagnosis] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const generateAIDiagnosis = async () => {
    setIsLoading(true);
    // Simulate API wait time of 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Simulate AI diagnosis generation
    const diagnosis = `Based on the patient's medical history and current entries, the AI analysis suggests: ${
      entries.length > 0
        ? "Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided. Further evaluation recommended based on the imaging and lab results provided."
        : "Insufficient data for comprehensive diagnosis. Additional tests may be required."
    }`;
    setAiDiagnosis(diagnosis);
    setShowAIDiagnosis(true);
    setIsLoading(false);
  };

  const downloadReport = () => {
    const reportContent = `
MEDICAL SESSION REPORT
Date: ${new Date().toLocaleDateString()}

PATIENT ENTRIES:
${entries
  .map(
    (entry) => `
${entry.type.toUpperCase()}: ${entry.title}
Date: ${entry.date}
${typeof entry.content === "string" ? entry.content : entry.content.name}
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
