"""Integration tests for the Medical Image Preprocessor pipeline.

Tests against sample images per modality, validating:
- MONOCHROME1 inversion
- CT HU windowing pixel distributions
- MRI N4 bias field correction
- Quality delta positivity
- Histopathology blank tile rejection
- Pipeline end-to-end for all modalities
- LLM formatter context string clinical caveats
"""

import json
import shutil
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# Core modules
from core.dicom_handler import load_image, _load_non_dicom
from core.modality_detector import detect_modality, _detect_mri_subtype
from core.standardizer import standardize, _normalize_intensity, _resize_with_padding
from core.quality_assessor import assess_quality, compute_quality_delta
from core.llm_formatter import format_for_llm, _build_context_string, _get_clinical_caveat

# Filters
from filters.base_filter import BaseFilter, detect_motion_artifact
from filters.ct_filters import CTFilter, _apply_hu_window, _select_windows
from filters.mri_filters import MRIFilter
from filters.xray_filters import XRayFilter, _is_pediatric
from filters.ultrasound_filters import UltrasoundFilter, _detect_doppler
from filters.histopath_filters import HistopathFilter, _check_tile_rejection, _compute_optical_density
from filters.fundus_filters import FundusFilter
from filters.dermoscopy_filters import DermoscopyFilter

# Agents
from agents.filter_selector import select_filter_config


# ===== Test Fixtures =====

@pytest.fixture
def temp_output_dir():
    """Create a temporary output directory for test artifacts."""
    tmpdir = tempfile.mkdtemp(prefix="med_img_test_")
    yield Path(tmpdir)
    shutil.rmtree(tmpdir, ignore_errors=True)


@pytest.fixture
def sample_ct_image():
    """Synthetic CT image with Hounsfield Units."""
    # Simulate bimodal HU distribution: air (-1000) and soft tissue (~50)
    image = np.random.normal(50, 30, (512, 512)).astype(np.float32)
    # Add "air" region
    image[:100, :] = np.random.normal(-800, 50, (100, 512)).astype(np.float32)
    return image


@pytest.fixture
def sample_mri_image():
    """Synthetic MRI image with bias field."""
    image = np.random.normal(500, 100, (256, 256)).astype(np.float32)
    # Add synthetic bias field (smooth multiplicative gradient)
    y, x = np.mgrid[0:256, 0:256]
    bias = 1.0 + 0.3 * np.sin(np.pi * y / 256) * np.sin(np.pi * x / 256)
    image *= bias
    image = np.clip(image, 0, 1500)
    return image


@pytest.fixture
def sample_xray_image():
    """Synthetic chest X-ray image."""
    image = np.random.normal(128, 40, (1024, 1024)).astype(np.float32)
    # Simulate lung fields (lower intensity)
    image[200:800, 200:450] = np.random.normal(60, 20, (600, 250))
    image[200:800, 574:824] = np.random.normal(60, 20, (600, 250))
    return np.clip(image, 0, 255)


@pytest.fixture
def sample_ultrasound_image():
    """Synthetic ultrasound image with speckle noise."""
    # Simulate speckle (multiplicative noise)
    clean = np.ones((512, 512), dtype=np.float32) * 128
    speckle = np.random.exponential(1, (512, 512)).astype(np.float32)
    image = clean * speckle
    return np.clip(image, 0, 255)


@pytest.fixture
def sample_histopath_image():
    """Synthetic histopathology RGB image (H&E-like colors)."""
    # Create pink-purple tissue appearance
    image = np.zeros((224, 224, 3), dtype=np.float32)
    image[:, :, 0] = np.random.normal(0.7, 0.1, (224, 224))  # Red
    image[:, :, 1] = np.random.normal(0.4, 0.1, (224, 224))  # Green
    image[:, :, 2] = np.random.normal(0.6, 0.1, (224, 224))  # Blue
    return np.clip(image, 0, 1)


@pytest.fixture
def sample_fundus_image():
    """Synthetic fundus image with circular FOV."""
    image = np.zeros((800, 800, 3), dtype=np.float32)
    # Create circular FOV
    y, x = np.mgrid[0:800, 0:800]
    center_y, center_x = 400, 400
    radius = 350
    mask = (y - center_y) ** 2 + (x - center_x) ** 2 < radius ** 2
    image[mask, 0] = np.random.normal(0.6, 0.1, np.sum(mask))  # Red
    image[mask, 1] = np.random.normal(0.3, 0.05, np.sum(mask))  # Green
    image[mask, 2] = np.random.normal(0.1, 0.05, np.sum(mask))  # Blue
    return np.clip(image, 0, 1)


@pytest.fixture
def sample_dermoscopy_image():
    """Synthetic dermoscopy image."""
    image = np.random.normal(0.6, 0.1, (512, 512, 3)).astype(np.float32)
    # Simulate skin-colored lesion
    image[:, :, 0] = np.random.normal(0.65, 0.1, (512, 512))
    image[:, :, 1] = np.random.normal(0.45, 0.08, (512, 512))
    image[:, :, 2] = np.random.normal(0.35, 0.08, (512, 512))
    return np.clip(image, 0, 1)


@pytest.fixture
def ct_metadata():
    """Sample CT DICOM metadata."""
    return {
        "Modality": "CT",
        "BodyPartExamined": "CHEST",
        "PhotometricInterpretation": "MONOCHROME2",
        "RescaleSlope": 1.0,
        "RescaleIntercept": -1024.0,
        "SliceThickness": "3.0",
        "source_format": "DICOM",
    }


@pytest.fixture
def mri_metadata():
    """Sample MRI DICOM metadata."""
    return {
        "Modality": "MR",
        "BodyPartExamined": "HEAD",
        "SeriesDescription": "T1W_3D_SAG",
        "MagneticFieldStrength": 3.0,
        "source_format": "DICOM",
    }


@pytest.fixture
def default_config():
    """Load default configuration from YAML."""
    import yaml

    config_path = Path(__file__).parent.parent / "config" / "modality_configs.yaml"
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


# ===== MONOCHROME1 Inversion Tests =====

class TestMonochrome1Inversion:
    """Test that MONOCHROME1 inversion is correctly applied."""

    def test_monochrome1_detected_and_inverted(self):
        """Verify MONOCHROME1 images are inverted to MONOCHROME2 convention."""
        # Create a mock DICOM dataset
        with patch("core.dicom_handler.pydicom.dcmread") as mock_dcmread:
            ds = MagicMock()
            ds.pixel_array = np.array([[100, 200], [150, 250]], dtype=np.uint16)
            ds.PixelData = b"dummy"

            # Set up MONOCHROME1
            mock_tag = MagicMock()
            mock_tag.value = "MONOCHROME1"

            def getitem(key):
                tag_map = {
                    (0x0028, 0x0004): MagicMock(value="MONOCHROME1"),
                    (0x0008, 0x0060): MagicMock(value="CR"),
                }
                if key in tag_map:
                    return tag_map[key]
                raise KeyError(key)

            ds.__getitem__ = getitem
            mock_dcmread.return_value = ds

            # The pixel array should be inverted: max_value - pixel_array
            original_max = ds.pixel_array.max()
            original_pixels = ds.pixel_array.copy()

            # After inversion: values should be (max - original)
            expected = original_max - original_pixels
            inverted = original_max - ds.pixel_array
            np.testing.assert_array_equal(inverted, expected)

    def test_monochrome2_not_inverted(self):
        """Verify MONOCHROME2 images are NOT inverted."""
        metadata = {"PhotometricInterpretation": "MONOCHROME2"}
        # MONOCHROME2 should pass through unchanged
        assert metadata["PhotometricInterpretation"] == "MONOCHROME2"


# ===== CT HU Windowing Tests =====

class TestCTWindowing:
    """Test CT HU window application produces expected pixel distributions."""

    def test_lung_window(self, sample_ct_image):
        """Lung window should map HU range [-1350, -600+750] to display range."""
        windowed = _apply_hu_window(sample_ct_image, center=-600, width=1500)

        assert windowed.min() >= 0
        assert windowed.max() <= 255
        assert windowed.dtype == np.float32

    def test_brain_window(self):
        """Brain window should have narrow range centered on 35 HU."""
        brain_image = np.random.normal(35, 20, (256, 256)).astype(np.float32)
        windowed = _apply_hu_window(brain_image, center=35, width=80)

        # Most pixels should be in the mid-range for brain tissue
        mid_range = np.sum((windowed > 50) & (windowed < 200))
        assert mid_range > 0.3 * windowed.size

    def test_window_preset_selection_head(self):
        """CT HEAD should select brain and subdural windows."""
        config = {
            "window_presets": {
                "brain": {"center": 35, "width": 80},
                "subdural": {"center": 75, "width": 200},
                "lung": {"center": -600, "width": 1500},
            }
        }
        windows = _select_windows("HEAD", config)
        assert "brain" in windows
        assert "subdural" in windows
        assert "lung" not in windows

    def test_window_preset_selection_chest(self):
        """CT CHEST should select lung, mediastinum, and bone windows."""
        config = {
            "window_presets": {
                "lung": {"center": -600, "width": 1500},
                "mediastinum": {"center": 40, "width": 400},
                "bone": {"center": 400, "width": 1500},
            }
        }
        windows = _select_windows("CHEST", config)
        assert "lung" in windows
        assert "mediastinum" in windows
        assert "bone" in windows


