"""Pre- and post-processing quality metrics: SNR, CNR, sharpness, motion, artifacts."""

from typing import Any

import numpy as np
from scipy import ndimage

from utils.logger import logger, log_quality_delta


def assess_quality(
    image: np.ndarray,
    metadata: dict[str, Any],
    config: dict[str, Any],
    modality: str,
) -> dict[str, Any]:
    """Compute quality metrics for the given image.

    Runs pre- or post-processing to establish a baseline or validate improvements.

    Args:
        image: Pixel array.
        metadata: Image metadata.
        config: Quality thresholds from config.
        modality: Detected modality.

    Returns:
        Dictionary of quality metrics with pass/fail flags and warnings.
    """
    quality_config = config.get("quality", {})

    metrics = {}
    warnings = []

    # SNR estimation
    snr = _estimate_snr(image)
    metrics["snr_db"] = snr
    snr_threshold = quality_config.get("snr_threshold", 15.0)
    metrics["snr_pass"] = snr >= snr_threshold
    if not metrics["snr_pass"]:
        warnings.append(f"Low SNR: {snr:.1f} dB (threshold: {snr_threshold} dB)")

    # Sharpness (Laplacian variance)
    sharpness = _compute_sharpness(image)
    metrics["sharpness"] = sharpness
    sharpness_threshold = quality_config.get("sharpness_threshold", 80.0)
    metrics["sharpness_pass"] = sharpness >= sharpness_threshold

    # Motion artifact detection (Laplacian variance threshold)
    motion_threshold = quality_config.get("motion_laplacian_threshold", 80.0)
    metrics["motion_detected"] = sharpness < motion_threshold
    if metrics["motion_detected"]:
        warnings.append(
            f"Possible motion blur: sharpness {sharpness:.1f} "
            f"(threshold: {motion_threshold})"
        )

    # Dynamic range
    metrics["dynamic_range"] = float(image.max() - image.min())
    metrics["pixel_mean"] = float(np.mean(image))
    metrics["pixel_std"] = float(np.std(image))

    # Modality-specific artifact detection
    if modality == "CT":
        ct_artifacts = _detect_ct_artifacts(image, quality_config)
        metrics.update(ct_artifacts)
        if ct_artifacts.get("metal_artifact_detected"):
            warnings.append("Metal artifact detected — bright streaks from implant")
        if ct_artifacts.get("ring_artifact_detected"):
            warnings.append("Ring artifact detected — concentric bands")
        if ct_artifacts.get("truncation_artifact_detected"):
            warnings.append("Truncation artifact — patient extends beyond FOV")

    elif modality == "MRI":
        mri_artifacts = _detect_mri_artifacts(image, quality_config)
        metrics.update(mri_artifacts)
        if mri_artifacts.get("coil_noise_detected"):
            warnings.append("Peripheral coil noise detected")
        if mri_artifacts.get("zipper_artifact_detected"):
            warnings.append("Zipper artifact detected — RF interference banding")
        if mri_artifacts.get("truncation_artifact_detected"):
            warnings.append("Truncation artifact at image edges")

    elif modality == "XRAY":
        if metrics["motion_detected"]:
            warnings.append("Motion blur in X-ray — clinical significance: may obscure findings")

    # Compile quality report
    quality_report = {
        "metrics": metrics,
        "warnings": warnings,
        "overall_pass": len(warnings) == 0,
    }

    logger.info(
        f"Quality assessment: SNR={snr:.1f}dB, sharpness={sharpness:.1f}, "
        f"warnings={len(warnings)}"
    )

    return quality_report


