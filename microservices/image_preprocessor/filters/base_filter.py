"""Abstract base class that all modality-specific filters must inherit from."""

from abc import ABC, abstractmethod
from typing import Any

import numpy as np

from utils.logger import logger


class BaseFilter(ABC):
    """Abstract base class for modality-specific image filters.

    All filter modules must inherit from this class and implement
    the apply() and get_quality_delta() methods.
    """

    def __init__(self, config: dict[str, Any]):
        """Initialize filter with modality-specific configuration.

        Args:
            config: Modality-specific configuration dictionary from YAML.
        """
        self.config = config
        self._pre_snr: float | None = None
        self._post_snr: float | None = None

    @abstractmethod
    def apply(
        self,
        image: np.ndarray,
        metadata: dict[str, Any],
        config: dict[str, Any],
    ) -> tuple[np.ndarray, dict[str, Any]]:
        """Apply modality-specific filtering to the image.

        Args:
            image: Input pixel array.
            metadata: Image metadata dictionary (may be updated in-place).
            config: Filter-specific configuration parameters.

        Returns:
            Tuple of (filtered_image, updated_metadata).
        """

    def get_quality_delta(self) -> float:
        """Return the SNR improvement in dB from the last apply() call.

        Returns:
            SNR delta in dB. Positive means improvement.
        """
        if self._pre_snr is not None and self._post_snr is not None:
            return self._post_snr - self._pre_snr
        return 0.0

    def _estimate_snr(self, image: np.ndarray) -> float:
        """Estimate SNR in dB for quality tracking."""
        if len(image.shape) == 3:
            img = np.mean(image, axis=2)
        else:
            img = image

        flat = img.flatten()
        threshold = np.mean(flat)
        foreground = flat[flat > threshold]
        background = flat[flat <= threshold]

        if len(background) == 0 or len(foreground) == 0:
            return 0.0

        signal = np.mean(foreground)
        noise_std = np.std(background)

        if noise_std < 1e-10:
            return 60.0

        return float(max(20 * np.log10(signal / (noise_std + 1e-10)), 0.0))

    def _track_quality(self, pre_image: np.ndarray, post_image: np.ndarray) -> None:
        """Track SNR before and after filtering for quality delta reporting."""
        self._pre_snr = self._estimate_snr(pre_image)
        self._post_snr = self._estimate_snr(post_image)
        logger.info(
            f"{self.__class__.__name__} quality: "
            f"SNR {self._pre_snr:.1f} -> {self._post_snr:.1f} dB "
            f"(delta: {self.get_quality_delta():+.1f} dB)"
        )


def detect_motion_artifact(image: np.ndarray, threshold: float = 80.0) -> bool:
    """Detect motion blur using Laplacian variance.

    Shared utility used across multiple modality filters.
    """
    from scipy import ndimage

    if len(image.shape) == 3:
        img = np.mean(image, axis=2)
    else:
        img = image

    if img.max() <= 1.0:
        img = img * 255.0

    laplacian = ndimage.laplace(img.astype(np.float64))
    sharpness = float(np.var(laplacian))
    return sharpness < threshold


def detect_truncation_artifact(image: np.ndarray) -> bool:
    """Detect truncation artifacts (bright bands at image edges)."""
    if len(image.shape) == 3:
        img = np.mean(image, axis=2)
    else:
        img = image

    edge_pixels = np.concatenate([
        img[0, :], img[-1, :], img[:, 0], img[:, -1]
    ])
    center = img[img.shape[0] // 4 : 3 * img.shape[0] // 4,
                  img.shape[1] // 4 : 3 * img.shape[1] // 4]

    return bool(np.mean(edge_pixels) > np.mean(center) * 1.5)
