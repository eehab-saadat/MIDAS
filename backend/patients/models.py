from datetime import date
from django.utils import timezone
from django.db import models


class Patient(models.Model):
    GENDER_CHOICES = [
        ("Male", "Male"),
        ("Female", "Female"),
        ("Other", "Other"),
    ]

    mrno = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True)
    dob = models.DateField(null=True, blank=True)
    history = models.TextField(blank=True)
    # default is current date/time
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["mrno"]

    def __str__(self):
        return f"{self.mrno} – {self.name or 'Unknown'}"

    @property
    def age(self) -> int | None:
        if not self.dob:
            return None
        today = date.today()
        return today.year - self.dob.year - (
            (today.month, today.day) < (self.dob.month, self.dob.day)
        )


class Vitals(models.Model):
    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="vitals"
    )
    timestamp = models.DateTimeField(null=True, blank=True)

    weight = models.FloatField(null=True, blank=True)
    weight_unit = models.CharField(max_length=20, blank=True)

    height = models.FloatField(null=True, blank=True)
    height_unit = models.CharField(max_length=20, blank=True)

    temperature = models.FloatField(null=True, blank=True)
    temperature_unit = models.CharField(max_length=20, blank=True)

    pulse = models.FloatField(null=True, blank=True)
    pulse_unit = models.CharField(max_length=20, blank=True)

    respiratory_rate = models.FloatField(null=True, blank=True)
    respiratory_rate_unit = models.CharField(max_length=20, blank=True)

    bp_high = models.FloatField(null=True, blank=True)
    bp_low = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-timestamp"]
        verbose_name_plural = "vitals"

    def __str__(self):
        return f"Vitals for {self.patient.mrno} @ {self.timestamp}"
