"""Final output formatting and metadata packaging for the downstream medical LLM."""

import json
import shutil
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from utils.logger import logger, StepTimer
from utils.visualization import create_side_by_side


# Mandatory clinical caveats per modality for LLM context
MODALITY_CAVEATS = {
    "CT": {
        "CHEST": (
            "State which window(s) are provided. Note if contrast-enhanced or "
            "non-contrast. Contrast CT will show enhancement patterns not visible "
            "on non-contrast."
        ),
        "HEAD": (
            "Note if this is non-contrast — hemorrhage detection relies on "
            "non-contrast HU values. Contrast CT brain changes the appearance of "
            "infarcts (may appear bright from contrast enhancement rather than hemorrhage)."
        ),
        "DEFAULT": "CT image with HU windowing applied.",
    },
    "MRI": (
        "State the sequence: T1 pre/post contrast, T2, FLAIR, DWI, SWI. "
        "Each sequence has different pathology visibility. Acute stroke is "
        "DWI-bright, chronic is FLAIR-bright."
    ),
    "XRAY": (
        "State if PA or AP, upright or supine. Supine X-rays make pleural "
        "effusions appear as haziness rather than distinct blunting. Free air "
        "under diaphragm is only detectable on upright PA."
    ),
    "ULTRASOUND": (
        "Note transducer frequency if available. High-frequency (7-15 MHz) "
        "provides better resolution for superficial structures. Low-frequency "
        "(2-5 MHz) for deep structures. Note if B-mode only or Doppler included."
    ),
    "HISTOPATH": (
        "State objective magnification level (10x, 20x, 40x). State staining "
        "type — H&E is standard; IHC stains require completely different interpretation. "
        "Reference slide used for normalization."
    ),
    "MAMMOGRAPHY": (
        "State if screening or diagnostic. State if MLO or CC view. Note patient "
        "age — density categories (ACR BI-RADS A-D) affect lesion detection rates."
    ),
    "PET": (
        "State tracer used (FDG is most common). State SUV normalization method "
        "(body weight, lean body mass). Background SUV threshold for significant "
        "uptake: SUVmax > 2.5 for FDG."
    ),
    "FUNDUS": "Color fundus photograph of the posterior segment.",
    "DERMOSCOPY": "Dermoscopy image of skin lesion.",
    "NUCLEAR_MED": "Nuclear medicine scintigraphy image.",
}


def format_for_llm(
    original_image: np.ndarray,
    processed_image: np.ndarray | dict[str, np.ndarray],
    metadata: dict[str, Any],
    quality_report: dict[str, Any],
    quality_delta: dict[str, Any],
    modality: str,
    output_dir: str | Path,
    original_file_path: str | Path | None = None,
) -> dict[str, Any]:
    """Package preprocessed image(s) and metadata for the downstream medical LLM.

    Args:
        original_image: Raw/original pixel array before preprocessing.
        processed_image: Preprocessed pixel array, or dict of window_name -> array for CT.
        metadata: Accumulated metadata dictionary.
        quality_report: Post-processing quality assessment.
        quality_delta: Quality change from pre to post processing.
        modality: Detected modality string.
        output_dir: Directory to write output files.
        original_file_path: Path to the original input file (for copying).

    Returns:
        Output bundle dictionary with paths, metadata, and context string.
    """
    with StepTimer("llm_formatting"):
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

        output_bundle = {
            "modality": modality,
            "metadata": metadata,
            "quality_report": quality_report,
            "quality_delta": quality_delta,
            "output_images": [],
            "context_string": "",
        }

        # Save processed image(s) as lossless PNG
        if isinstance(processed_image, dict):
            # Multiple windows (e.g., CT with lung, mediastinum, bone)
            for window_name, img_array in processed_image.items():
                filename = f"processed_{window_name}_window.png"
                img_path = output_dir / filename
                _save_image_png(img_array, img_path)
                output_bundle["output_images"].append(str(img_path))
                logger.info(f"Saved {window_name} window: {img_path}")
        else:
            img_path = output_dir / "processed.png"
            _save_image_png(processed_image, img_path)
            output_bundle["output_images"].append(str(img_path))

        # Copy original file alongside processed output
        if original_file_path is not None:
            original_file_path = Path(original_file_path)
            if original_file_path.exists():
                dest = output_dir / f"original_{original_file_path.name}"
                shutil.copy2(str(original_file_path), str(dest))
                output_bundle["original_file"] = str(dest)

        # Generate side-by-side QC visualization (debug artifact, not sent to LLM)
        qc_image = processed_image
        if isinstance(qc_image, dict):
            # Use first window for QC comparison
            qc_image = next(iter(qc_image.values()))

        qc_path = output_dir / "qc_comparison.png"
        try:
            create_side_by_side(original_image, qc_image, qc_path)
            output_bundle["qc_visualization"] = str(qc_path)
        except Exception as e:
            logger.warning(f"QC visualization failed: {e}")

        # Build LLM context string
        context_string = _build_context_string(
            metadata, quality_report, quality_delta, modality
        )
        output_bundle["context_string"] = context_string

        # Save metadata and context as JSON
        metadata_path = output_dir / "metadata.json"
        _save_json(output_bundle, metadata_path)

        # Save context string as plain text
        context_path = output_dir / "llm_context.txt"
        context_path.write_text(context_string, encoding="utf-8")

        logger.info(f"LLM output bundle written to: {output_dir}")

    return output_bundle


