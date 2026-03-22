from django.core.management.base import BaseCommand
from diagnostics.models import Radiology


class Command(BaseCommand):
    help = "Unlock all existing Radiology records (set locked=False for all existing entries)"

    def handle(self, *args, **options):
        # Get all existing radiology records
        existing_records = Radiology.objects.all()
        count = existing_records.count()
        
        if count == 0:
            self.stdout.write(self.style.WARNING("No existing Radiology records found."))
            return
        
        # Update all existing records to have locked=False
        updated = existing_records.update(locked=False)
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully unlocked {updated} existing Radiology record(s)."
            )
        )
