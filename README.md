# Multiple Input Diagnostic Aid System (MIDAS)

MIDAS is a modular healthcare decision-support platform that consolidates heterogeneous clinical data (demographics, encounters, structured laboratory panels, radiology narratives, vital signs, and SNOMED CT–coded symptoms) into a single repository and exposes it through a REST API. The system is intended to support clinician-facing workflows, future multimodal AI inference, and interoperability-oriented design, as described in the project’s formal requirements specification.

This repository implements the data layer, ingestion pipeline, Django REST API, auxiliary Python microservices for medical image handling and report extraction, and a legacy web client. The specification document *F25-047-Documentation* (National University of Computer and Emerging Sciences, Lahore) defines the broader vision: a multi-agent, explainable AI framework that fuses clinical notes, laboratory results, imaging, vitals, and social determinants of health (SDoH) to reduce cognitive load and diagnostic error. The code in this repository represents the current engineering baseline toward that vision.

---

## Project background and vision (specification summary)

Contemporary diagnosis depends on correlating information that often resides in separate systems or formats. MIDAS is specified as an AI-assisted, clinician-centered decision aid—not a replacement for professional judgment—that:

- Integrates multimodal patient data into a unified, longitudinal view.
- Applies specialized processing per modality (for example, natural language processing for notes, analytics for labs and vitals, computer vision for imaging) within a multi-agent architecture.
- Produces prioritized differential diagnoses, actionable recommendations, and structured documentation with explainable reasoning.
- Targets workflow integration, security, and standards such as HL7 FHIR R4 for exchange (specified as a long-term interoperability goal).

**Institutional context (from project documentation):** Final Year Project; authors Muhammad Huzyefah Saqib, Muhammad Eehab Saadat, and Fayyez Farrukh; supervisor Kashif Zafar; affiliation National University of Computer and Emerging Sciences, Lahore.

---

## Implemented capabilities versus specification

The following clarifies what the repository delivers today relative to the formal Software Requirement Specifications.

| Area | Specification intent | Current repository state |
| ------ | ---------------------- | --------------------------- |
| Central patient repository | Longitudinal EHR-style records, search, CRUD | Implemented in Django models and REST ViewSets (`patients`, `clinical`, `diagnostics`). |
| Clinical notes | Markdown encounter notes | `Encounter.notes` stored as plain text (Markdown-capable). |
| Labs and imaging | Structured storage and chronology | `Lab` (JSON per panel) and `Radiology` models with patient linkage; list/filter/search via API. |
| Symptoms | Ontology-backed findings | `Symptom` records linked to `SnomedEntity`; optional `BodyPart` grouping for UI or filtering. |
| Terminology | SNOMED CT concepts | `SnomedEntity` with management command for ingestion (`ingest_snomed_data`); API CRUD. |
| AI diagnosis | Explainable inference; specification targets sub-ninety-second case turnaround | Partial: `get_complete_patient_details` builds the case bundle; `POST /api/diagnose/?mrno=` proxies to the FastAPI `POST /diagnose` endpoint (Ollama / MedGemma-class flow in `microservices/diagnosis`). `run_batch_diagnosis` management command batches cases to CSV via Ollama. |
| Authentication and RBAC | Secure login, sessions, roles, audit logs | JWT is **enabled** by default: `JWTAuthentication` plus `IsAuthenticated` on the REST API. Pair obtain/refresh/verify at `/api/token/`, `/api/token/refresh/`, `/api/token/verify/`; `POST /api/register/` creates Django users (`AllowAny`). Session/basic auth remain available. Role-based access, audit trails, and multi-tenancy are not fully modeled. |
| FHIR export | HL7 FHIR R4 exchange | Not implemented as an automated exporter in this codebase (specified as a target). |
| SDoH | Captured in clinical sessions | Specified in documentation; not modeled as first-class entities in the current Django schema. |
| Web application | Next.js clinician UI | `frontend/` exists but is **deprecated** and scheduled for replacement; do not treat it as the long-term client. |

---

## Feature catalogue

The list below merges **specified** features (from the project documentation) with **implemented or partially implemented** capabilities observed in the codebase.

