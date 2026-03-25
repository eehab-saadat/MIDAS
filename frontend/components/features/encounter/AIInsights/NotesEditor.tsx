"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { encountersAPI } from "@/lib/api";
import { useDebounce } from "@/hooks/useDebounce";

export function NotesEditor() {
  const encounterId = useEncounterStore((s) => s.encounterId);
  const notes = useEncounterStore((s) => s.notes);
  const updateNotes = useEncounterStore((s) => s.updateNotes);

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const debouncedNotes = useDebounce(notes, 1500);
  const lastSavedRef = useRef(notes);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const saveNotes = useCallback(
    async (text: string) => {
      if (!encounterId) return;
      setSaveStatus("saving");
      try {
        await encountersAPI.patch(encounterId, { notes: text });
        lastSavedRef.current = text;
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    },
    [encounterId],
  );

  // Auto-save notes when they change (debounced)
  useEffect(() => {
    if (!encounterId || debouncedNotes === lastSavedRef.current) return;

    let cancelled = false;

    saveNotes(debouncedNotes).then(() => {
      if (cancelled) return;
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedNotes, encounterId, saveNotes]);

  const appendText = useCallback(
    (text: string) => {
      const current = notes;
      const updated = current ? `${current}\n${text}` : text;
      updateNotes(updated);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
      }, 0);
    },
    [notes, updateNotes],
  );

  // Expose appendText for AutoScribe
  useEffect(() => {
    (window as Record<string, unknown>).__notesAppend = appendText;
    return () => {
      delete (window as Record<string, unknown>).__notesAppend;
    };
  }, [appendText]);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm h-full">
      <div className="card-body gap-2 p-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
            Encounter Notes
          </h2>
          <span
            className={`text-xs ${
              saveStatus === "saving"
                ? "text-warning"
                : saveStatus === "saved"
                  ? "text-success"
                  : saveStatus === "error"
                    ? "text-error"
                    : "text-base-content/30"
            }`}
          >
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && "Save failed"}
          </span>
        </div>

        <textarea
          ref={textareaRef}
          className="textarea textarea-ghost w-full flex-1 min-h-[300px] text-sm leading-relaxed resize-y"
          placeholder="Type encounter notes here (Markdown supported)..."
          value={notes}
          onChange={(e) => updateNotes(e.target.value)}
        />

        <div className="flex items-center justify-between pt-1">
          {!encounterId ? (
            <p className="text-xs text-warning">
              Notes will auto-save once the encounter session is initialized.
            </p>
          ) : (
            <span />
          )}
          <button
            className="btn btn-sm btn-primary"
            disabled={!encounterId || saveStatus === "saving"}
            onClick={() => saveNotes(notes)}
          >
            {saveStatus === "saving" ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                Saving...
              </>
            ) : (
              "Save Notes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
