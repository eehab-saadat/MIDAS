"""
RAG module — dynamic 2-shot prompting via patient-case similarity.

Architecture
------------
1.  VectorStore loads seed.csv once at startup.
2.  Each row is serialised to a flat medical-text summary via
    `_patient_to_text`, which handles both the seed-CSV schema
    (radiology_reports / recent_encounters) and the app-facing
    schema (clinical_notes / medications / nested lab_results).
3.  Embeddings are built with sentence-transformers
    (``all-MiniLM-L6-v2``).  If the library is absent the module
    falls back to TF-IDF + cosine similarity transparently.
4.  `retrieve_similar_cases` is the single public entry-point used
    by engine.py.

Usage
-----
    from rag import retrieve_similar_cases
    examples = retrieve_similar_cases(patient_data, k=2)
    # each example → {"mrno", "patient_data", "diagnosis", "reasoning", "text"}
"""

from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from typing import Any

import numpy as np

# ---------------------------------------------------------------------------
# Optional heavy deps — graceful fallback
# ---------------------------------------------------------------------------
try:
    from sentence_transformers import SentenceTransformer  # type: ignore

    _USE_SBERT = True
except ImportError:  # pragma: no cover
    from sklearn.feature_extraction.text import TfidfVectorizer  # type: ignore
    from sklearn.metrics.pairwise import cosine_similarity  # type: ignore  # noqa: F401

    _USE_SBERT = False

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Text serialisation
# ---------------------------------------------------------------------------

def _safe_str(val: Any, max_chars: int = 400) -> str:
    """Coerce *val* to a trimmed string, returning '' for null-ish values."""
    if val is None:
        return ""
    s = str(val).strip()
    return s[:max_chars]


def _flatten_lab_results(lab_results: list[dict]) -> list[str]:
    """
    Handle two schemas:

    Seed-CSV schema
    ---------------
    {"cpt_name": "...", "results": {"TEST": {"result": 4.99, "unit": "..."}}}

    App schema (P001-style)
    -----------------------
    {"date": "...", "results": {"CBC": {"WBC_Count_per_mm3": 6800, ...}}}
    """
    parts: list[str] = []
    for lab in lab_results:
        results = lab.get("results", {})
        for test_name, test_data in results.items():
            if isinstance(test_data, dict):
                # Seed CSV: {"result": ..., "unit": ...}
                if "result" in test_data:
                    unit = test_data.get("unit", "")
                    parts.append(
                        f"Lab {test_name}: {test_data['result']} {unit}".strip()
                    )
                # App schema: nested panel e.g. {"WBC_Count_per_mm3": 6800}
                else:
                    for subkey, subval in test_data.items():
                        if not isinstance(subval, dict):
                            parts.append(f"Lab {test_name}/{subkey}: {subval}")
            elif isinstance(test_data, (int, float, str)):
                # flat scalar result (e.g. ESR_mm_per_hr: 6)
                parts.append(f"Lab {test_name}: {test_data}")
    return parts


