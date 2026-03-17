"""DICOM I/O, pixel array extraction, metadata parsing, and non-DICOM fallback loader."""

from pathlib import Path
from typing import Any

import numpy as np
import pydicom
from PIL import Image

from utils.logger import logger


# DICOM tags to extract for metadata
METADATA_TAGS = {
    "Modality": (0x0008, 0x0060),
    "BodyPartExamined": (0x0018, 0x0015),
    "PatientAge": (0x0010, 0x1010),
    "PatientSex": (0x0010, 0x0040),
    "StudyDescription": (0x0008, 0x1030),
    "SeriesDescription": (0x0008, 0x103E),
    "KVP": (0x0018, 0x0060),
    "Exposure": (0x0018, 0x1152),
    "MagneticFieldStrength": (0x0018, 0x0087),
    "ImageOrientationPatient": (0x0020, 0x0037),
    "SliceThickness": (0x0018, 0x0050),
    "PhotometricInterpretation": (0x0028, 0x0004),
    "RescaleSlope": (0x0028, 0x1053),
    "RescaleIntercept": (0x0028, 0x1052),
    "NumberOfFrames": (0x0028, 0x0008),
    "Rows": (0x0028, 0x0010),
    "Columns": (0x0028, 0x0011),
    "BitsAllocated": (0x0028, 0x0100),
    "PixelSpacing": (0x0028, 0x0030),
    "WindowCenter": (0x0028, 0x1050),
    "WindowWidth": (0x0028, 0x1051),
}

NON_DICOM_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif"}


def load_image(file_path: str | Path) -> tuple[np.ndarray, dict[str, Any]]:
    """Load a medical image from DICOM or standard image format.

    Args:
        file_path: Path to the image file.

    Returns:
        Tuple of (pixel_array, metadata_dict).

    Raises:
        ValueError: If the file has no pixel data or is unsupported.
        FileNotFoundError: If the file does not exist.
    """
    file_path = Path(file_path)

    if not file_path.exists():
        raise FileNotFoundError(f"Image file not found: {file_path}")

    if file_path.suffix.lower() in NON_DICOM_EXTENSIONS:
        return _load_non_dicom(file_path)

    return _load_dicom(file_path)


def _load_dicom(file_path: Path) -> tuple[np.ndarray, dict[str, Any]]:
    """Load a DICOM file and extract pixel data and metadata.

    Uses force=True to handle malformed headers from older scanners.
    """
    logger.info(f"Loading DICOM file: {file_path}")

    ds = pydicom.dcmread(str(file_path), force=True)

    # Check for pixel data
    if not hasattr(ds, "PixelData"):
        raise ValueError(
            f"DICOM file has no PixelData — may be a Structured Report (SR) "
            f"or Presentation State (PR): {file_path}"
        )

    # Extract pixel array
    pixel_array = ds.pixel_array.astype(np.float64)

    # Extract metadata
    metadata = _extract_metadata(ds)

    # Handle PhotometricInterpretation MONOCHROME1 inversion
    photometric = metadata.get("PhotometricInterpretation", "")
    if photometric == "MONOCHROME1":
        logger.warning(
            "MONOCHROME1 detected — inverting pixel array to standard MONOCHROME2 convention."
        )
        pixel_array = pixel_array.max() - pixel_array
        metadata["PhotometricInterpretation"] = "MONOCHROME2"
        metadata["monochrome1_inverted"] = True

    # Apply Rescale Slope and Intercept for CT (HU conversion)
    modality = metadata.get("Modality", "")
    rescale_slope = metadata.get("RescaleSlope", 1.0)
    rescale_intercept = metadata.get("RescaleIntercept", 0.0)

    if modality == "CT" or rescale_slope != 1.0 or rescale_intercept != 0.0:
        pixel_array = pixel_array * float(rescale_slope) + float(rescale_intercept)
        logger.info(
            f"Applied HU rescale: slope={rescale_slope}, intercept={rescale_intercept}"
        )
        metadata["hu_corrected"] = True

    # Handle multi-frame DICOM (3D volumes)
    if len(pixel_array.shape) == 3 and pixel_array.shape[0] > 1:
        pixel_array, slice_index = _extract_representative_slice(
            pixel_array, modality, metadata
        )
        metadata["original_num_frames"] = pixel_array.shape[0] if len(pixel_array.shape) == 3 else 1
        metadata["selected_slice_index"] = slice_index
        logger.info(
            f"Multi-frame DICOM: extracted slice {slice_index} from "
            f"{metadata.get('original_num_frames', 'unknown')} frames"
        )

    # Convert to float32
    pixel_array = pixel_array.astype(np.float32)

    metadata["source_format"] = "DICOM"
    metadata["original_dtype"] = str(ds.pixel_array.dtype)
    metadata["original_shape"] = list(ds.pixel_array.shape)
    metadata["file_path"] = str(file_path)

    logger.info(
        f"DICOM loaded: shape={pixel_array.shape}, dtype={pixel_array.dtype}, "
        f"modality={metadata.get('Modality', 'UNKNOWN')}"
    )

    return pixel_array, metadata


