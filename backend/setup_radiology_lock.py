#!/usr/bin/env python
"""
Setup script for Radiology Lock System.
Run this after updating the code to set up the necessary infrastructure.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")
django.setup()

from django.core.management import call_command
from diagnostics.models import Radiology


def main():
    print("=" * 60)
    print("Radiology Lock System Setup")
    print("=" * 60)
    
    # Step 1: Create migrations
    print("\n[1/4] Creating migrations...")
    try:
        call_command("makemigrations", "diagnostics")
        print("✓ Migrations created successfully")
    except Exception as e:
        print(f"✗ Error creating migrations: {e}")
        return
    
    # Step 2: Run migrations
    print("\n[2/4] Running migrations...")
    try:
        call_command("migrate", "diagnostics")
        print("✓ Migrations applied successfully")
    except Exception as e:
        print(f"✗ Error running migrations: {e}")
        return
    
    # Step 3: Unlock existing records
    print("\n[3/4] Unlocking existing Radiology records...")
    try:
        count = Radiology.objects.count()
        if count > 0:
            updated = Radiology.objects.update(locked=False)
            print(f"✓ Unlocked {updated} existing record(s)")
        else:
            print("✓ No existing records to unlock")
    except Exception as e:
        print(f"✗ Error unlocking records: {e}")
        return
    
    # Step 4: Check Celery/Redis
    print("\n[4/4] Checking Celery/Redis setup...")
    try:
        from django.conf import settings
        import redis
        
        broker_url = getattr(settings, 'CELERY_BROKER_URL', None)
        if broker_url:
            # Try to connect to Redis
            r = redis.from_url(broker_url)
            r.ping()
            print(f"✓ Redis connection successful ({broker_url})")
        else:
            print("⚠ Celery not configured - will use synchronous processing")
    except ImportError:
        print("⚠ Redis library not installed - run: pip install redis")
    except Exception as e:
        print(f"⚠ Redis connection failed: {e}")
        print("  System will fall back to synchronous processing")
    
    # Summary
    print("\n" + "=" * 60)
    print("Setup Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Start Redis server (if using Celery):")
    print("   - redis-server")
    print("3. Start Celery worker (if using Celery):")
    print("   - celery -A backend worker --loglevel=info")
    print("4. Test the system by creating a new Radiology record")
    print("\nFor more details, see backend/diagnostics/RADIOLOGY_LOCK_README.md")


if __name__ == "__main__":
    main()
