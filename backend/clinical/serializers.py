from rest_framework import serializers

from .models import BodyPart, Clinician, Encounter, Medication, SnomedEntity, Symptom


class BodyPartSerializer(serializers.ModelSerializer):
    class Meta:
        model = BodyPart
        fields = [
            "id",
            "name",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class SnomedEntitySerializer(serializers.ModelSerializer):
    body_parts = BodyPartSerializer(many=True, read_only=True)
    body_part_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=BodyPart.objects.all(),
        source="body_parts",
        write_only=True,
        required=False,
    )

    class Meta:
        model = SnomedEntity
        fields = [
            "snomed_cid",
            "fsn",
            "umls_cui",
            "entity_type",
            "body_parts",
            "body_part_ids",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["body_parts", "created_at", "updated_at"]


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
    snomed_cid = serializers.CharField(
        source="snomed_entity.snomed_cid", read_only=True
    )
    snomed_fsn = serializers.CharField(source="snomed_entity.fsn", read_only=True)
    snomed_entity_type = serializers.CharField(
        source="snomed_entity.entity_type", read_only=True
    )

    class Meta:
        model = Symptom
        fields = [
            "id",
            "encounter",
            "snomed_entity",
            "snomed_cid",
            "snomed_fsn",
            "snomed_entity_type",
            "clinician_remarks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "snomed_cid",
            "snomed_fsn",
            "snomed_entity_type",
            "created_at",
            "updated_at",
        ]


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
        read_only_fields = [
            "patient_mrno",
            "clinician_name",
            "symptoms",
            "created_at",
            "updated_at",
        ]

    def get_clinician_name(self, obj) -> str | None:
        return obj.clinician.name if obj.clinician else None


class EncounterSummarySerializer(serializers.ModelSerializer):
    """Lightweight serializer for encounter lists — no notes or symptoms."""

    clinician_name = serializers.SerializerMethodField()

    class Meta:
        model = Encounter
        fields = [
            "id",
            "patient",
            "date",
            "clinician",
            "clinician_name",
        ]

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
            "active",
            "active_agent_name",
            "medication_name",
            "dosage",
            "frequency",
            "indication",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "patient_mrno",
            "prescribed_by_name",
            "created_at",
            "updated_at",
        ]

    def get_prescribed_by_name(self, obj) -> str | None:
        return obj.prescribed_by.name if obj.prescribed_by else None
