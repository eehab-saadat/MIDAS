import { NextRequest, NextResponse } from "next/server";

// Dummy transcription data based on audio duration
const dummyTranscriptions = [
  "The patient presents with chronic pain in the left shoulder. Pain started approximately 3 weeks ago after lifting a heavy object. No previous history of shoulder injuries.",
  "Patient reports fever for the past 5 days with intermittent cough. Denies shortness of breath. Family history of respiratory conditions noted.",
  "Cardiovascular assessment shows normal heart rate and blood pressure. No signs of arrhythmia detected. Patient reports occasional palpitations but denies chest pain.",
  "Physical examination reveals mild swelling in the knee joint. Limited range of motion observed. Patient reports pain during weight-bearing activities.",
  "Neurological examination findings: normal reflexes, intact sensation, normal motor strength. Patient denies recent headaches or dizziness.",
  "Respiratory system appears clear on examination. Normal breath sounds bilaterally. Oxygen saturation within normal limits.",
  "Gastrointestinal assessment: patient reports occasional nausea, no vomiting. Abdomen soft and non-tender. Normal bowel sounds.",
  "Mental status examination: patient alert and oriented. Memory intact, appropriate affect observed. No signs of cognitive impairment.",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioBlob = formData.get("audio") as Blob;

    if (!audioBlob) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Generate a dummy transcription
    // In real implementation, this would call a speech-to-text service
    const randomIndex = Math.floor(Math.random() * dummyTranscriptions.length);
    const transcription = dummyTranscriptions[randomIndex];

    console.log(`Transcribing audio (size: ${audioBlob.size} bytes)`);

    return NextResponse.json(
      {
        success: true,
        transcription: transcription,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in transcribe endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process audio transcription" },
      { status: 500 }
    );
  }
}