### Specification-defined primary features

1. Integration of multimodal clinical data (notes, prescriptions, laboratory results, symptoms, medical imaging, and SDoH) into a unified platform.
2. AI-enabled, data-driven diagnostic inference in a controlled, oversight-friendly setting.
3. Reduction of cognitive load on clinicians during diagnostic work.
4. Simpler digitization and structuring of medical records.
5. Patient information lifecycle management (create, retrieve, update, delete) for EHR-oriented data.
6. Alignment with industry practices for medical record management and interoperability (including FHIR R4 as a stated compliance target).

### Specification-defined functional themes

**User management (target state):**

- Secure authentication for dashboard access.
- Session establishment and termination on logout.
- User activity logging for non-repudiation.
- Role-based access with least privilege.
- Multi-tenancy with institutional data separation.

**Patient repository management (target state):**

- Register and maintain patients; search by name and identifier.
- Longitudinal history with chronological symptoms and quantitative labs.
- Central summarization endpoint for medical summary retrieval and sharing.
- FHIR-format exchange and export to PDF or Word (targets).
- Clinical notes captured and maintained from the dashboard.

**Medical diagnosis management (target state):**

- Ranked list of potential conditions from supplied inputs.
- Actionable next-step recommendations.
- Incorporation of notes and SDoH into the diagnosis pipeline.
- Explainable AI outputs with explicit reasoning.

### Implemented backend and data features

- **Patient registry:** Unique `mrno`, demographics, optional history text; computed `age` from `dob` (not stored as a column).
- **Vitals:** Time-stamped measurements with explicit units; foreign key to patient; filter by `?patient=`.
- **Clinicians:** Directory of prescribers and encounter authors.
- **Encounters:** Patient and optional clinician linkage; datetime; Markdown-oriented `notes`; nested symptoms in serializer responses.
- **Medications:** Prescription records with optional prescriber, dates, dosage, frequency, indication.
- **Diagnostics:** Radiology reports (technique, result, human `conclusion`, separate `system_conclusion` for AI or system use, optional `file_path`); laboratory panels as JSON documents keyed by test name with `result`, `unit`, and `normal_range` structure per project conventions.
- **Terminology:** `BodyPart` and `SnomedEntity` with many-to-many association; `Symptom` ties encounters to SNOMED concepts with optional clinician remarks.
- **Aggregated patient snapshot:** `GET /api/patients/mrno/<mrno>/` returns a consolidated JSON document (demographics, latest vitals, recent labs and radiology, medications, recent encounters with symptoms).
- **REST API:** Paginated list endpoints (default **page size 6** via `REST_FRAMEWORK["PAGE_SIZE"]` in `settings/base.py`), `search` and `ordering` where configured per ViewSet.
- **OpenAPI:** Schema and interactive docs from **drf-spectacular** — `GET /api/schema/`, Swagger UI at `/api/docs/`, ReDoc at `/api/redoc/` (schema UI is `AllowAny`; API calls still require auth unless you override per view).
- **User registration:** `core` app exposes `POST /api/register/` for Django `User` creation (used with JWT login).
- **Django admin:** Standard admin site at `/admin/` for model maintenance.
- **Uploaded media:** Radiology and similar file paths resolve under `backend/media/` (`MEDIA_ROOT` is one level above the inner `backend` package).
- **Background imaging pipeline:** On new `Radiology` rows with `file_path`, `diagnostics/signals.py` dispatches `process_radiology_image` via **Celery** when the broker is reachable; otherwise it falls back to a **daemon thread** calling the microservice preprocess endpoint (see `diagnostics/tasks.py`, `diagnostics/utils.py`).
- **FMH data pipeline:** Excel processors under `data/FMH/scripts/` and ORM-based loader `backend/ingest_fmh_data.py` with optional `--flush` and `--data-dir`.

### Microservice features (`microservices/`)

