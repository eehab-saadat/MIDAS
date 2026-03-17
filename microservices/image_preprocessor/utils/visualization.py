"""Side-by-side before/after display utilities for debugging and QC."""

from pathlib import Path

import cv2
import numpy as np


def create_side_by_side(
    original: np.ndarray,
    processed: np.ndarray,
    output_path: str | Path,
    title_left: str = "Original",
    title_right: str = "Processed",
) -> Path:
    """Generate a side-by-side PNG comparing original and processed images for human QC.

    This is a debug artifact — not sent to the LLM.

    Args:
        original: Original image array.
        processed: Processed image array.
        output_path: Path to save the comparison PNG.
        title_left: Label for the original image.
        title_right: Label for the processed image.

    Returns:
        Path to the saved comparison image.
    """
    output_path = Path(output_path)

    def normalize_for_display(img: np.ndarray) -> np.ndarray:
        """Normalize image to uint8 for display."""
        if img.dtype == np.float32 or img.dtype == np.float64:
            if img.max() <= 1.0:
                img = (img * 255).clip(0, 255).astype(np.uint8)
            else:
                img = ((img - img.min()) / (img.max() - img.min() + 1e-8) * 255).astype(np.uint8)
        elif img.dtype != np.uint8:
            img = ((img - img.min()) / (img.max() - img.min() + 1e-8) * 255).astype(np.uint8)
        return img

    orig_display = normalize_for_display(original.copy())
    proc_display = normalize_for_display(processed.copy())

    # Ensure both images are the same size for side-by-side
    target_h = max(orig_display.shape[0], proc_display.shape[0])
    target_w = max(orig_display.shape[1], proc_display.shape[1])

    def pad_to_size(img, h, w):
        if len(img.shape) == 2:
            padded = np.zeros((h, w), dtype=np.uint8)
        else:
            padded = np.zeros((h, w, img.shape[2]), dtype=np.uint8)
        padded[: img.shape[0], : img.shape[1]] = img
        return padded

    orig_display = pad_to_size(orig_display, target_h, target_w)
    proc_display = pad_to_size(proc_display, target_h, target_w)

    # Convert grayscale to BGR for labeling
    if len(orig_display.shape) == 2:
        orig_display = cv2.cvtColor(orig_display, cv2.COLOR_GRAY2BGR)
    if len(proc_display.shape) == 2:
        proc_display = cv2.cvtColor(proc_display, cv2.COLOR_GRAY2BGR)

    # Add labels
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8
    color = (0, 255, 0)
    thickness = 2
    cv2.putText(orig_display, title_left, (10, 30), font, font_scale, color, thickness)
    cv2.putText(proc_display, title_right, (10, 30), font, font_scale, color, thickness)

    # Add separator line
    separator = np.ones((target_h, 3, 3), dtype=np.uint8) * 128

    # Concatenate side by side
    comparison = np.concatenate([orig_display, separator, proc_display], axis=1)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), comparison)

    return output_path
