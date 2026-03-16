"""Modality detection using two-tier approach: DICOM tags then ML/heuristic fallback."""

import re
from typing import Any

import numpy as np

from utils.logger import logger, log_modality_detection


# Tier 1: DICOM modality code to internal pipeline modality mapping
DICOM_MODALITY_MAP = {
    "CT": "CT",
    "MR": "MRI",
    "CR": "XRAY",
    "DX": "XRAY",
    "US": "ULTRASOUND",
    "NM": "NUCLEAR_MED",
    "PT": "PET",
    "MG": "MAMMOGRAPHY",
    "OP": "FUNDUS",
    "OPT": "FUNDUS",
    "SM": "HISTOPATH",
    "XC": "HISTOPATH",
}

# MRI subtype keyword patterns (case-insensitive)
MRI_SUBTYPE_PATTERNS = {
    "MRI_T1": re.compile(r"t1[_\s-]?w|t1[_\s-]?weighted|\bt1\b", re.IGNORECASE),
    "MRI_T2": re.compile(r"t2[_\s-]?w|t2[_\s-]?weighted|\bt2\b", re.IGNORECASE),
    "MRI_FLAIR": re.compile(r"flair", re.IGNORECASE),
    "MRI_DIFFUSION": re.compile(r"\bdwi\b|\badc\b|diffusion", re.IGNORECASE),
    "MRI_SWI": re.compile(r"\bswi\b|\bgre\b|susceptibility", re.IGNORECASE),
}

# Confidence threshold for ML fallback
ML_CONFIDENCE_THRESHOLD = 0.80


def detect_modality(
    image: np.ndarray, metadata: dict[str, Any]
) -> tuple[str, str | None, float | None]:
    """Detect imaging modality using two-tier strategy.

    Tier 1: DICOM tag-based detection (fast, reliable).
    Tier 2: ML/heuristic fallback for non-DICOM or ambiguous inputs.

    Args:
        image: The loaded pixel array.
        metadata: Extracted DICOM metadata dictionary.

    Returns:
        Tuple of (modality, subtype, confidence).
        - modality: Internal pipeline modality name (e.g., "CT", "MRI", "XRAY").
        - subtype: MRI subtype if applicable (e.g., "MRI_T1"), else None.
        - confidence: Detection confidence (1.0 for DICOM tag, 0.0-1.0 for ML fallback).
    """
    dicom_code = metadata.get("Modality", "").strip().upper()

    # Tier 1: DICOM tag-based detection
    if dicom_code and dicom_code in DICOM_MODALITY_MAP:
        modality = DICOM_MODALITY_MAP[dicom_code]
        subtype = None

        # Sub-classify MRI by series description
        if modality == "MRI":
            subtype = _detect_mri_subtype(metadata)

        log_modality_detection("DICOM_TAG", modality, confidence=1.0)
        return modality, subtype, 1.0

    # Tier 2: ML/heuristic fallback
    logger.warning(
        f"DICOM modality tag absent or unrecognized ('{dicom_code}'). "
        "Falling back to heuristic-based detection."
    )
    modality, confidence = _heuristic_fallback(image, metadata)

    if confidence < ML_CONFIDENCE_THRESHOLD:
        logger.warning(
            f"Heuristic confidence {confidence:.2f} below threshold "
            f"{ML_CONFIDENCE_THRESHOLD}. Assigning MODALITY_UNCERTAIN."
        )
        log_modality_detection("HEURISTIC_FALLBACK", "MODALITY_UNCERTAIN", confidence)
        return "MODALITY_UNCERTAIN", None, confidence

    log_modality_detection("HEURISTIC_FALLBACK", modality, confidence)
    return modality, None, confidence


def _detect_mri_subtype(metadata: dict[str, Any]) -> str | None:
    """Detect MRI subtype from SeriesDescription tag."""
    series_desc = metadata.get("SeriesDescription", "")
    if not series_desc:
        return None

    for subtype, pattern in MRI_SUBTYPE_PATTERNS.items():
        if pattern.search(series_desc):
            logger.info(f"MRI subtype detected: {subtype} from '{series_desc}'")
            return subtype

    logger.info(f"No MRI subtype matched for series: '{series_desc}'")
    return None


def _heuristic_fallback(
    image: np.ndarray, metadata: dict[str, Any]
) -> tuple[str, float]:
    """Heuristic-based modality classification using image characteristics.

    Analyzes histogram shape, dynamic range, and speckle variance to guess modality.
    """
    # Ensure 2D image for analysis
    if len(image.shape) == 3:
        if image.shape[2] == 3:
            # RGB image — likely histopath, fundus, dermoscopy
            return _classify_color_image(image, metadata)
        analysis_image = image[:, :, 0]
    else:
        analysis_image = image

    # Compute histogram features
    flat = analysis_image.flatten()
    flat_nonzero = flat[flat != 0]

    if len(flat_nonzero) == 0:
        return "MODALITY_UNCERTAIN", 0.0

    hist_std = np.std(flat_nonzero)
    hist_mean = np.mean(flat_nonzero)
    hist_min = np.min(flat)
    hist_max = np.max(flat)
    dynamic_range = hist_max - hist_min
    speckle_var = np.var(flat_nonzero) / (np.mean(flat_nonzero) ** 2 + 1e-10)

    # CT: bimodal histogram with HU values (negative values indicate HU)
    if hist_min < -500:
        return "CT", 0.90

    # Ultrasound: high speckle variance
    if speckle_var > 0.3 and dynamic_range < 300:
        return "ULTRASOUND", 0.75

    # X-ray: wide dynamic range, large low-intensity peak
    low_intensity_fraction = np.mean(flat_nonzero < (hist_mean * 0.3))
    if low_intensity_fraction > 0.3 and dynamic_range > 200:
        return "XRAY", 0.70

    # MRI: roughly Gaussian histogram, no negative values
    from scipy.stats import kurtosis as scipy_kurtosis

    k = scipy_kurtosis(flat_nonzero)
    if -1 < k < 3 and hist_min >= 0:
        return "MRI", 0.65

    return "MODALITY_UNCERTAIN", 0.40


def _classify_color_image(
    image: np.ndarray, metadata: dict[str, Any]
) -> tuple[str, float]:
    """Classify color (RGB) medical images by color and texture characteristics."""
    # Compute color channel statistics
    r_mean = np.mean(image[:, :, 0])
    g_mean = np.mean(image[:, :, 1])
    b_mean = np.mean(image[:, :, 2])

    # Histopathology: dominated by pink/purple H&E staining
    # High red, moderate blue, lower green
    if r_mean > g_mean and b_mean > g_mean * 0.8:
        return "HISTOPATH", 0.75

    # Fundus: circular field of view, red-dominated with green channel detail
    # Check for dark corners (circular FOV)
    h, w = image.shape[:2]
    corner_mean = np.mean([
        np.mean(image[:h // 8, :w // 8]),
        np.mean(image[:h // 8, -w // 8:]),
        np.mean(image[-h // 8:, :w // 8]),
        np.mean(image[-h // 8:, -w // 8:]),
    ])
    center_mean = np.mean(image[h // 4 : 3 * h // 4, w // 4 : 3 * w // 4])

    if corner_mean < center_mean * 0.3 and r_mean > g_mean:
        return "FUNDUS", 0.70

    # Dermoscopy: skin-colored, relatively uniform saturation
    if r_mean > g_mean > b_mean:
        return "DERMOSCOPY", 0.60

    return "MODALITY_UNCERTAIN", 0.40
