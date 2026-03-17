"""CT-specific noise reduction, HU windowing, and artifact handling."""

from typing import Any

import cv2
import numpy as np

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class CTFilter(BaseFilter):
    """CT image filter implementing HU windowing, bilateral denoising, and artifact detection."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray | dict[str, np.ndarray], dict[str, Any]]:
        """Apply CT-specific filtering pipeline.

        Step 1: HU window/level application
        Step 2: Bilateral or Gaussian denoising
        Step 3: Ring artifact detection and flagging

        Returns a dict of windowed images if multiple windows are requested,
        otherwise a single processed image.
        """
        pre_image = image.copy()

        with StepTimer("ct_filtering"):
            # Step 3 first: Ring artifact detection (before windowing)
            ring_detected = _detect_ring_artifact(image)
            if ring_detected:
                metadata["ring_artifact"] = True
                logger.warning("Ring artifact detected in CT image")

            # Step 1: HU Windowing
            body_part = metadata.get("BodyPartExamined", "").upper()
            windows = _select_windows(body_part, config)
            metadata["windows_applied"] = list(windows.keys())

            windowed_images = {}
            for window_name, (center, width) in windows.items():
                windowed = _apply_hu_window(image, center, width)

                # Step 2: Bilateral denoising (after windowing)
                windowed = _apply_denoising(
                    windowed, metadata, config, window_name
                )

                windowed_images[window_name] = windowed

            # Track quality using the first windowed image
            first_windowed = next(iter(windowed_images.values()))
            self._track_quality(pre_image, first_windowed)

            metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])
            metadata["preprocessing_steps"].extend([
                f"CT HU windowing ({', '.join(windows.keys())})",
                "bilateral denoising",
            ])

        # Return single image if only one window, dict if multiple
        if len(windowed_images) == 1:
            return next(iter(windowed_images.values())), metadata

        return windowed_images, metadata


def _apply_hu_window(
    image: np.ndarray, center: float, width: float
) -> np.ndarray:
    """Apply HU window/level to convert full HU range to display range.

    Formula: output = clip((HU - (center - width/2)) / width * 255, 0, 255)
    """
    lower = center - width / 2
    upper = center + width / 2

    windowed = (image - lower) / (upper - lower) * 255.0
    windowed = np.clip(windowed, 0, 255).astype(np.float32)

    logger.info(f"Applied HU window: center={center}, width={width} (range [{lower}, {upper}])")
    return windowed


def _select_windows(
    body_part: str, config: dict[str, Any]
) -> dict[str, tuple[float, float]]:
    """Select appropriate HU windows based on body part.

    CT HEAD: brain + subdural windows
    CT CHEST: lung + mediastinum + bone windows
    Default: mediastinum (soft tissue) window
    """
    presets = config.get("window_presets", {})

    if body_part in ("HEAD", "BRAIN"):
        windows = {}
        brain = presets.get("brain", {})
        subdural = presets.get("subdural", {})
        if brain:
            windows["brain"] = (brain["center"], brain["width"])
        if subdural:
            windows["subdural"] = (subdural["center"], subdural["width"])
        if not windows:
            windows["brain"] = (35, 80)
        return windows

    elif body_part in ("CHEST", "THORAX", "LUNG"):
        windows = {}
        for name in ["lung", "mediastinum", "bone"]:
            preset = presets.get(name, {})
            if preset:
                windows[name] = (preset["center"], preset["width"])
        if not windows:
            windows["lung"] = (-600, 1500)
        return windows

    elif body_part in ("ABDOMEN", "LIVER", "PANCREAS", "KIDNEY"):
        liver = presets.get("liver", {})
        if liver:
            return {"liver": (liver["center"], liver["width"])}
        return {"liver": (60, 150)}

    else:
        # Default soft tissue window
        med = presets.get("mediastinum", {})
        if med:
            return {"soft_tissue": (med["center"], med["width"])}
        return {"soft_tissue": (40, 400)}


def _apply_denoising(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
    window_name: str,
) -> np.ndarray:
    """Apply bilateral filtering for CT noise reduction.

    Do NOT apply Gaussian blur to lung window images — it reduces small nodule sharpness.
    For thin-slice CT (< 2mm), increase spatial sigma.
    """
    bilateral_config = config.get("bilateral_filter", {})
    spatial_sigma = bilateral_config.get("spatial_sigma", 1.5)
    range_sigma = bilateral_config.get("range_sigma", 15.0)

    # Check for thin-slice CT
    slice_thickness = metadata.get("SliceThickness")
    thin_threshold = bilateral_config.get("thin_slice_threshold_mm", 2.0)

    if slice_thickness is not None:
        try:
            thickness = float(slice_thickness)
            if thickness < thin_threshold:
                spatial_sigma = bilateral_config.get("thin_slice_spatial_sigma", 2.0)
                logger.info(
                    f"Thin-slice CT ({thickness}mm): increased spatial sigma to {spatial_sigma}"
                )
        except (ValueError, TypeError):
            pass

    # Skip denoising for lung window to preserve nodule sharpness
    if window_name == "lung":
        logger.info("Skipping Gaussian blur for lung window to preserve nodule sharpness")
        # Still apply mild bilateral filter (edge-preserving)

    # Apply bilateral filter
    img_uint8 = np.clip(image, 0, 255).astype(np.uint8)
    d = int(spatial_sigma * 4)  # Filter diameter
    filtered = cv2.bilateralFilter(
        img_uint8, d, sigmaColor=range_sigma, sigmaSpace=spatial_sigma
    )

    return filtered.astype(np.float32)


def _detect_ring_artifact(image: np.ndarray) -> bool:
    """Detect ring artifacts by analyzing radial variance profile.

    Ring artifacts appear as concentric circular bands centered on the isocenter.
    """
    if len(image.shape) == 3:
        img = np.mean(image, axis=2)
    else:
        img = image

    h, w = img.shape
    center_y, center_x = h // 2, w // 2
    max_radius = min(center_y, center_x)

    if max_radius < 20:
        return False

    radii = np.arange(5, max_radius, 2)
    variances = []

    for r in radii:
        angles = np.linspace(0, 2 * np.pi, max(16, r), endpoint=False)
        y_coords = (center_y + r * np.sin(angles)).astype(int)
        x_coords = (center_x + r * np.cos(angles)).astype(int)

        valid = (y_coords >= 0) & (y_coords < h) & (x_coords >= 0) & (x_coords < w)
        if np.sum(valid) < 4:
            continue

        ring_values = img[y_coords[valid], x_coords[valid]]
        variances.append(np.var(ring_values))

    if len(variances) < 10:
        return False

    var_array = np.array(variances)
    var_diff = np.diff(var_array)
    sign_changes = np.sum(np.diff(np.sign(var_diff)) != 0)
    periodicity_ratio = sign_changes / len(var_diff)

    return periodicity_ratio > 0.7