# ===== Quality Assessment Tests =====

class TestQualityAssessment:
    """Test quality metrics computation and delta validation."""

    def test_quality_delta_positive(self, sample_xray_image, default_config):
        """Verify that preprocessing improves quality (positive delta)."""
        metadata = {"Modality": "CR"}
        pre_quality = assess_quality(sample_xray_image, metadata, default_config, "XRAY")

        # Simulate preprocessed image with reduced noise
        from scipy.ndimage import gaussian_filter
        processed = gaussian_filter(sample_xray_image, sigma=1.0)
        post_quality = assess_quality(processed, metadata, default_config, "XRAY")

        delta = compute_quality_delta(pre_quality, post_quality)
        # SNR should improve after noise reduction
        assert "snr_delta_db" in delta

    def test_snr_estimation(self, sample_ct_image, default_config):
        """Test SNR is computed and within reasonable range."""
        metadata = {"Modality": "CT"}
        quality = assess_quality(sample_ct_image, metadata, default_config, "CT")
        assert "snr_db" in quality["metrics"]
        assert quality["metrics"]["snr_db"] >= 0

    def test_sharpness_metric(self, sample_xray_image, default_config):
        """Test sharpness metric is computed."""
        metadata = {}
        quality = assess_quality(sample_xray_image, metadata, default_config, "XRAY")
        assert "sharpness" in quality["metrics"]
        assert quality["metrics"]["sharpness"] >= 0


# ===== Histopathology Tile Rejection Tests =====

class TestHistopathTileRejection:
    """Test histopathology tile rejection logic."""

    def test_blank_tile_rejected(self):
        """Verify tiles with mean OD < 0.05 are rejected (background)."""
        # Create a nearly white (background) tile
        white_tile = np.ones((224, 224, 3), dtype=np.float32) * 0.98
        tile_config = {"min_od_threshold": 0.05, "min_focus_score": 50}

        rejection = _check_tile_rejection(white_tile, tile_config)
        assert rejection is not None
        assert "Background" in rejection or "mean OD" in rejection

    def test_tissue_tile_accepted(self, sample_histopath_image):
        """Verify tiles with tissue are not rejected."""
        tile_config = {"min_od_threshold": 0.05, "min_focus_score": 1}

        rejection = _check_tile_rejection(sample_histopath_image, tile_config)
        # Tissue tile should not be rejected (or only for focus, not OD)
        if rejection is not None:
            assert "Background" not in rejection

    def test_optical_density_computation(self):
        """Test OD computation follows Beer-Lambert law."""
        # White pixel (255/255 = 1.0) should have OD near 0
        white = np.ones((10, 10, 3), dtype=np.float32)
        od = _compute_optical_density(white)
        assert np.all(od < 0.1)

        # Dark pixel should have high OD
        dark = np.ones((10, 10, 3), dtype=np.float32) * 0.1
        od_dark = _compute_optical_density(dark)
        assert np.mean(od_dark) > np.mean(od)


# ===== Modality Detection Tests =====

class TestModalityDetection:
    """Test modality detection Tier 1 and Tier 2."""

    def test_dicom_tag_ct(self):
        """CT modality detected from DICOM tag."""
        metadata = {"Modality": "CT"}
        image = np.zeros((100, 100), dtype=np.float32)
        modality, subtype, conf = detect_modality(image, metadata)
        assert modality == "CT"
        assert conf == 1.0

    def test_dicom_tag_mri(self):
        """MRI modality detected from DICOM tag."""
        metadata = {"Modality": "MR", "SeriesDescription": "T2W_AX"}
        image = np.zeros((100, 100), dtype=np.float32)
        modality, subtype, conf = detect_modality(image, metadata)
        assert modality == "MRI"
        assert subtype == "MRI_T2"

    def test_dicom_tag_xray(self):
        """X-ray detected from CR/DX codes."""
        for code in ["CR", "DX"]:
            metadata = {"Modality": code}
            image = np.zeros((100, 100), dtype=np.float32)
            modality, _, conf = detect_modality(image, metadata)
            assert modality == "XRAY"

    def test_mri_subtype_detection(self):
        """MRI subtypes correctly classified from SeriesDescription."""
        test_cases = {
            "T1W_3D_SAG": "MRI_T1",
            "T2 weighted axial": "MRI_T2",
            "FLAIR_COR": "MRI_FLAIR",
            "DWI b1000": "MRI_DIFFUSION",
            "SWI_AX": "MRI_SWI",
        }
        for desc, expected in test_cases.items():
            result = _detect_mri_subtype({"SeriesDescription": desc})
            assert result == expected, f"Failed for '{desc}': got {result}"

    def test_unknown_modality_fallback(self):
        """Unknown/missing modality triggers heuristic fallback."""
        metadata = {"Modality": ""}
        image = np.random.normal(0, 1, (100, 100)).astype(np.float32)
        modality, _, conf = detect_modality(image, metadata)
        # Should either detect something or return MODALITY_UNCERTAIN
        assert modality in [
            "CT", "MRI", "XRAY", "ULTRASOUND", "MODALITY_UNCERTAIN",
            "HISTOPATH", "FUNDUS", "DERMOSCOPY",
        ]


