"use client";

import { useState, useRef, useCallback } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { apiClient } from "@/lib/api/client";
import type { Radiology } from "@/types/api";

export function RadiologyUploader() {
  const patientPk = useEncounterStore((s) => s.patientPk);
  const patientMrno = useEncounterStore((s) => s.patientMrno);
  const refreshPatientData = useEncounterStore((s) => s.refreshPatientData);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [cptName, setCptName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0 || !patientPk) return;
      const file = files[0];

      setIsUploading(true);
      setUploadMsg(null);

      try {
        const formData = new FormData();
        formData.append("patient", String(patientPk));
        formData.append("cpt_name", cptName || file.name);
        formData.append("file", file);

        await apiClient.postForm<Radiology>("/radiology/upload/", formData);
        setUploadMsg("Image uploaded successfully. Processing started.");
        setCptName("");
        await refreshPatientData();
      } catch {
        // If the upload endpoint doesn't exist yet, fall back to basic create
        try {
          const { radiologyAPI } = await import("@/lib/api");
          await radiologyAPI.create({
            patient: patientPk,
            cpt_name: cptName || file.name,
            file_path: file.name,
          });
          setUploadMsg("Record created (file upload pending backend support).");
          setCptName("");
          await refreshPatientData();
        } catch {
          setUploadMsg("Failed to upload. Please try again.");
        }
      } finally {
        setIsUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [patientPk, cptName, refreshPatientData],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
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
          onClick={() => fileRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <span className="loading loading-spinner loading-md text-primary" />
              <p className="text-sm text-base-content/60">Uploading...</p>
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
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {uploadMsg && (
          <p
            className={`text-xs ${uploadMsg.includes("Failed") ? "text-error" : "text-success"}`}
          >
            {uploadMsg}
          </p>
        )}

        {!patientPk && (
          <p className="text-xs text-warning">
            Patient not loaded yet.
          </p>
        )}
      </div>
    </div>
  );
}
