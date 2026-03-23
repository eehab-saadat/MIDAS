# MIDAS Backend – API Documentation

All endpoints are served under the `/api/` prefix.  
Base URL (development): `http://localhost:8000/api/`

The API is built with [Django REST Framework](https://www.django-rest-framework.org/) and follows standard REST conventions.  
A browsable HTML interface is available at any endpoint when accessed from a browser.

---

## Pagination

All list endpoints return paginated results.

| Field      | Description                           |
| ---------- | ------------------------------------- |
| `count`    | Total number of records               |
| `next`     | URL for the next page (or `null`)     |
| `previous` | URL for the previous page (or `null`) |
| `results`  | Array of objects for the current page |

Default page size: **20 records**.  
Navigate with `?page=<n>` (e.g. `?page=2`).

---

## Common Query Parameters

| Parameter           | Applies to                        | Description                                             |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| `?search=<term>`    | List endpoints marked with search | Case-insensitive partial match on designated fields     |
| `?ordering=<field>` | List endpoints with ordering      | Prefix with `-` for descending (e.g. `?ordering=-date`) |
| `?page=<n>`         | All list endpoints                | Page number for pagination                              |

---

## 1. Patients

### 1.1 Patient

**Model fields:** `id`, `mrno`, `name`, `gender`, `dob`, `age` _(read-only, computed)_, `last_visit_date` _(read-only, computed)_, `history`

| Method   | URL                            | Description                     |
| -------- | ------------------------------ | ------------------------------- |
| `GET`    | `/api/patients/`               | List all patients               |
| `GET`    | `/api/patients/?search=<term>` | Search patients by MRNO or name |
| `POST`   | `/api/patients/`               | Create a patient                |
| `GET`    | `/api/patients/{id}/`          | Retrieve a patient              |
| `PUT`    | `/api/patients/{id}/`          | Full update a patient           |
| `PATCH`  | `/api/patients/{id}/`          | Partial update a patient        |
| `DELETE` | `/api/patients/{id}/`          | Delete a patient                |

**Search fields:** `mrno`, `name`  
**Ordering fields:** `mrno`, `name`, `dob`

#### Example – List patients with search (`GET /api/patients/?search=john`)

```
GET /api/patients/?search=john
```

Returns all patients where MRNO or name contains "john" (case-insensitive).

#### Example – Create patient (`POST /api/patients/`)

```json
{
  "mrno": "MR-00123",
  "name": "John Doe",
  "gender": "Male",
  "dob": "1985-04-15",
  "history": "No significant past medical history."
}
```

#### Example – Response (includes last_visit_date)

```json
{
  "id": 1,
  "mrno": "MR-00123",
  "name": "John Doe",
  "gender": "Male",
  "dob": "1985-04-15",
  "age": 40,
  "last_visit_date": "2025-11-15T14:30:00Z",
  "history": "No significant past medical history.",
  "created_at": "2025-10-01T08:00:00Z",
  "updated_at": "2025-11-15T14:30:00Z"
}
```

**Note:** `last_visit_date` is computed from the most recent encounter date.

---

### 1.2 Patient – Related Resource Sub-routes

These read-only `GET` endpoints return all records of a given type that belong to a specific patient.

| Method | URL                               | Description                           |
| ------ | --------------------------------- | ------------------------------------- |
| `GET`  | `/api/patients/{id}/vitals/`      | All vitals for the patient            |
| `GET`  | `/api/patients/{id}/encounters/`  | All encounters for the patient        |
| `GET`  | `/api/patients/{id}/medications/` | All medications for the patient       |
| `GET`  | `/api/patients/{id}/radiology/`   | All radiology reports for the patient |
| `GET`  | `/api/patients/{id}/labs/`        | All lab results for the patient       |

---

### 1.3 Vitals

**Model fields:** `id`, `patient`, `timestamp`, `weight`, `weight_unit`, `height`, `height_unit`, `temperature`, `temperature_unit`, `pulse`, `pulse_unit`, `respiratory_rate`, `respiratory_rate_unit`, `bp_high`, `bp_low`

| Method   | URL                 | Description                    |
| -------- | ------------------- | ------------------------------ |
| `GET`    | `/api/vitals/`      | List all vitals                |
| `POST`   | `/api/vitals/`      | Create a vitals record         |
| `GET`    | `/api/vitals/{id}/` | Retrieve a vitals record       |
| `PUT`    | `/api/vitals/{id}/` | Full update a vitals record    |
| `PATCH`  | `/api/vitals/{id}/` | Partial update a vitals record |
| `DELETE` | `/api/vitals/{id}/` | Delete a vitals record         |

**Filter by patient:** `?patient=<patient_id>`  
**Ordering fields:** `timestamp`

#### Example – Create vitals (`POST /api/vitals/`)

```json
{
  "patient": 1,
  "timestamp": "2025-11-01T09:30:00Z",
  "weight": 72.5,
  "weight_unit": "kg",
  "height": 175.0,
  "height_unit": "cm",
  "temperature": 37.1,
  "temperature_unit": "°C",
  "pulse": 78.0,
  "pulse_unit": "bpm",
  "respiratory_rate": 16.0,
  "respiratory_rate_unit": "breaths/min",
  "bp_high": 120.0,
  "bp_low": 80.0
}
```

---

## 2. Clinical

### 2.1 Clinician

**Model fields:** `id`, `name`, `title`, `joining_date`

| Method   | URL                     | Description                |
| -------- | ----------------------- | -------------------------- |
| `GET`    | `/api/clinicians/`      | List all clinicians        |
| `POST`   | `/api/clinicians/`      | Create a clinician         |
| `GET`    | `/api/clinicians/{id}/` | Retrieve a clinician       |
| `PUT`    | `/api/clinicians/{id}/` | Full update a clinician    |
| `PATCH`  | `/api/clinicians/{id}/` | Partial update a clinician |
| `DELETE` | `/api/clinicians/{id}/` | Delete a clinician         |

**Search fields:** `name`, `title`  
**Ordering fields:** `name`, `joining_date`

#### Example – Create clinician (`POST /api/clinicians/`)

```json
{
  "name": "Dr. Sarah Ahmed",
  "title": "Consultant Cardiologist",
  "joining_date": "2018-03-01"
}
```

---

### 2.2 Encounter

**Model fields:** `id`, `patient`, `clinician`, `date`, `notes`

> `notes` is stored as Markdown-formatted plain text.

| Method   | URL                     | Description                 |
| -------- | ----------------------- | --------------------------- |
| `GET`    | `/api/encounters/`      | List all encounters         |
| `POST`   | `/api/encounters/`      | Create an encounter         |
| `GET`    | `/api/encounters/{id}/` | Retrieve an encounter       |
| `PUT`    | `/api/encounters/{id}/` | Full update an encounter    |
| `PATCH`  | `/api/encounters/{id}/` | Partial update an encounter |
| `DELETE` | `/api/encounters/{id}/` | Delete an encounter         |

**Filter by patient:** `?patient=<patient_id>`  
**Filter by clinician:** `?clinician=<clinician_id>`  
**Ordering fields:** `date`

#### Example – Create encounter (`POST /api/encounters/`)

```json
{
  "patient": 1,
  "clinician": 3,
  "date": "2025-11-01T10:00:00Z",
  "notes": "## Chief Complaint\nPatient presents with chest pain.\n\n## Assessment\nLikely costochondritis."
}
```

---

### 2.3 Medication

**Model fields:** `id`, `patient`, `prescribed_by`, `prescribed_on`, `active_agent_name`, `medication_name`, `dosage`, `frequency`, `indication`

| Method   | URL                      | Description                        |
| -------- | ------------------------ | ---------------------------------- |
| `GET`    | `/api/medications/`      | List all medications               |
| `POST`   | `/api/medications/`      | Create a medication record         |
| `GET`    | `/api/medications/{id}/` | Retrieve a medication record       |
| `PUT`    | `/api/medications/{id}/` | Full update a medication record    |
| `PATCH`  | `/api/medications/{id}/` | Partial update a medication record |
| `DELETE` | `/api/medications/{id}/` | Delete a medication record         |

**Filter by patient:** `?patient=<patient_id>`  
**Search fields:** `medication_name`, `active_agent_name`  
**Ordering fields:** `prescribed_on`, `medication_name`

#### Example – Create medication (`POST /api/medications/`)

```json
{
  "patient": 1,
  "prescribed_by": 3,
  "prescribed_on": "2025-11-01",
  "active_agent_name": "Atorvastatin",
  "medication_name": "Lipitor 40mg",
  "dosage": "40 mg",
  "frequency": "Once daily at bedtime",
  "indication": "Hypercholesterolemia"
}
```

---

## 3. Diagnostics

### 3.1 Radiology

**Model fields:** `id`, `patient`, `cpt_id`, `cpt_name`, `technique`, `result`, `conclusion`, `system_conclusion`, `file_path`

| Method   | URL                    | Description                       |
| -------- | ---------------------- | --------------------------------- |
| `GET`    | `/api/radiology/`      | List all radiology reports        |
| `POST`   | `/api/radiology/`      | Create a radiology report         |
| `GET`    | `/api/radiology/{id}/` | Retrieve a radiology report       |
| `PUT`    | `/api/radiology/{id}/` | Full update a radiology report    |
| `PATCH`  | `/api/radiology/{id}/` | Partial update a radiology report |
| `DELETE` | `/api/radiology/{id}/` | Delete a radiology report         |

**Filter by patient:** `?patient=<patient_id>`  
**Search fields:** `cpt_name`, `cpt_id`  
**Ordering fields:** `cpt_name`

#### Example – Create radiology report (`POST /api/radiology/`)

```json
{
  "patient": 1,
  "cpt_id": "71046",
  "cpt_name": "Chest X-Ray (2 views)",
  "technique": "PA and lateral projections of the chest.",
  "result": "Lungs are clear. No pleural effusion. Heart size normal.",
  "conclusion": "No acute cardiopulmonary process.",
  "system_conclusion": "Normal chest radiograph.",
  "file_path": "/media/radiology/20251101_MR00123_71046.dcm"
}
```

---

### 3.2 Lab Results

**Model fields:** `id`, `patient`, `cpt_id`, `cpt_name`, `results` _(JSON object)_, `invoice_date`

> The `results` field is a JSON object keyed by test name with numeric values, e.g. `{"SODIUM": 138.0, "POTASSIUM": 4.1}`.

| Method   | URL               | Description                        |
| -------- | ----------------- | ---------------------------------- |
| `GET`    | `/api/labs/`      | List all lab result records        |
| `POST`   | `/api/labs/`      | Create a lab result record         |
| `GET`    | `/api/labs/{id}/` | Retrieve a lab result record       |
| `PUT`    | `/api/labs/{id}/` | Full update a lab result record    |
| `PATCH`  | `/api/labs/{id}/` | Partial update a lab result record |
| `DELETE` | `/api/labs/{id}/` | Delete a lab result record         |

**Filter by patient:** `?patient=<patient_id>`  
**Search fields:** `cpt_name`, `cpt_id`  
**Ordering fields:** `invoice_date`, `cpt_name`

#### Example – Create lab result (`POST /api/labs/`)

```json
{
  "patient": 1,
  "cpt_id": "80053",
  "cpt_name": "Comprehensive Metabolic Panel",
  "results": {
    "SODIUM": 138.0,
    "POTASSIUM": 4.1,
    "CHLORIDE": 102.0,
    "CO2": 24.0,
    "BUN": 14.0,
    "CREATININE": 0.9,
    "GLUCOSE": 95.0
  },
  "invoice_date": "2025-11-01"
}
```

---

## 4. Complete Endpoint Reference

| Method   | URL                               | Description                     |
| -------- | --------------------------------- | ------------------------------- |
| `GET`    | `/api/patients/`                  | List patients                   |
| `GET`    | `/api/patients/?search=<term>`    | Search patients by MRNO or name |
| `GET`    | `/api/patients/?ordering=<field>` | List patients with ordering     |
| `POST`   | `/api/patients/`                  | Create patient                  |
| `GET`    | `/api/patients/{id}/`             | Retrieve patient                |
| `PUT`    | `/api/patients/{id}/`             | Update patient                  |
| `PATCH`  | `/api/patients/{id}/`             | Partial update patient          |
| `DELETE` | `/api/patients/{id}/`             | Delete patient                  |
| `GET`    | `/api/patients/{id}/vitals/`      | Patient's vitals                |
| `GET`    | `/api/patients/{id}/encounters/`  | Patient's encounters            |
| `GET`    | `/api/patients/{id}/medications/` | Patient's medications           |
| `GET`    | `/api/patients/{id}/radiology/`   | Patient's radiology reports     |
| `GET`    | `/api/patients/{id}/labs/`        | Patient's lab results           |
| `GET`    | `/api/vitals/`                    | List vitals                     |
| `POST`   | `/api/vitals/`                    | Create vitals                   |
| `GET`    | `/api/vitals/{id}/`               | Retrieve vitals                 |
| `PUT`    | `/api/vitals/{id}/`               | Update vitals                   |
| `PATCH`  | `/api/vitals/{id}/`               | Partial update vitals           |
| `DELETE` | `/api/vitals/{id}/`               | Delete vitals                   |
| `GET`    | `/api/clinicians/`                | List clinicians                 |
| `POST`   | `/api/clinicians/`                | Create clinician                |
| `GET`    | `/api/clinicians/{id}/`           | Retrieve clinician              |
| `PUT`    | `/api/clinicians/{id}/`           | Update clinician                |
| `PATCH`  | `/api/clinicians/{id}/`           | Partial update clinician        |
| `DELETE` | `/api/clinicians/{id}/`           | Delete clinician                |
| `GET`    | `/api/encounters/`                | List encounters                 |
| `POST`   | `/api/encounters/`                | Create encounter                |
| `GET`    | `/api/encounters/{id}/`           | Retrieve encounter              |
| `PUT`    | `/api/encounters/{id}/`           | Update encounter                |
| `PATCH`  | `/api/encounters/{id}/`           | Partial update encounter        |
| `DELETE` | `/api/encounters/{id}/`           | Delete encounter                |
| `GET`    | `/api/medications/`               | List medications                |
| `POST`   | `/api/medications/`               | Create medication               |
| `GET`    | `/api/medications/{id}/`          | Retrieve medication             |
| `PUT`    | `/api/medications/{id}/`          | Update medication               |
| `PATCH`  | `/api/medications/{id}/`          | Partial update medication       |
| `DELETE` | `/api/medications/{id}/`          | Delete medication               |
| `GET`    | `/api/radiology/`                 | List radiology reports          |
| `POST`   | `/api/radiology/`                 | Create radiology report         |
| `GET`    | `/api/radiology/{id}/`            | Retrieve radiology report       |
| `PUT`    | `/api/radiology/{id}/`            | Update radiology report         |
| `PATCH`  | `/api/radiology/{id}/`            | Partial update radiology report |
| `DELETE` | `/api/radiology/{id}/`            | Delete radiology report         |
| `GET`    | `/api/labs/`                      | List lab results                |
| `POST`   | `/api/labs/`                      | Create lab result               |
| `GET`    | `/api/labs/{id}/`                 | Retrieve lab result             |
| `PUT`    | `/api/labs/{id}/`                 | Update lab result               |
| `PATCH`  | `/api/labs/{id}/`                 | Partial update lab result       |
| `DELETE` | `/api/labs/{id}/`                 | Delete lab result               |

---

## 5. Getting Started

### Run migrations and start the dev server

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### Ingest sample data

```bash
python ingest_fmh_data.py --data-dir /path/to/xlsx/files
```

Use `--flush` to wipe all existing rows before ingesting.

---

## 6. HTTP Status Codes

| Code              | Meaning                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `200 OK`          | Successful GET / PUT / PATCH                                        |
| `201 Created`     | Successful POST                                                     |
| `204 No Content`  | Successful DELETE                                                   |
| `400 Bad Request` | Validation error – response body contains field-level error details |
| `404 Not Found`   | Record does not exist                                               |
