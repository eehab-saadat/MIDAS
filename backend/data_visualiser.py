import os
import json
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from wordcloud import WordCloud
from datetime import date
import django

# --- 1. SETUP DJANGO AND DIRECTORIES ---
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings.dev")
django.setup()

from django.db.models import Count

from patients.models import Patient, Vitals
from clinical.models import Encounter, SnomedEntity
from diagnostics.models import Lab, Radiology

# Define base paths
BASE_DIR = "../data/EDA_summary"
MODELS_DIR = os.path.join(BASE_DIR, "Models")
CSV_DIR = os.path.join(BASE_DIR, "CSVs")

# Create folder structure
folders = [
    os.path.join(MODELS_DIR, "Patient"),
    os.path.join(MODELS_DIR, "Encounters"),
    os.path.join(MODELS_DIR, "SnomedEntity"),
    os.path.join(MODELS_DIR, "Radiology"),
    os.path.join(MODELS_DIR, "Lab"),
    os.path.join(CSV_DIR, "ground_truth"),
    os.path.join(CSV_DIR, "diagnosis"),
]
for folder in folders:
    os.makedirs(folder, exist_ok=True)

sns.set_theme(style="whitegrid")


# Helper function to calculate age
def calculate_age(dob):
    if not dob:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


print("Starting Data Extraction and Visualization...")

# ==========================================
# 2. DJANGO MODELS EXTRACTION & PLOTTING
# ==========================================

# --- PATIENT ---
print("Processing Patient Data...")
patient_folder = os.path.join(MODELS_DIR, "Patient")
patients = Patient.objects.all()
df_patients = pd.DataFrame(list(patients.values("gender", "dob")))
df_patients["age"] = df_patients["dob"].apply(calculate_age)

# Text Metric: Total Patient count
pd.DataFrame([{"Total_Patients": len(df_patients)}]).to_csv(
    os.path.join(patient_folder, "patient_metrics.csv"), index=False
)

# Graph 1: Age Distribution (Histogram)
plt.figure(figsize=(8, 5))
sns.histplot(df_patients["age"].dropna(), bins=20, kde=True, color="skyblue")
plt.title("Age Distribution")
plt.savefig(os.path.join(patient_folder, "age_distribution.png"))
plt.close()

# Graph 2: Gender Distribution (Pie Chart)
gender_counts = df_patients["gender"].value_counts()
plt.figure(figsize=(6, 6))
plt.pie(
    gender_counts,
    labels=gender_counts.index,
    autopct="%1.1f%%",
    colors=sns.color_palette("pastel"),
)
plt.title("Gender Distribution")
plt.savefig(os.path.join(patient_folder, "gender_distribution.png"))
plt.close()

# --- ENCOUNTERS ---
print("Processing Encounters Data...")
enc_folder = os.path.join(MODELS_DIR, "Encounters")
encounters = list(Encounter.objects.values("patient_id"))
df_enc = pd.DataFrame(encounters)
enc_per_patient = df_enc["patient_id"].value_counts()

# Text Metric
pd.DataFrame(
    [
        {
            "Total_Encounters": len(df_enc),
            "Avg_Encounters_Per_Patient": enc_per_patient.mean(),
        }
    ]
).to_csv(os.path.join(enc_folder, "encounter_metrics.csv"), index=False)

# Graph: Encounters per patient distribution (Line/KDE or Countplot)
plt.figure(figsize=(8, 5))
sns.histplot(enc_per_patient, discrete=True, color="coral")
plt.title("Distribution of Encounters per Patient")
plt.xlabel("Number of Encounters")
plt.savefig(os.path.join(enc_folder, "encounters_per_patient.png"))
plt.close()

# --- SNOMED ENTITY ---
print("Processing SNOMED Data...")
snomed_folder = os.path.join(MODELS_DIR, "SnomedEntity")
snomed_counts = pd.DataFrame(
    list(SnomedEntity.objects.values("entity_type").annotate(count=Count("snomed_cid")))
)

pd.DataFrame([{"Total_SNOMED_Entities": SnomedEntity.objects.count()}]).to_csv(
    os.path.join(snomed_folder, "snomed_metrics.csv"), index=False
)

plt.figure(figsize=(6, 6))
plt.pie(
    snomed_counts["count"],
    labels=snomed_counts["entity_type"],
    autopct="%1.1f%%",
    wedgeprops=dict(width=0.4),
)
plt.title("Distribution of SNOMED Entity Types")
plt.savefig(os.path.join(snomed_folder, "snomed_entity_types.png"))
plt.close()

# --- RADIOLOGY ---
print("Processing Radiology Data...")
rad_folder = os.path.join(MODELS_DIR, "Radiology")
df_rad = pd.DataFrame(
    list(Radiology.objects.values("cpt_id", "cpt_name", "conclusion"))
)
df_rad["clean_name"] = (
    df_rad["cpt_name"].str.replace("C.T.", "", regex=False).str.strip()
)

# Metrics
rad_metrics = {"Total_Radiology_Orders": len(df_rad)}
rad_grouped = df_rad["clean_name"].value_counts().reset_index()
rad_grouped.columns = ["CPT_Name", "Count"]
rad_grouped.to_csv(
    os.path.join(rad_folder, "radiology_types_distribution.csv"), index=False
)
pd.DataFrame([rad_metrics]).to_csv(
    os.path.join(rad_folder, "radiology_totals.csv"), index=False
)

# Word Cloud for Conclusions
text_conclusions = " ".join(df_rad["conclusion"].dropna().astype(str))
if text_conclusions.strip():
    wordcloud = WordCloud(width=800, height=400, background_color="white").generate(
        text_conclusions
    )
    plt.figure(figsize=(10, 5))
    plt.imshow(wordcloud, interpolation="bilinear")
    plt.axis("off")
    plt.title("Radiology Conclusions Word Cloud")
    plt.savefig(os.path.join(rad_folder, "conclusion_wordcloud.png"))
    plt.close()

# Graph: Top 3 Radiology Types
plt.figure(figsize=(8, 5))
sns.barplot(data=rad_grouped.head(3), y="CPT_Name", x="Count", palette="Blues_r")
plt.title("Top 3 Radiology Types")
plt.savefig(os.path.join(rad_folder, "top_3_radiology.png"))
plt.close()

# --- LAB ---
print("Processing Lab Data...")
lab_folder = os.path.join(MODELS_DIR, "Lab")
df_lab = pd.DataFrame(list(Lab.objects.values("cpt_id", "cpt_name")))
lab_counts = df_lab["cpt_name"].value_counts().reset_index()
lab_counts.columns = ["Lab_Test", "Count"]

# Metrics
pd.DataFrame([{"Total_Lab_Orders": len(df_lab)}]).to_csv(
    os.path.join(lab_folder, "lab_totals.csv"), index=False
)
lab_counts.to_csv(os.path.join(lab_folder, "lab_types_distribution.csv"), index=False)

# Graph: Top 10 Labs
plt.figure(figsize=(10, 6))
sns.barplot(data=lab_counts.head(10), y="Lab_Test", x="Count", palette="magma")
plt.title("Top 10 Most Frequently Ordered Lab Tests")
plt.savefig(os.path.join(lab_folder, "top_10_labs.png"))
plt.close()

# ==========================================
# 3. CSV FILES EXTRACTION & PLOTTING
# ==========================================

# --- GROUND TRUTH CSV ---
print("Processing Ground Truth CSV...")
gt_folder = os.path.join(CSV_DIR, "ground_truth")
try:
    df_gt = pd.read_csv("../data/Output/ground_truth.csv")  # Using your exact filename
    gt_icds = []
    histories = []

    for _, row in df_gt.iterrows():
        try:
            gt_json = json.loads(row["GT1"])
            # Extract ICDs (truncate to category)
            for code in gt_json.get("ICD_codes", []):
                gt_icds.append(str(code).split(".")[0].strip())

            # Extract history for word cloud
            patient_details = json.loads(row["patient_details"])
            hist_list = patient_details.get("known_medical_history", [])
            histories.extend(hist_list)
        except Exception:
            continue

    df_gt_icd = pd.DataFrame({"ICD": gt_icds})
    icd_counts = df_gt_icd["ICD"].value_counts()

    pd.DataFrame([{"Total_Unique_GT_ICD10": df_gt_icd["ICD"].nunique()}]).to_csv(
        os.path.join(gt_folder, "gt_metrics.csv"), index=False
    )

    # Graph: Top 10 GT ICD Categories
    plt.figure(figsize=(8, 5))
    sns.barplot(
        y=icd_counts.head(10).index, x=icd_counts.head(10).values, palette="viridis"
    )
    plt.title("Top 10 Ground Truth ICD-10 Categories")
    plt.savefig(os.path.join(gt_folder, "top_10_gt_icd.png"))
    plt.close()

    # Word Cloud for Medical History
    history_text = " ".join(histories)
    if history_text.strip():
        wordcloud = WordCloud(width=800, height=400, background_color="white").generate(
            history_text
        )
        plt.figure(figsize=(10, 5))
        plt.imshow(wordcloud, interpolation="bilinear")
        plt.axis("off")
        plt.title("Known Medical History Keywords")
        plt.savefig(os.path.join(gt_folder, "medical_history_wordcloud.png"))
        plt.close()
except FileNotFoundError:
    print("Warning: 'ground truth . csv' not found.")

# --- DIAGNOSIS CSV ---
print("Processing Diagnosis CSV...")
diag_folder = os.path.join(CSV_DIR, "diagnosis")
try:
    df_diag = pd.read_csv("../data/Output/diagnosis.csv")
    pred_icds = []
    reasoning_lengths = []

    for _, row in df_diag.iterrows():
        reasoning_lengths.append(len(str(row.get("Reasoning", ""))))
        try:
            pred_json = json.loads(row["ICD-10 Codes"])
            for code in pred_json.get("ICD_codes", []):
                pred_icds.append(str(code).split(".")[0].strip())
        except Exception:
            continue

    df_pred_icd = pd.DataFrame({"ICD": pred_icds})
    pred_counts = df_pred_icd["ICD"].value_counts()

    pd.DataFrame(
        [{"Total_Unique_Predicted_ICD10": df_pred_icd["ICD"].nunique()}]
    ).to_csv(os.path.join(diag_folder, "diag_metrics.csv"), index=False)

    # Graph: Top 10 Predicted ICD Categories
    plt.figure(figsize=(8, 5))
    sns.barplot(
        y=pred_counts.head(10).index, x=pred_counts.head(10).values, palette="mako"
    )
    plt.title("Top 10 AI-Predicted ICD-10 Categories")
    plt.savefig(os.path.join(diag_folder, "top_10_pred_icd.png"))
    plt.close()

    # Graph: Reasoning Length Box Plot
    plt.figure(figsize=(6, 8))
    sns.boxplot(y=reasoning_lengths, color="mediumpurple")
    plt.title("Average Length of AI Diagnosis Reasoning (Characters)")
    plt.ylabel("Character Count")
    plt.savefig(os.path.join(diag_folder, "reasoning_length_boxplot.png"))
    plt.close()

    # (Note: "Distribution of AI prediction errors" pie chart requires comparing GT and Pred simultaneously,
    # which assumes merging the CSVs by MRNO. If you need that specific chart, merge logic goes here.)
except FileNotFoundError:
    print("Warning: 'diagnosis.csv' not found.")

print(
    "Success! All reports and visualizations have been saved in the 'Data/' directory."
)
