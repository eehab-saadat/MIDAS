from rest_framework.routers import DefaultRouter

from .views import ClinicianViewSet, EncounterViewSet, MedicationViewSet

router = DefaultRouter()
router.register(r"clinicians", ClinicianViewSet, basename="clinician")
router.register(r"encounters", EncounterViewSet, basename="encounter")
router.register(r"medications", MedicationViewSet, basename="medication")

urlpatterns = router.urls
