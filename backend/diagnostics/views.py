from rest_framework import filters, viewsets

from .models import Lab, Radiology
from .serializers import LabSerializer, RadiologySerializer


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
