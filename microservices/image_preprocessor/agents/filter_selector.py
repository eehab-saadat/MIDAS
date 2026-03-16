"""Sub-agentic router that selects optimal filter configuration per image."""

from typing import Any

from utils.logger import logger


def select_filter_config(
    image_metrics: dict[str, Any],
    metadata: dict[str, Any],
    modality: str,
    default_config: dict[str, Any],
) -> dict[str, Any]:
    """Determine the optimal filter configuration for a given input image.

    Uses a rule-based approach with documented rules ordered by priority:
    1. Patient safety — never suppress findings
    2. Quality improvement — optimize for SNR and CNR gain
    3. Efficiency — prefer fewer filter steps when quality is already good

    Args:
        image_metrics: Pre-processing quality metrics from quality_assessor.
        metadata: Image metadata dictionary.
        modality: Detected modality string.
        default_config: Default modality configuration from YAML.

    Returns:
        Modified configuration dictionary for this specific image.
        Includes additional flags like 'skip_denoising', 'needs_review', etc.
    """
    config = default_config.copy()
    metrics = image_metrics.get("metrics", {})
    warnings = image_metrics.get("warnings", [])

    snr = metrics.get("snr_db", 0)
    sharpness = metrics.get("sharpness", 0)
    motion_detected = metrics.get("motion_detected", False)
    body_part = metadata.get("BodyPartExamined", "").upper()
    patient_age = metadata.get("PatientAge", "")

    applied_rules = []

    # Rule 1: High quality image — skip denoising
    if snr > 30.0 and sharpness > 100:
        config["skip_denoising"] = True
        applied_rules.append(
            "High quality (SNR>30, sharpness>100): skipping denoising"
        )
        logger.info(
            f"Filter selector: SNR={snr:.1f}dB, sharpness={sharpness:.1f} — "
            "quality already high, skipping denoising"
        )

    # Rule 2: Poor quality image — maximum denoising
    if snr < 15.0:
        config["denoise_strength"] = 1.0
        config["needs_radiologist_review"] = True
        metadata["needs_radiologist_review"] = True
        applied_rules.append(
            "Poor quality (SNR<15): maximum denoising, flagged for review"
        )
        logger.warning(
            f"Filter selector: SNR={snr:.1f}dB — poor quality, "
            "applying maximum denoising and flagging for radiologist review"
        )

    # Rule 3: Motion artifact + MRI — skip NLM, apply only bias correction
    if motion_detected and modality == "MRI":
        config["skip_nlm"] = True
        metadata["motion_detected"] = True
        metadata["motion_degraded"] = True
        applied_rules.append(
            "Motion + MRI: skipping NLM (amplifies ghosts), bias correction only"
        )
        logger.warning(
            "Filter selector: motion detected in MRI — "
            "skipping NLM denoising (it amplifies motion ghosts)"
        )

    # Rule 4: CT HEAD — always brain + subdural windows, never lung
    if modality == "CT" and body_part in ("HEAD", "BRAIN"):
        config["forced_windows"] = ["brain", "subdural"]
        applied_rules.append("CT HEAD: forcing brain + subdural windows")

    # Rule 5: CT CHEST — three windows: lung, mediastinum, bone
    if modality == "CT" and body_part in ("CHEST", "THORAX", "LUNG"):
        config["forced_windows"] = ["lung", "mediastinum", "bone"]
        applied_rules.append("CT CHEST: generating lung + mediastinum + bone windows")

    # Rule 6: Pediatric X-ray — reduce CLAHE clip limit
    if modality == "XRAY" and _is_pediatric(patient_age):
        config["clahe_clip_limit"] = 1.5
        metadata["pediatric_case"] = True
        applied_rules.append(
            "Pediatric X-ray: reduced CLAHE to 1.5 to avoid thymus over-enhancement"
        )
        logger.info("Filter selector: pediatric X-ray — reducing CLAHE clip limit")

    # Rule 7: Histopathology out-of-focus — reject tile
    if modality == "HISTOPATH":
        focus_score = sharpness
        tile_config = config.get("tile_rejection", {})
        min_focus = tile_config.get("min_focus_score", 50)
        if focus_score < min_focus:
            config["reject_tile"] = True
            applied_rules.append(
                f"Histopath: focus score {focus_score:.1f} < {min_focus} — rejecting tile"
            )
            logger.warning(
                f"Filter selector: histopath tile out of focus "
                f"(score={focus_score:.1f}), rejecting"
            )

    # Rule 8: Ultrasound with Doppler — separate processing
    if modality == "ULTRASOUND":
        # Doppler detection happens in the filter itself
        config["check_doppler"] = True
        applied_rules.append("Ultrasound: Doppler detection enabled")

    # Store applied rules in metadata
    metadata["filter_selector_rules"] = applied_rules
    config["_applied_rules"] = applied_rules

    logger.info(
        f"Filter selector: {len(applied_rules)} rules applied for "
        f"{modality} ({body_part or 'unknown body part'})"
    )

    return config


def _is_pediatric(age_str: str) -> bool:
    """Check if patient is pediatric (< 18 years) from DICOM age tag."""
    if not age_str:
        return False

    age_str = str(age_str).strip()

    try:
        if age_str.endswith("Y"):
            return int(age_str[:-1]) < 18
        elif age_str.endswith("M"):
            return int(age_str[:-1]) < 18 * 12
        elif age_str.endswith(("W", "D")):
            return True
        else:
            return int(age_str) < 18
    except (ValueError, TypeError):
        return False


def get_feature_vector(
    metrics: dict[str, Any],
    modality: str,
    body_part: str,
) -> dict[str, Any]:
    """Prepare a feature vector for future ML-based filter selection.

    Documents the interface for replacing rule-based selection with a
    trained model. The model would accept this feature vector and output
    a continuous parameter vector for filter configuration.

    The training signal would be improvement in downstream LLM finding
    accuracy on a validation set with ground truth (RL reward = quality delta).
    """
    # Quality metrics
    features = {
        "snr_db": metrics.get("snr_db", 0),
        "sharpness": metrics.get("sharpness", 0),
        "dynamic_range": metrics.get("dynamic_range", 0),
        "pixel_mean": metrics.get("pixel_mean", 0),
        "pixel_std": metrics.get("pixel_std", 0),
        "motion_detected": int(metrics.get("motion_detected", False)),
        "metal_artifact": int(metrics.get("metal_artifact_detected", False)),
    }

    # Modality one-hot encoding
    modalities = [
        "CT", "MRI", "XRAY", "ULTRASOUND", "HISTOPATH",
        "FUNDUS", "DERMOSCOPY", "MAMMOGRAPHY", "PET", "NUCLEAR_MED",
    ]
    for m in modalities:
        features[f"modality_{m}"] = int(modality == m)

    # Body part encoding
    body_parts = [
        "HEAD", "CHEST", "ABDOMEN", "PELVIS", "SPINE",
        "EXTREMITY", "BREAST", "EYE", "SKIN",
    ]
    for bp in body_parts:
        features[f"body_{bp}"] = int(body_part.upper() == bp)

    return features
