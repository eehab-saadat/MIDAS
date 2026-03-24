from rest_framework import serializers

from .models import Lab, Radiology


class RadiologySerializer(serializers.ModelSerializer):
    patient_mrno = serializers.CharField(source="patient.mrno", read_only=True)

    class Meta:
        model = Radiology
        fields = [
            "id",
            "patient",
            "patient_mrno",
            "cpt_id",
            "cpt_name",
            "technique",
            "result",
            "conclusion",
            "system_conclusion",
            "file_path",
            "created_at",
            "updated_at",
            "is_under_processing",
        ]
        read_only_fields = ["patient_mrno", "created_at", "updated_at"]


class LabSerializer(serializers.ModelSerializer):
    patient_mrno = serializers.CharField(source="patient.mrno", read_only=True)

    class Meta:
        model = Lab
        fields = [
            "id",
            "patient",
            "patient_mrno",
            "cpt_id",
            "cpt_name",
            "results",
            "invoice_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["patient_mrno", "created_at", "updated_at"]
