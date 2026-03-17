"""Hair artifact removal, vignette correction, and specular reflection removal for dermoscopy."""

from typing import Any

import cv2
import numpy as np

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class DermoscopyFilter(BaseFilter):
    """Dermoscopy image filter implementing hair artifact removal,
    specular reflection removal, and vignette correction."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Apply dermoscopy-specific filtering pipeline.

        Step 1: Hair artifact removal (DullRazor algorithm)
        Step 2: Specular reflection removal
        Step 3: Vignette correction
        """
        pre_image = image.copy()

        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])

        with StepTimer("dermoscopy_filtering"):
            # Step 1: Hair artifact removal
            image = _remove_hair_artifacts(image, config)
            metadata["preprocessing_steps"].append("Hair artifact removal (DullRazor)")

            # Step 2: Specular reflection removal
            image = _remove_specular_reflections(image, config)
            metadata["preprocessing_steps"].append("Specular reflection removal")

            # Step 3: Vignette correction
            image = _correct_vignette(image)
            metadata["preprocessing_steps"].append("Vignette correction")

            self._track_quality(pre_image, image)

        return image, metadata


def _remove_hair_artifacts(
    image: np.ndarray, config: dict[str, Any]
) -> np.ndarray:
    """Remove hair artifacts using the DullRazor algorithm.

    Uses morphological black top-hat with line-shaped structuring elements
    at multiple angles to detect thin, dark, elongated structures.
    Then inpaints detected hair regions using Telea algorithm.
    """
    with StepTimer("hair_removal"):
        hair_config = config.get("hair_removal", {})
        angles = hair_config.get("structuring_element_angles", [0, 45, 90, 135])

        # Convert to uint8 for morphological operations
        if image.max() <= 1.0:
            img_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
        else:
            img_uint8 = image.clip(0, 255).astype(np.uint8)

        # Convert to grayscale for hair detection
        if len(img_uint8.shape) == 3:
            gray = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_uint8.copy()

        # Combine black top-hat responses at multiple angles
        hair_mask = np.zeros_like(gray)
        se_length = 15

        for angle in angles:
            # Create line-shaped structuring element
            se = _create_line_se(se_length, angle)

            # Black top-hat: closing - original (highlights dark thin structures)
            blackhat = cv2.morphologyEx(gray, cv2.MORPH_BLACKHAT, se)

            # Add to combined mask
            hair_mask = np.maximum(hair_mask, blackhat)

        # Threshold to create binary hair mask
        _, binary_mask = cv2.threshold(hair_mask, 10, 255, cv2.THRESH_BINARY)

        # Dilate to fully cover hair width
        dilate_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        binary_mask = cv2.dilate(binary_mask, dilate_kernel, iterations=1)

        # Inpaint hair regions using Telea algorithm
        if np.any(binary_mask > 0):
            if len(img_uint8.shape) == 3:
                inpainted = cv2.inpaint(img_uint8, binary_mask, 6, cv2.INPAINT_TELEA)
            else:
                inpainted = cv2.inpaint(img_uint8, binary_mask, 6, cv2.INPAINT_TELEA)
            logger.info(
                f"Hair artifacts detected and removed "
                f"({np.sum(binary_mask > 0)} pixels inpainted)"
            )
        else:
            inpainted = img_uint8
            logger.info("No hair artifacts detected")

        if image.max() <= 1.0:
            return inpainted.astype(np.float32) / 255.0
        return inpainted.astype(np.float32)


def _create_line_se(length: int, angle: float) -> np.ndarray:
    """Create a line-shaped structuring element at the given angle."""
    se = np.zeros((length, length), dtype=np.uint8)
    center = length // 2

    angle_rad = np.radians(angle)
    cos_a = np.cos(angle_rad)
    sin_a = np.sin(angle_rad)

    for i in range(-center, center + 1):
        x = int(center + i * cos_a)
        y = int(center + i * sin_a)
        if 0 <= x < length and 0 <= y < length:
            se[y, x] = 1

    # Ensure at least one pixel is set
    if np.sum(se) == 0:
        se[center, center] = 1

    return se


def _remove_specular_reflections(
    image: np.ndarray, config: dict[str, Any]
) -> np.ndarray:
    """Remove specular reflections by detecting bright saturated spots.

    Detects via V channel (value) in HSV — pixels above the 98th percentile
    intensity are flagged as reflections. Inpainted using Telea method.
    """
    with StepTimer("specular_removal"):
        specular_config = config.get("specular_removal", {})
        percentile_threshold = specular_config.get("intensity_percentile_threshold", 98)

        # Convert to uint8
        if image.max() <= 1.0:
            img_uint8 = (image * 255).clip(0, 255).astype(np.uint8)
        else:
            img_uint8 = image.clip(0, 255).astype(np.uint8)

        # Convert to HSV and threshold V channel
        if len(img_uint8.shape) == 3:
            hsv = cv2.cvtColor(img_uint8, cv2.COLOR_RGB2HSV)
            v_channel = hsv[:, :, 2]
        else:
            v_channel = img_uint8

        threshold = np.percentile(v_channel, percentile_threshold)
        specular_mask = (v_channel > threshold).astype(np.uint8) * 255

        # Inpaint specular regions
        if np.any(specular_mask > 0):
            inpainted = cv2.inpaint(img_uint8, specular_mask, 5, cv2.INPAINT_TELEA)
            logger.info(
                f"Specular reflections removed ({np.sum(specular_mask > 0)} pixels)"
            )
        else:
            inpainted = img_uint8

        if image.max() <= 1.0:
            return inpainted.astype(np.float32) / 255.0
        return inpainted.astype(np.float32)


def _correct_vignette(image: np.ndarray) -> np.ndarray:
    """Correct vignetting by estimating and dividing out radial illumination pattern.

    Fits a large Gaussian to the illumination map and divides to flatten.
    """
    with StepTimer("vignette_correction"):
        # Convert to uint8 for processing
        if image.max() <= 1.0:
            img_float = image.copy()
        else:
            img_float = image.astype(np.float32) / 255.0

        if len(img_float.shape) == 3:
            # Process luminance channel
            gray = np.mean(img_float, axis=2)
        else:
            gray = img_float.copy()

        # Estimate illumination map with very large Gaussian blur
        sigma = max(gray.shape) // 4
        if sigma < 10:
            sigma = 10

        illum_map = cv2.GaussianBlur(
            gray, (0, 0), sigmaX=sigma, sigmaY=sigma
        )

        # Normalize illumination map
        illum_map_norm = illum_map / (np.max(illum_map) + 1e-10)
        illum_map_norm = np.clip(illum_map_norm, 0.1, 1.0)  # Avoid division by zero

        # Divide original by normalized illumination map
        if len(img_float.shape) == 3:
            for c in range(img_float.shape[2]):
                img_float[:, :, c] = img_float[:, :, c] / illum_map_norm
            img_float = np.clip(img_float, 0, 1)
        else:
            img_float = gray / illum_map_norm
            img_float = np.clip(img_float, 0, 1)

        logger.info("Vignette correction applied")

        if image.max() > 1.0:
            return (img_float * 255.0).astype(np.float32)
        return img_float.astype(np.float32)
