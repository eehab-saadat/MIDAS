from django.contrib import admin

from .models import BodyPart, Clinician, Encounter, Medication, SnomedEntity, Symptom


@admin.register(BodyPart)
class BodyPartAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(SnomedEntity)
class SnomedEntityAdmin(admin.ModelAdmin):
    list_display = ["snomed_cid", "fsn", "entity_type", "umls_cui"]
    list_filter = ["entity_type"]
    search_fields = ["snomed_cid", "fsn", "umls_cui"]
    filter_horizontal = ["body_parts"]


@admin.register(Clinician)
class ClinicianAdmin(admin.ModelAdmin):
    list_display = ["name", "title", "joining_date"]
    search_fields = ["name", "title"]


@admin.register(Encounter)
class EncounterAdmin(admin.ModelAdmin):
    list_display = ["patient", "clinician", "date"]
    list_filter = ["clinician"]
    search_fields = ["patient__mrno", "notes"]


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ["medication_name", "patient", "prescribed_by", "prescribed_on"]
    search_fields = ["medication_name", "active_agent_name", "patient__mrno"]


@admin.register(Symptom)
class SymptomAdmin(admin.ModelAdmin):
    list_display = ["snomed_entity", "encounter", "clinician_remarks"]
    search_fields = ["snomed_entity__fsn", "snomed_entity__snomed_cid"]
