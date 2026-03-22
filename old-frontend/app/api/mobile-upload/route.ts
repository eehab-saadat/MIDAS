import { NextRequest, NextResponse } from "next/server";

// In-memory storage for uploaded images (in production, use Redis or DB)
const imageStore = new Map<string, Array<{
  id: string;
  fileName: string;
  fileType: string;
  base64Data: string;
  timestamp: number;
}>>();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image") as Blob;
    const sessionId = formData.get("session_id") as string;

    if (!imageFile || !sessionId) {
      return NextResponse.json(
        { error: "Missing image or session_id" },
        { status: 400 }
      );
    }

    // Convert blob to base64
    const buffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const base64Data = `data:${imageFile.type};base64,${base64}`;

    // Store in memory
    if (!imageStore.has(sessionId)) {
      imageStore.set(sessionId, []);
    }

    const imageData = {
      id: Date.now().toString(),
      fileName: `mobile_capture_${Date.now()}.jpg`,
      fileType: imageFile.type,
      base64Data: base64Data,
      timestamp: Date.now(),
    };

    imageStore.get(sessionId)!.push(imageData);

    // Clean up old images (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, images] of imageStore.entries()) {
      const filtered = images.filter(img => img.timestamp > oneHourAgo);
      if (filtered.length === 0) {
        imageStore.delete(key);
      } else {
        imageStore.set(key, filtered);
      }
    }

    return NextResponse.json(
      { success: true, imageId: imageData.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error uploading mobile image:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    const images = imageStore.get(sessionId) || [];

    return NextResponse.json({ images }, { status: 200 });
  } catch (error) {
    console.error("Error fetching mobile images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear images after they're consumed
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const imageId = searchParams.get("image_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    if (imageId) {
      // Delete specific image
      const images = imageStore.get(sessionId);
      if (images) {
        const filtered = images.filter(img => img.id !== imageId);
        imageStore.set(sessionId, filtered);
      }
    } else {
      // Delete all images for session
      imageStore.delete(sessionId);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting mobile images:", error);
    return NextResponse.json(
      { error: "Failed to delete images" },
      { status: 500 }
    );
  }
}

