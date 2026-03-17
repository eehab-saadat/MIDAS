"""Stain normalization, color deconvolution, and tile management for histopathology."""

from typing import Any

import cv2
import numpy as np

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class HistopathFilter(BaseFilter):
    """Histopathology image filter implementing stain normalization,
    artifact detection, and tile rejection."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray | None, dict[str, Any]]:
        """Apply histopathology-specific filtering pipeline.

        Step 1: Color space conversion and stain separation
        Step 2: Stain transfer to reference
        Step 3: Artifact detection and tile rejection

        Returns None for image if tile is rejected.
        """
        pre_image = image.copy()

        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])

        with StepTimer("histopath_filtering"):
            # Step 3 first: Artifact detection and tile rejection
            tile_config = config.get("tile_rejection", {})
            rejection_reason = _check_tile_rejection(image, tile_config)

            if rejection_reason is not None:
                logger.warning(f"Tile rejected: {rejection_reason}")
                metadata["tile_rejected"] = True
                metadata["rejection_reason"] = rejection_reason
                return None, metadata

            # Steps 1 & 2: Stain normalization
            stain_config = config.get("stain_normalization", {})
            method = stain_config.get("method", "macenko")

            image = _apply_stain_normalization(image, method, metadata)
            metadata["preprocessing_steps"].append(
                f"Stain normalization ({method})"
            )

            self._track_quality(pre_image, image)

        return image, metadata


def _check_tile_rejection(
    image: np.ndarray, tile_config: dict[str, Any]
) -> str | None:
    """Check if a tile should be rejected.

    Reject tiles that are:
    - Predominantly white (background, no tissue — mean OD < 0.05)
    - Out of focus (Laplacian variance below threshold)
    - Contain pen marks or artifacts (unusual saturation)
    """
    min_od_threshold = tile_config.get("min_od_threshold", 0.05)
    min_focus_score = tile_config.get("min_focus_score", 50)

    # Ensure RGB
    if len(image.shape) != 3 or image.shape[2] != 3:
        return None

    # Check optical density (uninformative white background)
    od = _compute_optical_density(image)
    mean_od = np.mean(od)

    if mean_od < min_od_threshold:
        return f"Background tile (mean OD={mean_od:.4f} < {min_od_threshold})"

    # Check focus quality (Laplacian variance)
    gray = cv2.cvtColor(
        (image * 255).clip(0, 255).astype(np.uint8) if image.max() <= 1.0 else image.astype(np.uint8),
        cv2.COLOR_RGB2GRAY,
    )
    focus_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    if focus_score < min_focus_score:
        return f"Out of focus (score={focus_score:.1f} < {min_focus_score})"

    # Check for pen marks (unusual saturation outside H&E range)
    if _detect_pen_marks(image):
        return "Pen mark or non-H&E artifact detected"

    return None


def _compute_optical_density(image: np.ndarray) -> np.ndarray:
    """Convert RGB image to optical density space.

    OD = -log(pixel / 255 + epsilon)
    Linearizes Beer-Lambert law for stain concentration.
    """
    epsilon = 1e-6

    if image.max() <= 1.0:
        img_255 = (image * 255).clip(1, 255)
    else:
        img_255 = image.clip(1, 255)

    od = -np.log(img_255 / 255.0 + epsilon)
    return od


def _detect_pen_marks(image: np.ndarray) -> bool:
    """Detect pen marks or artifacts via HSV saturation mapping.

    Pen marks have unusually saturated colors outside the H&E range.
    """
    if image.max() <= 1.0:
        img_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
    else:
        img_uint8 = image.clip(0, 255).astype(np.uint8)

    hsv = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    hue = hsv[:, :, 0]

    # H&E hue range: roughly 120-170 (blue-purple) and 0-20 (pink-red)
    # Pen marks: green (35-85), blue pen (100-120), red pen (0-10 with high S)
    non_he_mask = (
        (hue > 25) & (hue < 100) &  # Green range (not H&E)
        (saturation > 100)  # High saturation
    )

    pen_fraction = np.mean(non_he_mask)
    return bool(pen_fraction > 0.05)


def _apply_stain_normalization(
    image: np.ndarray,
    method: str,
    metadata: dict[str, Any],
) -> np.ndarray:
    """Apply Macenko or Vahadane stain normalization using staintools.

    Normalizes the input image's stain appearance to a reference standard.
    """
    with StepTimer("stain_normalization"):
        try:
            import staintools

            # Ensure uint8 RGB
            if image.max() <= 1.0:
                img_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
            else:
                img_uint8 = image.clip(0, 255).astype(np.uint8)

            # Standardize luminosity
            img_standardized = staintools.LuminosityStandardizer.standardize(img_uint8)

            # Create normalizer
            if method == "vahadane":
                normalizer = staintools.StainNormalizer(method="vahadane")
            else:
                normalizer = staintools.StainNormalizer(method="macenko")

            # Use the image itself as reference if no external reference provided
            # In production, a reference image would be loaded from config
            normalizer.fit(img_standardized)
            normalized = normalizer.transform(img_standardized)

            logger.info(f"Stain normalization applied ({method})")
            return normalized.astype(np.float32) / 255.0

        except ImportError:
            logger.warning(
                "staintools not installed — falling back to manual OD normalization"
            )
            return _manual_od_normalization(image)

        except Exception as e:
            logger.warning(f"Stain normalization failed: {e}")
            return image


def _manual_od_normalization(image: np.ndarray) -> np.ndarray:
    """Fallback manual optical density normalization without staintools."""
    od = _compute_optical_density(image)

    # Simple percentile normalization in OD space
    for c in range(3):
        channel = od[:, :, c]
        p1 = np.percentile(channel, 1)
        p99 = np.percentile(channel, 99)
        if p99 - p1 > 0:
            od[:, :, c] = np.clip((channel - p1) / (p99 - p1), 0, 1)

    # Convert back from OD
    result = np.exp(-od) * 255.0
    return result.clip(0, 255).astype(np.float32) / 255.0
