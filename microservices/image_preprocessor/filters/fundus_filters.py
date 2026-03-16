"""Retinal image CLAHE on green channel, illumination normalization, and FOV masking."""

from typing import Any

import cv2
import numpy as np

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class FundusFilter(BaseFilter):
    """Fundus (retinal) image filter implementing green channel CLAHE,
    illumination normalization, and field-of-view masking."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Apply fundus-specific filtering pipeline.

        Step 1: Green channel extraction and CLAHE
        Step 2: Illumination normalization (morphological top-hat)
        Step 3: Field of view masking
        """
        pre_image = image.copy()

        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])

        with StepTimer("fundus_filtering"):
            # Step 3 first: FOV masking (needed to avoid skewing statistics)
            fov_mask = _detect_fov_mask(image)
            metadata["fov_mask_applied"] = True
            metadata["preprocessing_steps"].append("FOV masking")

            # Step 1: Green channel CLAHE
            image = _apply_green_channel_clahe(image, config, fov_mask)
            metadata["preprocessing_steps"].append("Green channel CLAHE")

            # Step 2: Illumination normalization
            image = _apply_illumination_normalization(image, config, fov_mask)
            metadata["preprocessing_steps"].append("Illumination normalization")

            self._track_quality(pre_image, image)

        return image, metadata


def _detect_fov_mask(image: np.ndarray) -> np.ndarray:
    """Detect the circular field of view and create a binary mask.

    Fundus images have a circular FOV with black corners.
    """
    if len(image.shape) == 3:
        gray = np.mean(image, axis=2)
    else:
        gray = image.copy()

    # Normalize for thresholding
    if gray.max() <= 1.0:
        gray_uint8 = (gray * 255).astype(np.uint8)
    else:
        gray_uint8 = gray.astype(np.uint8)

    # Threshold to separate FOV from black background
    _, mask = cv2.threshold(gray_uint8, 15, 255, cv2.THRESH_BINARY)

    # Morphological closing to fill holes
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # Find largest contour (the FOV circle)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if contours:
        largest = max(contours, key=cv2.contourArea)
        fov_mask = np.zeros_like(mask)
        cv2.drawContours(fov_mask, [largest], -1, 255, -1)
        return fov_mask
    else:
        return np.ones_like(mask) * 255


def _apply_green_channel_clahe(
    image: np.ndarray,
    config: dict[str, Any],
    fov_mask: np.ndarray,
) -> np.ndarray:
    """Extract green channel and apply CLAHE for vessel and lesion enhancement.

    Green channel provides maximum contrast for retinal vessels and lesions
    because hemoglobin has peak absorption at green wavelengths (~540nm).
    """
    with StepTimer("green_channel_CLAHE"):
        clip_limit = config.get("clahe_clip_limit", 3.0)
        tile_grid = config.get("clahe_tile_grid_size", [8, 8])

        if len(image.shape) == 3 and image.shape[2] >= 3:
            # Extract green channel
            green = image[:, :, 1].copy()
        else:
            green = image.copy()

        # Convert to uint8
        if green.max() <= 1.0:
            green_uint8 = (green * 255).clip(0, 255).astype(np.uint8)
        else:
            green_uint8 = green.clip(0, 255).astype(np.uint8)

        # Apply CLAHE
        clahe = cv2.createCLAHE(
            clipLimit=clip_limit,
            tileGridSize=tuple(tile_grid),
        )
        enhanced = clahe.apply(green_uint8)

        # Apply FOV mask
        mask_bool = fov_mask > 0
        enhanced[~mask_bool] = 0

        logger.info(f"Green channel CLAHE applied: clip_limit={clip_limit}")

        # If input was RGB, replace green channel
        if len(image.shape) == 3 and image.shape[2] >= 3:
            result = image.copy()
            if image.max() <= 1.0:
                result[:, :, 1] = enhanced.astype(np.float32) / 255.0
            else:
                result[:, :, 1] = enhanced.astype(np.float32)
            return result
        else:
            return enhanced.astype(np.float32) / 255.0


def _apply_illumination_normalization(
    image: np.ndarray,
    config: dict[str, Any],
    fov_mask: np.ndarray,
) -> np.ndarray:
    """Apply morphological top-hat background estimation for illumination correction.

    Fundus images have uneven illumination — brighter in center, darker at periphery.
    Top-hat removes low-frequency illumination gradient while preserving fine structures.
    """
    with StepTimer("illumination_normalization"):
        illum_config = config.get("illumination_normalization", {})
        se_radius = illum_config.get("structuring_element_radius", 50)

        if len(image.shape) == 3:
            # Process green channel for illumination normalization
            green = image[:, :, 1].copy()
        else:
            green = image.copy()

        # Convert to uint8 for morphological operations
        if green.max() <= 1.0:
            green_uint8 = (green * 255).clip(0, 255).astype(np.uint8)
        else:
            green_uint8 = green.clip(0, 255).astype(np.uint8)

        # Morphological top-hat: image - opening(image)
        se = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (se_radius * 2., se_radius * 2)
        )
        background = cv2.morphologyEx(green_uint8, cv2.MORPH_OPEN, se)
        corrected = cv2.subtract(green_uint8, background)

        # Re-normalize
        if corrected.max() > 0:
            corrected = (corrected.astype(np.float32) / corrected.max())

        # Apply FOV mask
        mask_bool = fov_mask > 0
        corrected[~mask_bool] = 0

        logger.info(f"Illumination normalization applied (SE radius={se_radius})")

        if len(image.shape) == 3:
            result = image.copy()
            if image.max() <= 1.0:
                result[:, :, 1] = corrected
            else:
                result[:, :, 1] = corrected * 255.0
            return result
        else:
            return corrected