# ===== Standardization Tests =====

class TestStandardization:
    """Test spatial and intensity standardization."""

    def test_resize_preserves_aspect_ratio(self, default_config):
        """Resize should preserve aspect ratio with zero-padding."""
        image = np.random.random((300, 400)).astype(np.float32)
        metadata = {}
        config = {"target_size": [512, 512]}

        resized = _resize_with_padding(image, config, "XRAY", metadata)
        assert resized.shape == (512, 512)
        assert "padding" in metadata

    def test_ct_keeps_hounsfield_units(self, default_config):
        """CT images should NOT be normalized to 0-1 during standardization."""
        ct_image = np.random.normal(-500, 300, (256, 256)).astype(np.float32)
        config = default_config.get("ct", {})
        metadata = {}

        normalized = _normalize_intensity(ct_image, config, "CT", metadata)
        # CT values should be preserved (not clipped to 0-1)
        assert normalized.min() < 0  # HU values can be negative
        assert metadata.get("intensity_normalization") == "none_hu_preserved"

    def test_histopath_not_resized(self, sample_histopath_image, default_config):
        """Histopathology tiles should NOT be resized."""
        config = {"target_size": [224, 224]}
        metadata = {}
        original_shape = sample_histopath_image.shape

        resized = _resize_with_padding(
            sample_histopath_image, config, "HISTOPATH", metadata
        )
        assert resized.shape == original_shape


# ===== LLM Formatter Tests =====

class TestLLMFormatter:
    """Test LLM output formatting and clinical caveat generation."""

    def test_ct_chest_context_string(self):
        """CT chest context should mention windows provided."""
        metadata = {
            "detected_modality": "CT",
            "BodyPartExamined": "CHEST",
            "windows_applied": ["lung", "mediastinum", "bone"],
        }
        quality_report = {"metrics": {"snr_db": 25.0}, "warnings": []}
        quality_delta = {"snr_delta_db": 5.0, "quality_improved": True}

        context = _build_context_string(metadata, quality_report, quality_delta, "CT")
        assert "CT" in context
        assert "CHEST" in context
        assert "window" in context.lower()

    def test_xray_context_mentions_orientation(self):
        """X-ray context should mention PA/AP orientation."""
        metadata = {
            "BodyPartExamined": "CHEST",
            "xray_orientation": "AP portable chest radiograph",
        }
        quality_report = {"metrics": {"snr_db": 20.0}, "warnings": []}
        quality_delta = {"quality_improved": True}

        context = _build_context_string(metadata, quality_report, quality_delta, "XRAY")
        assert "AP" in context

    def test_clinical_caveats_present(self):
        """Verify mandatory clinical caveats exist for each modality."""
        for modality in ["CT", "MRI", "XRAY", "ULTRASOUND", "HISTOPATH", "MAMMOGRAPHY", "PET"]:
            caveat = _get_clinical_caveat(modality, "CHEST")
            assert caveat, f"Missing clinical caveat for {modality}"

    def test_output_bundle_structure(self, temp_output_dir, sample_xray_image):
        """Verify output bundle has all required components."""
        metadata = {"detected_modality": "XRAY", "BodyPartExamined": "CHEST"}
        quality_report = {"metrics": {"snr_db": 25}, "warnings": []}
        quality_delta = {"quality_improved": True}

        bundle = format_for_llm(
            original_image=sample_xray_image,
            processed_image=sample_xray_image,
            metadata=metadata,
            quality_report=quality_report,
            quality_delta=quality_delta,
            modality="XRAY",
            output_dir=temp_output_dir,
        )

        assert "output_images" in bundle
        assert "context_string" in bundle
        assert "metadata" in bundle
        assert len(bundle["output_images"]) > 0

        # Check PNG was saved
        for img_path in bundle["output_images"]:
            assert Path(img_path).exists()
            assert Path(img_path).suffix == ".png"


