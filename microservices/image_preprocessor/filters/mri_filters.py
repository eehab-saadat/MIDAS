"""MRI-specific bias field correction, NLM denoising, and intensity normalization."""

from typing import Any

import numpy as np
import SimpleITK as sitk
from skimage.restoration import denoise_nl_means, estimate_sigma

from filters.base_filter import BaseFilter
from utils.logger import logger, StepTimer


class MRIFilter(BaseFilter):
    """MRI image filter implementing N4 bias correction, NLM denoising,
    and subtype-specific intensity normalization."""

    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Apply MRI-specific filtering pipeline.

        Step 1: N4 Bias Field Correction (mandatory for brain MRI)
        Step 2: Non-Local Means (NLM) denoising
        Step 3: MRI-specific intensity normalization by subtype

        N4 bias correction MUST be applied BEFORE NLM denoising.
        """
        pre_image = image.copy()
        mri_subtype = metadata.get("mri_subtype")
        body_part = metadata.get("BodyPartExamined", "").upper()

        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])

        with StepTimer("mri_filtering"):
            # Check for motion artifact — if detected, skip NLM
            motion_detected = metadata.get("motion_detected", False)

            # Step 1: N4 Bias Field Correction
            if _should_apply_bias_correction(body_part, config):
                image = _apply_n4_bias_correction(image, metadata)
                metadata["preprocessing_steps"].append("N4 bias field correction")
            else:
                logger.info(
                    f"Skipping N4 bias correction for body part '{body_part}' "
                    "(not recommended for abdominal MRI)"
                )

            # Step 2: NLM Denoising
            if motion_detected:
                logger.warning(
                    "Motion artifact detected — skipping NLM denoising "
                    "(it amplifies motion ghosts)"
                )
                metadata["preprocessing_steps"].append("NLM denoising SKIPPED (motion)")
                metadata["motion_degraded"] = True
            else:
                image = _apply_nlm_denoising(image, metadata, config, mri_subtype)
                metadata["preprocessing_steps"].append("NLM denoising")

            # Step 3: Intensity normalization by MRI subtype
            image = _normalize_by_subtype(image, metadata, config, mri_subtype)

            self._track_quality(pre_image, image)

        return image, metadata


def _should_apply_bias_correction(body_part: str, config: dict[str, Any]) -> bool:
    """Determine if N4 bias correction should be applied.

    Apply to brain MRI. Do NOT apply to abdominal MRI — the algorithm
    can misinterpret T1 fat-suppression signal variation as bias field.
    """
    if not config.get("mri_bias_correction", True):
        return False

    # Skip for abdominal regions
    abdominal_parts = {"ABDOMEN", "LIVER", "PANCREAS", "KIDNEY", "PELVIS", "SPINE"}
    if body_part in abdominal_parts:
        return False

    return True


def _apply_n4_bias_correction(
    image: np.ndarray, metadata: dict[str, Any]
) -> np.ndarray:
    """Apply N4ITK bias field correction using SimpleITK.

    Uses a coarse Otsu threshold mask for the brain (does not require
    a perfect brain mask — a simple background-air threshold suffices).
    """
    with StepTimer("N4_bias_correction"):
        try:
            # Convert to SimpleITK image
            sitk_image = sitk.GetImageFromArray(image.astype(np.float64))
            sitk_image = sitk.Cast(sitk_image, sitk.sitkFloat64)

            # Create coarse mask using Otsu threshold (separates brain from air)
            otsu_filter = sitk.OtsuThresholdImageFilter()
            otsu_filter.SetInsideValue(0)
            otsu_filter.SetOutsideValue(1)
            mask = otsu_filter.Execute(sitk_image)
            mask = sitk.Cast(mask, sitk.sitkUInt8)

            # Apply N4 correction
            corrector = sitk.N4BiasFieldCorrectionImageFilter()
            corrector.SetMaximumNumberOfIterations([50, 50, 30, 20])
            corrected = corrector.Execute(sitk_image, mask)

            result = sitk.GetArrayFromImage(corrected).astype(np.float32)
            logger.info("N4 bias field correction applied successfully")
            return result

        except Exception as e:
            logger.warning(f"N4 bias correction failed: {e}. Returning uncorrected image.")
            return image


def _apply_nlm_denoising(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
    mri_subtype: str | None,
) -> np.ndarray:
    """Apply Non-Local Means denoising using skimage.

    h parameter (filter strength) varies by field strength and sequence:
    - 3T MRI: h = 0.05
    - 1.5T MRI: h = 0.08
    - FLAIR: h = 0.04 (conservative — hyperintense lesions are subtle)
    """
    with StepTimer("NLM_denoising"):
        nlm_config = config.get("nlm_params", {})

        # Determine h parameter based on field strength and subtype
        field_strength = metadata.get("MagneticFieldStrength")

        if mri_subtype == "MRI_FLAIR":
            h = nlm_config.get("h_flair", 0.04)
            logger.info("Using conservative NLM h=0.04 for FLAIR (preserving lesion signal)")
        elif field_strength is not None:
            try:
                fs = float(field_strength)
                if fs >= 2.5:
                    h = nlm_config.get("h_3T", 0.05)
                else:
                    h = nlm_config.get("h_1_5T", 0.08)
            except (ValueError, TypeError):
                h = nlm_config.get("h_3T", 0.05)
        else:
            h = nlm_config.get("h_3T", 0.05)

        # Estimate noise sigma
        sigma_est = np.mean(estimate_sigma(image))

        # Apply NLM
        patch_size = 5
        patch_distance = 6
        denoised = denoise_nl_means(
            image,
            h=h * sigma_est if sigma_est > 0 else h,
            patch_size=patch_size,
            patch_distance=patch_distance,
            fast_mode=True,
        )

        logger.info(f"NLM denoising applied: h={h}, sigma_est={sigma_est:.4f}")
        return denoised.astype(np.float32)


def _normalize_by_subtype(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
    mri_subtype: str | None,
) -> np.ndarray:
    """Apply subtype-specific MRI intensity normalization.

    T1: WhiteStripe normalization (white matter peak as reference)
    T2: Percentile normalization (1st-99th)
    FLAIR: Same as T2
    DWI/ADC: Clip to physiological range, scale to 0-1
    """
    with StepTimer("MRI_intensity_normalization"):
        if mri_subtype == "MRI_T1":
            image = _whitestripe_normalization(image)
            metadata["preprocessing_steps"].append("WhiteStripe normalization (T1)")

        elif mri_subtype in ("MRI_T2", "MRI_FLAIR"):
            image = _percentile_normalization(image, config)
            metadata["preprocessing_steps"].append(
                f"Percentile normalization ({mri_subtype})"
            )

        elif mri_subtype == "MRI_DIFFUSION":
            adc_range = config.get("adc_clip_range", [0.0, 0.003])
            image = np.clip(image, adc_range[0], adc_range[1])
            image = (image - adc_range[0]) / (adc_range[1] - adc_range[0] + 1e-10)
            metadata["preprocessing_steps"].append("ADC range normalization")

        else:
            # Default MRI normalization: percentile
            image = _percentile_normalization(image, config)
            metadata["preprocessing_steps"].append("Percentile normalization (default MRI)")

    return image.astype(np.float32)


def _whitestripe_normalization(image: np.ndarray) -> np.ndarray:
    """WhiteStripe normalization for T1-weighted MRI.

    Identifies the white matter intensity peak in the histogram and
    normalizes so that peak sits at a fixed reference value.
    """
    # Get non-zero voxels
    nonzero = image[image > 0]
    if len(nonzero) == 0:
        return image

    # Compute histogram
    hist, bin_edges = np.histogram(nonzero, bins=256)

    # Find the white matter peak (typically the largest peak in upper intensity range)
    # WM is usually the second largest peak after background
    mid_idx = len(hist) // 3
    upper_hist = hist[mid_idx:]
    wm_peak_idx = mid_idx + np.argmax(upper_hist)
    wm_peak_value = (bin_edges[wm_peak_idx] + bin_edges[wm_peak_idx + 1]) / 2

    if wm_peak_value < 1e-10:
        return image

    # Normalize so WM peak sits at 0.5
    reference_value = 0.5
    normalized = image * (reference_value / wm_peak_value)
    normalized = np.clip(normalized, 0, 1)

    logger.info(f"WhiteStripe normalization: WM peak at {wm_peak_value:.2f}, normalized to {reference_value}")
    return normalized


def _percentile_normalization(
    image: np.ndarray, config: dict[str, Any]
) -> np.ndarray:
    """Percentile-based normalization (1st-99th percentile clipping)."""
    pct_config = config.get("percentile_normalization", {})
    lower_pct = pct_config.get("lower", 1)
    upper_pct = pct_config.get("upper", 99)

    nonzero = image[image > 0]
    if len(nonzero) == 0:
        return image

    p_low = np.percentile(nonzero, lower_pct)
    p_high = np.percentile(nonzero, upper_pct)

    clipped = np.clip(image, p_low, p_high)
    normalized = (clipped - p_low) / (p_high - p_low + 1e-10)

    return normalized
