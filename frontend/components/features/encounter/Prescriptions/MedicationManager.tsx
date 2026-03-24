"use client";

import { useState, useEffect, useCallback } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { medicationsAPI } from "@/lib/api";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Medication, CreateMedicationInput } from "@/types/api";

const emptyForm: Omit<CreateMedicationInput, "patient"> = {
  medication_name: "",
  active_agent_name: "",
  dosage: "",
  frequency: "",
  indication: "",
};

export function MedicationManager() {
  const patientPk = useEncounterStore((s) => s.patientPk);
  const refreshPatientData = useEncounterStore((s) => s.refreshPatientData);

  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // New medication form
  const [form, setForm] = useState(emptyForm);
  const [isAdding, setIsAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  const fetchMedications = useCallback(async () => {
    if (!patientPk) return;
    setIsLoading(true);
    try {
      const res = await medicationsAPI.list({ patient: patientPk });
      setMedications(res.results);
    } catch {
      setMedications([]);
    } finally {
      setIsLoading(false);
    }
  }, [patientPk]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const toggleActive = async (med: Medication) => {
    setTogglingId(med.id);
    try {
      await medicationsAPI.patch(med.id, { active: !med.active } as Record<string, unknown> as Partial<CreateMedicationInput>);
      setMedications((prev) =>
        prev.map((m) =>
          m.id === med.id ? { ...m, active: !m.active } : m,
        ),
      );
      await refreshPatientData();
    } catch {
      // Silently fail
    } finally {
      setTogglingId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientPk) return;
    setIsAdding(true);
    setAddMsg(null);

    try {
      await medicationsAPI.create({
        ...form,
        patient: patientPk,
        prescribed_on: new Date().toISOString().split("T")[0],
      });
      setForm(emptyForm);
      setAddMsg("Medication added.");
      await fetchMedications();
      await refreshPatientData();
    } catch {
      setAddMsg("Failed to add medication.");
    } finally {
      setIsAdding(false);
    }
  };

  const activeMeds = medications.filter((m) => m.active !== false);
  const inactiveMeds = medications.filter((m) => m.active === false);

  return (
    <div className="card bg-base-100 border border-base-300 shadow-sm">
      <div className="card-body gap-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Medication Management
        </h2>

        {/* Current medications */}
        <div>
          <h3 className="text-xs font-semibold text-base-content/60 mb-2">
            Active Medications
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm text-primary" />
            </div>
          ) : activeMeds.length === 0 ? (
            <EmptyState compact title="No active medications" />
          ) : (
            <ul className="list">
              {activeMeds.map((med) => (
                <li key={med.id} className="list-row items-center py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {med.medication_name}
                    </p>
                    <p className="text-xs text-base-content/60">
                      {[med.dosage, med.frequency]
                        .filter(Boolean)
                        .join(" · ") || "No dosage info"}
                    </p>
                  </div>
                  <button
                    className="btn btn-xs btn-outline btn-error"
                    onClick={() => toggleActive(med)}
                    disabled={togglingId === med.id}
                  >
                    {togglingId === med.id ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      "Deactivate"
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inactive medications (collapsed) */}
        {inactiveMeds.length > 0 && (
          <div tabIndex={0} className="collapse collapse-arrow border border-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-xs font-medium text-base-content/50">
              Inactive Medications ({inactiveMeds.length})
            </div>
            <div className="collapse-content">
              <ul className="list">
                {inactiveMeds.map((med) => (
                  <li
                    key={med.id}
                    className="list-row items-center py-1 opacity-60"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate line-through">
                        {med.medication_name}
                      </p>
                    </div>
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() => toggleActive(med)}
                      disabled={togglingId === med.id}
                    >
                      Reactivate
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="divider my-0" />

        {/* Add new medication */}
        <form onSubmit={handleAdd} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-base-content/60">
            Add New Medication
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Medication name *"
              className="input input-sm"
              value={form.medication_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, medication_name: e.target.value }))
              }
              required
            />
            <input
              type="text"
              placeholder="Active agent"
              className="input input-sm"
              value={form.active_agent_name}
              onChange={(e) =>
                setForm((f) => ({ ...f, active_agent_name: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Dosage (e.g. 500mg)"
              className="input input-sm"
              value={form.dosage}
              onChange={(e) =>
                setForm((f) => ({ ...f, dosage: e.target.value }))
              }
            />
            <input
              type="text"
              placeholder="Frequency (e.g. BID)"
              className="input input-sm"
              value={form.frequency}
              onChange={(e) =>
                setForm((f) => ({ ...f, frequency: e.target.value }))
              }
            />
          </div>
          <input
            type="text"
            placeholder="Indication (reason for prescribing)"
            className="input input-sm w-full"
            value={form.indication}
            onChange={(e) =>
              setForm((f) => ({ ...f, indication: e.target.value }))
            }
          />
          <div className="flex items-center justify-end gap-2">
            {addMsg && (
              <span
                className={`text-xs ${addMsg.includes("Failed") ? "text-error" : "text-success"}`}
              >
                {addMsg}
              </span>
            )}
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={isAdding || !patientPk}
            >
              {isAdding && (
                <span className="loading loading-spinner loading-xs" />
              )}
              Add Medication
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
