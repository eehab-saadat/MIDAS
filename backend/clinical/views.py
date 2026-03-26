import base64
import logging
import os

import requests as http_requests
from rest_framework import filters, status, viewsets
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import BodyPart, Clinician, Encounter, Medication, SnomedEntity, Symptom
from .serializers import (
    BodyPartSerializer,
    ClinicianSerializer,
    EncounterSerializer,
    MedicationSerializer,
    SnomedEntitySerializer,
    SymptomSerializer,
)

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    "models/gemini-2.5-flash-lite:generateContent"
)


@api_view(["POST"])
@parser_classes([MultiPartParser])
def transcribe_audio(request):
    """Accept an audio file upload and return a Gemini-powered transcription."""
    if not GEMINI_API_KEY:
        return Response(
            {"detail": "GEMINI_API_KEY is not configured on the server."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    audio_file = request.FILES.get("file")
    if not audio_file:
        return Response(
            {"detail": "No audio file provided. Send a 'file' field."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    audio_bytes = audio_file.read()
    audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
    mime_type = audio_file.content_type or "audio/webm"

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": audio_b64,
                        }
                    },
                    {
                        "text": (
                            "Transcribe this audio accurately. "
                            "Return only the transcription text, nothing else."
                        )
                    },
                ]
            }
        ]
    }

    try:
        resp = http_requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=60,
        )
    except http_requests.RequestException as exc:
        logger.exception("Gemini API request failed")
        return Response(
            {"detail": f"Gemini API request failed: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    if resp.status_code != 200:
        logger.error("Gemini API error %s: %s", resp.status_code, resp.text[:500])
        return Response(
            {"detail": f"Gemini API error ({resp.status_code})."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    try:
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, ValueError) as exc:
        logger.exception("Unexpected Gemini response structure")
        return Response(
            {"detail": f"Could not parse Gemini response: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"transcription": text.strip()})


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
