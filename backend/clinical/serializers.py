from rest_framework import serializers

from .models import Clinician, Encounter, Medication, Symptom


class ClinicianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinician
        fields = [
            "id",
            "name",
            "title",
            "joining_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class SymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symptom
        fields = [
            "id",
            "encounter",
            "code",
            "code_system",
            "description",
            "clinician_remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class EncounterSerializer(serializers.ModelSerializer):
    patient_mrno = serializers.CharField(source="patient.mrno", read_only=True)
    clinician_name = serializers.SerializerMethodField()
    # Inline list of symptoms; read-only here — manage via /api/symptoms/
    symptoms = SymptomSerializer(many=True, read_only=True)

    class Meta:
        model = Encounter
        fields = [
            "id",
            "patient",
            "patient_mrno",
            "clinician",
            "clinician_name",
            "date",
            "notes",
            "symptoms",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["patient_mrno", "clinician_name", "symptoms", "created_at", "updated_at"]

    def get_clinician_name(self, obj) -> str | None:
        return obj.clinician.name if obj.clinician else None


class MedicationSerializer(serializers.ModelSerializer):
    patient_mrno = serializers.CharField(source="patient.mrno", read_only=True)
    prescribed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Medication
        fields = [
            "id",
            "patient",
            "patient_mrno",
            "prescribed_by",
            "prescribed_by_name",
            "prescribed_on",
            "active_agent_name",
            "medication_name",
            "dosage",
            "frequency",
            "indication",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["patient_mrno", "prescribed_by_name", "created_at", "updated_at"]

    def get_prescribed_by_name(self, obj) -> str | None:
        return obj.prescribed_by.name if obj.prescribed_by else None
