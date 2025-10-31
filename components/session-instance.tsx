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
import { Plus, X, Mic, Square, Pause, Play } from "lucide-react";

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
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Ensure component is mounted on client before using browser APIs
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [entryType, setEntryType] = useState<"imaging" | "lab" | "note" | "meds" | "symptoms">(
    "note"
  );

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
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      setAudioBlob(null);
      audioChunksRef.current = [];
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const convertBlobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
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
        };
        setEntries([...entries, newEntry]);
        setAudioBlob(null);
        setRecordingTime(0);
        cancelRecording();
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
        </div>
      </div>

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
              <p className="text-lg font-bold text-red-600">{formatTime(recordingTime)}</p>
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
              <p className="text-sm font-semibold text-green-600">Recording saved ({formatTime(recordingTime)})</p>
              <Button
                size="sm"
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
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
              src={URL.createObjectURL(audioBlob)}
              onPlay={() => setIsPlayingAudio(true)}
              onPause={() => setIsPlayingAudio(false)}
              onEnded={() => setIsPlayingAudio(false)}
            />

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={saveAudio}
                className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-700"
              >
                Save Audio
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAudioBlob(null);
                  setRecordingTime(0);
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
                onValueChange={(value: "imaging" | "lab" | "note" | "meds" | "symptoms") =>
                  setEntryType(value)
                }
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
                  {entryType === "imaging" ? "Upload Image" : "Upload Lab Report"}
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
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
          <div className="space-y-2 pr-1 mt-3">
            {entries.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                No entries yet. Click "Add" to create your first entry.
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
                      return entry.content.summary.substring(0, 50) + (entry.content.summary.length > 50 ? "..." : "");
                    case "imaging":
                    case "lab":
                      return entry.content.file_name;
                    case "audio":
                      return `Audio Recording (${formatTime(entry.content.duration)})`;
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
