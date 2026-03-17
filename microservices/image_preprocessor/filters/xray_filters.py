"""X-ray specific CLAHE, Wiener denoising, and anatomical landmark detection."""

from typing import Any

import cv2
import numpy as np
from scipy.signal import wiener

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class XRayFilter(BaseFilter):
    """X-ray image filter implementing CLAHE, Wiener denoising,
    and diaphragm/clavicle landmark detection."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Apply X-ray-specific filtering pipeline.

        Step 1: CLAHE (Contrast-Limited Adaptive Histogram Equalization)
        Step 2: Wiener denoising (focused on lung zone)
        Step 3: Diaphragm and clavicle landmark detection
        """
        pre_image = image.copy()

        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])

        with StepTimer("xray_filtering"):
            # Step 1: CLAHE
            image = _apply_clahe(image, metadata, config)
            metadata["preprocessing_steps"].append("CLAHE contrast enhancement")

            # Step 2: Wiener denoising (lung zone focused)
            image = _apply_wiener_denoising(image, config)
            metadata["preprocessing_steps"].append("Wiener denoising (lung zone)")

            # Step 3: Anatomical landmark detection
            landmarks = _detect_landmarks(image)
            metadata["anatomical_landmarks"] = landmarks
            metadata["preprocessing_steps"].append("Landmark detection")

            # Determine PA vs AP orientation
            _detect_xray_orientation(metadata)

            self._track_quality(pre_image, image)

        return image, metadata


def _apply_clahe(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
) -> np.ndarray:
    """Apply CLAHE to X-ray image.

    For pediatric patients (age < 18), use lower clip limit (1.5)
    to avoid over-enhancing the thymus.
    """
    with StepTimer("CLAHE"):
        clip_limit = config.get("clahe_clip_limit", 2.0)
        tile_grid = config.get("clahe_tile_grid_size", [8, 8])

        # Check for pediatric patient
        patient_age = metadata.get("PatientAge", "")
        is_pediatric = _is_pediatric(patient_age)

        if is_pediatric:
            clip_limit = config.get("clahe_clip_limit_pediatric", 1.5)
            metadata["pediatric_case"] = True
            logger.info(f"Pediatric X-ray detected — reducing CLAHE clip limit to {clip_limit}")

        # Convert to uint8 for CLAHE (OpenCV requirement)
        if image.dtype != np.uint8:
            if image.max() <= 1.0:
                img_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
            else:
                img_min, img_max = image.min(), image.max()
                img_uint8 = ((image - img_min) / (img_max - img_min + 1e-8) * 255).astype(np.uint8)
        else:
            img_uint8 = image

        # Ensure 2D grayscale
        if len(img_uint8.shape) == 3:
            img_uint8 = cv2.cvtColor(img_uint8, cv2.COLOR_BGR2GRAY)

        # Apply CLAHE
        clahe = cv2.createCLAHE(
            clipLimit=clip_limit,
            tileGridSize=tuple(tile_grid),
        )
        result = clahe.apply(img_uint8)

        logger.info(f"CLAHE applied: clip_limit={clip_limit}, tile_grid={tile_grid}")
        return result.astype(np.float32) / 255.0


def _apply_wiener_denoising(
    image: np.ndarray, config: dict[str, Any]
) -> np.ndarray:
    """Apply Wiener filtering focused on the lung zone.

    Wiener filtering is optimal for stationary Gaussian noise.
    Applied to lung zone only — bone and mediastinum have sufficient contrast.
    """
    with StepTimer("Wiener_denoising"):
        kernel_size = config.get("wiener_kernel_size", [5, 5])

        # Ensure 2D
        if len(image.shape) == 3:
            img = np.mean(image, axis=2)
        else:
            img = image.copy()

        # Segment lung zone using simple threshold
        # Lung fields typically have lower intensity than surrounding structures
        threshold = np.mean(img)
        lung_mask = img < threshold

        # Apply Wiener filter to the whole image
        filtered = wiener(img, mysize=tuple(kernel_size))

        # Blend: use filtered in lung zones, original in bone/mediastinum
        result = img.copy()
        result[lung_mask] = filtered[lung_mask]

        logger.info(f"Wiener denoising applied to lung zone (kernel_size={kernel_size})")
        return result.astype(np.float32)


def _detect_landmarks(image: np.ndarray) -> dict[str, Any]:
    """Detect approximate anatomical landmarks in a chest X-ray.

    Locates:
    - Diaphragm: highest-intensity horizontal transition in lower half
    - Lung apices: top of lung fields
    """
    if len(image.shape) == 3:
        img = np.mean(image, axis=2)
    else:
        img = image

    h, w = img.shape
    landmarks = {}

    # Diaphragm detection: look for intensity transition in lower half
    lower_half = img[h // 2 :, :]
    row_means = np.mean(lower_half, axis=1)
    row_gradients = np.diff(row_means)

    if len(row_gradients) > 0:
        diaphragm_relative = int(np.argmax(np.abs(row_gradients)))
        diaphragm_y = h // 2 + diaphragm_relative
        landmarks["diaphragm_y"] = diaphragm_y
        logger.info(f"Diaphragm detected at approximately y={diaphragm_y}")

    # Lung apex detection: find top of lung fields (where intensity drops from top)
    upper_quarter = img[: h // 4, w // 4 : 3 * w // 4]
    col_profile = np.mean(upper_quarter, axis=1)
    if len(col_profile) > 0:
        # Lung apex is where intensity drops below mean
        apex_threshold = np.mean(col_profile)
        apex_candidates = np.where(col_profile < apex_threshold)[0]
        if len(apex_candidates) > 0:
            landmarks["lung_apex_y"] = int(apex_candidates[0])

    return landmarks


def _detect_xray_orientation(metadata: dict[str, Any]) -> None:
    """Determine PA vs AP orientation from DICOM metadata.

    AP (anterior-posterior, portable) images make the cardiac silhouette
    appear larger — this is clinically significant.
    """
    study_desc = metadata.get("StudyDescription", "").upper()
    series_desc = metadata.get("SeriesDescription", "").upper()
    combined = f"{study_desc} {series_desc}"

    if "AP" in combined or "PORTABLE" in combined or "SUPINE" in combined:
        metadata["xray_orientation"] = (
            "AP portable chest radiograph — cardiac silhouette may appear "
            "enlarged relative to PA"
        )
    elif "PA" in combined:
        metadata["xray_orientation"] = "PA upright chest radiograph"
    else:
        metadata["xray_orientation"] = "Orientation not specified in metadata"


def _is_pediatric(age_str: str) -> bool:
    """Parse DICOM PatientAge tag and check if patient is pediatric (< 18 years)."""
    if not age_str:
        return False

    age_str = str(age_str).strip()

    try:
        # DICOM age format: nnnD, nnnW, nnnM, nnnY
        if age_str.endswith("Y"):
            years = int(age_str[:-1])
            return years < 18
        elif age_str.endswith("M"):
            months = int(age_str[:-1])
            return months < 18 * 12
        elif age_str.endswith("W"):
            return True  # Weeks old = definitely pediatric
        elif age_str.endswith("D"):
            return True  # Days old = definitely pediatric
        else:
            # Try parsing as plain number (years)
            years = int(age_str)
            return years < 18
    except (ValueError, TypeError):
        return False
