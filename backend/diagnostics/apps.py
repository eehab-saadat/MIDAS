from django.apps import AppConfig


class DiagnosticsConfig(AppConfig):
    name = "diagnostics"

    def ready(self):
        import diagnostics.signals
