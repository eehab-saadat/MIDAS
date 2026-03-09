from rest_framework.routers import DefaultRouter

from .views import LabViewSet, RadiologyViewSet

router = DefaultRouter()
router.register(r"radiology", RadiologyViewSet, basename="radiology")
router.register(r"labs", LabViewSet, basename="lab")

urlpatterns = router.urls
