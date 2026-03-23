"""Pipeline orchestrator — the single entry point that chains all stages in order."""

import json
import time
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path
from typing import Any

import numpy as np
import yaml

from agents.filter_selector import select_filter_config
from core.dicom_handler import load_image
from core.llm_formatter import format_for_llm
from core.modality_detector import detect_modality
from core.quality_assessor import assess_quality, compute_quality_delta
from core.standardizer import standardize
from filters.ct_filters import CTFilter
from filters.dermoscopy_filters import DermoscopyFilter
from filters.fundus_filters import FundusFilter
from filters.histopath_filters import HistopathFilter
from filters.mri_filters import MRIFilter
from filters.ultrasound_filters import UltrasoundFilter
from filters.xray_filters import XRayFilter
from utils.logger import logger, StepTimer


# Modality to filter class mapping
FILTER_MAP = {
    "CT": CTFilter,
    "MRI": MRIFilter,
    "XRAY": XRayFilter,
    "ULTRASOUND": UltrasoundFilter,
    "HISTOPATH": HistopathFilter,
    "FUNDUS": FundusFilter,
    "DERMOSCOPY": DermoscopyFilter,
    "MAMMOGRAPHY": XRayFilter,  # Mammography uses X-ray pipeline variant
    "PET": None,  # PET uses standardization only (SUV preservation)
    "NUCLEAR_MED": None,  # Nuclear med uses standardization only
}

CONFIG_PATH = Path(__file__).parent / "config" / "modality_configs.yaml"


def load_config(config_path: str | Path | None = None) -> dict[str, Any]:
    """Load pipeline configuration from YAML."""
    path = Path(config_path) if config_path else CONFIG_PATH
    with open(path, "r") as f:
        return yaml.safe_load(f)