def compute_quality_delta(
    pre_report: dict[str, Any],
    post_report: dict[str, Any],
) -> dict[str, Any]:
    """Compute quality improvement between pre- and post-processing.

    Returns delta metrics and flags if quality regressed.
    """
    pre_metrics = pre_report.get("metrics", {})
    post_metrics = post_report.get("metrics", {})

    delta = {}
    regressions = []

    # SNR delta
    if "snr_db" in pre_metrics and "snr_db" in post_metrics:
        snr_delta = post_metrics["snr_db"] - pre_metrics["snr_db"]
        delta["snr_delta_db"] = snr_delta
        if snr_delta < -1.0:
            regressions.append(f"SNR regressed by {abs(snr_delta):.1f} dB")

    # Sharpness delta
    if "sharpness" in pre_metrics and "sharpness" in post_metrics:
        sharpness_delta = post_metrics["sharpness"] - pre_metrics["sharpness"]
        delta["sharpness_delta"] = sharpness_delta
        if sharpness_delta < -10.0:
            regressions.append(f"Sharpness regressed by {abs(sharpness_delta):.1f}")

    delta["quality_improved"] = len(regressions) == 0
    delta["regressions"] = regressions

    # Log quality deltas
    log_quality_delta("preprocessing", pre_metrics, post_metrics)

    if regressions:
        for regression in regressions:
            logger.warning(f"Quality regression: {regression}")

    return delta


def _estimate_snr(image: np.ndarray) -> float:
    """Estimate Signal-to-Noise Ratio in decibels.

    Uses a simple approach: signal = mean of foreground,
    noise = std of a homogeneous background region.
    """
    # Ensure 2D
    if len(image.shape) == 3:
        img_2d = np.mean(image, axis=2)
    else:
        img_2d = image

    # Estimate foreground/background using Otsu-like threshold
    flat = img_2d.flatten()
    threshold = np.mean(flat)

    foreground = flat[flat > threshold]
    background = flat[flat <= threshold]

    if len(background) == 0 or len(foreground) == 0:
        return 0.0

    signal = np.mean(foreground)
    noise_std = np.std(background)

    if noise_std < 1e-10:
        return 60.0  # Effectively noiseless

    snr = 20 * np.log10(signal / (noise_std + 1e-10))
    return float(max(snr, 0.0))


def _compute_sharpness(image: np.ndarray) -> float:
    """Compute image sharpness using Laplacian variance.

    Higher values indicate sharper images.
    """
    if len(image.shape) == 3:
        img_2d = np.mean(image, axis=2)
    else:
        img_2d = image

    # Normalize to 0-255 for consistent Laplacian variance
    if img_2d.max() <= 1.0 and img_2d.min() >= 0.0:
        img_2d = img_2d * 255.0

    laplacian = ndimage.laplace(img_2d.astype(np.float64))
    return float(np.var(laplacian))


def _detect_ct_artifacts(
    image: np.ndarray, quality_config: dict
) -> dict[str, Any]:
    """Detect CT-specific artifacts: metal, ring, truncation."""
    artifacts = {}

    if len(image.shape) == 3:
        img = np.mean(image, axis=2)
    else:
        img = image

    # Metal artifact: pixels > 3000 HU
    metal_threshold = quality_config.get("metal_artifact_hu_threshold", 3000)
    artifacts["metal_artifact_detected"] = bool(np.any(img > metal_threshold))

    # Ring artifact: periodic variance along radial directions from center
    artifacts["ring_artifact_detected"] = _detect_ring_artifact(img)

    # Truncation artifact: edge saturation
    edge_pixels = np.concatenate([
        img[0, :], img[-1, :], img[:, 0], img[:, -1]
    ])
    edge_std = np.std(edge_pixels)
    metal_std_threshold = quality_config.get("metal_artifact_std_threshold", 5.0)
    artifacts["truncation_artifact_detected"] = bool(edge_std < metal_std_threshold)

    return artifacts