def _save_image_png(image: np.ndarray, path: Path) -> None:
    """Save image as lossless PNG. Never use JPEG for medical images."""
    # Normalize to uint8 for PNG
    if image.dtype == np.float32 or image.dtype == np.float64:
        if image.max() <= 1.0 and image.min() >= 0.0:
            img_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
        else:
            img_min, img_max = image.min(), image.max()
            img_uint8 = ((image - img_min) / (img_max - img_min + 1e-8) * 255).astype(np.uint8)
    elif image.dtype == np.uint8:
        img_uint8 = image
    else:
        img_uint8 = ((image - image.min()) / (image.max() - image.min() + 1e-8) * 255).astype(np.uint8)

    cv2.imwrite(str(path), img_uint8)


def _save_json(data: dict, path: Path) -> None:
    """Save dictionary as JSON, handling numpy types."""

    def default_handler(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, Path):
            return str(obj)
        return str(obj)

    path.write_text(
        json.dumps(data, indent=2, default=default_handler),
        encoding="utf-8",
    )


def _build_context_string(
    metadata: dict[str, Any],
    quality_report: dict[str, Any],
    quality_delta: dict[str, Any],
    modality: str,
) -> str:
    """Build a natural language metadata context string for the medical LLM.

    Includes modality info, body part, artifacts, quality summary,
    preprocessing steps, and mandatory clinical caveats.
    """
    parts = []

    # Modality and sub-type
    subtype = metadata.get("mri_subtype", "")
    body_part = metadata.get("BodyPartExamined", "unknown region")
    parts.append(f"Modality: {modality}")
    if subtype:
        parts.append(f"Sequence/Sub-type: {subtype}")
    parts.append(f"Body Part: {body_part}")

    # Clinical acquisition context
    study_desc = metadata.get("StudyDescription", "")
    series_desc = metadata.get("SeriesDescription", "")
    if study_desc:
        parts.append(f"Study: {study_desc}")
    if series_desc:
        parts.append(f"Series: {series_desc}")

    # Windows provided for CT
    windows_applied = metadata.get("windows_applied", [])
    if windows_applied:
        parts.append(f"Windows provided: {', '.join(windows_applied)}")

    # Orientation info for X-ray
    if modality == "XRAY":
        orientation_note = metadata.get("xray_orientation", "")
        if orientation_note:
            parts.append(f"Orientation: {orientation_note}")

    # Artifacts flagged
    quality_metrics = quality_report.get("metrics", {})
    quality_warnings = quality_report.get("warnings", [])
    if quality_warnings:
        parts.append("Artifacts/Warnings:")
        for warning in quality_warnings:
            parts.append(f"  - {warning}")

    # Image quality summary
    pre_snr = quality_metrics.get("snr_db", 0)
    post_snr = pre_snr  # Post-processing SNR from current report
    snr_delta = quality_delta.get("snr_delta_db", 0)

    parts.append(
        f"Image Quality: SNR={pre_snr:.1f}dB"
    )
    if snr_delta:
        parts.append(f"SNR improvement: {snr_delta:+.1f}dB")

    if quality_metrics.get("motion_detected"):
        parts.append("Motion blur detected. Confidence in findings: moderate.")

    # Preprocessing steps applied
    steps_applied = metadata.get("preprocessing_steps", [])
    if steps_applied:
        parts.append(f"Preprocessing: {', '.join(steps_applied)}")

    # Modality-specific clinical caveat
    caveat = _get_clinical_caveat(modality, body_part)
    if caveat:
        parts.append(f"Clinical Note: {caveat}")

    # Patient demographics (if available)
    patient_age = metadata.get("PatientAge", "")
    patient_sex = metadata.get("PatientSex", "")
    if patient_age or patient_sex:
        demo_parts = []
        if patient_age:
            demo_parts.append(f"Age: {patient_age}")
        if patient_sex:
            demo_parts.append(f"Sex: {patient_sex}")
        parts.append(f"Patient: {', '.join(demo_parts)}")

    return "\n".join(parts)


def _get_clinical_caveat(modality: str, body_part: str) -> str:
    """Get the mandatory clinical caveat for a given modality and body part."""
    caveat = MODALITY_CAVEATS.get(modality, "")

    if isinstance(caveat, dict):
        body_upper = body_part.upper() if body_part else ""
        # Try exact match, then DEFAULT
        for key in [body_upper, "DEFAULT"]:
            if key in caveat:
                return caveat[key]
        return caveat.get("DEFAULT", "")

    return caveat