def process_image(
    input_path: str | Path,
    output_dir: str | Path = "output",
    config_path: str | Path | None = None,
    modality_override: str | None = None,
) -> dict[str, Any]:
    """Process a single medical image through the full pipeline.

    Execution order (from Section 11.1):
    1. Load configuration
    2. Load image and extract metadata (dicom_handler)
    3. Detect modality (modality_detector)
    4. Compute baseline quality metrics (quality_assessor)
    5. Select optimal filter configuration (filter_selector)
    6. Standardize: resize, orient, normalize bit depth (standardizer)
    7. Apply modality-specific filters
    8. Compute post-processing quality metrics
    9. If quality regressed, revert to pre-filter image
    10. Format output for LLM (llm_formatter)
    11. Write output bundle to disk

    Args:
        input_path: Path to input image (DICOM, PNG, JPEG, TIFF).
        output_dir: Directory for output files.
        config_path: Optional path to config YAML (uses default if None).

    Returns:
        Output bundle dictionary.
    """
    start_time = time.perf_counter()
    input_path = Path(input_path)
    output_dir = Path(output_dir)

    logger.info(f"=== Pipeline start: {input_path.name} ===")

    # Step 1: Load configuration
    try:
        config = load_config(config_path)
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        raise

    # Step 2: Load image and extract metadata
    try:
        with StepTimer("image_loading"):
            image, metadata = load_image(input_path)
            original_image = image.copy()
    except Exception as e:
        logger.error(f"DICOM/Image load failed: {e}")
        raise  # Cannot proceed without image

    # Step 3: Detect modality
    if modality_override:
        modality = modality_override.upper()
        subtype = None
        confidence = 1.0
        metadata["detected_modality"] = modality
        metadata["mri_subtype"] = subtype
        metadata["modality_confidence"] = confidence
        metadata["modality_source"] = "user_override"
        logger.info(f"Using user-specified modality: {modality}")
    else:
        try:
            with StepTimer("modality_detection"):
                modality, subtype, confidence = detect_modality(image, metadata)
                metadata["detected_modality"] = modality
                metadata["mri_subtype"] = subtype
                metadata["modality_confidence"] = confidence
        except Exception as e:
            logger.error(f"Modality detection failed: {e}. Assigning UNKNOWN.")
            modality = "MODALITY_UNCERTAIN"
            subtype = None
            confidence = 0.0
            metadata["detected_modality"] = modality

    # Get modality-specific config
    modality_key = modality.lower()
    modality_config = config.get(modality_key, config.get("ct", {}))

    # Step 4: Compute baseline quality metrics
    try:
        with StepTimer("pre_quality_assessment"):
            pre_quality = assess_quality(image, metadata, config, modality)
    except Exception as e:
        logger.warning(f"Pre-quality assessment failed: {e}")
        pre_quality = {"metrics": {}, "warnings": [], "overall_pass": False}

    # Step 5: Select optimal filter configuration
    try:
        with StepTimer("filter_selection"):
            filter_config = select_filter_config(
                pre_quality, metadata, modality, modality_config
            )
    except Exception as e:
        logger.warning(f"Filter selection failed: {e}. Using defaults.")
        filter_config = modality_config

    # Step 6: Standardize (resize, orient, normalize bit depth)
    try:
        with StepTimer("standardization"):
            image, metadata = standardize(image, metadata, filter_config, modality)
            pre_filter_image = image.copy()  # Snapshot for potential revert
    except Exception as e:
        logger.error(f"Standardization failed: {e}")
        pre_filter_image = image.copy()

    # Step 7: Apply modality-specific filters
    processed_image = image
    if modality != "MODALITY_UNCERTAIN":
        try:
            with StepTimer("modality_filtering"):
                filter_class = FILTER_MAP.get(modality)
                if filter_class is not None:
                    filter_instance = filter_class(filter_config)
                    processed_image, metadata = filter_instance.apply(
                        image, metadata, filter_config
                    )
                else:
                    logger.info(
                        f"No specific filter for {modality} — using standardized image"
                    )
                    metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])
                    metadata["preprocessing_steps"].append("Standardization only")
        except Exception as e:
            logger.error(f"Filter application failed for {modality}: {e}")
            processed_image = image  # Fall back to pre-filter image
            metadata["filter_error"] = str(e)
    else:
        logger.warning(
            "MODALITY_UNCERTAIN — applying only universal safe operations"
        )
        metadata["preprocessing_steps"] = metadata.get("preprocessing_steps", [])
        metadata["preprocessing_steps"].append("Universal safe operations only")

    # Step 8: Post-processing quality assessment
    try:
        with StepTimer("post_quality_assessment"):
            # Handle dict of windowed images (CT)
            quality_image = processed_image
            if isinstance(processed_image, dict):
                quality_image = next(iter(processed_image.values()))
            post_quality = assess_quality(quality_image, metadata, config, modality)
    except Exception as e:
        logger.warning(f"Post-quality assessment failed: {e}")
        post_quality = {"metrics": {}, "warnings": [], "overall_pass": False}

    # Step 9: Quality delta check — revert if quality regressed
    try:
        quality_delta = compute_quality_delta(pre_quality, post_quality)
        if not quality_delta.get("quality_improved", True):
            logger.warning(
                f"Quality regression detected: {quality_delta.get('regressions', [])}. "
                "Reverting to pre-filter image."
            )
            processed_image = pre_filter_image
            metadata["quality_reverted"] = True
            # Re-assess quality on reverted image
            post_quality = pre_quality
            quality_delta = {"quality_improved": True, "regressions": [], "reverted": True}
    except Exception as e:
        logger.warning(f"Quality delta computation failed: {e}")
        quality_delta = {"quality_improved": True, "regressions": []}

    # Step 10: Format output for LLM
    try:
        with StepTimer("llm_formatting"):
            # Create modality-specific output directory
            image_output_dir = output_dir / input_path.stem
            output_bundle = format_for_llm(
                original_image=original_image,
                processed_image=processed_image,
                metadata=metadata,
                quality_report=post_quality,
                quality_delta=quality_delta,
                modality=modality,
                output_dir=image_output_dir,
                original_file_path=input_path,
            )
    except Exception as e:
        logger.error(f"LLM formatting failed: {e}. Writing fallback output.")
        output_bundle = _write_fallback_output(
            processed_image, metadata, output_dir / input_path.stem
        )

    # Step 11: Generate models findings with local Medgemma
    try:
        with StepTimer("medgemma_insights"):
            import base64
            import urllib.request
            import json as json_lib

            insights = None
            processed_image_path = None
            processed_images = output_bundle.get("output_images", [])

            if processed_images:
                processed_image_path = processed_images[0]
                with open(processed_image_path, "rb") as f:
                    img_base64 = base64.b64encode(f.read()).decode("utf-8")

                prompt = (
                    "Please analyze this medical image carefully and provide detailed and accurate clinical findings. "
                    "Ensure the findings are precise as they will be directly reviewed by a doctor. "
                    "Output a JSON object containing the image type, body part, and an array of plain text strings representing the findings. "
                    "You MUST wrap your response in ```json and ``` markdown tags. "
                    'Example:\n```json\n{\n  "image_type": "X-ray",\n  "body_part": "Chest",\n  "findings": [\n    "First detailed finding here.",\n    "Second detailed finding here."\n  ]\n}\n```'
                )
                if output_bundle.get("context_string"):
                    prompt += "\n\nImage Context:\n" + output_bundle["context_string"]

                payload = {
                    "model": "thiagomoraes/medgemma-4b-it:Q8_0",
                    "prompt": prompt,
                    "images": [img_base64],
                    "stream": False
                }

                req = urllib.request.Request(
                    "http://localhost:11434/api/generate",
                    data=json_lib.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )

                with urllib.request.urlopen(req, timeout=120) as response:
                    ollama_resp = json_lib.loads(response.read().decode("utf-8"))
                    raw_insights = ollama_resp.get("response", "")
                    
                    # Clean up markdown formatting
                    clean_insights = raw_insights.strip()
                    if clean_insights.startswith("```json"):
                        clean_insights = clean_insights[7:]
                    elif clean_insights.startswith("```"):
                        clean_insights = clean_insights[3:]
                    if clean_insights.endswith("```"):
                        clean_insights = clean_insights[:-3]
                        
                    clean_insights = clean_insights.strip()
                    
                    try:
                        insights = json_lib.loads(clean_insights)
                    except Exception:
                        # Fallback to returning plain text if it's not valid JSON
                        insights = {"raw_output": raw_insights}

            output_bundle["processed_image_path"] = processed_image_path
            output_bundle["model_findings"] = insights
    except Exception as e:
        logger.warning(f"Failed to get insights from local medgemma model: {e}")
        output_bundle["model_findings"] = f"Failed to get insights: {e}"

    # Step 12: Log completion
    total_time = time.perf_counter() - start_time
    output_bundle["processing_time_seconds"] = total_time
    logger.info(
        f"=== Pipeline complete: {input_path.name} in {total_time:.2f}s | "
        f"modality={modality} | quality_improved={quality_delta.get('quality_improved', 'unknown')} ==="
    )

    return output_bundle


