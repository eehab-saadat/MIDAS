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
            base_dir = Path(settings.BASE_DIR).parent  # Go up from backend/ to project root
            image_path = base_dir / radiology.file_path
        
        if not image_path.exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        # Add microservices directory to Python path
        microservices_path = base_dir / "microservices" / "image_preprocessor"
        sys.path.insert(0, str(microservices_path))
        
        # Import and run the image processing pipeline
        from pipeline import process_image
        
        # Create output directory for this specific radiology report
        output_dir = base_dir / "data" / "processed_radiology" / f"radiology_{radiology_id}"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Process the image
        result = process_image(
            input_path=str(image_path),
            output_dir=str(output_dir)
        )
        
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
    """
    Generate a system conclusion from the image processing pipeline result.
    
    Args:
        pipeline_result: Dictionary returned by the image preprocessor
        
    Returns:
        str: Formatted system conclusion
    """
    modality = pipeline_result.get("modality", "UNKNOWN")
    quality_report = pipeline_result.get("quality_report", {})
    quality_delta = pipeline_result.get("quality_delta", {})
    metadata = pipeline_result.get("metadata", {})
    
    # Extract quality metrics
    quality_improved = quality_delta.get("quality_improved", False)
    warnings = quality_report.get("warnings", [])
    preprocessing_steps = metadata.get("preprocessing_steps", [])
    
    # Build conclusion text
    conclusion_parts = []
    
    conclusion_parts.append(f"MODALITY: {modality}")
    
    if metadata.get("modality_confidence"):
        confidence = metadata["modality_confidence"]
        conclusion_parts.append(f"Detection Confidence: {confidence:.2%}")
    
    if preprocessing_steps:
        conclusion_parts.append(f"\nPREPROCESSING APPLIED:")
        for step in preprocessing_steps:
            conclusion_parts.append(f"  - {step}")
    
    if quality_improved:
        conclusion_parts.append("\nQUALITY: Improved after preprocessing")
    elif quality_delta.get("reverted"):
        conclusion_parts.append("\nQUALITY: Processing reverted due to quality regression")
    
    if warnings:
        conclusion_parts.append(f"\nWARNINGS ({len(warnings)}):")
        for warning in warnings[:5]:  # Limit to first 5 warnings
            conclusion_parts.append(f"  - {warning}")
    
    # Add LLM context path if available
    llm_context_path = pipeline_result.get("llm_context_file")
    if llm_context_path:
        conclusion_parts.append(f"\nDetailed analysis available at: {llm_context_path}")
    
    return "\n".join(conclusion_parts)