def _patient_to_text(patient: dict) -> str:
    """
    Produce a dense, human-readable medical summary from *patient* dict.

    Handles both the seed-CSV schema and the app-facing patient schema
    so that the same encoder works for the index and for query patients.
    """
    parts: list[str] = []

    # ── Demographics ──────────────────────────────────────────────────────
    pi = patient.get("personal_information", {})
    age = pi.get("age") or patient.get("age")
    gender = pi.get("sex") or pi.get("gender")
    ethnicity = pi.get("ethnicity")
    if age:
        parts.append(f"Age: {age}")
    if gender:
        parts.append(f"Gender: {gender}")
    if ethnicity:
        parts.append(f"Ethnicity: {ethnicity}")

    fam = pi.get("family_history", {})
    if fam:
        fam_conditions = [k for k, v in fam.items() if v]
        if fam_conditions:
            parts.append("Family history: " + ", ".join(fam_conditions))

    social = pi.get("social_determinants", {})
    if social.get("smoking_status"):
        parts.append(f"Smoking: {social['smoking_status']}")

    # ── Known medical history ─────────────────────────────────────────────
    history = patient.get("known_medical_history", [])
    if history:
        parts.append("Medical history: " + "; ".join(_safe_str(h) for h in history))

    # ── Current symptoms ──────────────────────────────────────────────────
    symptoms = patient.get("current_symptoms", [])
    if symptoms:
        parts.append("Symptoms: " + "; ".join(_safe_str(s) for s in symptoms))

    # ── Vitals ────────────────────────────────────────────────────────────
    vitals = patient.get("vitals", {})
    _skip_vitals = {
        "timestamp", "weight_unit", "height_unit",
        "temperature_unit", "pulse_unit", "respiratory_rate_unit",
    }
    vital_parts = [
        f"{k}={v}"
        for k, v in vitals.items()
        if v not in (None, "", "C", "kg", "cm") and k not in _skip_vitals
    ]
    if vital_parts:
        parts.append("Vitals: " + ", ".join(vital_parts))

    # ── Lab results ───────────────────────────────────────────────────────
    lab_results = patient.get("lab_results", [])
    if lab_results:
        parts.extend(_flatten_lab_results(lab_results))

    # ── Radiology (seed schema) ───────────────────────────────────────────
    for report in patient.get("radiology_reports", []):
        name = report.get("cpt_name", "Radiology")
        conclusion = report.get("conclusion") or report.get("result", "")
        if conclusion:
            parts.append(f"{name}: {_safe_str(conclusion)}")

    # ── Clinical notes (app schema) ───────────────────────────────────────
    notes = patient.get("clinical_notes", {})
    if notes.get("summary"):
        parts.append(f"Clinical summary: {_safe_str(notes['summary'])}")
    if notes.get("assessment"):
        parts.append(f"Assessment: {_safe_str(notes['assessment'])}")

    # ── Recent encounter notes (seed schema) ──────────────────────────────
    for enc in patient.get("recent_encounters", [])[:2]:
        enc_notes = enc.get("notes", "")
        if enc_notes:
            parts.append(f"Encounter notes: {_safe_str(enc_notes, 250)}")

    return "\n".join(parts) if parts else "No structured patient data available"


# ---------------------------------------------------------------------------
# Vector store
# ---------------------------------------------------------------------------