- **FastAPI gateway** (`microservices/main.py`): `GET /health`; `POST /diagnose` (JSON body with `patient_data`, Ollama-backed MedGemma-class inference); `POST /extract-report` (image upload, preprocessing, vision-language extraction, schema validation); `POST /preprocess-image` (DICOM or raster uploads, optional modality override, delegates to the image preprocessor pipeline).
- **Image preprocessor:** Modality detection, modality-specific filters (CT, MRI, X-ray, ultrasound, histopathology, fundus, dermoscopy, and others), DICOM handling, quality assessment, LLM-oriented context formatting.
- **Report extractor:** VLM-based structured extraction with Pydantic schema validation.

### Quality and non-functional attributes (from specification)

The documentation specifies performance (for example, full case processing under ninety seconds), UI responsiveness, scalability targets (concurrent sessions and patient counts), encryption in transit and at rest, RBAC, and PMDC ethical alignment. These should be treated as **design targets**; verify each against deployment configuration before claiming compliance.

---

## Technology stack

| Layer | Technology |
|-------|------------|
| Core API | Python 3.12+, Django 6.0.3, Django REST Framework 3.16.1 |
| API schema | drf-spectacular (OpenAPI 3) |
| Filtering | django-filter (in `requirements.txt`; not enabled in `INSTALLED_APPS` until you wire `DjangoFilterBackend`) |
| Database (development) | SQLite at `backend/backend/db.sqlite3` (`NAME = BASE_DIR / "db.sqlite3"` in `settings/dev.py`, with `BASE_DIR` = inner `backend/` package path) |
| Database (production-oriented) | PostgreSQL supported via `psycopg2-binary` (configure in settings) |
| HTTP CORS | `django-cors-headers` (`CORS_ALLOW_ALL_ORIGINS = True` in base settings—tighten for production) |
| Authentication | `djangorestframework-simplejwt` — JWT default on the API; registration via `core` |
| Async tasks | Celery 5.x with Redis as default broker/result backend (`CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` in `settings/base.py`) |
| LLM utilities (batch / tooling) | `google-generativeai` (e.g. `generate_gt` management command); Ollama client in microservices |
| Data processing | pandas, openpyxl |
| Microservices API | FastAPI, Uvicorn, Pillow, PyDICOM, MONAI-oriented stack per `microservices/requirements.txt` |
| Legacy frontend | Next.js **16**, React **19**, Tailwind CSS **4**, daisyUI **5** under `frontend/`—deprecated |
| Dev tooling | `django-debug-toolbar`, `black` (see `requirements.txt`) |
| CI | GitHub Actions workflow `django.yml` (install `backend/requirements.txt`, `python backend/manage.py check`, `python backend/manage.py test`) |

---

## Repository structure

