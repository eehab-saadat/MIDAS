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
            base_dir = Path(settings.BASE_DIR).parent.parent
            image_path = base_dir / radiology.file_path
        
        if not image_path.exists():
            raise FileNotFoundError(f"Image file not found: {image_path}")
        
        microservices_url = getattr(
            settings, "MICROSERVICES_URL", "http://localhost:8001"
        )
        
        import requests
        with open(image_path, "rb") as f:
            content_type = "image/jpeg" if image_path.suffix.lower() in [".jpg", ".jpeg"] else "application/octet-stream"
            resp = requests.post(
                f"{microservices_url}/preprocess-image",
                files={"file": (image_path.name, f, content_type)},
                timeout=300
            )
        resp.raise_for_status()
        result = resp.json()
        
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