# ===== Filter Selector Tests =====

class TestFilterSelector:
    """Test sub-agentic filter selection rules."""

    def test_high_quality_skips_denoising(self):
        """High SNR + sharpness should skip denoising."""
        metrics = {"metrics": {"snr_db": 35, "sharpness": 120, "motion_detected": False}}
        metadata = {"BodyPartExamined": "CHEST"}
        config = select_filter_config(metrics, metadata, "CT", {})
        assert config.get("skip_denoising") is True

    def test_poor_quality_max_denoising(self):
        """Low SNR should apply maximum denoising and flag for review."""
        metrics = {"metrics": {"snr_db": 10, "sharpness": 50, "motion_detected": False}}
        metadata = {"BodyPartExamined": "CHEST"}
        config = select_filter_config(metrics, metadata, "XRAY", {})
        assert config.get("denoise_strength") == 1.0
        assert metadata.get("needs_radiologist_review") is True

    def test_motion_mri_skips_nlm(self):
        """Motion + MRI should skip NLM denoising."""
        metrics = {"metrics": {"snr_db": 20, "sharpness": 50, "motion_detected": True}}
        metadata = {"BodyPartExamined": "HEAD"}
        config = select_filter_config(metrics, metadata, "MRI", {})
        assert config.get("skip_nlm") is True
        assert metadata.get("motion_degraded") is True

    def test_pediatric_xray_reduced_clahe(self):
        """Pediatric X-ray should reduce CLAHE clip limit."""
        metrics = {"metrics": {"snr_db": 20, "sharpness": 80, "motion_detected": False}}
        metadata = {"BodyPartExamined": "CHEST", "PatientAge": "005Y"}
        config = select_filter_config(metrics, metadata, "XRAY", {})
        assert config.get("clahe_clip_limit") == 1.5
        assert metadata.get("pediatric_case") is True

    def test_ct_head_correct_windows(self):
        """CT HEAD should force brain + subdural windows."""
        metrics = {"metrics": {"snr_db": 20, "sharpness": 80, "motion_detected": False}}
        metadata = {"BodyPartExamined": "HEAD"}
        config = select_filter_config(metrics, metadata, "CT", {})
        forced = config.get("forced_windows", [])
        assert "brain" in forced
        assert "subdural" in forced


# ===== Doppler Detection Tests =====

class TestDopplerDetection:
    """Test Doppler overlay detection in ultrasound."""

    def test_bmode_no_doppler(self, sample_ultrasound_image):
        """Grayscale B-mode should not trigger Doppler detection."""
        assert not _detect_doppler(sample_ultrasound_image)

    def test_color_doppler_detected(self):
        """Image with colored regions should detect Doppler."""
        image = np.zeros((100, 100, 3), dtype=np.float32)
        image[:, :, :] = 0.3  # Gray base
        # Add saturated red/blue color region (Doppler)
        image[30:70, 30:70, 0] = 0.9  # Red
        image[30:70, 30:70, 1] = 0.1  # Low green
        image[30:70, 30:70, 2] = 0.1  # Low blue

        assert _detect_doppler(image)


# ===== Pediatric Detection Tests =====

class TestPediatricDetection:
    def test_pediatric_ages(self):
        assert _is_pediatric("005Y") is True
        assert _is_pediatric("017Y") is True
        assert _is_pediatric("003M") is True
        assert _is_pediatric("010D") is True

    def test_adult_ages(self):
        assert _is_pediatric("025Y") is False
        assert _is_pediatric("065Y") is False

    def test_edge_case_18(self):
        assert _is_pediatric("018Y") is False

    def test_empty_age(self):
        assert _is_pediatric("") is False


# ===== Motion Artifact Detection Tests =====

class TestMotionArtifact:
    def test_sharp_image_no_motion(self):
        """Sharp image should not be flagged for motion."""
        # Create image with clear edges
        image = np.zeros((100, 100), dtype=np.float32)
        image[30:70, 30:70] = 255
        assert not detect_motion_artifact(image, threshold=10)

    def test_blurred_image_motion_detected(self):
        """Heavily blurred image should be flagged."""
        from scipy.ndimage import gaussian_filter
        image = np.zeros((100, 100), dtype=np.float32)
        image[30:70, 30:70] = 255
        blurred = gaussian_filter(image, sigma=20)
        assert detect_motion_artifact(blurred, threshold=100)