def _extract_representative_slice(
    volume: np.ndarray, modality: str, metadata: dict
) -> tuple[np.ndarray, int]:
    """Extract a representative 2D slice from a 3D volume.

    For brain MRI: use the middle slice.
    For chest CT: use the slice with maximum variance (most diagnostic content).
    For other modalities: use the middle slice.
    """
    num_frames = volume.shape[0]
    body_part = metadata.get("BodyPartExamined", "").upper()

    if modality == "MR" or body_part in ("HEAD", "BRAIN"):
        # Middle slice for brain MRI
        slice_index = num_frames // 2
    elif modality == "CT" and body_part in ("CHEST", "THORAX", "LUNG"):
        # Slice with maximum variance for chest CT
        variances = [np.var(volume[i]) for i in range(num_frames)]
        slice_index = int(np.argmax(variances))
    else:
        # Default to middle slice
        slice_index = num_frames // 2

    return volume[slice_index], slice_index


def _extract_metadata(ds: pydicom.Dataset) -> dict[str, Any]:
    """Extract clinically relevant DICOM tags into a structured dictionary."""
    metadata = {}

    for tag_name, tag_coords in METADATA_TAGS.items():
        try:
            element = ds[tag_coords]
            value = element.value
            # Convert pydicom types to standard Python types
            if isinstance(value, pydicom.multival.MultiValue):
                value = [float(v) if isinstance(v, (int, float)) else str(v) for v in value]
            elif isinstance(value, (int, float)):
                value = float(value)
            elif isinstance(value, bytes):
                value = value.decode("utf-8", errors="replace").strip()
            else:
                value = str(value).strip()
            metadata[tag_name] = value
        except (KeyError, IndexError):
            pass  # Tag not present in this DICOM

    return metadata


def _load_non_dicom(file_path: Path) -> tuple[np.ndarray, dict[str, Any]]:
    """Load a non-DICOM image (PNG, JPEG, TIFF) using Pillow.

    Converts to float32 normalized to 0.0-1.0.
    Checks if RGB channels are identical (grayscale saved as RGB).
    """
    logger.info(f"Loading non-DICOM image: {file_path}")

    img = Image.open(file_path)
    pixel_array = np.array(img, dtype=np.float32) / 255.0

    metadata = {
        "Modality": "UNKNOWN",
        "source_format": file_path.suffix.lower().lstrip("."),
        "original_shape": list(pixel_array.shape),
        "original_dtype": str(np.array(img).dtype),
        "file_path": str(file_path),
    }

    # Check if RGB channels are identical (grayscale stored as RGB)
    if len(pixel_array.shape) == 3 and pixel_array.shape[2] == 3:
        if np.allclose(pixel_array[:, :, 0], pixel_array[:, :, 1]) and np.allclose(
            pixel_array[:, :, 1], pixel_array[:, :, 2]
        ):
            logger.info("RGB channels are identical — converting to grayscale")
            pixel_array = pixel_array[:, :, 0]
            metadata["converted_from_rgb"] = True

    logger.info(
        f"Non-DICOM loaded: shape={pixel_array.shape}, "
        f"range=[{pixel_array.min():.3f}, {pixel_array.max():.3f}]"
    )

    return pixel_array, metadata
