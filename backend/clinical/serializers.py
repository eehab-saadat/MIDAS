from rest_framework import serializers

from .models import Clinician, Encounter, Medication


class ClinicianSerializer(serializers.ModelSerializer):
    class Meta:
        model = Clinician
        fields = "__all__"


class EncounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Encounter
        fields = "__all__"


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = "__all__"
