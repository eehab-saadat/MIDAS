"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, X, Check } from "lucide-react";

export default function MobileCameraPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    
    // Stop camera after capture
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setUploadSuccess(false);
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedImage || !sessionId) return;

    setIsUploading(true);
    setError(null);

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append("image", blob, `mobile_capture_${Date.now()}.jpg`);
      formData.append("session_id", sessionId);

      // Upload to backend
      const uploadResponse = await fetch("/api/mobile-upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setUploadSuccess(true);
      setTimeout(() => {
        setCapturedImage(null);
        setUploadSuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Camera className="h-6 w-6" />
            Mobile Camera Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!sessionId ? (
            <div className="text-center text-red-500">
              Invalid session. Please scan the QR code again.
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-600 dark:text-red-200">
                  {error}
                </div>
              )}

              {uploadSuccess && (
                <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded p-3 text-sm text-green-600 dark:text-green-200 flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Image uploaded successfully!
                </div>
              )}

              {/* Camera View */}
              {stream && !capturedImage && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                    <Button
                      size="lg"
                      onClick={capturePhoto}
                      className="rounded-full w-16 h-16 bg-white hover:bg-gray-100 text-black shadow-lg"
                    >
                      <Camera className="h-6 w-6" />
                    </Button>
                    <Button
                      size="lg"
                      variant="secondary"
                      onClick={stopCamera}
                      className="rounded-full w-12 h-12"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Captured Image Preview */}
              {capturedImage && (
                <div className="space-y-4">
                  <img
                    src={capturedImage}
                    alt="Captured"
                    className="w-full rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={uploadPhoto}
                      disabled={isUploading}
                      className="flex-1"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                    <Button
                      onClick={retakePhoto}
                      variant="outline"
                      disabled={isUploading}
                      className="flex-1"
                    >
                      Retake
                    </Button>
                  </div>
                </div>
              )}

              {/* Start Camera Button */}
              {!stream && !capturedImage && (
                <Button
                  onClick={startCamera}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Start Camera
                </Button>
              )}

              {/* Hidden canvas for image capture */}
              <canvas ref={canvasRef} className="hidden" />

              <div className="text-center text-sm text-muted-foreground mt-4">
                <p>Session: {sessionId.substring(0, 8)}...</p>
                <p className="mt-2">
                  Take a photo of lab results or medical imagery
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