def process_batch(
    input_dir: str | Path,
    output_dir: str | Path = "output",
    config_path: str | Path | None = None,
    max_workers: int | None = None,
    modality_override: str | None = None,
) -> dict[str, Any]:
    """Process a directory of medical images in parallel.

    Uses ProcessPoolExecutor for parallel processing.

    Args:
        input_dir: Directory containing input images.
        output_dir: Directory for output files.
        config_path: Optional path to config YAML.
        max_workers: Number of parallel workers (defaults to CPU count).

    Returns:
        Batch summary report dictionary.
    """
    import os

    input_dir = Path(input_dir)
    output_dir = Path(output_dir)

    if max_workers is None:
        max_workers = os.cpu_count() or 4

    # Find all supported image files
    supported_extensions = {".dcm", ".dicom", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}
    image_files = [
        f for f in input_dir.rglob("*")
        if f.suffix.lower() in supported_extensions and f.is_file()
    ]

    if not image_files:
        logger.warning(f"No supported images found in {input_dir}")
        return {"total_images": 0, "results": []}

    logger.info(
        f"Batch processing {len(image_files)} images with {max_workers} workers"
    )

    batch_start = time.perf_counter()
    results = []

    # Process images in parallel
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(
                process_image, str(img_path), str(output_dir), config_path, modality_override
            ): img_path
            for img_path in image_files
        }

        for future in futures:
            img_path = futures[future]
            try:
                result = future.result()
                results.append({
                    "file": str(img_path),
                    "status": "success",
                    "modality": result.get("modality", "UNKNOWN"),
                    "processing_time": result.get("processing_time_seconds", 0),
                    "quality_improved": result.get("quality_delta", {}).get(
                        "quality_improved", True
                    ),
                    "output_images": result.get("output_images", []),
                    "warnings": result.get("quality_report", {}).get("warnings", []),
                })
            except Exception as e:
                logger.error(f"Batch processing failed for {img_path}: {e}")
                results.append({
                    "file": str(img_path),
                    "status": "error",
                    "error": str(e),
                })

    batch_time = time.perf_counter() - batch_start

    # Generate batch summary report
    summary = {
        "total_images": len(image_files),
        "successful": sum(1 for r in results if r["status"] == "success"),
        "failed": sum(1 for r in results if r["status"] == "error"),
        "total_processing_time_seconds": batch_time,
        "results": results,
    }

    # Save batch report
    report_path = output_dir / "batch_report.json"
    output_dir.mkdir(parents=True, exist_ok=True)

    def default_handler(obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, Path):
            return str(obj)
        return str(obj)

    report_path.write_text(
        json.dumps(summary, indent=2, default=default_handler),
        encoding="utf-8",
    )

    logger.info(
        f"Batch complete: {summary['successful']}/{summary['total_images']} "
        f"successful in {batch_time:.2f}s"
    )

    return summary


