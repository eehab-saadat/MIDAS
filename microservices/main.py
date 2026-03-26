import io
import importlib.util
import json
import logging
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

import requests
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from PIL import Image, UnidentifiedImageError

from diagnosis import generate_diagnosis

logger = logging.getLogger(__name__)

CURRENT_DIR = Path(__file__).resolve().parent
IMAGE_PREPROCESSOR_DIR = CURRENT_DIR / "image_preprocessor"
DEFAULT_PREPROCESS_OUTPUT_DIR = IMAGE_PREPROCESSOR_DIR / "output"
VALID_MODALITIES = {
    "CT", "MRI", "XRAY", "ULTRASOUND", "HISTOPATH",
    "FUNDUS", "DERMOSCOPY", "MAMMOGRAPHY", "PET", "NUCLEAR_MED",
}

if str(IMAGE_PREPROCESSOR_DIR) not in sys.path:
    sys.path.append(str(IMAGE_PREPROCESSOR_DIR))

try:
    from microservices.report_extractor.validation.schema_validator import MedicalReport, SchemaValidator
    from microservices.report_extractor.extraction.vlm_engine import VLMEngine
    from microservices.report_extractor.preprocessing.image_preprocessor import ImagePreprocessor
except ModuleNotFoundError:
    from report_extractor.validation.schema_validator import MedicalReport, SchemaValidator
    from report_extractor.extraction.vlm_engine import VLMEngine
    from report_extractor.preprocessing.image_preprocessor import ImagePreprocessor

_PROCESS_IMAGE = None


app = FastAPI(
    title="MIDAS Microservices API",
    version="1.0.0",
    description="FastAPI microservices for MIDAS: report extraction, image preprocessing, and diagnosis",
)

# ---------------------------------------------------------------------------
# Diagnosis
# ---------------------------------------------------------------------------


class DiagnoseRequest(BaseModel):
    patient_data: dict


@app.post("/diagnose")
async def diagnose(body: DiagnoseRequest) -> dict:
    """Run MedGemma diagnosis on patient data via Ollama."""
    try:
        result = await run_in_threadpool(generate_diagnosis, body.patient_data)
        return result
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Ensure it is running on port 11434.",
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Ollama request timed out. The model may be loading — try again.",
        )
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Failed to parse model response: {exc}")
    except requests.exceptions.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Ollama returned an error: {exc}")
    except Exception as exc:
        logger.exception("Unexpected error in /diagnose")
        raise HTTPException(status_code=500, detail=f"Diagnosis failed: {exc}")


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


def _json_default(value: Any) -> Any:
    if isinstance(value, Path):
        return str(value)
    if hasattr(value, "tolist"):
        return value.tolist()
    if hasattr(value, "item"):
        return value.item()
    return str(value)


def _to_json_safe(payload: dict[str, Any]) -> dict[str, Any]:
    return json.loads(json.dumps(payload, default=_json_default))


def _get_process_image():
    global _PROCESS_IMAGE
    if _PROCESS_IMAGE is not None:
        return _PROCESS_IMAGE

    pipeline_path = IMAGE_PREPROCESSOR_DIR / "pipeline.py"
    spec = importlib.util.spec_from_file_location(
        "midas_image_preprocessor_pipeline", pipeline_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(
            f"Could not load pipeline module from: {pipeline_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _PROCESS_IMAGE = module.process_image
    return _PROCESS_IMAGE


@app.post("/extract-report")
async def extract_report(file: UploadFile = File(...)) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400, detail="Only image uploads are supported.")

    try:
        content = await file.read()
        image = Image.open(io.BytesIO(content)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid image file.") from exc
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail=f"Failed to read uploaded image: {exc}") from exc

    try:
        preprocessor = ImagePreprocessor()
        clean_img = preprocessor.preprocess(image)

        vlm = VLMEngine()
        raw_json = vlm.extract(clean_img, MedicalReport)

        validated_report = SchemaValidator.validate(raw_json)
        return validated_report.model_dump(mode="json")
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Extraction failed: {exc}") from exc


@app.post("/preprocess-image")
async def preprocess_image(
    file: UploadFile = File(...),
    modality: str | None = Query(
        default=None, description="Optional modality override"),
    config_path: str | None = Query(
        default=None, description="Optional path to config YAML"),
) -> dict:
    supported_extensions = {".dcm", ".dicom",
                            ".png", ".jpg", ".jpeg", ".tiff", ".tif"}
    filename_suffix = Path(file.filename or "").suffix.lower()

    if filename_suffix not in supported_extensions:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use DICOM/PNG/JPEG/TIFF.",
        )

    modality_override = None
    if modality:
        modality_override = modality.upper()
        if modality_override not in VALID_MODALITIES:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid modality. Must be one of: {', '.join(sorted(VALID_MODALITIES))}",
            )

    temp_suffix = filename_suffix if filename_suffix else ".img"
    temp_file_path: Path | None = None

    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=400, detail="Uploaded file is empty.")

        with NamedTemporaryFile(delete=False, suffix=temp_suffix) as temp_file:
            temp_file.write(content)
            temp_file_path = Path(temp_file.name)

        process_image = _get_process_image()
        result = await run_in_threadpool(
            process_image,
            str(temp_file_path),
            str(DEFAULT_PREPROCESS_OUTPUT_DIR),
            config_path,
            modality_override,
        )

        filtered_result = {
            "modality": result.get("modality"),
            "input_image_path": result.get("original_file", file.filename),
            "output_image_path": result.get("processed_image_path"),
            "model_findings": result.get("model_findings")
        }

        return _to_json_safe(filtered_result)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Image preprocessing failed: {exc}") from exc
    finally:
        if temp_file_path and temp_file_path.exists():
            temp_file_path.unlink()