class VectorStore:
    """
    In-memory store for seed patient-case embeddings.

    Parameters
    ----------
    seed_path : str | Path
        Path to seed.csv (columns: mrno, patient_details, diagnosis, reasoning).
    model_name : str
        Sentence-transformers model identifier (ignored when SBERT unavailable).
    """

    def __init__(
        self,
        seed_path: str | Path,
        model_name: str = "all-MiniLM-L6-v2",
    ) -> None:
        self.cases: list[dict[str, Any]] = []
        self.embeddings: np.ndarray | None = None
        self._encoder: Any = None   # SentenceTransformer or None
        self._tfidf: Any = None     # TfidfVectorizer or None

        self._load_seed(seed_path)
        self._build_index(model_name)
        log.info(
            "VectorStore ready: %d cases, backend=%s",
            len(self.cases),
            "sentence-transformers" if _USE_SBERT else "TF-IDF",
        )

    # ── Loading ───────────────────────────────────────────────────────────

    def _load_seed(self, path: str | Path) -> None:
        skipped = 0
        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                try:
                    patient_data = json.loads(row["patient_details"])
                    text = _patient_to_text(patient_data)
                    self.cases.append(
                        {
                            "mrno": row["mrno"],
                            "patient_data": patient_data,
                            "diagnosis": row["diagnosis"].strip(),
                            "reasoning": row["reasoning"].strip(),
                            "text": text,
                        }
                    )
                except (json.JSONDecodeError, KeyError) as exc:
                    skipped += 1
                    log.debug("Skipping row (parse error): %s", exc)
        if skipped:
            log.warning("Skipped %d malformed rows in seed CSV.", skipped)

    # ── Index ─────────────────────────────────────────────────────────────

    def _build_index(self, model_name: str) -> None:
        texts = [c["text"] for c in self.cases]
        if not texts:
            raise RuntimeError("Seed CSV produced no usable cases.")

        if _USE_SBERT:
            self._encoder = SentenceTransformer(model_name)
            self.embeddings = self._encoder.encode(
                texts,
                show_progress_bar=False,
                normalize_embeddings=True,
                batch_size=64,
            )
        else:
            self._tfidf = TfidfVectorizer(max_features=8000, ngram_range=(1, 2))
            raw = self._tfidf.fit_transform(texts).toarray().astype(np.float32)
            norms = np.linalg.norm(raw, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            self.embeddings = raw / norms

    # ── Retrieval ─────────────────────────────────────────────────────────

    def retrieve(
        self,
        patient_data: dict,
        k: int = 2,
    ) -> list[dict[str, Any]]:
        """
        Return the *k* most similar seed cases to *patient_data*.

        Returns
        -------
        list[dict]
            Each dict has keys: mrno, patient_data, diagnosis, reasoning, text.
            Ordered from most to least similar.
        """
        query_text = _patient_to_text(patient_data)

        if _USE_SBERT:
            query_emb = self._encoder.encode(
                [query_text],
                normalize_embeddings=True,
            )  # (1, D)
        else:
            raw = self._tfidf.transform([query_text]).toarray().astype(np.float32)
            norm = np.linalg.norm(raw)
            query_emb = raw / norm if norm > 0 else raw  # (1, D)

        # Cosine similarity via dot product of L2-normalised vectors → (N,)
        scores: np.ndarray = (self.embeddings @ query_emb.T).flatten()
        top_idx = int(np.argsort(scores)[::-1][:k].tolist()[0])
        top_indices = np.argsort(scores)[::-1][:k].tolist()

        results = [self.cases[i] for i in top_indices]
        log.debug(
            "Retrieved cases: %s (scores: %s)",
            [r["mrno"] for r in results],
            [round(float(scores[i]), 3) for i in top_indices],
        )
        return results


    # ── Dynamic insertion ─────────────────────────────────────────────────

    def add_case(
        self,
        patient_data: dict,
        diagnosis: str,
        reasoning: str,
        mrno: str = "FEEDBACK",
    ) -> None:
        """
        Add a new case to the store at runtime (e.g. from clinician feedback).

        The case is embedded immediately and appended to the index so it
        becomes available for future k-shot retrievals without a restart.
        """
        text = _patient_to_text(patient_data)
        case = {
            "mrno": mrno,
            "patient_data": patient_data,
            "diagnosis": diagnosis.strip(),
            "reasoning": reasoning.strip(),
            "text": text,
        }
        self.cases.append(case)

        if _USE_SBERT:
            new_emb = self._encoder.encode(
                [text],
                normalize_embeddings=True,
            )  # (1, D)
        else:
            raw = self._tfidf.transform([text]).toarray().astype(np.float32)
            norm = np.linalg.norm(raw)
            new_emb = raw / norm if norm > 0 else raw  # (1, D)

        self.embeddings = np.vstack([self.embeddings, new_emb])
        log.info(
            "Added feedback case to store (mrno=%s, dx=%r). Total cases: %d",
            mrno,
            diagnosis,
            len(self.cases),
        )


# ---------------------------------------------------------------------------
# Singleton + public API
# ---------------------------------------------------------------------------

_store: VectorStore | None = None


def init_store(seed_path: str | Path = None) -> VectorStore:
    """
    Initialise (or re-initialise) the singleton VectorStore.

    Call this explicitly at application startup if you need control
    over *seed_path*; otherwise ``retrieve_similar_cases`` will
    auto-init on first use with the default path.
    """
    if seed_path is None:
        seed_path = Path(__file__).resolve().parent.parent.parent / "data" / "Output" / "seed.csv"
        if not seed_path.exists():
            seed_path = Path(__file__).resolve().parent / "seed.csv"
    global _store
    _store = VectorStore(seed_path)
    return _store


def retrieve_similar_cases(
    patient_data: dict,
    k: int = 2,
    seed_path: str | Path = None,
) -> list[dict[str, Any]]:
    """
    Retrieve the *k* seed cases most similar to *patient_data*.

    This is the **only function engine.py needs to import**.

    Parameters
    ----------
    patient_data : dict
        The incoming patient JSON (either schema).
    k : int
        Number of examples to retrieve (default 2 for 2-shot prompting).
    seed_path : str | Path
        Path to seed.csv; used only on first call (singleton init).

    Returns
    -------
    list[dict]
        Up to *k* dicts, each with: mrno, patient_data, diagnosis,
        reasoning, text.  Ordered most → least similar.
    """
    global _store
    if _store is None:
        init_store(seed_path)
    return _store.retrieve(patient_data, k)


def add_to_store(
    patient_data: dict,
    diagnosis: str,
    reasoning: str,
    mrno: str = "FEEDBACK",
    seed_path: str | Path = None,
) -> None:
    """
    Add an approved diagnosis case to the singleton RAG store.

    If the store has not been initialised yet, it is created first from
    *seed_path* before the new case is appended.

    Parameters
    ----------
    patient_data : dict
        The patient JSON that produced the diagnosis.
    diagnosis : str
        The confirmed diagnosis string.
    reasoning : str
        The confirmed reasoning string.
    mrno : str
        Patient MRN (used as label only).
    seed_path : str | Path
        Fallback seed path for lazy initialisation.
    """
    global _store
    if _store is None:
        init_store(seed_path)
    _store.add_case(patient_data, diagnosis, reasoning, mrno)
