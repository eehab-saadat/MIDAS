import logging
import os

import requests
from django.db.models import IntegerField, Max, OuterRef, Subquery
from django.db.models.functions import Cast
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Patient, Vitals
from .serializers import PatientSerializer, VitalsSerializer
from .utils import get_complete_patient_details

logger = logging.getLogger(__name__)


class PatientViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD endpoints for Patient records plus sub-resource actions
    and a full-detail lookup by MRNO.

    List / search / order:
      GET  /api/patients/                          – paginated list
      GET  /api/patients/?search=<term>            – search by mrno or name
      GET  /api/patients/?ordering=mrno_int        – sort by MRN numerically (asc)
      GET  /api/patients/?ordering=-mrno_int       – sort by MRN numerically (desc)
      GET  /api/patients/?ordering=name            – sort by name (asc)
      GET  /api/patients/?ordering=-name           – sort by name (desc)
      GET  /api/patients/?ordering=dob             – sort by dob asc (= age desc)
      GET  /api/patients/?ordering=-dob            – sort by dob desc (= age asc)
      GET  /api/patients/?ordering=last_visit      – sort by last encounter date (asc)
      GET  /api/patients/?ordering=-last_visit     – sort by last encounter date (desc)

    Full patient snapshot (by MRNO):
      GET  /api/patients/mrno/<mrno>/            – complete patient details

    Sub-resource detail routes (by Django PK):
      GET  /api/patients/<id>/vitals/
      GET  /api/patients/<id>/encounters/
      GET  /api/patients/<id>/medications/
      GET  /api/patients/<id>/radiology/
      GET  /api/patients/<id>/labs/
    """

    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["mrno", "name"]
    # mrno_int  — annotated integer cast of mrno for correct numeric ordering.
    # dob       — sortable proxy for age (age asc = dob desc).
    # last_visit — annotated max encounter date per patient.
    ordering_fields = ["mrno_int", "name", "dob", "last_visit"]
    ordering = ["mrno_int"]

    def get_queryset(self):
        from clinical.models import Encounter

        last_visit_subquery = (
            Encounter.objects.filter(patient=OuterRef("pk"))
            .order_by("-date")
            .values("date")[:1]
        )
        return Patient.objects.annotate(
            mrno_int=Cast("mrno", output_field=IntegerField()),
            last_visit=Subquery(last_visit_subquery),
        )

    # ── Full snapshot by MRNO ────────────────────────────────────────────────

    @action(
        detail=False,
        methods=["get"],
        url_path=r"mrno/(?P<mrno>[^/.]+)",
        url_name="by-mrno",
    )
    def by_mrno(self, request, mrno: str = None):
        """
        Return complete patient information keyed by MRNO.

        Includes: demographics, most recent vitals, last 3 lab results,
        last 3 radiology reports, all medications, symptoms from the most
        recent encounter, and notes from the last 2 encounters.
        """
        data = get_complete_patient_details(mrno)
        if data is None:
            return Response(
                {"error": f"No patient found with MRNO '{mrno}'."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(data, status=status.HTTP_200_OK)

    # ── Sub-resource actions (by Django PK) ──────────────────────────────────

    @action(detail=True, methods=["get"])
    def vitals(self, request, pk=None):
        patient = self.get_object()
        serializer = VitalsSerializer(patient.vitals.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def encounters(self, request, pk=None):
        from clinical.serializers import EncounterSerializer

        patient = self.get_object()
        qs = patient.encounters.select_related("clinician").prefetch_related("symptoms")
        serializer = EncounterSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def medications(self, request, pk=None):
        from clinical.serializers import MedicationSerializer

        patient = self.get_object()
        qs = patient.medications.select_related("prescribed_by").all()
        serializer = MedicationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def radiology(self, request, pk=None):
        from diagnostics.serializers import RadiologySerializer

        patient = self.get_object()
        serializer = RadiologySerializer(patient.radiology_reports.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def labs(self, request, pk=None):
        from diagnostics.serializers import LabSerializer

        patient = self.get_object()
        serializer = LabSerializer(patient.lab_results.all(), many=True)
        return Response(serializer.data)

    # ── Lightweight summary actions for patient details page ─────────────

    @action(detail=True, methods=["get"], url_path="encounters-summary")
    def encounters_summary(self, request, pk=None):
        from clinical.serializers import EncounterSummarySerializer

        patient = self.get_object()
        qs = patient.encounters.select_related("clinician").order_by("-date")
        serializer = EncounterSummarySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="labs-summary")
    def labs_summary(self, request, pk=None):
        from diagnostics.serializers import LabSummarySerializer

        patient = self.get_object()
        qs = patient.lab_results.order_by("-invoice_date")
        serializer = LabSummarySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="radiology-summary")
    def radiology_summary(self, request, pk=None):
        from diagnostics.serializers import RadiologySummarySerializer

        patient = self.get_object()
        qs = patient.radiology_reports.order_by("-created_at")
        serializer = RadiologySummarySerializer(qs, many=True)
        return Response(serializer.data)


class VitalsViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Vitals records.

    Query params:
      ?patient=<patient_id> - filter by patient PK
      ?ordering=<field>     - sort by timestamp
    """

    queryset = Vitals.objects.select_related("patient")
    serializer_class = VitalsSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset


MICROSERVICE_URL = os.getenv("MICROSERVICE_URL", "http://localhost:8001")


@api_view(["POST"])
def diagnose_with_medgemma(request):
    """Proxy diagnosis request to the FastAPI microservice running MedGemma.
    
    Accepts an optional ``human_critique`` field in the request body.
    When present the critique is forwarded to the microservice so it
    can re-generate a revised diagnosis that addresses the feedback.
    """
    mrno = request.query_params.get("mrno")
    if not mrno:
        return Response(
            {"error": "Query parameter 'mrno' is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    patient_data = get_complete_patient_details(mrno)
    if patient_data is None:
        return Response(
            {"error": f"No patient found with MRNO '{mrno}'."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Optional critique from the feedback loop
    human_critique = None
    if request.data:
        human_critique = request.data.get("human_critique")

    try:
        payload = {"patient_data": patient_data}
        if human_critique:
            payload["human_critique"] = human_critique

        resp = requests.post(
            f"{MICROSERVICE_URL}/diagnose",
            json=payload,
            timeout=(10, 600),
        )
        resp.raise_for_status()
        return Response(resp.json(), status=status.HTTP_200_OK)

    except requests.exceptions.ConnectionError:
        return Response(
            {"error": "Cannot reach the diagnosis microservice."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except requests.exceptions.Timeout:
        return Response(
            {"error": "Diagnosis request timed out. Try again."},
            status=status.HTTP_504_GATEWAY_TIMEOUT,
        )
    except requests.exceptions.HTTPError:
        detail = resp.json().get("detail", resp.text) if resp.content else resp.text
        return Response({"error": detail}, status=resp.status_code)
    except Exception as e:
        logger.exception("Unexpected error in diagnose_with_medgemma")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["POST"])
def diagnosis_feedback(request):
    """Forward a clinician-approved diagnosis to the microservice RAG store.

    Expects a JSON body with:
      - mrno: str          — patient MRN
      - diagnosis: str     — the approved diagnosis text
      - reasoning: str     — the approved reasoning text

    The view looks up the full patient data and sends it alongside the
    diagnosis/reasoning to the microservice ``/diagnose/feedback`` endpoint
    which inserts the case into the in-memory vector store.
    """
    mrno = request.data.get("mrno")
    diagnosis = request.data.get("diagnosis")
    reasoning = request.data.get("reasoning")

    if not mrno or not diagnosis or not reasoning:
        return Response(
            {"error": "Fields 'mrno', 'diagnosis', and 'reasoning' are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    patient_data = get_complete_patient_details(mrno)
    if patient_data is None:
        return Response(
            {"error": f"No patient found with MRNO '{mrno}'."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        resp = requests.post(
            f"{MICROSERVICE_URL}/diagnose/feedback",
            json={
                "patient_data": patient_data,
                "diagnosis": diagnosis,
                "reasoning": reasoning,
                "mrno": mrno,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return Response(resp.json(), status=status.HTTP_200_OK)

    except requests.exceptions.ConnectionError:
        return Response(
            {"error": "Cannot reach the diagnosis microservice."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as e:
        logger.exception("Unexpected error in diagnosis_feedback")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

