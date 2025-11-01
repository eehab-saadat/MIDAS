import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log the received patient data with session entries for debugging
    console.log("=== AI DIAGNOSIS API REQUEST ===");
    console.log("Patient Data with Session Entries:");
    console.log(JSON.stringify(body, null, 2));
    console.log("================================");

    // Extract patient info for context
    const patientName = body.personal_information?.name || "Patient";
    const conditions = body.diagnosis?.probable_conditions || [];
    const symptoms = body.current_symptoms || [];
    const medications = body.medications?.map((m: any) => m.name) || [];
    const sessionEntries = body.entries || [];

    // Generate a dummy AI diagnosis summary
    const aiDiagnosisSummary = `
CLINICAL ANALYSIS SUMMARY
Patient: ${patientName}

Based on the comprehensive medical evaluation and ${sessionEntries.length > 0 ? `${sessionEntries.length} session entries` : "baseline data"}:

ASSESSMENT:
${conditions.length > 0 ? `Primary conditions identified: ${conditions.join(", ")}.` : "No acute conditions identified at this time."}

CURRENT CLINICAL STATUS:
${symptoms.length > 0 ? `Patient reports: ${symptoms.slice(0, 3).join(", ")}.` : "Patient appears stable with no acute symptoms."}

MEDICATION REVIEW:
${medications.length > 0 ? `Current medications: ${medications.join(", ")}.` : "No active medications."} Compliance and effectiveness should be monitored.

${sessionEntries.length > 0 ? `SESSION ENTRIES REVIEWED: ${sessionEntries.length} entries analyzed.` : ""}

CLINICAL RECOMMENDATIONS:
1. Continue current treatment plan with regular follow-ups
2. Monitor vital signs and symptom progression
3. Schedule follow-up appointment in 2-4 weeks
4. Maintain medication adherence as prescribed
5. Consider lifestyle modifications as appropriate

NOTES:
This is a preliminary AI-assisted analysis based on available data. Clinical correlation with physician examination is essential for definitive diagnosis and management decisions.

Generated: ${new Date().toLocaleString()}
    `.trim();

    return NextResponse.json(
      {
        success: true,
        diagnosis: aiDiagnosisSummary,
        entriesProcessed: sessionEntries.length,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing AI diagnosis request:", error);
    return NextResponse.json(
      { error: "Failed to generate AI diagnosis" },
      { status: 500 }
    );
  }
}

