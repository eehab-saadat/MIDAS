from rest_framework.routers import DefaultRouter

from .views import PatientViewSet, VitalsViewSet, diagnose_with_medgemma

router = DefaultRouter()
router.register(r"patients", PatientViewSet, basename="patient")
router.register(r"vitals", VitalsViewSet, basename="vitals")

urlpatterns = [
    # diagnois endpoints
    path("diagnose/", views.diagnose_with_medgemma, name="diagnose"),
]

urlpatterns = router.urls
