from django.db import models


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
    active_agent_name = models.CharField(max_length=255, blank=True)
    medication_name = models.CharField(max_length=255)
    dosage = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    indication = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.medication_name} for {self.patient.mrno}"
