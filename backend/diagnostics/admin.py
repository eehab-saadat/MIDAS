from django.contrib import admin
from .models import Radiology, Lab


@admin.register(Radiology)
class RadiologyAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "patient",
        "cpt_name",
        "locked",
        "created_at",
        "updated_at",
    ]
    list_filter = ["locked", "created_at"]
    search_fields = ["patient__mrno", "cpt_id", "cpt_name"]
    readonly_fields = ["locked", "system_conclusion", "created_at", "updated_at"]
    
    fieldsets = (
        ("Basic Information", {
            "fields": ("patient", "cpt_id", "cpt_name", "file_path")
        }),
        ("Report Details", {
            "fields": ("technique", "result", "conclusion")
        }),
        ("System Processing", {
            "fields": ("locked", "system_conclusion"),
            "classes": ("collapse",)
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )


@admin.register(Lab)
class LabAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "patient",
        "cpt_name",
        "invoice_date",
        "created_at",
    ]
    list_filter = ["invoice_date", "created_at"]
    search_fields = ["patient__mrno", "cpt_id", "cpt_name"]
    readonly_fields = ["created_at", "updated_at"]
