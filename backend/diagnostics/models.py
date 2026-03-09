from django.db import models


class Radiology(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="radiology_reports",
    )
    cpt_id = models.CharField(max_length=50, blank=True)
    cpt_name = models.CharField(max_length=255, blank=True)
    technique = models.TextField(blank=True)
    result = models.TextField(blank=True)
    conclusion = models.TextField(blank=True)
    system_conclusion = models.TextField(blank=True)
    file_path = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "radiology reports"

    def __str__(self):
        return f"Radiology [{self.cpt_name}] for {self.patient.mrno}"


class Lab(models.Model):
    id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="lab_results",
    )
    cpt_id = models.CharField(max_length=50, blank=True)
    cpt_name = models.CharField(max_length=255, blank=True)
    # e.g. {"SODIUM": {"result": 138.0, "unit": "", "normal_range": ["", ""]}}
    results = models.JSONField(default=dict)
    invoice_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "lab results"

    def __str__(self):
        return f"Lab [{self.cpt_name}] for {self.patient.mrno} on {self.invoice_date}"