```
MIDAS/
├── backend/                      # Django project root (primary application)
│   ├── manage.py
│   ├── requirements.txt
│   ├── ingest_fmh_data.py       # Bulk load processed FMH Excel files into the ORM
│   ├── API_DOCUMENTATION.md     # Endpoint reference (maintain alongside code)
│   ├── backend/                 # Project package (Django BASE_DIR for settings)
│   │   ├── settings/
│   │   │   ├── base.py          # REST_FRAMEWORK (JWT, pagination, spectacular), CORS, Celery, MEDIA
│   │   │   └── dev.py           # Development SQLite (`backend/backend/db.sqlite3`)
│   │   ├── urls.py              # Admin, JWT, register, OpenAPI, api app includes
│   │   ├── celery.py            # Celery app (task autodiscovery)
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── patients/                # App: Patient, Vitals; patient-centric utilities
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py             # PatientViewSet, VitalsViewSet; mrno snapshot action
│   │   ├── urls.py              # DefaultRouter: patients, vitals
│   │   ├── utils.py             # get_complete_patient_details(mrno)
│   │   └── management/commands/
│   │       ├── run_batch_diagnosis.py
│   │       ├── get_all_patients_in_csv.py
│   │       └── generate_gt.py          # optional Gemini-assisted ground truth (API key)
│   ├── clinical/                # App: BodyPart, SnomedEntity, Clinician, Encounter, Medication, Symptom
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── constants.py         # SNOMED entity type enums
│   │   └── management/commands/
│   │       ├── ingest_snomed_data.py
│   │       ├── query_snomed.py
│   │       └── map_snomed_to_bodyParts.py
│   ├── diagnostics/             # App: Radiology, Lab; Celery tasks; post_save radiology pipeline
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── signals.py
│   │   ├── tasks.py
│   │   ├── utils.py
│   │   └── management/commands/
│   │       └── unlock_existing_radiology.py
│   └── core/                    # User registration API (`RegisterView`); empty models module
├── data/
│   ├── FMH/                     # Fatima Memorial Hospital derived datasets
│   │   ├── files/
│   │   │   ├── raw/             # Source spreadsheets
│   │   │   └── processed/       # Normalized inputs for ingest_fmh_data.py
│   │   └── scripts/             # Excel processors and orchestration (main.py)
│   ├── Output/                  # Optional evaluation exports (e.g. CSV ground truth)
│   └── fake/                    # Sample JSON fixtures for testing or demos
├── microservices/               # FastAPI + image preprocessor + report extractor
│   ├── main.py                  # ASGI app: health, extract-report, preprocess-image
│   ├── image_preprocessor/      # Pipeline, filters, DICOM, quality, agents
│   └── report_extractor/        # VLM engine, preprocessing, schema validation
├── frontend/                    # Legacy Next.js UI (deprecated; replacement planned)
├── old-frontend/               # Earlier Next.js experiment (not the active client)
├── old-backend/                 # Earlier experimental backend (not the active API)
├── media/                       # Created at runtime for uploaded clinical files (Django MEDIA_ROOT)
├── .github/workflows/         # CI definitions
└── .cursor/rules/             # Editor-level project conventions (optional for contributors)
```

### Backend code organization conventions

- **Models:** Every entity includes `created_at` and `updated_at`. Cross-app foreign keys use string references (for example `"patients.Patient"`). Nullable foreign keys use `null=True, blank=True`. Derived values (such as age) use `@property`, not redundant columns.
- **Serializers:** Explicit field lists; timestamps read-only; human-readable companion fields (for example `patient_mrno`) alongside raw foreign keys; `SerializerMethodField` for nullable traversals.
- **ViewSets:** `select_related` / `prefetch_related` aligned with serializer access; default `ordering` on the class; patient scoping via `?patient=<id>` where applicable.

---

## Database structure

The physical schema is defined by Django migrations. The logical model is as follows.

### Entity-relationship overview

- **Patient** (1) — (N) **Vitals**  
- **Patient** (1) — (N) **Encounter**  
- **Patient** (1) — (N) **Medication**  
- **Patient** (1) — (N) **Radiology**  
- **Patient** (1) — (N) **Lab**  
- **Clinician** (1) — (N) **Encounter** (nullable on encounter)  
- **Clinician** (1) — (N) **Medication** as prescriber (nullable)  
- **Encounter** (1) — (N) **Symptom**  
- **SnomedEntity** (1) — (N) **Symptom** (`PROTECT` on delete to preserve clinical references)  
- **SnomedEntity** (N) — (N) **BodyPart** (through table for grouping and filtering)

### Table-level field summary

| Model | Purpose | Notable fields |
|-------|---------|----------------|
| `Patient` | Registry | `mrno` (unique), `name`, `gender`, `dob`, `history` |
| `Vitals` | Physiologic measurements | `timestamp`, weight/height/temperature/pulse/respiratory rate with units, `bp_high`, `bp_low` |
| `Clinician` | Provider directory | `name`, `title`, `joining_date` |
| `Encounter` | Visit | `patient`, `clinician` (optional), `date`, `notes` (Markdown-oriented) |
| `Medication` | Prescription | `medication_name`, `active_agent_name`, `dosage`, `frequency`, `indication`, `prescribed_on`, `prescribed_by` |
| `BodyPart` | UI-oriented anatomy grouping | `name`, `description` |
| `SnomedEntity` | Terminology | `snomed_cid` (primary key), `fsn`, `umls_cui`, `entity_type`, M2M `body_parts` |
| `Symptom` | Encounter finding | `encounter`, `snomed_entity`, `clinician_remarks` |
| `Radiology` | Imaging report | `cpt_id`, `cpt_name`, `technique`, `result`, `conclusion`, `system_conclusion`, `file_path` |
| `Lab` | Panel result | `cpt_id`, `cpt_name`, `results` (JSON), `invoice_date` |

