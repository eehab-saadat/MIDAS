import io

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from report_extractor.validation.schema_validator import MedicalReport, SchemaValidator
from report_extractor.extraction.vlm_engine import VLMEngine
from report_extractor.preprocessing.image_preprocessor import ImagePreprocessor


app = FastAPI(
    title="Report Extractor API",
    version="1.0.0",
    description="FastAPI wrapper around microservices/report_extractor",
)


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


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
