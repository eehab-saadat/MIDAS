# MIDAS — Project Completion Roadmap

This document synthesizes the formal project specification (*F25-047-Documentation*), the frontend workflow brainstorm (*FE Workflows.md*), and a full-pass review of the repository. It records what is already implemented, what remains, and where new code should live. Items are not strictly ordered; use the priority notes to sequence work for your sprint or thesis timeline.

---

## 1. Purpose and sources

| Source | Role in this analysis |
|--------|------------------------|
| `F25-047-Documentation.pdf` | Vision, SRS features, functional and non-functional requirements, architecture narrative, UI mockups, compliance targets (FHIR R4, security, usability). |
| `FE Workflows.md` | Raw clinician-facing workflow ideas: auth scope, dashboard tabs, SNOMED-driven symptoms, imaging and lab upload paths, PDF portfolio, diagnosis encoding, open questions (scheduling, email). |
| Repository (`backend/`, `data/FMH/`, `microservices/`, `frontend/`, `old-backend/`) | Ground truth for implemented behavior, file locations, and technical debt. |

---

## 2. Current state — what is substantially complete

### 2.1 Core data model and persistence (Django)

The relational schema aligns well with a longitudinal mini-EHR and supports the backend conventions documented in `.cursor/rules/backend-conventions.mdc`.

| Area | Status | Primary locations |
|------|--------|-------------------|
| Patient registry | Complete | `backend/patients/models.py` |
| Vitals | Complete | `backend/patients/models.py` |
| Clinicians | Complete | `backend/clinical/models.py` |
| Encounters (Markdown-oriented notes) | Complete | `backend/clinical/models.py` |
| Medications | Complete | `backend/clinical/models.py` |
| Radiology (human + system conclusion split) | Complete | `backend/diagnostics/models.py` |
| Lab panels (JSON per CPT) | Complete | `backend/diagnostics/models.py` |
| SNOMED entities + body parts + symptoms on encounters | Complete | `backend/clinical/models.py` |
| Timestamps on all models | Complete | Across model files |

**Suggestion:** Treat `backend/core/` as either removed or repurposed; it currently adds no domain models and may confuse new contributors.

### 2.2 REST API (Django REST Framework)

| Capability | Status | Primary locations |
|------------|--------|-------------------|
| CRUD ViewSets for patients, vitals, clinicians, encounters, medications, radiology, labs | Complete | `backend/*/views.py`, `backend/*/serializers.py`, `backend/*/urls.py` |
| Patient nested reads (vitals, encounters, medications, radiology, labs by patient PK) | Complete | `backend/patients/views.py` (`PatientViewSet` actions) |
| Aggregated patient bundle by MRNO | Complete | `backend/patients/views.py` (`by_mrno`), `backend/patients/utils.py` (`get_complete_patient_details`) |
| SNOMED and symptom APIs with filters | Complete | `backend/clinical/views.py` |
| Pagination, search, ordering (per ViewSet) | Complete | `backend/backend/settings/base.py` (`REST_FRAMEWORK`), individual ViewSets |
| API narrative documentation | Complete (may drift from code) | `backend/API_DOCUMENTATION.md` |
| Root README | Complete | `README.md` |

**Gaps relative to specification:** no default authentication or permission classes, no audit log model, no FHIR serializers or export endpoints, no multi-tenant data isolation.

### 2.3 Data ingestion and offline processing

| Capability | Status | Primary locations |
|------------|--------|-------------------|
| FMH raw-to-processed Excel pipeline | Complete | `data/FMH/scripts/main.py`, `data/FMH/scripts/processors/*.py`, `data/FMH/scripts/README.md` |
| Django bulk ingest from processed workbooks | Complete | `backend/ingest_fmh_data.py` |
| SNOMED pipe-delimited import command | Complete | `backend/clinical/management/commands/ingest_snomed_data.py` |

### 2.4 Microservices (FastAPI + Python pipelines)

| Capability | Status | Primary locations |
|------------|--------|-------------------|
| Health check | Complete | `microservices/main.py` (`GET /health`) |
| Report image extraction (preprocess + VLM + schema validation) | Implemented | `microservices/main.py` (`POST /extract-report`), `microservices/report_extractor/` |
| Medical image preprocessing (modalities, DICOM, filters) | Implemented | `microservices/image_preprocessor/` |
| Unit test skeleton for preprocessor | Present | `microservices/image_preprocessor/tests/test_pipeline.py` |

