"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Mic, Square, Pause, Play, Smartphone, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

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

interface SessionInstanceProps {
  entries: MedicalEntry[];
  setEntries: (entries: MedicalEntry[]) => void;
}

export const SessionInstance = ({
  entries,
  setEntries,
}: SessionInstanceProps) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [tempAudioBlob, setTempAudioBlob] = useState<Blob | null>(null);
  const [showMobileQR, setShowMobileQR] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [mobileUrl, setMobileUrl] = useState<string>("");
  const [customBaseUrl, setCustomBaseUrl] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [detectedLocalIp, setDetectedLocalIp] = useState<string>("");
  const [isDetectingIp, setIsDetectingIp] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const prevAudioUrlRef = useRef<string | null>(null);

  // Ensure component is mounted on client before using browser APIs
  useEffect(() => {
    setIsMounted(true);
    // Generate unique session ID
    const uniqueId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(uniqueId);
    
    // Set mobile URL - default to window origin
    if (typeof window !== "undefined") {
      const baseUrl = customBaseUrl || "https://nonpedagogical-cris-epizootically.ngrok-free.dev";
      setMobileUrl(`${baseUrl}/mobile-camera?session=${uniqueId}`);
    }
  }, [customBaseUrl]);
  
  // Update mobile URL when custom base URL changes
  const updateMobileUrl = (newBaseUrl: string) => {
    setCustomBaseUrl(newBaseUrl);
  };

  // Detect local IP address using WebRTC
  const detectLocalIp = async () => {
    setIsDetectingIp(true);
    try {
      // Create a dummy peer connection
      const pc = new RTCPeerConnection({
        iceServers: []
      });

      // Create a dummy data channel
      pc.createDataChannel('');

      // Create an offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidate
      return new Promise<string>((resolve) => {
        pc.onicecandidate = (ice) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            return;
          }

          const candidate = ice.candidate.candidate;
          
          // Extract IP address from candidate string
          // Format: "candidate:... typ host" contains local IP
          const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = candidate.match(ipRegex);
          
          if (match && match[1]) {
            const ip = match[1];
            // Filter out localhost
            if (!ip.startsWith('127.') && !ip.startsWith('0.')) {
              pc.close();
              setDetectedLocalIp(ip);
              setIsDetectingIp(false);
              resolve(ip);
            }
          }
        };

        // Timeout after 3 seconds
        setTimeout(() => {
          pc.close();
          setIsDetectingIp(false);
          resolve('');
        }, 3000);
      });
    } catch (error) {
      console.error('Error detecting local IP:', error);
      setIsDetectingIp(false);
      return '';
    }
  };

  // Auto-detect IP when QR modal opens
  useEffect(() => {
    if (showMobileQR && !detectedLocalIp && !customBaseUrl) {
      detectLocalIp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMobileQR, detectedLocalIp, customBaseUrl]);

  // Poll for new images from mobile
  useEffect(() => {
    if (!sessionId || !showMobileQR) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/mobile-upload?session_id=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.images && data.images.length > 0) {
            // Add new images as entries
            const newImages = data.images.filter(
              (img: any) => !entries.find((e) => e.id === img.id)
            );

            newImages.forEach((img: any) => {
              const newEntry: MedicalEntry = {
                id: img.id,
                type: "imaging",
                date: new Date(img.timestamp).toISOString(),
                content: {
                  file_name: img.fileName,
                  file_type: img.fileType,
                  base64_data: img.base64Data,
                },
              };
              setEntries([...entries, newEntry]);
            });

            // Clear consumed images
            if (newImages.length > 0) {
              await fetch(`/api/mobile-upload?session_id=${sessionId}`, {
                method: "DELETE",
              });
            }
          }
        }
      } catch (error) {
        console.error("Error polling for mobile images:", error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [sessionId, showMobileQR, entries, setEntries]);

  const [entryType, setEntryType] = useState<
    "imaging" | "lab" | "note" | "meds" | "symptoms"
  >("note");

  // Note fields
  const [noteContent, setNoteContent] = useState("");

  // Meds fields
  const [medName, setMedName] = useState("");
  const [medDose, setMedDose] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medIndication, setMedIndication] = useState("");

  // Symptoms fields
  const [symptomContent, setSymptomContent] = useState("");

  // Imaging/Lab fields
  const [imageFile, setImageFile] = useState<File | null>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    setTempAudioBlob(blob);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json();
        const transcriptionText = transcribeData.transcription || "";
        console.log("Transcription received:", transcriptionText);
        setTranscription(transcriptionText);
      } else {
        console.error("Failed to transcribe audio:", transcribeResponse.status);
        setTranscription("Failed to transcribe audio");
      }
    } catch (transcribeError) {
      console.error("Error calling transcribe API:", transcribeError);
      setTranscription("Error during transcription");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      // Check if component is mounted and browser supports audio
      if (!isMounted || typeof window === "undefined") {
        console.error("Component not mounted or window not available");
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        console.error("Audio recording not supported in this browser");
        return;
      }

      audioChunksRef.current = [];
      setRecordingTime(0);
      setAudioBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        // Revoke previous URL if exists
        if (prevAudioUrlRef.current) {
          try {
            URL.revokeObjectURL(prevAudioUrlRef.current);
          } catch (e) {
            // ignore
          }
          prevAudioUrlRef.current = null;
        }
        const url = URL.createObjectURL(blob);
        prevAudioUrlRef.current = url;
        setAudioUrl(url);
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());

        // Start transcription after audio blob is ready
        transcribeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const pauseRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === "recording") {
      if (typeof mr.pause === "function") {
        mr.pause();
      }
      setIsPaused(true);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    } else if (mr.state === "paused") {
      if (typeof mr.resume === "function") {
        mr.resume();
      }
      setIsPaused(false);
      // restart timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const resumeRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === "paused" && typeof mr.resume === "function") {
      mr.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    const mr = mediaRecorderRef.current;
    try {
      if (mr && mr.state !== "inactive") {
        mr.stop();
      }
    } catch (e) {
      // ignore
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setAudioBlob(null);
    audioChunksRef.current = [];
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (prevAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(prevAudioUrlRef.current);
      } catch (e) {}
      prevAudioUrlRef.current = null;
      setAudioUrl(null);
    }
    mediaRecorderRef.current = null;
  };

  const saveAudio = async () => {
    if (audioBlob) {
      try {
        const base64Audio = await convertBlobToBase64(audioBlob);

        const newEntry: MedicalEntry = {
          id: Date.now().toString(),
          type: "audio",
          date: new Date().toISOString(),
          content: {
            file_name: `recording_${Date.now()}.webm`,
            file_type: "audio/webm",
            duration: recordingTime,
          },
          audio_file: {
            file_name: `recording_${Date.now()}.webm`,
            file_type: "audio/webm",
            base64_data: base64Audio,
            duration: recordingTime,
          },
          audio_transcription: transcription || undefined,
        };
        console.log("Creating audio entry with transcription:", {
          transcription,
          entry: newEntry,
        });
        setEntries([...entries, newEntry]);
        // cleanup audio URL and blob after saving
        setAudioBlob(null);
        setRecordingTime(0);
        setTranscription(null);
        if (prevAudioUrlRef.current) {
          try {
            URL.revokeObjectURL(prevAudioUrlRef.current);
          } catch (e) {}
          prevAudioUrlRef.current = null;
        }
        setAudioUrl(null);
        // ensure any recorder/stream are stopped
        try {
          cancelRecording();
        } catch (e) {}
      } catch (error) {
        console.error("Error saving audio:", error);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const addEntry = async () => {
    try {
      let content: any = null;
      let isValid = false;

      if (entryType === "note") {
        isValid = noteContent.trim() !== "";
        content = {
          summary: noteContent,
        };
      } else if (entryType === "meds") {
        isValid = medName.trim() !== "" && medDose.trim() !== "";
        content = {
          name: medName,
          dose: medDose,
          frequency: medFrequency,
          indication: medIndication,
        };
      } else if (entryType === "symptoms") {
        isValid = symptomContent.trim() !== "";
        content = {
          symptoms: symptomContent.split(",").map((s) => s.trim()),
        };
      } else if (entryType === "imaging" || entryType === "lab") {
        isValid = imageFile !== null;
        if (isValid) {
          const base64 = await convertFileToBase64(imageFile!);
          content = {
            file_name: imageFile!.name,
            file_type: imageFile!.type,
            base64_data: base64,
          };
        }
      }

      if (isValid) {
        const newEntry: MedicalEntry = {
          id: Date.now().toString(),
          type: entryType,
          date: new Date().toISOString(),
          content: content,
        };
        setEntries([...entries, newEntry]);

        // Reset form
        setNoteContent("");
        setMedName("");
        setMedDose("");
        setMedFrequency("");
        setMedIndication("");
        setSymptomContent("");
        setImageFile(null);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error("Error adding entry:", error);
    }
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Add and Audio Buttons */}
      <div className="flex justify-between items-center mb-2 gap-2">
        <h3 className="text-sm font-medium">Session Entries</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-2 w-2 mr-1" />
            Add
          </Button>
          <Button
            size="sm"
            onClick={startRecording}
            disabled={isRecording || !isMounted}
            className="h-7 px-2 text-xs"
            variant={isRecording ? "secondary" : "outline"}
            title={!isMounted ? "Loading audio support..." : "Record audio"}
          >
            <Mic className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowMobileQR(!showMobileQR)}
            className="h-7 px-2 text-xs"
            variant={showMobileQR ? "default" : "outline"}
            title="Use mobile camera"
          >
            <Smartphone className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Mobile QR Code Modal */}
      {showMobileQR && (
        <Card className="p-4 mb-2 border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-semibold text-blue-600">
                Scan with Mobile Device
              </h4>
            </div>
            
            {/* URL Configuration */}
            <div className="w-full space-y-2">
              <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded p-2 text-xs">
                <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  📱 For Localhost Development:
                </p>
                <ol className="list-decimal ml-4 space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>Mobile device must be on the same WiFi network</li>
                  <li>Click the button below to use your local IP</li>
                  <li>Make sure your Next.js dev server is accessible on your network</li>
                </ol>
              </div>

              {/* Auto-detected IP Section */}
              {isDetectingIp && (
                <div className="bg-blue-50 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded p-3 text-xs">
                  <p className="text-blue-700 dark:text-blue-300 animate-pulse">
                    🔍 Detecting your local IP address...
                  </p>
                </div>
              )}

              {detectedLocalIp && !customBaseUrl && (
                <div className="bg-green-50 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded p-3 text-xs space-y-2">
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    ✅ Detected Local IP: <span className="font-mono">{detectedLocalIp}</span>
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      const port = typeof window !== "undefined" ? window.location.port || "3000" : "3000";
                      updateMobileUrl(`http://${detectedLocalIp}:${port}`);
                    }}
                    className="h-7 text-xs w-full bg-green-600 hover:bg-green-700"
                  >
                    Use This IP for QR Code
                  </Button>
                </div>
              )}

              {customBaseUrl && (
                <div className="bg-green-50 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded p-2 text-xs">
                  <p className="font-semibold text-green-800 dark:text-green-200">
                    ✅ Using: <span className="font-mono">{customBaseUrl}</span>
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setCustomBaseUrl("")}
                    variant="outline"
                    className="h-6 text-xs w-full mt-2"
                  >
                    Reset to Default
                  </Button>
                </div>
              )}

              {!showUrlInput && (
                <Button
                  size="sm"
                  onClick={() => setShowUrlInput(true)}
                  variant="outline"
                  className="h-7 text-xs w-full"
                >
                  Enter Custom URL (Tunnel/Different IP)
                </Button>
              )}

              {showUrlInput && (
                <div className="space-y-2">
                  <Label className="text-xs text-blue-700 dark:text-blue-300">
                    Base URL (without /mobile-camera):
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g., http://192.168.1.100:3000"
                    value={customBaseUrl}
                    onChange={(e) => updateMobileUrl(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Leave empty to use: {typeof window !== "undefined" ? window.location.origin : ""}
                  </p>
                </div>
              )}
            </div>
            
            {mobileUrl && (
              <>
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG value={mobileUrl} size={150} />
                </div>
                
                <div className="text-center text-xs break-all bg-white dark:bg-gray-800 p-2 rounded w-full">
                  <p className="font-mono text-gray-700 dark:text-gray-300">
                    {mobileUrl}
                  </p>
                </div>
              </>
            )}

            <div className="text-center text-xs text-blue-600 dark:text-blue-300">
              <p className="font-semibold mb-1">Capture images from your phone</p>
              <p className="text-xs opacity-75">Images will appear automatically</p>
            </div>

            <div className="bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded p-2 text-xs w-full">
              <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                💡 Finding Your Local IP:
              </p>
              <ul className="list-disc ml-4 space-y-1 text-blue-700 dark:text-blue-300 text-xs">
                <li><strong>Windows:</strong> Open CMD, type <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">ipconfig</code></li>
                <li><strong>Mac/Linux:</strong> Open Terminal, type <code className="bg-blue-200 dark:bg-blue-800 px-1 rounded">ifconfig</code></li>
                <li>Look for IPv4 Address (usually starts with 192.168.x.x)</li>
              </ul>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setShowMobileQR(false);
                setShowUrlInput(false);
              }}
              variant="outline"
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Close
            </Button>
          </div>
        </Card>
      )}

      {/* Audio Recording Modal */}
      {isRecording && (
        <Card className="p-4 mb-2 border-2 border-red-500 bg-red-50 dark:bg-red-950">
          <div className="flex flex-col items-center gap-4">
            {/* Pulsing Circle Animation */}
            <div className="relative w-16 h-16">
              <style>{`
                @keyframes pulse-ring {
                  0% {
                    transform: scale(0.8);
                    opacity: 1;
                  }
                  100% {
                    transform: scale(1.5);
                    opacity: 0;
                  }
                }
                .pulse-circle {
                  animation: pulse-ring 1.5s ease-out infinite;
                }
              `}</style>
              <div className="absolute inset-0 bg-red-500 rounded-full pulse-circle" />
              <div className="absolute inset-2 bg-red-600 rounded-full flex items-center justify-center">
                <Mic className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Recording Time */}
            <div className="text-center">
              <p className="text-sm font-semibold text-red-600">Recording...</p>
              <p className="text-lg font-bold text-red-600">
                {formatTime(recordingTime)}
              </p>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                size="sm"
                onClick={pauseRecording}
                className="h-7 text-xs"
              >
                <Pause className="h-3 w-3 mr-1" />
                Pause
              </Button>
              <Button
                size="sm"
                onClick={stopRecording}
                variant="default"
                className="h-7 text-xs"
              >
                <Square className="h-3 w-3 mr-1" />
                Stop
              </Button>
              <Button
                size="sm"
                onClick={cancelRecording}
                variant="destructive"
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Audio Preview and Save */}
      {audioBlob && !isRecording && (
        <Card className="p-4 mb-2 bg-green-50 dark:bg-green-950 border-2 border-green-500">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-green-600">
                Recording saved ({formatTime(recordingTime)})
              </p>
              <Button
                size="sm"
                onClick={() => {
                  const audioEl = audioElementRef.current;
                  if (!audioEl) return;
                  if (audioEl.paused) {
                    audioEl.play();
                  } else {
                    audioEl.pause();
                  }
                }}
                variant="outline"
                className="h-7 text-xs"
              >
                <Play className="h-3 w-3 mr-1" />
                {isPlayingAudio ? "Pause" : "Play"}
              </Button>
            </div>

            {/* Hidden audio element for playback */}
            <audio
              ref={audioElementRef}
              src={audioUrl ?? undefined}
              onPlay={() => setIsPlayingAudio(true)}
              onPause={() => setIsPlayingAudio(false)}
              onEnded={() => setIsPlayingAudio(false)}
            />

            {/* Transcription Section */}
            <div className="bg-white dark:bg-gray-900 p-3 rounded border border-green-200 dark:border-green-800">
              {isTranscribing ? (
                <div className="text-sm text-gray-500">
                  <p className="font-semibold mb-2">Transcribing...</p>
                  <div className="animate-pulse space-y-2">
                    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                    <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded w-4/5"></div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-xs text-green-700 dark:text-green-300 mb-2">
                    Transcription:
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {transcription || "No transcription available"}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveAudio}
                disabled={isTranscribing}
                className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700"
              >
                {isTranscribing ? "Transcribing..." : "Save Audio"}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAudioBlob(null);
                  setRecordingTime(0);
                  setTranscription(null);
                }}
                variant="outline"
                className="h-7 text-xs"
              >
                Discard
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add Entry Form */}
      {showAddForm && (
        <Card className="p-3 mb-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Entry Type</Label>
              <Select
                value={entryType}
                onValueChange={(
                  value: "imaging" | "lab" | "note" | "meds" | "symptoms"
                ) => setEntryType(value)}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">Doctor Notes</SelectItem>
                  <SelectItem value="meds">Medications</SelectItem>
                  <SelectItem value="symptoms">Symptoms</SelectItem>
                  <SelectItem value="imaging">Imaging Result</SelectItem>
                  <SelectItem value="lab">Lab Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Notes Form */}
            {entryType === "note" && (
              <div>
                <Label className="text-xs">Clinical Notes</Label>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter clinical notes..."
                  className="min-h-[60px] resize-none text-xs"
                />
              </div>
            )}

            {/* Medications Form */}
            {entryType === "meds" && (
              <>
                <div>
                  <Label className="text-xs">Medication Name</Label>
                  <Input
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    placeholder="e.g., Paracetamol"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Dose</Label>
                  <Input
                    value={medDose}
                    onChange={(e) => setMedDose(e.target.value)}
                    placeholder="e.g., 500 mg"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Frequency</Label>
                  <Input
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    placeholder="e.g., twice daily"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Indication</Label>
                  <Input
                    value={medIndication}
                    onChange={(e) => setMedIndication(e.target.value)}
                    placeholder="e.g., Pain relief"
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            {/* Symptoms Form */}
            {entryType === "symptoms" && (
              <div>
                <Label className="text-xs">Symptoms (comma-separated)</Label>
                <Textarea
                  value={symptomContent}
                  onChange={(e) => setSymptomContent(e.target.value)}
                  placeholder="e.g., Headache, Fever, Cough"
                  className="min-h-[60px] resize-none text-xs"
                />
              </div>
            )}

            {/* Imaging/Lab Upload Form */}
            {(entryType === "imaging" || entryType === "lab") && (
              <div>
                <Label className="text-xs">
                  {entryType === "imaging"
                    ? "Upload Image"
                    : "Upload Lab Report"}
                </Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="h-8 text-xs"
                />
                {imageFile && (
                  <p className="text-xs text-muted-foreground mt-1">
                    File: {imageFile.name}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" onClick={addEntry} className="h-7 text-xs">
                Add Entry
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="h-7 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Entries List - Scrollable area (hidden while add form open) */}
      {!showAddForm && (
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full min-h-0">
          <div className="space-y-2 pr-2 mt-3">
            {entries.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No entries yet. Click &quot;Add&quot; to create your first entry.
              </div>
            ) : (
              entries.map((entry) => {
                const getEntryDisplay = () => {
                  switch (entry.type) {
                    case "meds":
                      return `${entry.content.name} - ${entry.content.dose}, ${entry.content.frequency}`;
                    case "symptoms":
                      return entry.content.symptoms.join(", ");
                    case "note":
                      return (
                        entry.content.summary.substring(0, 50) +
                        (entry.content.summary.length > 50 ? "..." : "")
                      );
                    case "imaging":
                    case "lab":
                      return entry.content.file_name;
                    case "audio":
                      return `Audio Recording (${formatTime(
                        entry.content.duration
                      )})`;
                    default:
                      return "Entry";
                  }
                };

                return (
                  <Card key={entry.id} className="p-0 m-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 m-0">
                        <Badge
                          variant={
                            entry.type === "imaging"
                              ? "default"
                              : entry.type === "lab"
                              ? "secondary"
                              : entry.type === "audio"
                              ? "default"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {entry.type === "imaging"
                            ? "Imaging"
                            : entry.type === "lab"
                            ? "Lab"
                            : entry.type === "meds"
                            ? "Meds"
                            : entry.type === "symptoms"
                            ? "Symptoms"
                            : entry.type === "audio"
                            ? "Audio"
                            : "Note"}
                        </Badge>
                        <h4 className="text-xs font-medium truncate">
                          {getEntryDisplay()}
                        </h4>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeEntry(entry.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
