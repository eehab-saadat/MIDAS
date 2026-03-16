"""Standardization engine: resize, bit-depth normalization, orientation correction."""

from typing import Any

import cv2
import numpy as np
import SimpleITK as sitk

from utils.logger import logger, StepTimer


def standardize(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
    modality: str,
) -> tuple[np.ndarray, dict[str, Any]]:
    """Apply spatial and intensity standardization to the image.

    Args:
        image: Input pixel array.
        metadata: Image metadata dictionary (will be updated in-place).
        config: Modality-specific configuration from YAML.
        modality: Detected modality string.

    Returns:
        Tuple of (standardized_image, updated_metadata).
    """
    with StepTimer("standardization"):
        # Step 1: Spatial standardization (resize with aspect ratio preservation)
        image = _resize_with_padding(image, config, modality, metadata)

        # Step 2: Bit-depth and dynamic range normalization
        image = _normalize_intensity(image, config, modality, metadata)

        # Step 3: Orientation correction
        image = _correct_orientation(image, metadata, config)

    return image, metadata


def _resize_with_padding(
    image: np.ndarray,
    config: dict[str, Any],
    modality: str,
    metadata: dict[str, Any],
) -> np.ndarray:
    """Resize image to target size while preserving aspect ratio with zero-padding.

    Uses bicubic for downsampling, Lanczos for upsampling.
    Histopathology tiles are not resized.
    """
    target_size = config.get("target_size", [512, 512])
    target_w, target_h = target_size

    # Histopathology: do not resize individual tiles
    if modality == "HISTOPATH":
        logger.info("Histopathology modality — skipping resize (tile-level processing)")
        return image

    original_h, original_w = image.shape[:2]
    metadata["original_dimensions"] = [original_h, original_w]

    # Compute scale factor preserving aspect ratio
    scale = min(target_w / original_w, target_h / original_h)
    new_w = int(original_w * scale)
    new_h = int(original_h * scale)

    # Choose interpolation method
    if scale < 1.0:
        interpolation = cv2.INTER_CUBIC  # Bicubic for downsampling
    else:
        interpolation = cv2.INTER_LANCZOS4  # Lanczos for upsampling

    # Resize
    if len(image.shape) == 2:
        resized = cv2.resize(image, (new_w, new_h), interpolation=interpolation)
    else:
        resized = cv2.resize(image, (new_w, new_h), interpolation=interpolation)

    # Zero-pad to target size, centering the image
    pad_top = (target_h - new_h) // 2
    pad_bottom = target_h - new_h - pad_top
    pad_left = (target_w - new_w) // 2
    pad_right = target_w - new_w - pad_left

    if len(image.shape) == 2:
        padded = np.zeros((target_h, target_w), dtype=resized.dtype)
        padded[pad_top : pad_top + new_h, pad_left : pad_left + new_w] = resized
    else:
        padded = np.zeros((target_h, target_w, image.shape[2]), dtype=resized.dtype)
        padded[pad_top : pad_top + new_h, pad_left : pad_left + new_w] = resized

    metadata["resize_scale"] = scale
    metadata["padding"] = {
        "top": pad_top,
        "bottom": pad_bottom,
        "left": pad_left,
        "right": pad_right,
    }

    logger.info(
        f"Resized from {original_w}x{original_h} to {new_w}x{new_h}, "
        f"padded to {target_w}x{target_h}"
    )

    return padded


