from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PatientViewSet, VitalsViewSet

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"vitals", VitalsViewSet, basename="vitals")

urlpatterns = [
    # diagnois endpoints
    path("diagnose/", diagnose_with_medgemma, name="diagnose"),
]

urlpatterns = router.urls