**Gaps:** VLM dependencies are split across `microservices/requirements.txt` and `microservices/report_extractor/requirements.txt`; consolidate or document install order; deployment story (GPU, model weights) remains environment-specific.

### 2.5 Continuous integration

| Capability | Status | Location |
|------------|--------|----------|
| Django check + test on push/PR to `main` | Complete | `.github/workflows/django.yml` |

**Gap:** `backend/*/tests.py` files are empty placeholders; CI passes but does not validate API or model behavior.

### 2.6 Legacy frontend (Next.js)

| Capability | Status | Notes |
|------------|--------|-------|
| Pages: login, signup, patient list, patient detail, mobile camera | Partial prototype | `frontend/app/` |
| Client-side auth helpers | Partial | `frontend/lib/auth.ts` |

**Project stance:** `frontend/` is **deprecated** and slated for replacement. Anything counted as “done” here is legacy only, not the target architecture.

### 2.7 Diagnostic inference (batch path)

| Capability | Status | Location |
|------------|--------|----------|
| Batch run over all patients, CSV output, Ollama integration, resume/skip | Substantial | `backend/patients/management/commands/run_batch_diagnosis.py` |

**Gaps:** Hosted endpoint path still TODO inside the command; model choice differs from some comments elsewhere (acceptable if documented).

---

## 3. Critical defects and technical debt (fix before building on top)

These items block correctness, security, or integration and should be addressed early.

### 3.1 Patient diagnosis HTTP endpoint is non-functional and not routed

**Symptoms:**

- `backend/patients/urls.py` assigns `urlpatterns` twice; the second assignment `urlpatterns = router.urls` **discards** the `diagnose/` path, so the view is never registered.
- `diagnose_with_medgemma` in `backend/patients/views.py` references `os`, `json`, and uses `patient_data` before it is defined; `ROLE` and `CONTENT` are not valid variable assignments; response handling leaves success and failure paths incomplete; placeholder `HOSTED_ENDPOINT` default is invalid.

**Where to fix:**

- `backend/patients/urls.py` — combine routes, for example:  
  `urlpatterns = router.urls + [path("diagnose/", diagnose_with_medgemma, name="diagnose")]`  
  (or use `include` with a small `urlpatterns` list).
- `backend/patients/views.py` — rewrite `diagnose_with_medgemma`: add `import os`, `import json`; use `@api_view` / request method guards; build `patient_data` from `get_complete_patient_details(mrno)` with 404 handling; reuse patterns from `old-backend/utils/diagnose.py` (multimodal `images` in Ollama payload when applicable).
- Optionally extract inference into `backend/patients/services/diagnosis.py` or `backend/patients/inference.py` to share logic with `run_batch_diagnosis.py`.

**Suggestion:** Single module for “call LLM with patient bundle + optional image” shared by the management command and the API view.

### 3.2 Authentication and authorization not enforced on the API

**Specification expectation:** secure authentication, sessions, RBAC, activity logs, multi-tenancy (*F25-047*, SRS §4.2.1).

**Current state:** `djangorestframework-simplejwt` appears in `backend/requirements.txt` / `Pipfile` but `REST_FRAMEWORK` in `backend/backend/settings/base.py` does not set `DEFAULT_AUTHENTICATION_CLASSES` or `DEFAULT_PERMISSION_CLASSES`. Endpoints are effectively open on the LAN unless something else terminates auth.

**Where to implement:**

- `backend/backend/settings/base.py` — configure JWT or session auth defaults for API routes.
- `backend/backend/urls.py` — add SimpleJWT token routes (`token/`, `token/refresh/`) if using JWT.
- New app recommended: `backend/accounts/` or use Django’s `User` with profiles — models for `ClinicianUser` link to `clinical.Clinician`, roles (`admin`, `clinician`, `assistant`), and optional `Organization` for multi-tenancy.
- `backend/*/views.py` — replace blanket `AllowAny` (implicit) with role-aware permissions; use object-level rules for “only supervising clinician edits encounter” (SRS §4.2.2).
- **Audit log:** new model `AuditEvent` (user, action, entity type, PK, timestamp, IP) in `accounts/models.py` or `core/models.py`, written via DRF middleware or signal handlers.

