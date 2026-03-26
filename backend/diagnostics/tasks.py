import sys
from pathlib import Path
from celery import shared_task
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def process_radiology_image(self, radiology_id):
    """
    Process radiology image through the image preprocessing pipeline.
    
    Args:
        radiology_id: Primary key of the Radiology instance
        
    Returns:
        dict: Processing result with system_conclusion
    """
    from .models import Radiology
    
    try:
        # Fetch the radiology instance
        radiology = Radiology.objects.get(id=radiology_id)
        
        if not radiology.file_path:
            raise ValueError(f"No file_path found for Radiology ID {radiology_id}")
        
        # Construct absolute path to the image file
        if Path(radiology.file_path).is_absolute():
            image_path = Path(radiology.file_path)
        else:
            # Assume relative to Django BASE_DIR or project root
            base_dir = Path(settings.BASE_DIR).parent.parent  # Go up from backend/backend to project root
            image_path = base_dir / radiology.file_path
        
        if not image_path.exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        microservices_url = getattr(
            settings, "MICROSERVICES_URL", "http://localhost:8001"
        )
        
        import requests
        with open(image_path, "rb") as f:
            # We don't necessarily know the content type safely here, octet-stream is a safe fallback
            content_type = "image/jpeg" if image_path.suffix.lower() in [".jpg", ".jpeg"] else "application/octet-stream"
            resp = requests.post(
                f"{microservices_url}/preprocess-image",
                files={"file": (image_path.name, f, content_type)},
                timeout=300
            )
        resp.raise_for_status()
        result = resp.json()
        
        # Extract system conclusion from the processing result
        # The pipeline returns metadata with modality, quality info, etc.
        system_conclusion = generate_system_conclusion(result)
        
        # Update the radiology instance with system_conclusion and unlock
        radiology.system_conclusion = system_conclusion
        radiology.locked = False
        radiology.save(update_fields=["system_conclusion", "locked", "updated_at"])
        
        return {
            "status": "success",
            "radiology_id": radiology_id,
            "system_conclusion": system_conclusion,
            "modality": result.get("modality", "UNKNOWN"),
            "processing_time": result.get("processing_time_seconds", 0)
        }
        
    except Radiology.DoesNotExist:
        raise ValueError(f"Radiology instance with ID {radiology_id} does not exist")
    
    except Exception as exc:
        # Retry the task with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        
        # If all retries failed, unlock the radiology record and log error
        try:
            radiology = Radiology.objects.get(id=radiology_id)
            radiology.system_conclusion = f"Processing failed: {str(exc)}"
            radiology.locked = False
            radiology.save(update_fields=["system_conclusion", "locked", "updated_at"])
        except Exception:
            pass
        
        raise


def generate_system_conclusion(pipeline_result):
    """Generate a human-readable system conclusion from the pipeline output.

    Combines modality/quality metadata with the clinical findings produced
    by medgemma (``model_findings``) so the downstream UI shows both the
    processing summary *and* the AI-generated clinical observations.
    """
    modality = pipeline_result.get("modality", "UNKNOWN")
    quality_report = pipeline_result.get("quality_report", {})
    quality_delta = pipeline_result.get("quality_delta", {})
    metadata = pipeline_result.get("metadata", {})
    model_findings = pipeline_result.get("model_findings")

    quality_improved = quality_delta.get("quality_improved", False)
    warnings = quality_report.get("warnings", [])
    preprocessing_steps = metadata.get("preprocessing_steps", [])

    conclusion_parts = [f"MODALITY: {modality}"]

    if metadata.get("modality_confidence"):
        conclusion_parts.append(
            f"Detection Confidence: {metadata['modality_confidence']:.2%}"
        )

    # ----- AI clinical findings (from medgemma) -----
    if isinstance(model_findings, dict) and model_findings.get("findings"):
        img_type = model_findings.get("image_type", "")
        body_part = model_findings.get("body_part", "")
        header = " - ".join(filter(None, [img_type, body_part]))
        conclusion_parts.append(f"\nFINDINGS ({header}):" if header else "\nFINDINGS:")
        for finding in model_findings["findings"]:
            conclusion_parts.append(f"  - {finding}")

    if preprocessing_steps:
        conclusion_parts.append("\nPREPROCESSING APPLIED:")
        for step in preprocessing_steps:
            conclusion_parts.append(f"  - {step}")

    if quality_improved:
        conclusion_parts.append("\nQUALITY: Improved after preprocessing")
    elif quality_delta.get("reverted"):
        conclusion_parts.append("\nQUALITY: Processing reverted due to quality regression")

    if warnings:
        conclusion_parts.append(f"\nWARNINGS ({len(warnings)}):")
        for warning in warnings[:5]:
            conclusion_parts.append(f"  - {warning}")

    return "\n".join(conclusion_parts)
