from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BodyPartViewSet,
    ClinicianViewSet,
    EncounterViewSet,
    MedicationViewSet,
    SnomedEntityViewSet,
    SymptomViewSet,
    transcribe_audio,
)

router = DefaultRouter()
router.register(r"body-parts", BodyPartViewSet, basename="bodypart")
router.register(r"snomed-entities", SnomedEntityViewSet, basename="snomedentity")
router.register(r"clinicians", ClinicianViewSet, basename="clinician")
router.register(r"encounters", EncounterViewSet, basename="encounter")
router.register(r"medications", MedicationViewSet, basename="medication")
router.register(r"symptoms", SymptomViewSet, basename="symptom")

urlpatterns = [
    path("transcribe/", transcribe_audio, name="transcribe-audio"),
] + router.urls
