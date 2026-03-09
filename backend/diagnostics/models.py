from django.db import models


class Radiology(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="radiology_reports",
    )
    cpt_id = models.CharField(max_length=50, blank=True)
    cpt_name = models.CharField(max_length=255, blank=True)
    technique = models.TextField(blank=True) # description of the test
    result = models.TextField(blank=True) # machine generated result
    conclusion = models.TextField(blank=True) # radiologist generated conclusion
    system_conclusion = models.TextField(blank=True) # AI generated conclusion
    file_path = models.CharField(max_length=500, blank=True)

    class Meta:
        verbose_name_plural = "radiology reports"

    def __str__(self):
        return f"Radiology [{self.cpt_name}] for {self.patient.mrno}"


class Lab(models.Model):
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="lab_results",
    )
    cpt_id = models.CharField(max_length=50, blank=True)
    cpt_name = models.CharField(max_length=255, blank=True)
    # Keyed by test name, value is the numeric result
    # e.g. {"SODIUM": 138.0, "POTASSIUM": 4.1}
    results = models.JSONField(default=dict)
    invoice_date = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name_plural = "lab results"

    def __str__(self):
        return f"Lab [{self.cpt_name}] for {self.patient.mrno} on {self.invoice_date}"
