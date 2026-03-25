"use client";

import { NotesEditor } from "./NotesEditor";
import { AutoScribe } from "./AutoScribe";
import { DiagnosisPipeline } from "./DiagnosisPipeline";

export function AIInsightsPanel() {
  return (
    <div className="flex flex-col gap-4">
      {/* Auto-scribe toggle row */}
      <div className="flex items-center justify-end">
        <AutoScribe />
      </div>

      {/* Main content: Notes (left) + Diagnosis (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <NotesEditor />
        </div>
        <div className="lg:col-span-2">
          <DiagnosisPipeline />
        </div>
      </div>
    </div>
  );
}
