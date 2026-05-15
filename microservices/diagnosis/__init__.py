"""diagnosis package — MedGemma-based clinical diagnosis via Ollama."""

__all__ = ["generate_diagnosis", "add_to_store"]

from .engine import generate_diagnosis
from .rag import add_to_store
