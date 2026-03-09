from rest_framework import filters, viewsets

from .models import Clinician, Encounter, Medication
from .serializers import ClinicianSerializer, EncounterSerializer, MedicationSerializer


class ClinicianViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Clinician records.

    Query params:
      ?search=<term>    – match on name or title
      ?ordering=<field> – sort by name or joining_date
    """

    queryset = Clinician.objects.all()
    serializer_class = ClinicianSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "title"]
    ordering_fields = ["name", "joining_date"]
    ordering = ["name"]


class EncounterViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Encounter records.

    Query params:
      ?patient=<patient_id>     – filter by patient PK
      ?clinician=<clinician_id> – filter by clinician PK
      ?search=<term>            – search within notes
      ?ordering=<field>         – sort by date
    """

    queryset = Encounter.objects.select_related("patient", "clinician")
    serializer_class = EncounterSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["notes"]
    ordering_fields = ["date"]
    ordering = ["-date"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        clinician_id = self.request.query_params.get("clinician")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        if clinician_id:
            queryset = queryset.filter(clinician_id=clinician_id)
        return queryset


class MedicationViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Medication records.

    Query params:
      ?patient=<patient_id> – filter by patient PK
      ?search=<term>        – match on medication_name or active_agent_name
      ?ordering=<field>     – sort by prescribed_on or medication_name
    """

    queryset = Medication.objects.select_related("patient", "prescribed_by")
    serializer_class = MedicationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["medication_name", "active_agent_name"]
    ordering_fields = ["prescribed_on", "medication_name"]
    ordering = ["-prescribed_on"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset
