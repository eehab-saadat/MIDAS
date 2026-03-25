"use client";

import { useState, useRef, useCallback } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { apiClient } from "@/lib/api/client";
import type { Radiology } from "@/types/api";

export function RadiologyUploader() {
  const patientPk = useEncounterStore((s) => s.patientPk);
  const refreshPatientData = useEncounterStore((s) => s.refreshPatientData);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [cptName, setCptName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stageFile = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSelectedFile(files[0]);
    setUploadMsg(null);
  }, []);

  const clearFile = () => {
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedFile || !patientPk) return;

    setIsUploading(true);
    setUploadMsg(null);

    try {
      const formData = new FormData();
      formData.append("patient", String(patientPk));
      formData.append("cpt_name", cptName || selectedFile.name);
      formData.append("file", selectedFile);

      await apiClient.postForm<Radiology>("/radiology/upload/", formData);
      setUploadMsg("Image uploaded successfully. Processing started.");
      setCptName("");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await refreshPatientData();
    } catch {
      setUploadMsg("Failed to upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [patientPk, cptName, selectedFile, refreshPatientData]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    stageFile(e.dataTransfer.files);
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-3">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Upload Radiology Image
        </h2>

        <input
          type="text"
          placeholder="Study name (e.g. Chest X-Ray)..."
          className="input input-sm w-full"
          value={cptName}
          onChange={(e) => setCptName(e.target.value)}
        />

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-base-300 hover:border-primary/50"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => !selectedFile && fileRef.current?.click()}
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-success shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span className="text-sm truncate max-w-[180px]">
                {selectedFile.name}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                &times;
              </button>
            </div>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mx-auto mb-2 text-base-content/30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-base-content/60">
                Drag & drop an image or{" "}
                <span className="text-primary font-medium">browse</span>
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.dcm"
            className="hidden"
            onChange={(e) => stageFile(e.target.files)}
          />
        </div>

        {/* Submit button */}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!selectedFile || !patientPk || isUploading}
          onClick={handleSubmit}
        >
          {isUploading && (
            <span className="loading loading-spinner loading-xs" />
          )}
          Upload
        </button>

        {uploadMsg && (
          <p
            className={`text-xs ${uploadMsg.includes("Failed") ? "text-error" : "text-success"}`}
          >
            {uploadMsg}
          </p>
        )}

        {!patientPk && (
          <p className="text-xs text-warning">Patient not loaded yet.</p>
        )}
      </div>
    </div>
  );
}
