from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Patient, Vitals
from .serializers import PatientSerializer, VitalsSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Patient records.

    Supports filtering via ?search=<term> (matches mrno or name)
    and ordering via ?ordering=<field>.

    Extra detail routes expose related resources:
      GET /api/patients/{id}/vitals/
      GET /api/patients/{id}/encounters/
      GET /api/patients/{id}/medications/
      GET /api/patients/{id}/radiology/
      GET /api/patients/{id}/labs/
    """

    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["mrno", "name"]
    ordering_fields = ["mrno", "name", "dob"]

    @action(detail=True, methods=["get"])
    def vitals(self, request, pk=None):
        patient = self.get_object()
        qs = patient.vitals.all()
        serializer = VitalsSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def encounters(self, request, pk=None):
        from clinical.serializers import EncounterSerializer

        patient = self.get_object()
        qs = patient.encounters.all()
        serializer = EncounterSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def medications(self, request, pk=None):
        from clinical.serializers import MedicationSerializer

        patient = self.get_object()
        qs = patient.medications.all()
        serializer = MedicationSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def radiology(self, request, pk=None):
        from diagnostics.serializers import RadiologySerializer

        patient = self.get_object()
        qs = patient.radiology_reports.all()
        serializer = RadiologySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def labs(self, request, pk=None):
        from diagnostics.serializers import LabSerializer

        patient = self.get_object()
        qs = patient.lab_results.all()
        serializer = LabSerializer(qs, many=True)
        return Response(serializer.data)


class VitalsViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Vitals records.

    Filter by patient with ?patient=<patient_id>.
    """

    queryset = Vitals.objects.select_related("patient")
    serializer_class = VitalsSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["timestamp"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset
