import { NextRequest, NextResponse } from "next/server";

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

    // Forward the audio to the Flask backend API
    const backendFormData = new FormData();
    backendFormData.append("audio", audioBlob, "recording.webm");

    console.log(
      `Forwarding audio transcription request (size: ${audioBlob.size} bytes)`
    );

    try {
      const backendResponse = await fetch("http://127.0.0.1:5000/transcribe", {
        method: "POST",
        body: backendFormData,
      });

      if (!backendResponse.ok) {
        const error = await backendResponse.json();
        console.error("Backend transcription error:", error);
        return NextResponse.json(
          { error: error.error || "Failed to transcribe audio from backend" },
          { status: backendResponse.status }
        );
      }

      const backendData = await backendResponse.json();

      return NextResponse.json(
        {
          success: true,
          transcription: backendData.transcription,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (fetchError) {
      console.error("Error connecting to backend:", fetchError);
      return NextResponse.json(
        { error: "Failed to connect to transcription service" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error in transcribe endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process audio transcription request" },
      { status: 500 }
    );
  }
}

