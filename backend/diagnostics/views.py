import logging
from pathlib import Path

import requests as http_requests
from django.conf import settings
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from patients.models import Patient

from .models import Lab, Radiology
from .serializers import LabSerializer, RadiologySerializer

logger = logging.getLogger(__name__)


class RadiologyViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Radiology report records.

    Query params:
      ?patient=<patient_id> – filter by patient PK
      ?search=<term>        – match on cpt_name or cpt_id
      ?ordering=<field>     – sort by cpt_name
    """

    queryset = Radiology.objects.select_related("patient")
    serializer_class = RadiologySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["cpt_name", "cpt_id"]
    ordering_fields = ["cpt_name"]
    ordering = ["cpt_name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request):
        """Accept a radiology image upload, persist the file, and create a
        locked Radiology record.  The post_save signal triggers the
        preprocessing / AI-description pipeline in the background."""

        file = request.FILES.get("file")
        patient_id = request.data.get("patient")
        cpt_name = request.data.get("cpt_name", "")

        if not file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not patient_id:
            return Response(
                {"detail": "Patient ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response(
                {"detail": "Patient not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
        safe_name = file.name.replace(" ", "_")
        relative_dir = Path("media") / "radiology" / str(patient.mrno)
        relative_path = relative_dir / f"{timestamp}_{safe_name}"

        abs_dir = Path(settings.BASE_DIR).parent / relative_dir
        abs_dir.mkdir(parents=True, exist_ok=True)
        abs_path = Path(settings.BASE_DIR).parent / relative_path

        with open(abs_path, "wb") as dest:
            for chunk in file.chunks():
                dest.write(chunk)

        radiology = Radiology.objects.create(
            patient=patient,
            cpt_name=cpt_name or safe_name,
            file_path=str(relative_path),
            locked=True,
        )

        serializer = self.get_serializer(radiology)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LabViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Lab result records.

    Query params:
      ?patient=<patient_id> – filter by patient PK
      ?search=<term>        – match on cpt_name or cpt_id
      ?ordering=<field>     – sort by invoice_date or cpt_name
    """

    queryset = Lab.objects.select_related("patient")
    serializer_class = LabSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["cpt_name", "cpt_id"]
    ordering_fields = ["invoice_date", "cpt_name"]
    ordering = ["-invoice_date"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    @action(
        detail=False,
        methods=["post"],
        url_path="ocr-upload",
        parser_classes=[MultiPartParser],
    )
    def ocr_upload(self, request):
        """Forward a lab-report image to the microservice /extract-report
        endpoint, transform the response into the Lab model format, and
        return it for the frontend to pre-fill the manual entry form.
        Nothing is saved to the database here."""

        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "No file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        microservices_url = getattr(
            settings, "MICROSERVICES_URL", "http://localhost:8001"
        )

        try:
            resp = http_requests.post(
                f"{microservices_url}/extract-report",
                files={"file": (file.name, file.read(), file.content_type)},
                timeout=120,
            )
            resp.raise_for_status()
            report = resp.json()
        except http_requests.ConnectionError:
            return Response(
                {"detail": "Cannot connect to extraction microservice."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except http_requests.Timeout:
            return Response(
                {"detail": "Extraction microservice timed out."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as exc:
            logger.exception("OCR extraction failed")
            return Response(
                {"detail": f"Extraction failed: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        lab_tests = report.get("lab_tests") or []
        diagnosis = report.get("diagnosis") or []
        cpt_name = diagnosis[0] if diagnosis else "Lab Panel"

        results = {}
        for test in lab_tests:
            name = (test.get("test_name") or "").strip().upper()
            if not name:
                continue

            raw_value = test.get("value")
            try:
                numeric_value = float(raw_value) if raw_value else None
            except (ValueError, TypeError):
                numeric_value = None

            ref_range = test.get("reference_range") or ""
            low, high = "", ""
            if " - " in ref_range:
                parts = ref_range.split(" - ", 1)
                low, high = parts[0].strip(), parts[1].strip()
            elif "-" in ref_range:
                parts = ref_range.split("-", 1)
                low, high = parts[0].strip(), parts[1].strip()

            results[name] = {
                "result": numeric_value,
                "unit": test.get("unit") or "",
                "normal_range": [low, high],
            }

        return Response({"cpt_name": cpt_name, "results": results})