def _write_fallback_output(
    image: np.ndarray | dict,
    metadata: dict[str, Any],
    output_dir: Path,
) -> dict[str, Any]:
    """Write fallback output when LLM formatter fails."""
    import cv2

    output_dir.mkdir(parents=True, exist_ok=True)

    if isinstance(image, dict):
        image = next(iter(image.values()))

    # Save raw processed image
    if image.dtype != np.uint8:
        if image.max() <= 1.0:
            img_save = (image * 255).clip(0, 255).astype(np.uint8)
        else:
            img_save = ((image - image.min()) / (image.max() - image.min() + 1e-8) * 255).astype(np.uint8)
    else:
        img_save = image

    img_path = output_dir / "fallback_processed.png"
    cv2.imwrite(str(img_path), img_save)

    # Save raw metadata
    meta_path = output_dir / "fallback_metadata.json"

    def default_handler(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        return str(obj)

    meta_path.write_text(
        json.dumps(metadata, indent=2, default=default_handler),
        encoding="utf-8",
    )

    return {
        "output_images": [str(img_path)],
        "metadata": metadata,
        "fallback": True,
    }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python pipeline.py <input_path> [output_dir]")
        print("       python pipeline.py --batch <input_dir> [output_dir]")
        sys.exit(1)

    if sys.argv[1] == "--batch":
        input_dir = sys.argv[2] if len(sys.argv) > 2 else "."
        output_dir = sys.argv[3] if len(sys.argv) > 3 else "output"
        result = process_batch(input_dir, output_dir)
        print(f"Batch complete: {result['successful']}/{result['total_images']} successful")
    else:
        input_path = sys.argv[1]
        output_dir = sys.argv[2] if len(sys.argv) > 2 else "output"
        result = process_image(input_path, output_dir)
        print(f"Processing complete: {result.get('modality', 'UNKNOWN')}")
