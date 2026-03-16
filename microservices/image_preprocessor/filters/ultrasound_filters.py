"""Ultrasound speckle reduction via anisotropic diffusion, log-compression, and gain normalization."""

from typing import Any

import numpy as np
from medpy.filter.smoothing import anisotropic_diffusion

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class UltrasoundFilter(BaseFilter):
    """Ultrasound image filter implementing anisotropic diffusion,
    log-compression check, and gain normalization."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Apply ultrasound-specific filtering pipeline.

        Step 1: Anisotropic diffusion filtering (Perona-Malik)
        Step 2: Log-compression check and application
        Step 3: Gain normalization (column-wise mean)

        Speckle is NOT random noise — it carries textural information.
        Anisotropic diffusion preserves edges while smoothing homogeneous regions.
        """
        pre_image = image.copy()

        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])

        with StepTimer("ultrasound_filtering"):
            # Check for Doppler overlay
            has_doppler = _detect_doppler(image)
            if has_doppler:
                metadata["doppler_present"] = True
                logger.info(
                    "Doppler overlay detected — separating B-mode from Doppler."
                )
                bmode, doppler_mask = _separate_doppler(image)
                metadata["preprocessing_steps"].append("Doppler separation")
            else:
                bmode = image.copy()
                doppler_mask = None

            # Step 1: Anisotropic diffusion
            bmode = _apply_anisotropic_diffusion(bmode, config)
            metadata["preprocessing_steps"].append("Anisotropic diffusion")

            # Step 2: Log-compression check
            bmode = _check_log_compression(bmode, config, metadata)

            # Step 3: Gain normalization
            bmode = _apply_gain_normalization(bmode)
            metadata["preprocessing_steps"].append("Gain normalization")

            # Recombine with Doppler if separated
            if has_doppler and doppler_mask is not None:
                image = _recombine_doppler(bmode, image, doppler_mask)
                metadata["preprocessing_steps"].append("Doppler recombination")
            else:
                image = bmode

            self._track_quality(pre_image, image)

        return image, metadata


def _apply_anisotropic_diffusion(
    image: np.ndarray, config: dict[str, Any]
) -> np.ndarray:
    """Apply Perona-Malik anisotropic diffusion via medpy.

    Selectively smooths homogeneous regions (reducing speckle within
    organ parenchyma) while preserving edges at tissue interfaces.
    """
    with StepTimer("anisotropic_diffusion"):
        diffusion_config = config.get("anisotropic_diffusion", {})
        kappa = diffusion_config.get("kappa", 50)
        gamma = diffusion_config.get("gamma", 0.1)
        n_iter = diffusion_config.get("n_iterations", 10)

        # Ensure 2D for diffusion
        if len(image.shape) == 3:
            img = np.mean(image, axis=2)
        else:
            img = image.copy()

        filtered = anisotropic_diffusion(
            img.astype(np.float64),
            niter=n_iter,
            kappa=kappa,
            gamma=gamma,
        )

        logger.info(
            f"Anisotropic diffusion applied: kappa={kappa}, gamma={gamma}, "
            f"iterations={n_iter}"
        )
        return filtered.astype(np.float32)


def _check_log_compression(
    image: np.ndarray,
    config: dict[str, Any],
    metadata: dict[str, Any],
) -> np.ndarray:
    """Check if log compression has already been applied and apply if needed.

    If pixel array is uint8 (0-255), scanner already applied log compression.
    If dynamic range spans > 60 dB, apply manually.
    """
    log_threshold = config.get("log_compression_db_threshold", 60.0)

    img_min = image.min()
    img_max = image.max()

    if img_max <= 255 and img_min >= 0:
        logger.info("Ultrasound appears already log-compressed (0-255 range)")
        metadata["preprocessing_steps"].append("Log-compression (already applied)")
        return image

    # Check dynamic range in dB
    if img_max > 0 and img_min >= 0:
        dynamic_range_db = 20 * np.log10((img_max + 1e-10) / (img_min + 1e-10))
        if dynamic_range_db > log_threshold:
            compressed = np.log1p(image) / np.log1p(img_max) * 255.0
            logger.info(
                f"Log-compression applied (dynamic range: {dynamic_range_db:.1f} dB)"
            )
            metadata["preprocessing_steps"].append("Log-compression applied")
            return compressed.astype(np.float32)

    return image


def _apply_gain_normalization(image: np.ndarray) -> np.ndarray:
    """Apply column-wise mean normalization to correct TGC brightness gradients.

    Ultrasound images often have non-uniform brightness due to
    time-gain compensation (TGC) settings applied by the sonographer.
    """
    with StepTimer("gain_normalization"):
        if len(image.shape) == 3:
            img = np.mean(image, axis=2)
        else:
            img = image.copy()

        # Column-wise mean normalization (along scan depth axis)
        col_means = np.mean(img, axis=1, keepdims=True)
        global_mean = np.mean(img)

        if np.any(col_means > 0):
            correction = global_mean / (col_means + 1e-10)
            # Limit correction to avoid extreme values
            correction = np.clip(correction, 0.5, 2.0)
            normalized = img * correction
        else:
            normalized = img

        logger.info("Gain normalization applied (column-wise depth correction)")
        return normalized.astype(np.float32)


def _detect_doppler(image: np.ndarray) -> bool:
    """Detect if image contains Doppler color overlay.

    Color Doppler appears as color pixels in an otherwise grayscale image.
    """
    if len(image.shape) != 3 or image.shape[2] != 3:
        return False

    # Check for significant color information
    r, g, b = image[:, :, 0], image[:, :, 1], image[:, :, 2]

    # Compute color saturation
    max_rgb = np.maximum(np.maximum(r, g), b)
    min_rgb = np.minimum(np.minimum(r, g), b)
    saturation = (max_rgb - min_rgb) / (max_rgb + 1e-10)

    # If more than 5% of pixels have significant saturation, Doppler is present
    color_fraction = np.mean(saturation > 0.2)
    return bool(color_fraction > 0.05)


def _separate_doppler(
    image: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Separate B-mode grayscale from Doppler color overlay.

    Returns the grayscale B-mode component and a binary mask of Doppler regions.
    """
    r, g, b = image[:, :, 0], image[:, :, 1], image[:, :, 2]

    max_rgb = np.maximum(np.maximum(r, g), b)
    min_rgb = np.minimum(np.minimum(r, g), b)
    saturation = (max_rgb - min_rgb) / (max_rgb + 1e-10)

    # Doppler mask where saturation is high
    doppler_mask = saturation > 0.2

    # B-mode is the grayscale component (luminance)
    bmode = 0.299 * r + 0.587 * g + 0.114 * b

    return bmode.astype(np.float32), doppler_mask.astype(np.uint8)


def _recombine_doppler(
    processed_bmode: np.ndarray,
    original_image: np.ndarray,
    doppler_mask: np.ndarray,
) -> np.ndarray:
    """Recombine processed B-mode with original Doppler overlay.

    Doppler color regions must NOT be processed through grayscale normalization.
    """
    if len(original_image.shape) != 3:
        return processed_bmode

    # Create output as 3-channel
    if len(processed_bmode.shape) == 2:
        output = np.stack([processed_bmode] * 3, axis=2)
    else:
        output = processed_bmode.copy()

    # Restore original Doppler regions
    mask_3d = np.stack([doppler_mask] * 3, axis=2).astype(bool)
    output[mask_3d] = original_image[mask_3d]

    return output
