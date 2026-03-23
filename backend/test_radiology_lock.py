#!/usr/bin/env python
"""
Test script for Radiology Lock System.
Creates a test radiology record and monitors the processing.
"""
import os
import sys
import time
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")
django.setup()

from diagnostics.models import Radiology
from patients.models import Patient


def main():
    print("=" * 60)
    print("Radiology Lock System Test")
    print("=" * 60)
    
    # Get or create a test patient
    patient, created = Patient.objects.get_or_create(
        mrno="TEST001",
        defaults={
            "first_name": "Test",
            "last_name": "Patient",
            "dob": "1990-01-01",
            "gender": "M"
        }
    )
    
    if created:
        print(f"\n✓ Created test patient: {patient.mrno}")
    else:
        print(f"\n✓ Using existing patient: {patient.mrno}")
    
    # Use a sample image from the image_preprocessor
    test_image_path = "microservices/image_preprocessor/input_images/IM-0007-0001.jpeg"
    
    # Check if file exists
    from pathlib import Path
    if not Path(test_image_path).exists():
        print(f"\n✗ Test image not found: {test_image_path}")
        print("Please provide a valid image path")
        return
    
    print(f"✓ Using test image: {test_image_path}")
    
    # Create radiology record
    print("\n[1/3] Creating Radiology record...")
    radiology = Radiology.objects.create(
        patient=patient,
        cpt_id="TEST001",
        cpt_name="Test X-Ray",
        file_path=test_image_path,
        technique="Standard protocol",
        result="Test result",
        conclusion="Test conclusion"
    )
    
    print(f"✓ Created Radiology record ID: {radiology.id}")
    print(f"  - Initial locked state: {radiology.locked}")
    print(f"  - File path: {radiology.file_path}")
    
    # Monitor processing
    print("\n[2/3] Monitoring processing...")
    max_wait_time = 120  # seconds
    start_time = time.time()
    last_status = radiology.locked
    
    while time.time() - start_time < max_wait_time:
        radiology.refresh_from_db()
        
        if radiology.locked != last_status:
            last_status = radiology.locked
            elapsed = time.time() - start_time
            print(f"  [{elapsed:.1f}s] Locked state changed: {radiology.locked}")
        
        if not radiology.locked:
            print(f"✓ Processing completed in {time.time() - start_time:.1f}s")
            break
        
        time.sleep(2)
    else:
        print(f"⚠ Processing did not complete within {max_wait_time}s")
        print("  Check Celery worker logs for errors")
    
    # Display results
    print("\n[3/3] Results:")
    radiology.refresh_from_db()
    print(f"  - Locked: {radiology.locked}")
    print(f"  - System Conclusion:")
    if radiology.system_conclusion:
        for line in radiology.system_conclusion.split('\n')[:10]:
            print(f"    {line}")
        if len(radiology.system_conclusion.split('\n')) > 10:
            print("    ...")
    else:
        print("    (empty)")
    
    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)
    
    # Cleanup option
    cleanup = input("\nDelete test record? (y/n): ")
    if cleanup.lower() == 'y':
        radiology.delete()
        if created:
            patient.delete()
        print("✓ Test records deleted")


if __name__ == "__main__":
    main()
