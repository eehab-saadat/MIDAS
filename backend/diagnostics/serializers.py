from rest_framework import serializers

from .models import Lab, Radiology


class RadiologySerializer(serializers.ModelSerializer):
    class Meta:
        model = Radiology
        fields = "__all__"


class LabSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lab
        fields = "__all__"
