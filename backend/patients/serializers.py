from rest_framework import serializers

from .models import Patient, Vitals


class PatientSerializer(serializers.ModelSerializer):
    # Computed from dob; not a DB column
    age = serializers.ReadOnlyField()

    class Meta:
        model = Patient
        fields = [
            "id",
            "mrno",
            "name",
            "gender",
            "dob",
            "age",
            "history",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class VitalsSerializer(serializers.ModelSerializer):
    # Human-readable patient identifier alongside the FK integer
    patient_mrno = serializers.CharField(source="patient.mrno", read_only=True)

    class Meta:
        model = Vitals
        fields = [
            "id",
            "patient",
            "patient_mrno",
            "timestamp",
            "weight",
            "weight_unit",
            "height",
            "height_unit",
            "temperature",
            "temperature_unit",
            "pulse",
            "pulse_unit",
            "respiratory_rate",
            "respiratory_rate_unit",
            "bp_high",
            "bp_low",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["patient_mrno", "created_at", "updated_at"]
