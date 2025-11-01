// app/patient/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
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

interface MedicalEntry {
  id: string;
  type: "imaging" | "lab" | "note" | "meds" | "symptoms" | "audio";
  date: string;
  content: any;
}

export default function PatientPage() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patient");
  
  const [patientData, setPatientData] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState("vitals");
  const [entries, setEntries] = useState<MedicalEntry[]>([]);
  const [isMounted, setIsMounted] = useState(false);

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
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient data");
        }
        const data: PatientDetail = await response.json();
        setPatientData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching patient:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch patient");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, isMounted]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div>Loading patient data...</div>
      </div>
    );
  }

  if (error || !patientData) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-red-500">Error: {error || "Patient not found"}</div>
      </div>
    );
  }

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
            <Link
              href="/"
              className="bg-card rounded-full p-1 mr-4 border hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="text-sm">Patient List</div>
              {/* <div className="text-sm">NRN: 123456789</div> */}
            </div>
          </div>
          <ThemeToggle />
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
                  <TabsTrigger className=" text-xs" value="ai-summary">
                    Summary
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
          <div className="col-span-full md:col-span-1 gap-0">
            <Card className="h-[58.25vh] p-3 mb-1">
              <SessionInstance entries={entries} setEntries={setEntries} />
            </Card>
            <Card className="h-[33.5vh] p-3 pr-0 z-10">
              <AIDiagnosis entries={entries} patientData={patientData} />
            </Card>
          </div>
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
              {selectedTab === "ai-summary" && (
                <AiSummary />
              )}
            </CardContent>
          </Card>

          {/* Bottom Right Box */}
          <Card className="rounded-tl-none col-span-full md:col-span-1 lg:col-span-1 h-full p-0 mr-1">
            <CardContent className="h-full p-0">
              <DiagnosisDisplay diagnosis={patientData.diagnosis} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