def _detect_ring_artifact(image: np.ndarray) -> bool:
    """Detect ring artifacts by computing radial variance profile.

    Ring artifacts show periodic variance spikes along radial directions.
    """
    h, w = image.shape
    center_y, center_x = h // 2, w // 2
    max_radius = min(center_y, center_x)

    if max_radius < 10:
        return False

    # Sample radial variance profile
    radii = np.arange(5, max_radius, 2)
    variances = []

    for r in radii:
        # Sample points along circle of radius r
        angles = np.linspace(0, 2 * np.pi, max(16, r), endpoint=False)
        y_coords = (center_y + r * np.sin(angles)).astype(int)
        x_coords = (center_x + r * np.cos(angles)).astype(int)

        # Clip to valid image bounds
        valid = (
            (y_coords >= 0) & (y_coords < h) &
            (x_coords >= 0) & (x_coords < w)
        )
        if np.sum(valid) < 4:
            continue

        ring_values = image[y_coords[valid], x_coords[valid]]
        variances.append(np.var(ring_values))

    if len(variances) < 10:
        return False

    # Check for periodic peaks in variance profile (ring artifact signature)
    var_array = np.array(variances)
    var_diff = np.diff(var_array)
    sign_changes = np.sum(np.diff(np.sign(var_diff)) != 0)

    # High number of sign changes relative to length suggests periodic pattern
    periodicity_ratio = sign_changes / len(var_diff)
    return periodicity_ratio > 0.7


def _detect_mri_artifacts(
    image: np.ndarray, quality_config: dict
) -> dict[str, Any]:
    """Detect MRI-specific artifacts: coil noise, zipper, truncation."""
    artifacts = {}

    if len(image.shape) == 3:
        img = np.mean(image, axis=2)
    else:
        img = image

    # Coil noise: local SNR drops at image periphery
    h, w = img.shape
    border_width = max(h, w) // 10
    if border_width > 0:
        center = img[border_width:-border_width, border_width:-border_width]
        periphery = np.concatenate([
            img[:border_width, :].flatten(),
            img[-border_width:, :].flatten(),
            img[:, :border_width].flatten(),
            img[:, -border_width:].flatten(),
        ])

        if np.std(center) > 0 and np.std(periphery) > 0:
            center_snr = np.mean(center) / (np.std(center) + 1e-10)
            periph_snr = np.mean(periphery) / (np.std(periphery) + 1e-10)
            artifacts["coil_noise_detected"] = bool(periph_snr < center_snr * 0.3)
        else:
            artifacts["coil_noise_detected"] = False
    else:
        artifacts["coil_noise_detected"] = False

    # Zipper artifact: periodic horizontal banding in FFT
    artifacts["zipper_artifact_detected"] = _detect_zipper_artifact(img)

    # Truncation: bright bands at edges
    metal_std_threshold = quality_config.get("metal_artifact_std_threshold", 5.0)
    mean_val = np.mean(img)
    edge_pixels = np.concatenate([img[0, :], img[-1, :], img[:, 0], img[:, -1]])
    artifacts["truncation_artifact_detected"] = bool(
        np.mean(edge_pixels) > mean_val * 1.5 and np.std(edge_pixels) < metal_std_threshold
    )

    return artifacts


def _detect_zipper_artifact(image: np.ndarray) -> bool:
    """Detect zipper artifacts via FFT frequency analysis for periodic banding."""
    try:
        fft = np.fft.fft2(image)
        fft_shift = np.fft.fftshift(fft)
        magnitude = np.abs(fft_shift)

        # Check for anomalous spikes along horizontal and vertical center lines
        h, w = magnitude.shape
        center_row = magnitude[h // 2, :]
        center_col = magnitude[:, w // 2]

        # Normalize
        row_norm = center_row / (np.max(center_row) + 1e-10)
        col_norm = center_col / (np.max(center_col) + 1e-10)

        # Count spikes above threshold (exclude DC component)
        row_spikes = np.sum(row_norm[w // 4 : 3 * w // 4] > 0.5)
        col_spikes = np.sum(col_norm[h // 4 : 3 * h // 4] > 0.5)

        return bool(row_spikes > 3 or col_spikes > 3)

    except Exception:
        return False
