import logging
import threading

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Radiology

logger = logging.getLogger(__name__)


def _run_sync_processing(radiology_id):
    """Wrapper executed inside a daemon thread so the HTTP response is not
    blocked while the image-processing pipeline runs."""
    try:
        from .utils import process_radiology_image_sync

        process_radiology_image_sync(radiology_id)
    except Exception:
        logger.exception("Background image processing failed for Radiology %s", radiology_id)


@receiver(post_save, sender=Radiology)
def trigger_image_processing(sender, instance, created, **kwargs):
    """Trigger image processing pipeline when a new Radiology entry is created.
    Uses Celery if available, otherwise spawns a daemon thread so the request
    returns immediately."""

    if not (created and instance.file_path):
        return

    celery_enabled = getattr(settings, "CELERY_BROKER_URL", None)

    if celery_enabled:
        try:
            from .tasks import process_radiology_image

            process_radiology_image.delay(instance.id)
            return
        except Exception:
            logger.warning(
                "Celery dispatch failed for Radiology %s, falling back to thread",
                instance.id,
                exc_info=True,
            )

    threading.Thread(
        target=_run_sync_processing,
        args=(instance.id,),
        daemon=True,
    ).start()
