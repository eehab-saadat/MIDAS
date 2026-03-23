from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import Radiology


@receiver(post_save, sender=Radiology)
def trigger_image_processing(sender, instance, created, **kwargs):
    """
    Trigger image processing pipeline when a new Radiology entry is created.
    Only triggers for newly created entries, not updates.
    
    Uses Celery for async processing if available, otherwise falls back to
    synchronous processing (useful for development/testing).
    """
    if created and instance.file_path:
        # Check if Celery is configured
        celery_enabled = hasattr(settings, 'CELERY_BROKER_URL') and settings.CELERY_BROKER_URL
        
        if celery_enabled:
            try:
                from .tasks import process_radiology_image
                # Trigger async task
                process_radiology_image.delay(instance.id)
            except Exception as e:
                # If Celery fails, fall back to sync
                print(f"Celery task failed, falling back to sync: {e}")
                from .utils import process_radiology_image_sync
                process_radiology_image_sync(instance.id)
        else:
            # No Celery configured, use synchronous processing
            from .utils import process_radiology_image_sync
            process_radiology_image_sync(instance.id)
