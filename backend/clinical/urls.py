from rest_framework.routers import DefaultRouter

from .views import ClinicianViewSet, EncounterViewSet, MedicationViewSet, SymptomViewSet

router = DefaultRouter()
router.register(r"clinicians", ClinicianViewSet, basename="clinician")
router.register(r"encounters", EncounterViewSet, basename="encounter")
router.register(r"medications", MedicationViewSet, basename="medication")
router.register(r"symptoms", SymptomViewSet, basename="symptom")

urlpatterns = router.urls