**Lab JSON shape (canonical):** each key is a test identifier; each value is an object with `result` (numeric or null), `unit`, and `normal_range` (typically a two-element list representing bounds or textual norms).

---

## HTTP API surface

Most JSON API routes are mounted under **`/api/`**. **Authentication:** supply `Authorization: Bearer <access_token>` for protected endpoints after obtaining tokens (see below). The browsable API is available in development when opening endpoints in a browser. Pagination follows Django REST Framework’s page-number style: `count`, `next`, `previous`, `results`; default **page size 6**; use `?page=<n>`.

### Authentication and OpenAPI

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/register/` | Create a Django user (`AllowAny`) |
| POST | `/api/token/` | Obtain JWT pair (username / password) |
| POST | `/api/token/refresh/` | Refresh access token |
| POST | `/api/token/verify/` | Verify a token |
| GET | `/api/schema/` | OpenAPI schema |
| GET | `/api/docs/` | Swagger UI |
| GET | `/api/redoc/` | ReDoc |

### Cross-cutting query parameters

| Parameter | Description |
|-----------|-------------|
| `?page=<n>` | Page index for list endpoints |
| `?search=<term>` | Where `SearchFilter` is enabled (fields vary per ViewSet) |
| `?ordering=<field>` | Sort; prefix with `-` for descending |

### Diagnosis proxy (Django → microservice)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/diagnose/?mrno=<mrno>` | Loads the patient bundle via `get_complete_patient_details`, forwards JSON to FastAPI `POST /diagnose` (env **`MICROSERVICE_URL`**, default `http://localhost:8001`). Requires a running microservice and Ollama where configured. |

### Patients and vitals

| Method | Path | Description |
|--------|------|-------------|
| GET, POST | `/api/patients/` | List or create patients |
| GET, PUT, PATCH, DELETE | `/api/patients/{id}/` | Retrieve, replace, partial update, delete |
| GET | `/api/patients/mrno/<mrno>/` | Full aggregated snapshot by medical record number |
| GET | `/api/patients/{id}/vitals/` | All vitals for patient |
| GET | `/api/patients/{id}/encounters/` | All encounters (with symptoms) |
| GET | `/api/patients/{id}/medications/` | All medications |
| GET | `/api/patients/{id}/radiology/` | All radiology reports |
| GET | `/api/patients/{id}/labs/` | All laboratory panels |
| GET, POST | `/api/vitals/` | List or create vitals |
| GET, PUT, PATCH, DELETE | `/api/vitals/{id}/` | Vitals instance operations |
| — | `?patient=<patient_pk>` | Filter vitals by patient |

**Patient list:** `search` on `mrno`, `name`; `ordering` on `mrno`, `name`, `dob`.

### Clinical

| Method | Path | Description |
|--------|------|-------------|
| GET, POST | `/api/clinicians/` | List or create clinicians |
| GET, PUT, PATCH, DELETE | `/api/clinicians/{id}/` | Clinician instance |
| GET, POST | `/api/encounters/` | List or create encounters |
| GET, PUT, PATCH, DELETE | `/api/encounters/{id}/` | Encounter instance |
| GET, POST | `/api/medications/` | List or create medications |
| GET, PUT, PATCH, DELETE | `/api/medications/{id}/` | Medication instance |
| GET, POST | `/api/body-parts/` | List or create body-part tags |
| GET, PUT, PATCH, DELETE | `/api/body-parts/{id}/` | Body part instance |
| GET, POST | `/api/snomed-entities/` | List or create SNOMED rows |
| GET, PUT, PATCH, DELETE | `/api/snomed-entities/{snomed_cid}/` | SNOMED instance (PK is `snomed_cid`) |
| GET, POST | `/api/symptoms/` | List or create symptoms |
| GET, PUT, PATCH, DELETE | `/api/symptoms/{id}/` | Symptom instance |