def _normalize_intensity(
    image: np.ndarray,
    config: dict[str, Any],
    modality: str,
    metadata: dict[str, Any],
) -> np.ndarray:
    """Normalize bit-depth and dynamic range per modality conventions.

    CT: Keep in Hounsfield Units (no normalization yet — windowing happens in filters).
    MRI: Percentile-based normalization (1st-99th) on non-zero voxels.
    X-ray: Global min-max normalization to 0.0-1.0.
    Ultrasound: Log-compression if not already applied.
    Others: Convert to float32 range 0.0-1.0.
    """
    # Ensure float32
    image = image.astype(np.float32)

    if modality == "CT":
        # DO NOT normalize CT to 0-1. Keep in HU. Windowing happens in ct_filters.
        logger.info("CT modality — keeping Hounsfield Units (no global normalization)")
        metadata["intensity_normalization"] = "none_hu_preserved"

    elif modality == "MRI":
        # Percentile-based normalization on non-zero voxels
        percentile_config = config.get("percentile_normalization", {})
        lower_pct = percentile_config.get("lower", 1)
        upper_pct = percentile_config.get("upper", 99)

        nonzero_mask = image > 0
        if np.any(nonzero_mask):
            nonzero_vals = image[nonzero_mask]
            p_low = np.percentile(nonzero_vals, lower_pct)
            p_high = np.percentile(nonzero_vals, upper_pct)

            image = np.clip(image, p_low, p_high)
            image = (image - p_low) / (p_high - p_low + 1e-8)

            logger.info(
                f"MRI percentile normalization: clipped [{p_low:.1f}, {p_high:.1f}], "
                f"rescaled to [0, 1]"
            )
        metadata["intensity_normalization"] = f"percentile_{lower_pct}_{upper_pct}"

    elif modality == "XRAY":
        # Global min-max normalization
        img_min, img_max = image.min(), image.max()
        if img_max - img_min > 0:
            image = (image - img_min) / (img_max - img_min)
        logger.info("X-ray min-max normalization to [0, 1]")
        metadata["intensity_normalization"] = "minmax"

    elif modality == "ULTRASOUND":
        # Log-compression if dynamic range exceeds threshold
        log_threshold = config.get("log_compression_db_threshold", 60.0)
        dynamic_range_db = 20 * np.log10(image.max() / (image.min() + 1e-10) + 1e-10)

        if dynamic_range_db > log_threshold:
            image = np.log1p(image) / np.log1p(image.max()) * 255.0
            logger.info(
                f"Ultrasound log-compression applied (dynamic range: {dynamic_range_db:.1f} dB)"
            )
            metadata["intensity_normalization"] = "log_compression"
        else:
            # Already log-compressed, normalize to 0-1
            img_min, img_max = image.min(), image.max()
            if img_max - img_min > 0:
                image = (image - img_min) / (img_max - img_min)
            metadata["intensity_normalization"] = "minmax_already_compressed"

    else:
        # Default: normalize to 0-1
        img_min, img_max = image.min(), image.max()
        if img_max - img_min > 0:
            image = (image - img_min) / (img_max - img_min)
        metadata["intensity_normalization"] = "minmax"

    return image


def _correct_orientation(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
) -> np.ndarray:
    """Correct image orientation to standard anatomical convention.

    Uses ImageOrientationPatient DICOM tag with SimpleITK for resampling
    into standard radiological orientation (LPS by default).
    """
    target_orientation = config.get("orientation_standard", "LPS")
    orientation_data = metadata.get("ImageOrientationPatient")

    if orientation_data is None:
        logger.info("No ImageOrientationPatient tag — skipping orientation correction")
        metadata["orientation_corrected"] = False
        return image

    try:
        # Convert image to SimpleITK for orientation processing
        if len(image.shape) == 2:
            sitk_image = sitk.GetImageFromArray(image)
        else:
            sitk_image = sitk.GetImageFromArray(image)

        # Set direction cosines from DICOM tag
        if isinstance(orientation_data, list) and len(orientation_data) == 6:
            row_cosines = orientation_data[:3]
            col_cosines = orientation_data[3:6]

            # Compute slice normal as cross product
            normal = [
                row_cosines[1] * col_cosines[2] - row_cosines[2] * col_cosines[1],
                row_cosines[2] * col_cosines[0] - row_cosines[0] * col_cosines[2],
                row_cosines[0] * col_cosines[1] - row_cosines[1] * col_cosines[0],
            ]

            if len(image.shape) == 2:
                direction = [
                    row_cosines[0], col_cosines[0],
                    row_cosines[1], col_cosines[1],
                ]
                sitk_image.SetDirection(direction)
            # For 2D we keep the image as-is after setting metadata

        # Reorient using SimpleITK's DICOMOrient filter for 3D
        if sitk_image.GetDimension() == 3:
            orienter = sitk.DICOMOrientImageFilter()
            orienter.SetDesiredCoordinateOrientation(target_orientation)
            sitk_image = orienter.Execute(sitk_image)
            image = sitk.GetArrayFromImage(sitk_image)

        metadata["orientation_corrected"] = True
        metadata["target_orientation"] = target_orientation
        logger.info(f"Orientation corrected to {target_orientation}")

    except Exception as e:
        logger.warning(f"Orientation correction failed: {e}")
        metadata["orientation_corrected"] = False

    return image
