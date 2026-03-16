#!/usr/bin/env python3
"""Run the medical image preprocessing pipeline on a folder of images."""

import argparse
import sys
from pathlib import Path

from pipeline import process_image, process_batch

# ===== Default folders — edit these to match your setup =====
DEFAULT_INPUT_FOLDER = "input_images"
DEFAULT_OUTPUT_FOLDER = "output"

VALID_MODALITIES = [
    "CT", "MRI", "XRAY", "ULTRASOUND", "HISTOPATH",
    "FUNDUS", "DERMOSCOPY", "MAMMOGRAPHY", "PET", "NUCLEAR_MED",
]


def main():
    parser = argparse.ArgumentParser(
        description="Medical Image Preprocessor — batch process a folder of images"
    )
    parser.add_argument("input_folder", nargs="?", default=DEFAULT_INPUT_FOLDER,
                        help=f"Folder containing input images (default: {DEFAULT_INPUT_FOLDER})")
    parser.add_argument("output_folder", nargs="?", default=DEFAULT_OUTPUT_FOLDER,
                        help=f"Folder to write processed output (default: {DEFAULT_OUTPUT_FOLDER})")
    parser.add_argument("--modality", "-m", type=str, default=None,
                        choices=[m.lower() for m in VALID_MODALITIES],
                        help="Force a specific modality instead of auto-detection: "
                             + ", ".join(VALID_MODALITIES))
    parser.add_argument("--workers", type=int, default=None,
                        help="Number of parallel workers (default: CPU count)")
    parser.add_argument("--config", type=str, default=None,
                        help="Path to custom config YAML")
    args = parser.parse_args()

    input_dir = Path(args.input_folder)
    output_dir = Path(args.output_folder)
    modality_override = args.modality.upper() if args.modality else None

    if not input_dir.exists():
        print(f"Error: Input folder does not exist: {input_dir}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)

    # Collect supported files
    supported = {".dcm", ".dicom", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}
    files = [f for f in input_dir.rglob("*") if f.suffix.lower() in supported and f.is_file()]

    if not files:
        print(f"No supported images found in {input_dir}")
        sys.exit(0)

    print(f"Found {len(files)} image(s) in {input_dir}")
    print(f"Output: {output_dir}")
    if modality_override:
        print(f"Modality: {modality_override} (user-specified)")
    else:
        print("Modality: auto-detect")
    print("-" * 50)

    if len(files) == 1:
        result = process_image(str(files[0]), str(output_dir), args.config, modality_override)
        _print_result(files[0].name, result)
    else:
        summary = process_batch(str(input_dir), str(output_dir), args.config, args.workers, modality_override)
        print(f"\nBatch complete: {summary['successful']}/{summary['total_images']} successful")
        print(f"Total time: {summary['total_processing_time_seconds']:.2f}s")
        for r in summary["results"]:
            status = "OK" if r["status"] == "success" else "FAIL"
            name = Path(r["file"]).name
            modality = r.get("modality", "?")
            print(f"  [{status}] {name} — {modality}")

    print("-" * 50)
    print(f"Results saved to: {output_dir}")
    print("Open qc_comparison.png in each subfolder to see before/after.")


def _print_result(name, result):
    modality = result.get("modality", result.get("metadata", {}).get("detected_modality", "UNKNOWN"))
    t = result.get("processing_time_seconds", 0)
    improved = result.get("quality_delta", {}).get("quality_improved", "?")
    print(f"  {name} — modality: {modality} | time: {t:.2f}s | quality_improved: {improved}")
    for img in result.get("output_images", []):
        print(f"    -> {img}")
    qc = result.get("qc_visualization")
    if qc:
        print(f"    -> Before/After: {qc}")


if __name__ == "__main__":
    main()
