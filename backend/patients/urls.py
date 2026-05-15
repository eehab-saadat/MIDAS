from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import PatientViewSet, VitalsViewSet, diagnose_with_medgemma, diagnosis_feedback

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"vitals", VitalsViewSet, basename="vitals")

urlpatterns = router.urls + [
    path("diagnose/", diagnose_with_medgemma, name="diagnose"),
    path("diagnosis-feedback/", diagnosis_feedback, name="diagnosis-feedback"),
]
