"""
Medical Image Preprocessor Module.

This module provides a comprehensive pipeline for the automated preprocessing of various 
medical imaging modalities (CT, MRI, X-Ray, Ultrasound, etc.). It applies optimal filters, 
assesses image quality, and formats images for downstream multimodal AI models.

Usage Example:
-------------
from image_preprocessor.pipeline import process_image, process_batch

# Process a single medical image
result = process_image(
    input_path="input_images/scan.dcm",
    output_dir="output",
    modality_override="CT"  # Optional, will auto-detect if not provided
)

print(f"Processed images: {result.get('output_images', [])}")

# Process a batch of images in a directory
summary = process_batch(
    input_dir="input_images",
    output_dir="output",
    max_workers=4
)

print(f"Successfully processed {summary.get('successful', 0)} images.")
"""

from .pipeline import process_image, process_batch
from .run import main as cli_main

__all__ = ["process_image", "process_batch", "cli_main"]
