"""Structured logging with step-level timing and quality delta tracking."""

import sys
import time
from pathlib import Path

from loguru import logger

# Remove default handler
logger.remove()

# Add structured console handler
logger.add(
    sys.stderr,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="DEBUG",
)

# Add file handler for persistent logs
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)
logger.add(
    LOG_DIR / "pipeline_{time:YYYY-MM-DD}.log",
    rotation="10 MB",
    retention="30 days",
    level="DEBUG",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
)


class StepTimer:
    """Context manager for timing pipeline steps."""

    def __init__(self, step_name: str):
        self.step_name = step_name
        self.start_time = None
        self.elapsed = None

    def __enter__(self):
        self.start_time = time.perf_counter()
        logger.info(f"Starting step: {self.step_name}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.elapsed = time.perf_counter() - self.start_time
        if exc_type is not None:
            logger.error(
                f"Step '{self.step_name}' failed after {self.elapsed:.3f}s: {exc_val}"
            )
        else:
            logger.info(
                f"Step '{self.step_name}' completed in {self.elapsed:.3f}s"
            )
        return False


def log_quality_delta(step_name: str, pre_metrics: dict, post_metrics: dict):
    """Log the quality delta between pre and post processing metrics."""
    for metric_name in pre_metrics:
        if metric_name in post_metrics:
            pre_val = pre_metrics[metric_name]
            post_val = post_metrics[metric_name]
            if isinstance(pre_val, (int, float)) and isinstance(post_val, (int, float)):
                delta = post_val - pre_val
                direction = "improved" if delta > 0 else "worsened" if delta < 0 else "unchanged"
                logger.info(
                    f"Quality delta [{step_name}] {metric_name}: "
                    f"{pre_val:.4f} -> {post_val:.4f} (delta: {delta:+.4f}, {direction})"
                )


def log_modality_detection(method: str, modality: str, confidence: float = None):
    """Log the modality detection result."""
    if confidence is not None:
        logger.info(
            f"Modality detected: {modality} (method: {method}, confidence: {confidence:.2f})"
        )
    else:
        logger.info(f"Modality detected: {modality} (method: {method})")


def log_artifact_flag(artifact_type: str, details: str = ""):
    """Log a detected artifact."""
    logger.warning(f"Artifact detected: {artifact_type}. {details}")
