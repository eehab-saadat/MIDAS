from rest_framework import filters, viewsets

from .models import BodyPart, Clinician, Encounter, Medication, SnomedEntity, Symptom
from .serializers import (
    BodyPartSerializer,
    ClinicianSerializer,
    EncounterSerializer,
    MedicationSerializer,
    SnomedEntitySerializer,
    SymptomSerializer,
)


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
    CRUD endpoints for Encounter records.  Each encounter response includes
    its full list of symptoms inline (read-only).

    Query params:
        ?patient=<patient_id>     – filter by patient PK
        ?clinician=<clinician_id> – filter by clinician PK
        ?search=<term>            – search within notes
        ?ordering=<field>         – sort by date
    """

    queryset = Encounter.objects.select_related(
        "patient", "clinician"
    ).prefetch_related("symptoms")
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


class BodyPartViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for BodyPart reference records.

    Query params:
        ?search=<term>    – match on name
        ?ordering=<field> – sort by name
    """

    queryset = BodyPart.objects.all()
    serializer_class = BodyPartSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name"]
    ordering = ["name"]


class SnomedEntityViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for SNOMED CT entity records.

    Query params:
      ?entity_type=<type>  – filter by entity_type (finding, procedure, body_structure, other)
      ?body_part=<id>      – filter by associated BodyPart PK
      ?search=<term>       – match on fsn, snomed_cid, or umls_cui
      ?ordering=<field>    – sort by fsn or snomed_cid
    """

    queryset = SnomedEntity.objects.prefetch_related("body_parts")
    serializer_class = SnomedEntitySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["fsn", "snomed_cid", "umls_cui"]
    ordering_fields = ["fsn", "snomed_cid"]
    ordering = ["fsn"]

    def get_queryset(self):
        queryset = super().get_queryset()
        entity_type = self.request.query_params.get("entity_type")
        body_part_id = self.request.query_params.get("body_part")
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
        if body_part_id:
            queryset = queryset.filter(body_parts__id=body_part_id)
        return queryset


class SymptomViewSet(viewsets.ModelViewSet):
    """
    CRUD endpoints for Symptom / clinical observation records.

    Every symptom must reference a valid SnomedEntity — the snomed_entity FK
    is required on write.

    Query params:
      ?encounter=<encounter_id>   – filter by encounter PK
      ?snomed_entity=<snomed_cid> – filter by SNOMED concept CID
      ?search=<term>              – match on SNOMED FSN or CID
      ?ordering=<field>           – sort by created_at
    """

    queryset = Symptom.objects.select_related("encounter__patient", "snomed_entity")
    serializer_class = SymptomSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["snomed_entity__fsn", "snomed_entity__snomed_cid"]
    ordering_fields = ["created_at"]
    ordering = ["created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        encounter_id = self.request.query_params.get("encounter")
        snomed_cid = self.request.query_params.get("snomed_entity")
        if encounter_id:
            queryset = queryset.filter(encounter_id=encounter_id)
        if snomed_cid:
            queryset = queryset.filter(snomed_entity_id=snomed_cid)
        return queryset