**Encounters:** `?patient=`, `?clinician=`; `search` on `notes`; `ordering` on `date`.

**Medications:** `?patient=`; `search` on `medication_name`, `active_agent_name`; `ordering` on `prescribed_on`, `medication_name`.

**SNOMED entities:** `?entity_type=`, `?body_part=`; `search` on `fsn`, `snomed_cid`, `umls_cui`; `ordering` on `fsn`, `snomed_cid`.

**Symptoms:** `?encounter=`, `?snomed_entity=` (concept id); `search` on related FSN/CID; `ordering` on `created_at`.

### Diagnostics

| Method | Path | Description |
|--------|------|-------------|
| GET, POST | `/api/radiology/` | List or create radiology reports |
| GET, PUT, PATCH, DELETE | `/api/radiology/{id}/` | Radiology instance |
| GET, POST | `/api/labs/` | List or create lab panels |
| GET, PUT, PATCH, DELETE | `/api/labs/{id}/` | Lab instance |

**Radiology:** `?patient=`; `search` on `cpt_name`, `cpt_id`; `ordering` on `cpt_name`.

**Labs:** `?patient=`; `search` on `cpt_name`, `cpt_id`; `ordering` on `invoice_date`, `cpt_name`.

### Administrative and diagnostic tooling

| Component | Access | Notes |
|-----------|--------|-------|
| Django admin | `GET /admin/` | Requires superuser |
| Batch LLM inference | `python manage.py run_batch_diagnosis` | Writes CSV; uses Ollama or optional `HOSTED_ENDPOINT` |
| Patient export | `python manage.py get_all_patients_in_csv` | Export patients for offline use |
| Ground-truth generation | `python manage.py generate_gt` | Uses Google Generative AI (configure API credentials) |
| SNOMED helpers | `query_snomed`, `map_snomed_to_bodyParts` | Query/mapping utilities |
| Radiology maintenance | `python manage.py unlock_existing_radiology` | Diagnostics maintenance command |
| FMH ingestion | `python ingest_fmh_data.py` | See Data ingestion below |

Extended narrative examples and payload samples are maintained in `backend/API_DOCUMENTATION.md`.

### Microservice HTTP API (`microservices/main.py`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness probe |
| POST | `/diagnose` | JSON `{"patient_data": { ... }}`; runs Ollama-backed diagnosis (`microservices/diagnosis`) |
| POST | `/extract-report` | Multipart image upload; returns validated structured report JSON |
| POST | `/preprocess-image` | Upload DICOM or image; optional `modality` and `config_path` query parameters |

Django calls this service using **`MICROSERVICES_URL`** (default `http://localhost:8001`) for radiology preprocessing tasks, and **`MICROSERVICE_URL`** (same default in `patients.views`) for the diagnose proxy—run Uvicorn on a matching host/port (see **Microservices (FastAPI)** under Installation).

---

## Data ingestion and offline processing

### FMH Excel pipeline

1. Place raw workbooks under `data/FMH/files/raw/` (see `data/FMH/scripts/README.md` for expected column layouts).
2. Execute processors from `data/FMH/scripts/` (entry point `main.py`) to emit normalized files under `data/FMH/scripts/output/` or the mirrored `data/FMH/files/processed/` tree used by Django ingestion.
3. From `backend/`, run:

   ```bash
   python ingest_fmh_data.py
   ```

   Options:

   - `--flush` — delete existing rows before load (use with caution).
   - `--data-dir <path>` — override the processed files directory (default: `../data/FMH/files/processed` relative to `ingest_fmh_data.py`).

### SNOMED terminology

Import or refresh terminology using the clinical management command (exact filename and format are defined in the command implementation):

```bash
cd backend
python manage.py ingest_snomed_data --help
```

---

## Installation and operation

### Prerequisites

- Python **3.12** (matches CI matrix; other 3.11+ versions may work but are not validated in CI).
- Git.
- For microservices: additional dependencies for FastAPI, imaging, and optional VLM backends (consult `microservices` package layout and any local `requirements` files if present).
- For batch diagnosis: [Ollama](https://ollama.com/) or a compatible hosted inference endpoint when implemented.

### Backend (Django)

1. Clone the repository and change into the backend directory:

   ```bash
   cd backend
   ```

2. Create and activate a virtual environment (recommended).

3. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables. The project loads `.env` via `python-dotenv`. At minimum, set:

   - `SECRET_KEY` — Django secret key (also used to sign JWTs).
   - `DEBUG` — use `1` for development; omit or set otherwise for production-like runs.

   Optional integration:

   - `MICROSERVICES_URL` / `MICROSERVICE_URL` — FastAPI base URL for radiology preprocessing and `/api/diagnose` proxy (defaults to `http://localhost:8001`).
   - `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` — Redis URLs for Celery (defaults in `settings/base.py`; worker required for async tasks).

5. Point Django at development settings (required by project convention):

   ```bash
   set DJANGO_SETTINGS_MODULE=backend.settings.dev
   ```

   On Unix-style shells:

   ```bash
   export DJANGO_SETTINGS_MODULE=backend.settings.dev
   ```

6. Apply migrations and create an administrative user if needed:

   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

7. Start the development server:

   ```bash
   python manage.py runserver
   ```

   The API base URL is `http://127.0.0.1:8000/api/`. The admin site is `http://127.0.0.1:8000/admin/`.

8. Optional: load FMH processed data:

   ```bash
   python ingest_fmh_data.py
   ```

### PostgreSQL (optional)

Replace the `DATABASES` definition in `backend/backend/settings/dev.py` (or add a dedicated `prod.py`) with a PostgreSQL configuration using `psycopg2`. Run `migrate` against the new database before serving traffic.

### Continuous integration

The workflow `.github/workflows/django.yml` installs `backend/requirements.txt`, runs `python backend/manage.py check`, and `python backend/manage.py test` on pushes and pull requests to `main`. `backend/manage.py` sets `DJANGO_SETTINGS_MODULE` to `backend.settings.dev` by default, so CI does not need a separate env var unless you change that layout.

### Celery worker (optional)

If you want radiology image tasks to run through the broker instead of in-process threads:

```bash
cd backend
celery -A backend worker -l info
```

Ensure Redis (or your configured broker) is running.

### Microservices (FastAPI)

Install dependencies from `microservices/requirements.txt` (and `microservices/report_extractor/requirements.txt` if you use the full VLM stack). From the repository root:

```bash
cd microservices
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

Verify `GET http://127.0.0.1:8001/health`. Use the same port in `MICROSERVICES_URL` / `MICROSERVICE_URL` on the Django side. Image and VLM operations require appropriate model weights, API keys, and hardware as configured in `report_extractor` and `image_preprocessor`.

### Legacy frontend

The `frontend/` Next.js application is deprecated. If you must run it for historical comparison, use its own `package.json` scripts (`pnpm install` / `npm install`, then `pnpm dev` or `npm run dev`) after installing Node.js. The stack is Next.js 16, React 19, Tailwind 4, and daisyUI 5. Point the client at your Django API and JWT flow as implemented. Do not extend it for new features. The `old-frontend/` directory is an older experiment and is not the maintained UI.

---

## Documentation and governance

- **API details:** `backend/API_DOCUMENTATION.md`
- **Formal project specification:** external document `F25-047-Documentation.pdf` (problem statement, SRS, design, and UI mockups)
- **Editor rules:** `.cursor/rules/project-overview.mdc`, `.cursor/rules/backend-conventions.mdc`, `.cursor/rules/daisyui.mdc`, `.cursor/rules/daisyui-standards.mdc`
- **Pipenv:** `backend/Pipfile` exists for alternative installs; CI and most docs assume `pip install -r backend/requirements.txt`.

---

## Disclaimer

MIDAS is academic and experimental software. It is not a medical device and must not be used as the sole basis for clinical decisions. All inference outputs require qualified human review. Compliance with HIPAA, GDPR, PMDC ethics, and HL7 FHIR profiles remains the responsibility of the deploying organization and is not fully realized by default configuration in this repository.
