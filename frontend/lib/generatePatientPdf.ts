import jsPDF from "jspdf";
import type {
  CompletePatientDetails,
  CompletePatientVitals,
} from "@/types/api";

interface PdfSummaryData {
  patientDetails: CompletePatientDetails;
  customDiagnosis: string;
  notes: string;
}

const BRAND_NAVY = [26, 54, 93] as const; // #1A365D
const TEXT_DARK = [30, 30, 30] as const;
const TEXT_MUTED = [100, 100, 100] as const;
const DIVIDER_COLOR = [200, 210, 220] as const;
const PAGE_MARGIN = 25;
const CONTENT_WIDTH = 160; // A4 width (210) minus 2 × margin

async function loadLogoAsBase64(): Promise<string> {
  const res = await fetch("/logo-full.png");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function drawDivider(doc: jsPDF, y: number): number {
  doc.setDrawColor(...DIVIDER_COLOR);
  doc.setLineWidth(0.4);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);
  return y + 4;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_NAVY);
  doc.text(title, PAGE_MARGIN, y);
  y += 2;
  doc.setDrawColor(...BRAND_NAVY);
  doc.setLineWidth(0.6);
  doc.line(PAGE_MARGIN, y, PAGE_MARGIN + CONTENT_WIDTH, y);
  return y + 6;
}

function drawField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(label, x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  doc.text(value || "N/A", x + doc.getTextWidth(label) + 2, y);
  return y + 5.5;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 275) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_DARK);
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, 6);
    doc.text(line, x, y);
    y += 4.5;
  }
  return y;
}

export async function generatePatientSummaryPdf(
  data: PdfSummaryData,
): Promise<void> {
  const { patientDetails, customDiagnosis, notes } = data;
  const info = patientDetails.personal_information;
  const vitals = patientDetails.vitals as CompletePatientVitals;
  const hasVitals = vitals && Object.keys(vitals).length > 0;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoData = await loadLogoAsBase64();

  // --- Letterhead ---
  const logoWidth = 48;
  const logoHeight = 18;
  const logoX = (210 - logoWidth) / 2;
  doc.addImage(logoData, "PNG", logoX, 12, logoWidth, logoHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  doc.text("    Multiple Input Diagnostic Aid System", 105, 33, {
    align: "center",
  });

  let y = 37;
  y = drawDivider(doc, y);
  y += 2;

  // Report title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_NAVY);
  doc.text("Patient Encounter Summary", 105, y, { align: "center" });
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_MUTED);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  doc.text(`Generated: ${dateStr}`, 105, y, { align: "center" });
  y += 6;
  y = drawDivider(doc, y);
  y += 4;

  // --- Patient Information ---
  y = drawSectionTitle(doc, "Patient Information", y);
  const col1 = PAGE_MARGIN;
  const col2 = PAGE_MARGIN + CONTENT_WIDTH / 2;

  y = drawField(doc, "Name:", info.name || "N/A", col1, y);
  drawField(
    doc,
    "MRN:",
    patientDetails.patient_id || "N/A",
    col2,
    y - 5.5,
  );
  y = drawField(
    doc,
    "Age:",
    info.age != null ? `${info.age} years` : "N/A",
    col1,
    y,
  );
  drawField(doc, "Gender:", info.gender || "N/A", col2, y - 5.5);
  if (info.dob) {
    y = drawField(doc, "Date of Birth:", info.dob, col1, y);
  }
  y += 3;

  // --- Vitals ---
  if (hasVitals) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionTitle(doc, "Vitals", y);
    const col3 = PAGE_MARGIN + CONTENT_WIDTH / 3;
    const col3_2 = PAGE_MARGIN + (2 * CONTENT_WIDTH) / 3;

    if (vitals.blood_pressure) {
      drawField(doc, "BP:", `${vitals.blood_pressure} mmHg`, col1, y);
    }
    if (vitals.temperature != null) {
      drawField(
        doc,
        "Temp:",
        `${vitals.temperature} ${vitals.temperature_unit || "°C"}`,
        col3,
        y,
      );
    }
    if (vitals.pulse != null) {
      drawField(doc, "Pulse:", `${vitals.pulse} bpm`, col3_2, y);
    }
    y += 5.5;

    if (vitals.weight != null) {
      drawField(
        doc,
        "Weight:",
        `${vitals.weight} ${vitals.weight_unit || "kg"}`,
        col1,
        y,
      );
    }
    if (vitals.height != null) {
      drawField(
        doc,
        "Height:",
        `${vitals.height} ${vitals.height_unit || "cm"}`,
        col3,
        y,
      );
    }
    if (vitals.respiratory_rate != null) {
      drawField(
        doc,
        "Resp Rate:",
        `${vitals.respiratory_rate} ${vitals.respiratory_rate_unit || "/min"}`,
        col3_2,
        y,
      );
    }
    y += 8;
  }

  // --- Clinical Diagnosis ---
  y = checkPageBreak(doc, y, 25);
  y = drawSectionTitle(doc, "Clinical Diagnosis", y);
  y = drawWrappedText(
    doc,
    customDiagnosis || "No diagnosis provided.",
    PAGE_MARGIN,
    y,
    CONTENT_WIDTH,
  );
  y += 4;

  // --- Medications ---
  if (patientDetails.medications.length > 0) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionTitle(doc, "Medications", y);

    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND_NAVY);
    doc.text("Medication", col1 + 1, y);
    doc.text("Dosage", col1 + 55, y);
    doc.text("Frequency", col1 + 95, y);
    doc.text("Indication", col1 + 125, y);
    y += 2;
    doc.setDrawColor(...DIVIDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(col1, y, col1 + CONTENT_WIDTH, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_DARK);

    for (const med of patientDetails.medications) {
      y = checkPageBreak(doc, y, 6);
      doc.text(
        doc.splitTextToSize(med.medication_name || "—", 50)[0],
        col1 + 1,
        y,
      );
      doc.text(doc.splitTextToSize(med.dosage || "—", 36)[0], col1 + 55, y);
      doc.text(
        doc.splitTextToSize(med.frequency || "—", 26)[0],
        col1 + 95,
        y,
      );
      doc.text(
        doc.splitTextToSize(med.indication || "—", 32)[0],
        col1 + 125,
        y,
      );
      y += 5;
    }
    y += 3;
  }

  // --- Encounter Notes ---
  if (notes) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionTitle(doc, "Encounter Notes", y);
    y = drawWrappedText(doc, notes, PAGE_MARGIN, y, CONTENT_WIDTH);
    y += 4;
  }

  // --- Footer on every page ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...DIVIDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(PAGE_MARGIN, 284, PAGE_MARGIN + CONTENT_WIDTH, 284);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_MUTED);
    doc.text("MIDAS — Confidential Patient Record", PAGE_MARGIN, 289);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_MARGIN + CONTENT_WIDTH, 289, {
      align: "right",
    });
  }

  const datePart = new Date().toISOString().slice(0, 10);
  doc.save(`MIDAS_Summary_${patientDetails.patient_id}_${datePart}.pdf`);
}