### 3.3 CORS and debug settings unsuitable for production

**Where:** `backend/backend/settings/base.py` (`CORS_ALLOW_ALL_ORIGINS = True`), `DEBUG` from env.

**Action:** environment-specific settings file (`prod.py`) with restricted `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, secure cookies, HTTPS-only flags.

---

## 4. Mapping the FE Workflows mind map to backlog

The following table ties each bullet in *FE Workflows.md* to repository reality and suggested implementation locus.

| Mind map item | Backend / microservice today | Frontend today | Work remaining |
|---------------|------------------------------|----------------|----------------|
| Login and auth (doctors only?) | Not enforced on Django API | `frontend/app/login/page.tsx`, `frontend/lib/auth.ts` (local/mock-style) | Implement real auth in Django; new SPA or server app; role “clinician” vs “admin”; see §3.2. |
| All patients view, searchable, tabular, server-side sort | `GET /api/patients/?search=&ordering=` | Deprecated list UI | New client: data table with query params aligned to DRF; optional backend cursor pagination if lists grow large. |
| Previous encounters / sessions list | `GET /api/patients/{id}/encounters/` or filter `GET /api/encounters/?patient=` | Partial in deprecated UI | New client: timeline component; optional `Encounter` summary field or derived endpoint if payloads are too heavy. |
| Patient profile: meds, symptoms, demographics | Multiple endpoints + `GET /api/patients/mrno/<mrno>/` | Partial | New client: compose dashboard from bundle endpoint; ensure serializers include everything needed (already largely true). |
| Create patient | `POST /api/patients/` | Modal in deprecated UI | New client form; validation parity with serializer. |
| Clinical dashboard (main screen) | N/A | Partial home/patient pages | Full redesign per SRS GUI chapter; new repo or `frontend/` replacement. |
| Share with clinicians | Not implemented | Not implemented | Define product: in-app share vs export; possible new model `CaseShare` or FHIR DocumentReference generation; email out of scope unless added. |
| Auto-scribe | Not in Django | Not wired to backend | New service: speech-to-text + note structuring; store in `Encounter.notes`; optional LLM post-process; new endpoints under `clinical/` or dedicated `transcription/` app. |
| Upload data tab — medical imagery | `POST` radiology; microservice preprocess/extract | Not integrated | Flow: upload file → optional `microservices` preprocess → attach `file_path` or media storage → create `Radiology` row; **use Django `FileField`/`MEDIA_ROOT` instead of raw path strings** — extend `backend/diagnostics/models.py`, serializers, views. |
| Imaging: radiologist remarks, conclusion, lock while processing | `conclusion`, `result` exist; no workflow state | None | Add `status` field on `Radiology` (e.g. `draft`, `processing`, `final`); optional `locked_at`; background task (Celery/RQ) if async processing. |
| Symptoms — SNOMED, dynamic fetch, body parts | `GET /api/snomed-entities/`, `body-parts`, filters | None in new UI | New client: debounced search, body-part filter; ensure SNOMED dataset populated via `ingest_snomed_data`. |
| Prescribe medications (see previous) | `GET /api/medications/?patient=` + `POST` | None | New client: medication form + history panel. |
| Doctor notes + optional auto-scribe + “improve with AI” | `Encounter.notes` | None | API: `PATCH /api/encounters/{id}/`; optional `POST /api/encounters/{id}/polish_note/` calling LLM with audit trail. |
| Lab reports — picture upload, OCR, QR | Labs are structured JSON today; microservice does report images | `frontend/app/mobile-camera/page.tsx` exists | Pipeline: image → OCR microservice or extend `report_extractor` → map to `Lab.results` schema; new endpoint `POST /api/labs/from_image/` or queue job. |
| Personal info, vitals, upload vitals | Patient + Vitals APIs | Partial | New forms bound to serializers. |
| Shareable patient portfolio PDF | Not implemented | None | New endpoint e.g. `GET /api/patients/{id}/portfolio.pdf` using WeasyPrint, ReportLab, or template → PDF; **strict PHI and access control**. |
| Diagnosis + medical encoding + next steps | Batch command only; broken HTTP diagnose | Partial old-backend reference | Fix HTTP API; persist outputs in new model `DiagnosticSession` or `AIDiagnosisResult` (mrno, diagnosis text, ICD/SNOMED codes JSON, reasoning, model id, created_at); link to encounter optional. |
| Appointment scheduling and email (question) | Out of current scope | None | If in scope: new app `scheduling/` models `Appointment`; email via Django email backend or SendGrid; otherwise document as out of scope for FYP. |

---

## 5. Specification backlog (F25-047 SRS vs codebase)

### 5.1 Functional requirements not yet met

| SRS section | Requirement (paraphrased) | Suggested implementation direction |
|-------------|---------------------------|-----------------------------------|
| §4.2.1 | Secure authentication | §3.2; `accounts` app; JWT or session + HTTPS. |
| §4.2.1 | Session termination on logout | Token blacklist (JWT) or session flush; frontend clears storage. |
| §4.2.1 | User activity logs | `AuditEvent` model + middleware. |
| §4.2.1 | RBAC, least privilege | Django groups/permissions or custom roles; enforce in ViewSets. |
| §4.2.1 | Multi-tenancy | `Organization` FK on `Patient` and users; filter querysets by tenant. |
| §4.2.2 | Encounter edits only by supervising doctor/assistant | Object-level permissions; link `Encounter.clinician` to requesting user’s clinician profile. |
| §4.2.2 | FHIR exchange | New package `backend/fhir/` or app: serializers to FHIR R4 Patient, Observation, DiagnosticReport, etc.; `GET /api/fhir/Patient/{id}/` style or bulk export. |
| §4.2.2 | Download PDF/Word | Portfolio endpoint (PDF above); Word via `python-docx` if required. |
| §4.2.3 | Differential diagnoses list | Persist structured output from LLM; schema validation (Pydantic in backend or shared lib). |
| §4.2.3 | Actionable recommendations | Extend prompt + JSON schema; store in same diagnostic record. |
| §4.2.3 | SDoH in pipeline | New models (e.g. `SocialDeterminant` linked to `Patient` or `Encounter`); include in `get_complete_patient_details`; optional SNOMED or LOINC coding. |
| §4.2.3 | Explainable AI | Return `reasoning` field; show citations if RAG added later. |

### 5.2 Non-functional requirements (targets to verify in deployment)

| Theme | Specification hint | Engineering actions |
|-------|--------------------|---------------------|
| Performance | Full case under ~90 seconds | Load test API + microservice; async jobs for heavy VLM; timeouts documented in `README.md`. |
| UI responsiveness | Under ~3 seconds actions | Frontend performance budget; API profiling (`django-debug-toolbar` in dev only). |
| Scalability | ~50 concurrent sessions, ~10k patients | Connection pooling (PostgreSQL); consider read replicas later; not urgent for thesis demo. |
| Security | TLS 1.3, AES-256 at rest | Deployment checklist (reverse proxy, disk encryption); not code-only. |
| Compliance | PMDC ethics, FHIR R4 | Documentation + design choices; legal review outside codebase. |

---

## 6. Suggested work packages (ordered for a typical FYP completion path)

Each package lists **primary files** to touch. Adjust to your team split.

### Phase A — Stabilize backend foundations

1. **Fix URL routing and diagnosis service**  
   - `backend/patients/urls.py`, `backend/patients/views.py`, new `backend/patients/services/diagnosis.py` (recommended), align with `run_batch_diagnosis.py` and `old-backend/utils/diagnose.py`.

2. **Introduce authentication**  
   - `backend/backend/settings/base.py`, `backend/backend/urls.py`, new `accounts/` app with user profile and JWT views, migrations.

3. **Tighten API permissions**  
   - Every `backend/*/views.py` ViewSet: set `permission_classes`; add tests for forbidden access.

4. **File uploads for radiology**  
   - `backend/diagnostics/models.py` (`FileField`), `serializers.py`, `views.py`, `settings` for `MEDIA_URL` / `MEDIA_ROOT`, storage abstraction for production (S3-compatible optional).

5. **Automated tests**  
   - `backend/patients/tests.py`, `backend/clinical/tests.py`, `backend/diagnostics/tests.py`: CRUD smoke tests, `by_mrno` shape test, permission tests.

### Phase B — Clinical workflow and AI productization

6. **Persist AI diagnosis outputs**  
   - New model in `patients` or `clinical` (e.g. `clinical/models.py` + migration), serializers, optional read-only list filtered by patient.

7. **Radiology workflow state**  
   - `diagnostics/models.py` status field; admin and API validation rules.

8. **Lab OCR ingestion**  
   - Contract between `microservices` OCR output and `Lab.results` JSON; new Django endpoint or async worker.

9. **Note assistance endpoints**  
   - `clinical/views.py` custom `@action` on `EncounterViewSet` or separate view; log prompts/responses for audit.

10. **SDoH (if in scope)**  
    - New models + ingestion + include in `patients/utils.py` aggregator.

### Phase C — Interoperability and reporting

11. **FHIR R4 read API (subset)**  
    - New module mapping `Patient`, `Observation` (labs/vitals), `DiagnosticReport` (radiology) — large effort; prioritize resources your supervisor cares about.

12. **PDF portfolio**  
    - New view + HTML template + WeasyPrint (or similar); enforce auth.

### Phase D — Replace frontend

13. **Greenfield client** (recommended over reviving deprecated tree)  
    - New directory e.g. `web/` or separate repository: React/Next/Vue per team skill; API client generated from OpenAPI (optional: `drf-spectacular` in `backend/requirements.txt`, `urls.py`).

14. **Implement FE Workflows screens** in order: auth → patient list → patient detail → encounter session (tabs from mind map) → diagnosis modal → PDF export.

### Phase E — Operations and thesis deliverables

15. **Production settings**  
    - `backend/backend/settings/prod.py`, environment documentation in `README.md`.

16. **Deployment story**  
    - Docker Compose (Django + Postgres + microservice + optional Ollama) — new `docker-compose.yml` at repo root if desired.

17. **Evaluation chapter support**  
    - Scripted scenarios, fixed demo dataset, metrics from batch diagnosis CSV.

---

## 7. Optional and out-of-scope candidates

| Idea | Recommendation |
|------|----------------|
| Appointment scheduling + email (*FE Workflows* question) | Defer unless required by supervisor; adds scope (calendar, notifications, privacy). |
| LangGraph / LangSmith (*spec scope text*) | Introduce only after single-agent LLM path is stable and logged. |
| Real hospital HL7v2 feeds | Out of scope per spec; FHIR export is the more realistic student deliverable. |
| Removing `old-backend/` | After porting any useful logic (e.g. `diagnose.py` image path) into Django; then delete or archive to reduce confusion. |

---

## 8. Documentation and hygiene tasks

| Task | Location |
|------|----------|
| Keep `README.md` and `backend/API_DOCUMENTATION.md` synchronized when adding auth, FHIR, or file fields | Root and `backend/` |
| Add `.env.example` with `SECRET_KEY`, `DEBUG`, `DATABASE_URL`, `HOSTED_ENDPOINT`, Ollama URL | `backend/.env.example` |
| Document microservice dependencies and run command | `microservices/README.md` (create if absent) |
| Regenerate OpenAPI if using drf-spectacular | CI artifact or `docs/openapi.yaml` |

---

## 9. Summary

**Strengths:** The Django domain model and REST surface are mature for a student EHR backbone; FMH ingestion and SNOMED import exist; aggregated patient retrieval by MRNO is a strong foundation for LLM and UI work; microservices provide a credible path for imaging and report extraction.

**Gaps:** Security and RBAC are the largest specification mismatch; the synchronous diagnose view is broken and unrouted; there is no persisted first-class “AI diagnosis” entity; FHIR, PDF export, SDoH, and auto-scribe are largely absent; automated tests are minimal; the production frontend is explicitly deprecated and must be replaced to match the SRS GUI and usability requirements.

Completing the project in line with *F25-047* and the workflow mind map implies prioritizing **auth**, **stable diagnosis API + persistence**, **file-backed radiology**, **new clinician UI**, and a **subset of FHIR or PDF** as time permits, with clear written scope boundaries for scheduling, email, and full regulatory compliance.
