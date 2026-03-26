"use client";

import { useState } from "react";
import { patientsAPI } from "@/lib/api";
import { CreatePatientInput } from "@/types/api";

type AddPatientModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdded: (mrno: string) => void;
};

export function AddPatientModal({
  isOpen,
  onClose,
  onPatientAdded,
}: AddPatientModalProps) {
  const [formData, setFormData] = useState<CreatePatientInput>({
    mrno: "",
    name: "",
    gender: "Male" as any,
    dob: "",
    history: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const createdPatient = await patientsAPI.create(formData);
      onPatientAdded(createdPatient.mrno);
      onClose();
      // Reset form
      setFormData({
        mrno: "",
        name: "",
        gender: "Male",
        dob: "",
        history: "",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create patient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }) as CreatePatientInput);
  };

  if (!isOpen) return null;

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-base-content">
            Add New Patient
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Medical Record Number (MRNO) *</span>
            </label>
            <input
              type="text"
              name="mrno"
              placeholder="e.g., MR-00123"
              className="input input-bordered w-full"
              value={formData.mrno}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Full Name *</span>
            </label>
            <input
              type="text"
              name="name"
              placeholder="e.g., John Doe"
              className="input input-bordered w-full"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Gender *</span>
              </label>
              <select
                name="gender"
                className="select select-bordered w-full"
                value={formData.gender}
                onChange={handleChange}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Date of Birth *</span>
              </label>
              <input
                type="date"
                name="dob"
                className="input input-bordered w-full"
                value={formData.dob}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Medical History</span>
            </label>
            <textarea
              name="history"
              placeholder="Brief medical history..."
              className="textarea textarea-bordered h-24 w-full"
              value={formData.history}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Adding...
                </>
              ) : (
                "Add Patient"
              )}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose} disabled={isSubmitting}>
          close
        </button>
      </form>
    </dialog>
  );
}
