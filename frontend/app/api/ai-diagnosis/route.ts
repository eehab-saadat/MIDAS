import { NextResponse } from "next/server";

const FLASK_BACKEND_URL = process.env.FLASK_BACKEND_URL || "http://localhost:5000";

export async function POST(request: Request) {
  console.log("=== AI DIAGNOSIS API REQUEST ===");
  
  try {
    const body = await request.json();

    // Log the received patient data with session entries for debugging
    console.log("Patient Data Keys:", Object.keys(body));
    console.log("Patient ID:", body.patient_id);
    console.log("Has medical_imagery:", !!body.medical_imagery);
    console.log("Has lab_report_imgs:", !!body.lab_report_imgs);
    console.log("Medical imagery count:", body.medical_imagery?.length || 0);
    console.log("Lab reports count:", body.lab_report_imgs?.length || 0);

    // Find the first lab report image from the merged data
    let imageBase64 = null;
    let imageType = "image/jpeg";

    // Check lab_report_imgs first
    if (body.lab_report_imgs && body.lab_report_imgs.length > 0) {
      const firstLabReport = body.lab_report_imgs[0];
      imageBase64 = firstLabReport.base64_data;
      imageType = firstLabReport.file_type || "image/jpeg";
      console.log("Using lab report image:", firstLabReport.file_name);
    } 
    // Check medical_imagery as fallback
    else if (body.medical_imagery && body.medical_imagery.length > 0) {
      const firstImage = body.medical_imagery[0];
      imageBase64 = firstImage.imagePath;
      imageType = "image/jpeg";
      console.log("Using medical imagery:", firstImage.name);
    }

    if (!imageBase64) {
      console.log("No image found, will proceed with text-only diagnosis");
    }

    // Prepare blob if image exists
    let blob = null;
    if (imageBase64) {
      // Clean base64 data if it has a data URI prefix
      if (imageBase64.startsWith('data:')) {
        imageBase64 = imageBase64.split(',')[1];
      }

      // Convert base64 to blob for multipart form data
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      blob = new Blob([imageBuffer], { type: imageType });
    }

    // Prepare the data for the backend (removing unnecessary fields)
    const diagnosisData = {
      patient_id: body.patient_id,
      personal_information: body.personal_information,
      vitals: body.vitals,
      current_symptoms: body.current_symptoms,
      medications: body.medications,
      known_medical_history: body.known_medical_history,
      clinical_notes: body.clinical_notes,
      audio_transcriptions: body.audio_transcriptions || [],
    };

    // Create FormData for Flask backend
    const formData = new FormData();
    formData.append('data', JSON.stringify(diagnosisData));
    if (blob) {
      formData.append('image', blob, 'medical-image.jpg');
    }

    console.log("Calling Flask backend at:", `${FLASK_BACKEND_URL}/diagnose`);
    console.log("FormData contents:");
    console.log("  - data field length:", diagnosisData ? JSON.stringify(diagnosisData).length : 0);
    console.log("  - image blob size:", blob ? blob.size : 0, "bytes");
    console.log("  - has image:", !!blob);

    // Call Flask backend
    const backendResponse = await fetch(`${FLASK_BACKEND_URL}/diagnose`, {
      method: 'POST',
      body: formData,
    });

    console.log("Backend response status:", backendResponse.status);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("Flask backend error:", backendResponse.status, errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      throw new Error(`Backend returned ${backendResponse.status}: ${errorData.error || errorText}`);
    }

    const diagnosisResult = await backendResponse.json();
    console.log("Diagnosis result from backend:");
    console.log("  - Has diagnosis:", !!diagnosisResult.diagnosis);
    console.log("  - Has reasoning:", !!diagnosisResult.reasoning);
    console.log("  - Has error:", !!diagnosisResult.error);
    
    if (diagnosisResult.diagnosis) {
      console.log("  - Diagnosis preview:", diagnosisResult.diagnosis.substring(0, 100) + "...");
    }

    // Check if there's an error in the diagnosis result
    if (diagnosisResult.error) {
      return NextResponse.json(
        { 
          error: diagnosisResult.error,
          diagnosis: `Error generating diagnosis: ${diagnosisResult.error}`
        },
        { status: 500 }
      );
    }

    // Format the response for the frontend
    const formattedDiagnosis = `
DIAGNOSIS: ${diagnosisResult.diagnosis || "No diagnosis provided"}

REASONING:
${diagnosisResult.reasoning || "No reasoning provided"}

Generated: ${new Date().toLocaleString()}
    `.trim();

    return NextResponse.json(
      {
        success: true,
        diagnosis: formattedDiagnosis,
        raw_diagnosis: diagnosisResult.diagnosis,
        raw_reasoning: diagnosisResult.reasoning,
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
      { 
        error: error instanceof Error ? error.message : "Failed to generate AI diagnosis",
        diagnosis: `Error: ${error instanceof Error ? error.message : "Failed to generate AI diagnosis. Please ensure the backend server is running and Ollama is available."}`
      },
      { status: 500 }
    );
  }
}

