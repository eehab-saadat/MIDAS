from rest_framework import serializers
from django.db.models import Max

from .models import Patient, Vitals


class PatientSerializer(serializers.ModelSerializer):
    # Computed from dob; not a DB column — cannot be used directly as an
    # ordering field. Use ?ordering=dob (asc = oldest first / age desc) or
    # ?ordering=-dob (desc = youngest first / age asc) instead.
    age = serializers.ReadOnlyField()
    # Most recent visit date computed from related records
    last_visit_date = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            "id",
            "mrno",
            "name",
            "gender",
            "dob",
            "age",
            "last_visit_date",
            "history",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["age", "last_visit_date", "created_at", "updated_at"]

    def get_last_visit_date(self, obj):
        """
        Compute the most recent encounter date for the patient.
        """
        encounter_date = obj.encounters.aggregate(Max('date'))['date__max']
        return encounter_date


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
