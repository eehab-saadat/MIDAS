from rest_framework import serializers

from .models import Patient, Vitals


class VitalsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vitals
        fields = "__all__"


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()

    class Meta:
        model = Patient
        fields = ["id", "mrno", "name", "gender", "dob", "age", "history"]
