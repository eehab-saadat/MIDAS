"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PatientList } from "@/components/features/PatientList";

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-base-100">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          {/* Header Section */}
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-base-content">Patients</h1>
            <p className="text-base-content/70">
              Manage and view patient information
            </p>
          </div>

          {/* Search and Action Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name, MRN, or ID..."
                className="input input-bordered w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Add New Patient Button */}
            <button className="btn btn-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-5 h-5"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Patient
            </button>
          </div>

          {/* Patient List */}
          <PatientList searchQuery={searchQuery} />
        </div>
      </div>
    </div>
  );
}
