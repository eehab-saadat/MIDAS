"use client";

import { useState, useRef, useCallback } from "react";
import { transcribeAPI } from "@/lib/api";

type ScribeState = "idle" | "recording" | "transcribing";

export function AutoScribe() {
  const [state, setState] = useState<ScribeState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const submitAudio = useCallback(async (blob: Blob) => {
    setState("transcribing");
    setError(null);
    try {
      const data = await transcribeAPI.transcribe(blob);
      const append = (window as unknown as Record<string, unknown>)
        .__notesAppend as ((text: string) => void) | undefined;
      if (append && data.transcription) {
        append(data.transcription);
      }
      setState("idle");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Transcription failed";
      setError(message);
      setState("idle");
      setTimeout(() => setError(null), 4000);
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        submitAudio(blob);
      };

      mr.start();
      mediaRecorderRef.current = mr;
      setState("recording");
    } catch {
      setError("Microphone access denied");
      setTimeout(() => setError(null), 4000);
    }
  }, [submitAudio]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleClick = useCallback(() => {
    if (state === "idle") startRecording();
    else if (state === "recording") stopRecording();
  }, [state, startRecording, stopRecording]);

  return (
    <div className="flex items-center gap-2">
      <button
        className={`btn btn-sm ${
          state === "recording"
            ? "btn-error"
            : state === "transcribing"
              ? "btn-ghost btn-disabled"
              : "btn-ghost"
        }`}
        onClick={handleClick}
        disabled={state === "transcribing"}
        title={
          state === "recording"
            ? "Stop recording"
            : state === "transcribing"
              ? "Transcribing audio..."
              : "Start auto-scribe"
        }
      >
        {state === "transcribing" ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 ${state === "recording" ? "animate-pulse" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        )}
        {state === "recording"
          ? "Stop Recording"
          : state === "transcribing"
            ? "Transcribing..."
            : "Auto-Scribe"}
      </button>

      {error && (
        <span className="text-xs text-error italic truncate max-w-48">
          {error}
        </span>
      )}
    </div>
  );
}
