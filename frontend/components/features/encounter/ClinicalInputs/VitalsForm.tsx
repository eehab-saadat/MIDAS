"use client";

import { useState } from "react";
import { useEncounterStore } from "@/store/encounterStore";
import { vitalsAPI } from "@/lib/api";
import type { CompletePatientVitals } from "@/types/api";

interface VitalsFormProps {
  latestVitals: CompletePatientVitals | Record<string, never>;
  patientPk: number | null;
}

interface VitalsFormData {
  weight: string;
  weight_unit: string;
  height: string;
  height_unit: string;
  temperature: string;
  temperature_unit: string;
  pulse: string;
  pulse_unit: string;
  respiratory_rate: string;
  respiratory_rate_unit: string;
  bp_high: string;
  bp_low: string;
}

function initFromExisting(
  v: CompletePatientVitals | Record<string, never>,
): VitalsFormData {
  if (!v || Object.keys(v).length === 0) {
    return {
      weight: "",
      weight_unit: "kg",
      height: "",
      height_unit: "cm",
      temperature: "",
      temperature_unit: "°C",
      pulse: "",
      pulse_unit: "bpm",
      respiratory_rate: "",
      respiratory_rate_unit: "/min",
      bp_high: "",
      bp_low: "",
    };
  }
  const vitals = v as CompletePatientVitals;
  const bpParts = vitals.blood_pressure?.split("/") ?? ["", ""];
  return {
    weight: vitals.weight != null ? String(vitals.weight) : "",
    weight_unit: vitals.weight_unit || "kg",
    height: vitals.height != null ? String(vitals.height) : "",
    height_unit: vitals.height_unit || "cm",
    temperature: vitals.temperature != null ? String(vitals.temperature) : "",
    temperature_unit: vitals.temperature_unit || "°C",
    pulse: vitals.pulse != null ? String(vitals.pulse) : "",
    pulse_unit: vitals.pulse_unit || "bpm",
    respiratory_rate:
      vitals.respiratory_rate != null
        ? String(vitals.respiratory_rate)
        : "",
    respiratory_rate_unit: vitals.respiratory_rate_unit || "/min",
    bp_high: bpParts[0] ?? "",
    bp_low: bpParts[1] ?? "",
  };
}

export function VitalsForm({ latestVitals, patientPk }: VitalsFormProps) {
  const [form, setForm] = useState<VitalsFormData>(
    initFromExisting(latestVitals),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const refreshPatientData = useEncounterStore((s) => s.refreshPatientData);

  const handleChange = (field: keyof VitalsFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSavedMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientPk) return;

    setIsSubmitting(true);
    setSavedMsg(null);

    try {
      await vitalsAPI.create({
        patient: patientPk,
        timestamp: new Date().toISOString(),
        weight: parseFloat(form.weight) || 0,
        weight_unit: form.weight_unit,
        height: parseFloat(form.height) || 0,
        height_unit: form.height_unit,
        temperature: parseFloat(form.temperature) || 0,
        temperature_unit: form.temperature_unit,
        pulse: parseFloat(form.pulse) || 0,
        pulse_unit: form.pulse_unit,
        respiratory_rate: parseFloat(form.respiratory_rate) || 0,
        respiratory_rate_unit: form.respiratory_rate_unit,
        bp_high: parseFloat(form.bp_high) || 0,
        bp_low: parseFloat(form.bp_low) || 0,
      });
      setSavedMsg("Vitals saved successfully.");
      await refreshPatientData();
    } catch {
      setSavedMsg("Failed to save vitals.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card bg-base-100 border border-base-300 shadow-sm"
    >
      <div className="card-body gap-4">
        <h2 className="card-title text-sm font-semibold uppercase tracking-wide text-base-content/70">
          Vitals Entry
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NumericField
            label="Weight"
            value={form.weight}
            unit={form.weight_unit}
            onValueChange={(v) => handleChange("weight", v)}
            onUnitChange={(u) => handleChange("weight_unit", u)}
            units={["kg", "lbs"]}
          />
          <NumericField
            label="Height"
            value={form.height}
            unit={form.height_unit}
            onValueChange={(v) => handleChange("height", v)}
            onUnitChange={(u) => handleChange("height_unit", u)}
            units={["cm", "ft"]}
          />
          <NumericField
            label="Temperature"
            value={form.temperature}
            unit={form.temperature_unit}
            onValueChange={(v) => handleChange("temperature", v)}
            onUnitChange={(u) => handleChange("temperature_unit", u)}
            units={["°C", "°F"]}
          />
          <NumericField
            label="Pulse"
            value={form.pulse}
            unit={form.pulse_unit}
            onValueChange={(v) => handleChange("pulse", v)}
            units={["bpm"]}
          />
          <NumericField
            label="Respiratory Rate"
            value={form.respiratory_rate}
            unit={form.respiratory_rate_unit}
            onValueChange={(v) => handleChange("respiratory_rate", v)}
            units={["/min"]}
          />

          {/* Blood Pressure (dual input) */}
          <fieldset className="fieldset">
            <legend className="fieldset-legend text-xs">
              Blood Pressure
            </legend>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="any"
                placeholder="Sys"
                className="input input-sm w-full"
                value={form.bp_high}
                onChange={(e) => handleChange("bp_high", e.target.value)}
              />
              <span className="text-base-content/50">/</span>
              <input
                type="number"
                step="any"
                placeholder="Dia"
                className="input input-sm w-full"
                value={form.bp_low}
                onChange={(e) => handleChange("bp_low", e.target.value)}
              />
              <span className="text-xs text-base-content/50 shrink-0">
                mmHg
              </span>
            </div>
          </fieldset>
        </div>

        <div className="card-actions justify-end items-center">
          {savedMsg && (
            <span
              className={`text-xs ${savedMsg.includes("Failed") ? "text-error" : "text-success"}`}
            >
              {savedMsg}
            </span>
          )}
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isSubmitting || !patientPk}
          >
            {isSubmitting && (
              <span className="loading loading-spinner loading-xs" />
            )}
            Save Vitals
          </button>
        </div>
      </div>
    </form>
  );
}

function NumericField({
  label,
  value,
  unit,
  units,
  onValueChange,
  onUnitChange,
}: {
  label: string;
  value: string;
  unit: string;
  units: string[];
  onValueChange: (v: string) => void;
  onUnitChange?: (u: string) => void;
}) {
  return (
    <fieldset className="fieldset">
      <legend className="fieldset-legend text-xs">{label}</legend>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="any"
          placeholder={label}
          className="input input-sm w-full"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
        {units.length > 1 && onUnitChange ? (
          <select
            className="select select-sm select-ghost w-auto"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs text-base-content/50 shrink-0">
            {units[0]}
          </span>
        )}
      </div>
    </fieldset>
  );
}
