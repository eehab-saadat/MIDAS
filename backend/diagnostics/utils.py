"""
Utility functions for diagnostics app.
"""
import sys
from pathlib import Path
from django.conf import settings


def process_radiology_image_sync(radiology_id):
    """
    Synchronous version of image processing (without Celery).
    Use this for development/testing when Celery is not available.
    
    Args:
        radiology_id: Primary key of the Radiology instance
        
    Returns:
        dict: Processing result
    """
    from .models import Radiology
    
    try:
        radiology = Radiology.objects.get(id=radiology_id)
        
        if not radiology.file_path:
            raise ValueError(f"No file_path found for Radiology ID {radiology_id}")
        
        # Construct absolute path
        if Path(radiology.file_path).is_absolute():
            image_path = Path(radiology.file_path)
        else:
            base_dir = Path(settings.BASE_DIR).parent
            image_path = base_dir / radiology.file_path
        
        if not image_path.exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        # Add microservices to path
        base_dir = Path(settings.BASE_DIR).parent
        microservices_path = base_dir / "microservices" / "image_preprocessor"
        sys.path.insert(0, str(microservices_path))
        
        from pipeline import process_image
        
        # Create output directory
        output_dir = base_dir / "data" / "processed_radiology" / f"radiology_{radiology_id}"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Process image
        result = process_image(
            input_path=str(image_path),
            output_dir=str(output_dir)
        )
        
        # Generate system conclusion
        from .tasks import generate_system_conclusion
        system_conclusion = generate_system_conclusion(result)
        
        # Update radiology
        radiology.system_conclusion = system_conclusion
        radiology.locked = False
        radiology.save(update_fields=["system_conclusion", "locked", "updated_at"])
        
        return {
            "status": "success",
            "radiology_id": radiology_id,
            "system_conclusion": system_conclusion,
            "modality": result.get("modality", "UNKNOWN")
        }
        
    except Exception as e:
        # On error, unlock and set error message
        try:
            radiology = Radiology.objects.get(id=radiology_id)
            radiology.system_conclusion = f"Processing failed: {str(e)}"
            radiology.locked = False
            radiology.save(update_fields=["system_conclusion", "locked", "updated_at"])
        except Exception:
            pass
        raise
