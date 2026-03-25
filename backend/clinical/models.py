from django.db import models
from .constants import BodyPart, SnomedEntityType


class BodyPart(models.Model):
    """
    Consumer-friendly, high-level body parts (e.g. 'Chest', 'Abdomen', 'Head & Face').
    Used to group SNOMED entities for UI filtering.
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Optional details about what this body part includes.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class SnomedEntity(models.Model):
    """
    A SNOMED CT concept imported from a terminology source file.
    Acts as the authoritative symptom/finding vocabulary for the system.
    """

    ENTITY_TYPE_CHOICES = [
        (SnomedEntityType.FINDING.value, "Finding/Symptom"),
        (SnomedEntityType.PROCEDURE.value, "Procedure"),
        (SnomedEntityType.BODY_STRUCTURE.value, "Body Structure"),
        (SnomedEntityType.OTHER.value, "Other"),
    ]

    # SNOMED_CID — CharField prevents integer truncation of large concept IDs
    snomed_cid = models.CharField(max_length=20, primary_key=True)
    # SNOMED_FSN (Fully Specified Name)
    fsn = models.CharField(
        max_length=500,
        help_text="Fully Specified Name, e.g. 'Hypertensive disorder, systemic arterial (disorder)'",
    )
    # UMLS_CUI (e.g. 'C0020538')
    umls_cui = models.CharField(max_length=20, blank=True, null=True)
    entity_type = models.CharField(
        max_length=20,
        choices=ENTITY_TYPE_CHOICES,
        default=SnomedEntityType.FINDING.value,
    )
    body_parts = models.ManyToManyField(
        BodyPart,
        related_name="snomed_entities",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "SNOMED Entities"
        ordering = ["fsn"]

    def __str__(self):
        return f"{self.snomed_cid} - {self.fsn}"


class Clinician(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    title = models.CharField(max_length=100, blank=True)
    joining_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} {self.name}".strip()


class Encounter(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="encounters",
    )
    clinician = models.ForeignKey(
        Clinician,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="encounters",
    )
    date = models.DateTimeField()
    # Stored as Markdown-formatted plain text
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Encounter {self.patient.mrno} on {self.date:%Y-%m-%d}"


class Medication(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="medications",
    )
    prescribed_by = models.ForeignKey(
        Clinician,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    prescribed_on = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    active_agent_name = models.CharField(max_length=255, blank=True)
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    indication = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medication_name} for {self.patient.mrno}"


class Symptom(models.Model):
    """
    An observed symptom or clinical finding recorded during an Encounter.

    Every symptom must reference a SnomedEntity — free-text codes are no longer
    accepted. The one-to-many relationship (Encounter → Symptoms) is enforced
    through the encounter FK.
    """

    encounter = models.ForeignKey(
        Encounter,
        on_delete=models.CASCADE,
        related_name="symptoms",
    )
    # PROTECT prevents accidental deletion of a SNOMED concept that has been
    # referenced in a patient's clinical history.
    snomed_entity = models.ForeignKey(
        SnomedEntity,
        on_delete=models.PROTECT,
        related_name="symptoms",
    )
    clinician_remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.snomed_entity.fsn} [{self.encounter}]"
