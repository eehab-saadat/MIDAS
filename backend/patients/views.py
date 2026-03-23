from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Patient, Vitals
from .serializers import PatientSerializer, VitalsSerializer
from .utils import get_complete_patient_details, process_model_response

import logging

logger = logging.getLogger(__name__)


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


def diagnose_with_medgemma(request):
    """
    Call to medgemma model for generating diagnosis for the patient
    use the  get_complete_patient_details(mrno: str) -> dict function to get patient data

    """
    OPTIONAL_PARAMS = [
        "",
        "misc_details",
    ]  # these are the optional params sent in the request body
    # get patient data
    # use online url first, if not avaibale then call local ollama as fallback

    HOSTED_ENDPOINT = os.getenv("HOSTED_ENDPOINT") or "http://idhar rakhna hai bdske"
    OLLAMA_URL = "http://localhost:11434/api/chat"
    OLLAMA_MODEL = "amsaravi/medgemma-4b-it:q6"
    MODEL = "amsaravi/medgemma-4b-it:q6"

    # model call vars
    ROLE: str = "user"
    CONTENT: str = (
        "You are an expert medical AI assistant. Analyze the provided case details and the medical image (if any) to suggest a probable diagnosis with detailed reasoning. Format your response EXACTLY as follows, wrapped in triple backticks:\n\n```\n'{'diagnosis': '<diagnosis>', 'reasoning': '<detailed reasoning>'}```\n\nBe precise, evidence-based, and explain your reasoning clearly. Return ONLY the JSON object wrapped in triple backticks."
    )

    # adding optionl params to the patient data in others field if provided
    for param in OPTIONAL_PARAMS:
        if param in request.GET:
            patient_data["others"][param] = request.GET.get(param)

    try:
        mrno: str = request.GET.get("mrno")
        patient_data: str = json.dumps(get_complete_patient_details(mrno))

        """if hosted:
            send request and wait for success code response
            if not success code returned or not hosted, then call ollama as fallback
        """
        if not patient_data:
            # throw error - TODO: implement error throwing and handling here
            pass
        logger.info(f"fetched patient data: {mrno}")

        response = None
        if HOSTED_ENDPOINT:
            # call logic here - TODO: implement hosted model call logic for diagnosis here
            logger.info(f"calling hosted model: {HOSTED_ENDPOINT}")
            response = None
            pass
        else:
            # call ollama as fallback
            logger.info(f"calling ollama model: {OLLAMA_URL}")
            message: dict = {
                "role": ROLE,
                "content": CONTENT
                + f"\n\nThe following json depicts relevant information about the case: {patient_data}",
            }
            payload: dict = {
                "model": MODEL,
                "messages": [message],
                "stream": False,
                "options": {"temperature": 0},
            }
            response = requests.post(OLLAMA_URL, json=payload, timeout=800)

        # response handling
        if response.status_code == 200:
            # handle success scenerio
            cleaned_response = process_model_response(response.json())
        elif response == None:
            # throw exeption - TODO
            pass
        elif response.status_code != 200:
            # handle error code and exception - TODO
            pass
        else:
            # throw unknown error - TODO
            pass

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(
        {"message": "Diagnosis generated successfully"}, status=status.HTTP_200_OK
    )
