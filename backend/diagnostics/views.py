from rest_framework import filters, viewsets

from .models import Lab, Radiology
from .serializers import LabSerializer, RadiologySerializer


class RadiologyViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Radiology report records.

    Filter by patient with ?patient=<patient_id>.
    Supports searching via ?search=<term> (matches cpt_name or cpt_id).
    """

    queryset = Radiology.objects.select_related("patient")
    serializer_class = RadiologySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["cpt_name", "cpt_id"]
    ordering_fields = ["cpt_name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset


class LabViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Lab result records.

    Filter by patient with ?patient=<patient_id>.
    Supports searching via ?search=<term> (matches cpt_name or cpt_id).
    """

    queryset = Lab.objects.select_related("patient")
    serializer_class = LabSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["cpt_name", "cpt_id"]
    ordering_fields = ["invoice_date", "cpt_name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get("patient")
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset
