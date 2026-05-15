# RAG-Powered Medical Diagnosis Engine

Dynamic 2-shot prompting for MedGemma via Ollama. For every incoming patient, the system retrieves the two most clinically similar cases from a seed dataset and injects them as labelled examples into the prompt before calling the model.

---

## Project Structure

```
.
├── engine.py          # Prompt construction, Ollama call, response parsing
├── rag.py             # Vector store, text encoding, similarity retrieval
├── seed.csv           # Labelled patient cases used as the retrieval corpus
├── requirements.txt
└── README.md
```

Patient records passed to `generate_diagnosis` should follow the `P001.json` schema. The seed corpus uses a different schema (hospital EHR export); `rag.py` handles both transparently.

---

## How It Works

```
Patient JSON
     │
     ▼
rag.py  ──  _patient_to_text()  ──►  query embedding
     │
     │   seed.csv (loaded once at startup)
     │        │
     │        └─  _patient_to_text() × N  ──►  index embeddings
     │
     ▼
cosine similarity  ──►  top-2 similar cases
     │
     ▼
engine.py
     │
     ├─  [SYSTEM PROMPT]
     ├─  [Similar Case 1]  ← RAG example
     ├─  [Similar Case 2]  ← RAG example
     └─  [New Patient]     ← query
     │
     ▼
Ollama  (MedGemma)
     │
     ▼
{"diagnosis": "...", "reasoning": "..."}
```

### Embedding Backend

The module picks a backend automatically:

| Library available | Backend used |
|---|---|
| `sentence-transformers` | `all-MiniLM-L6-v2` — semantic similarity |
| `scikit-learn` only | TF-IDF + cosine similarity |

Install `sentence-transformers` for meaningfully better retrieval on medical text.

---

## Setup

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 2. Install and start Ollama

```bash
# Install Ollama (macOS / Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull the MedGemma model
ollama pull amsaravi/medgemma-4b-it:q6

# Ollama runs on http://localhost:11434 by default
```

### 3. Place seed.csv in the project root

The CSV must have these columns:

| Column | Description |
|---|---|
| `mrno` | Unique patient record number |
| `patient_details` | JSON string of patient data |
| `diagnosis` | Confirmed diagnosis label |
| `reasoning` | Clinical reasoning for the diagnosis |

---

## Usage

```python
import json
from engine import generate_diagnosis

with open("P001.json") as f:
    patient = json.load(f)

result = generate_diagnosis(patient)
print(result["diagnosis"])
print(result["reasoning"])
```

`generate_diagnosis` accepts two optional keyword arguments:

| Argument | Default | Description |
|---|---|---|
| `seed_path` | `"seed.csv"` | Path to the retrieval corpus |
| `num_examples` | `2` | Number of RAG examples to inject |

The `VectorStore` is a module-level singleton — seed.csv is read and embeddings are built only once per process, regardless of how many times `generate_diagnosis` is called.

To pre-warm the store at application startup (recommended for web servers):

```python
from rag import init_store
init_store("seed.csv")   # blocks until index is built, then cached
```

---

## Configuration

Both Ollama settings live at the top of `engine.py`:

```python
OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "amsaravi/medgemma-4b-it:q6"
```

To swap the embedding model (sentence-transformers only), pass `model_name` to `VectorStore` directly or edit the default in `rag.init_store`.

---

## Logging

Both modules use Python's standard `logging` library under their own `__name__` loggers. Enable debug output to inspect retrieved case IDs and similarity scores:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Requirements

- Python 3.10+
- Ollama running locally with the MedGemma model pulled
- `seed.csv` with at least 2 labelled cases
