# Report Extractor API - Quick Reference Guide

This API provides endpoints for extracting medical reports from images and applying advanced image preprocessing with AI integration (via local `medgemma`).

## Base URL

By default, the server runs locally at: `http://localhost:8000`

---

## 1. Health Check

Check if the API is up and running.

**Endpoint:** `GET /health`

**Response:**

```json
{
  "status": "ok"
}
```

---

## 2. Extract Medical Report

Submits an image to the Vision Language Model (VLM) Engine to extract a structured medical report.

**Endpoint:** `POST /extract-report`

**Content-Type:** `multipart/form-data`

### Parameters

| Name   | Type              | Location | Required | Description                                                                                         |
| ------ | ----------------- | -------- | -------- | --------------------------------------------------------------------------------------------------- |
| `file` | `string($binary)` | FormData | **Yes**  | The medical image file (e.g. PNG, JPEG, DICOM representation). Must have an `image/*` content type. |

### Successful Response (200 OK)

Returns a validated structured JSON object representing the `MedicalReport` schema:

```json
{
  "patient": {
    "name": "John Doe",
    "age": 45,
    "gender": "Male",
    "report_date": "2023-10-25"
  },
  "lab_tests": [
    {
      "test_name": "Hemoglobin",
      "value": "13.5",
      "unit": "g/dL",
      "reference_range": "13.8 - 17.2",
      "abnormal_flag": true
    }
  ],
  "diagnosis": ["Mild Anemia"],
  "notes": "Review with primary care physician in 2 weeks."
}
```

### Error Responses

- **400 Bad Request**: Uploaded file is missing, empty, or not a recognized image type.
- **422 Unprocessable Entity**: The extracted JSON failed `MedicalReport` schema validation.
- **500 Internal Server Error**: Downstream VLM extraction or processing unexpectedly failed.

---

## 3. Preprocess Image (with Medgemma Insights)

Runs an image through the local preprocessing pipeline (Standardization, AI Quality Delta, Modality Filtering) and optionally extracts text-based insights using a local Ollama Medgemma instance.

**Endpoint:** `POST /preprocess-image`

**Content-Type:** `multipart/form-data`

### Parameters

| Name          | Type              | Location | Required | Description                                                                                                                                                         |
| ------------- | ----------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file`        | `string($binary)` | FormData | **Yes**  | The medical image file (`.dcm`, `.dicom`, `.png`, `.jpg`, `.jpeg`, `.tiff`, `.tif`).                                                                                |
| `modality`    | `string`          | Query    | No       | Overrides automatic modality detection. Valid options: `CT`, `MRI`, `XRAY`, `ULTRASOUND`, `HISTOPATH`, `FUNDUS`, `DERMOSCOPY`, `MAMMOGRAPHY`, `PET`, `NUCLEAR_MED`. |
| `config_path` | `string`          | Query    | No       | Path to an optional custom YAML configuration file for the preprocessing filters. If omitted, uses the default `modality_configs.yaml`.                             |

### Successful Response (200 OK)

Returns a filtered JSON object with the processed paths and the findings array extracted from Medgemma.

```json
{
  "modality": "XRAY",
  "input_image_path": "/Users/.../microservices/image_preprocessor/output/temp_img/original_img.png",
  "output_image_path": "/Users/.../microservices/image_preprocessor/output/temp_img/processed.png",
  "model_findings": {
    "image_type": "X-ray",
    "body_part": "Chest",
    "findings": [
      "First detailed clinical finding.",
      "Second detailed clinical finding."
    ]
  }
}
```

_(Note: If the inner JSON parsing of `model_findings` fails, it falls back to returning the text payload inside `{"raw_output": "..." }`)_

### Error Responses

- **400 Bad Request**: Unsupported file type, or the uploaded file is empty.
- **422 Unprocessable Entity**: An invalid string was provided for the `modality` parameter, or validation errors during standardization.
- **500 Internal Server Error**: The preprocessing pipeline crashed severely. (Note: Medgemma errors themselves do not crash the endpoint, but surface as an error string inside `model_findings`).

---

## Requirements for `/preprocess-image`

To fully utilize the **Medgemma AI Findings** feature within the `preprocess-image` route:

1. Ensure `ollama` is installed and running on your active machine: `http://localhost:11434`
2. Ensure the Medgemma model is actively installed inside Ollama (`ollama pull thiagomoraes/medgemma-4b-it:Q8_0`).
