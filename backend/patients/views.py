from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Patient, Vitals
from .serializers import PatientSerializer, VitalsSerializer
from .utils import get_complete_patient_details


class PatientViewSet(viewsets.ModelViewSet):
    """
    Standard CRUD endpoints for Patient records plus sub-resource actions
    and a full-detail lookup by MRNO.

    List / search / order:
      GET  /api/patients/                        – paginated list
      GET  /api/patients/?search=<term>          – search by mrno or name
      GET  /api/patients/?ordering=<field>       – sort by mrno, name, dob

    Full patient snapshot (by MRNO):
      GET  /api/patients/mrno/<mrno>/            – complete patient details

    Sub-resource detail routes (by Django PK):
      GET  /api/patients/<id>/vitals/
      GET  /api/patients/<id>/encounters/
      GET  /api/patients/<id>/medications/
      GET  /api/patients/<id>/radiology/
      GET  /api/patients/<id>/labs/
    """

    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["mrno", "name"]
    ordering_fields = ["mrno", "name", "dob"]
    ordering = ["mrno"]

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
        qs = (
            patient.encounters
            .select_related("clinician")
            .prefetch_related("symptoms")
        )
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


class VitalsViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Vitals records.

    Query params:
      ?patient=<patient_id> – filter by patient PK
      ?ordering=<field>     – sort by timestamp
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
