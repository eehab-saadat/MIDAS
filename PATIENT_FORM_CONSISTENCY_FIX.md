# Patient Form Consistency Fix

## Problem
There were inconsistencies between:
1. Fields available in the patient creation form
2. Fields stored in patient JSON files
3. Fields shown on patient pages

**Missing fields from the form:**
- Ethnicity
- Occupation
- Hearing Impairment (SDOH)
- Access to Healthcare (SDOH)

These fields existed in the stored patient data but couldn't be filled when creating a new patient, leading to "Unknown" or empty values.

## Solution

### 1. Frontend Changes (`frontend/app/page.tsx`)

#### Added New Form Fields

**Personal Information Section:**
- ✅ **Ethnicity** (text input) - e.g., "South Asian", "Caucasian"
- ✅ **Occupation** (text input) - e.g., "Teacher", "Engineer"

**SDOH Section:**
- ✅ **Hearing Impairment** (text input) - e.g., "None", "Uses hearing aids"
- ✅ **Access to Healthcare** (dropdown select) - Good, Moderate, Limited, Poor

#### Updated Form State
```typescript
const [formData, setFormData] = useState({
  // Basic info
  name: "",
  salutation: "",
  age: "",
  sex: "",
  email: "",
  phone: "",
  ethnicity: "",           // ✅ NEW
  occupation: "",          // ✅ NEW
  // SDOH
  smoking_status: "",
  physical_activity: "",
  diet: "",
  hearing_impairment: "",  // ✅ NEW
  access_to_healthcare: "",// ✅ NEW
  // Vitals
  weight_kg: "",
  blood_pressure_mmHg: "",
  heart_rate_bpm: "",
  spo2_percent: "",
  temperature: "",
});
```

#### Updated API Request
Now sends all the new fields:
```typescript
body: JSON.stringify({
  name: formData.name,
  salutation: formData.salutation,
  age: parseInt(formData.age),
  sex: formData.sex,
  email: formData.email || undefined,
  phone: formData.phone || undefined,
  ethnicity: formData.ethnicity || undefined,           // ✅ NEW
  occupation: formData.occupation || undefined,          // ✅ NEW
  // SDOH fields
  smoking_status: formData.smoking_status || undefined,
  physical_activity: formData.physical_activity || undefined,
  diet: formData.diet || undefined,
  hearing_impairment: formData.hearing_impairment || undefined,      // ✅ NEW
  access_to_healthcare: formData.access_to_healthcare || undefined,  // ✅ NEW
  // Vitals fields
  // ...
}),
```

### 2. Backend Changes (`backend/utils/patients.py`)

#### Smart Field Handling
Changed from always including fields with "Unknown" defaults to only including fields when data is provided:

**Before:**
```python
"personal_information": {
    "salutation": patient_data.get("salutation", ""),
    "name": patient_data.get("name", ""),
    "age": patient_data.get("age", 0),
    "sex": patient_data.get("sex", ""),
    "ethnicity": patient_data.get("ethnicity", "Unknown"),      # ❌ Always "Unknown"
    "occupation": patient_data.get("occupation", "Unknown"),    # ❌ Always "Unknown"
    "family_history": patient_data.get("family_history", {}),
    "social_determinants": {
        "smoking_status": patient_data.get("smoking_status", "Unknown"),
        # ... all get "Unknown" defaults
    }
}
```

**After:**
```python
# Build personal information - only include optional fields if provided
personal_info = {
    "salutation": patient_data.get("salutation", ""),
    "name": patient_data.get("name", ""),
    "age": patient_data.get("age", 0),
    "sex": patient_data.get("sex", ""),
}

# Add optional fields only if provided
if patient_data.get("ethnicity"):
    personal_info["ethnicity"] = patient_data.get("ethnicity")
if patient_data.get("occupation"):
    personal_info["occupation"] = patient_data.get("occupation")
if patient_data.get("family_history"):
    personal_info["family_history"] = patient_data.get("family_history")

# Social determinants - only include fields that are provided
social_determinants = {}
if patient_data.get("smoking_status"):
    social_determinants["smoking_status"] = patient_data.get("smoking_status")
if patient_data.get("hearing_impairment"):
    social_determinants["hearing_impairment"] = patient_data.get("hearing_impairment")
if patient_data.get("access_to_healthcare"):
    social_determinants["access_to_healthcare"] = patient_data.get("access_to_healthcare")
# ...

# Only add social_determinants section if there are values
if social_determinants:
    new_patient["personal_information"]["social_determinants"] = social_determinants
```

## Form Structure (Updated)

### Personal Information (Required *)
1. Salutation (dropdown) - Mr, Mrs, Ms, Dr
2. Full Name * (text)
3. Age * (number)
4. Gender * (dropdown) - Male, Female, Other
5. Email (text)
6. Phone (text)
7. **Ethnicity** (text) ✅ NEW
8. **Occupation** (text) ✅ NEW

### Social Determinants of Health (Optional)
1. Smoking Status (dropdown) - Non-smoker, Former smoker, Current smoker
2. Physical Activity (dropdown) - Sedentary, Low, Moderate, High
3. Diet (text)
4. **Hearing Impairment** (text) ✅ NEW
5. **Access to Healthcare** (dropdown) - Good, Moderate, Limited, Poor ✅ NEW

### Vitals (Optional)
1. Weight (kg) (number)
2. Blood Pressure (text) - Format: 120/80
3. Heart Rate (bpm) (number)
4. SpO2 (%) (number)
5. Temperature (°F) (number)

## Example: Before vs After

### Before - Missing Fields
When creating a patient named "John Doe":

**Form Input:**
- Name: John Doe
- Age: 45
- Sex: Male

**Stored Data (P004.json):**
```json
{
  "personal_information": {
    "name": "John Doe",
    "age": 45,
    "sex": "Male",
    "ethnicity": "Unknown",              ❌ Can't be edited
    "occupation": "Unknown",             ❌ Can't be edited
    "social_determinants": {
      "smoking_status": "Unknown",       ❌ Can't be edited
      "physical_activity": "Unknown",    ❌ Can't be edited
      "diet": "Unknown",                 ❌ Can't be edited
      "hearing_impairment": "None reported",  ❌ Can't be edited
      "access_to_healthcare": "Unknown"       ❌ Can't be edited
    }
  }
}
```

### After - All Fields Available
When creating a patient named "John Doe":

**Form Input:**
- Name: John Doe
- Age: 45
- Sex: Male
- Ethnicity: South Asian ✅
- Occupation: Software Engineer ✅
- Smoking Status: Non-smoker ✅
- Hearing Impairment: None ✅
- Access to Healthcare: Good ✅
- Weight: 75 kg ✅

**Stored Data (P006.json):**
```json
{
  "personal_information": {
    "name": "John Doe",
    "age": 45,
    "sex": "Male",
    "ethnicity": "South Asian",          ✅ User-provided
    "occupation": "Software Engineer",   ✅ User-provided
    "social_determinants": {
      "smoking_status": "Non-smoker",    ✅ User-provided
      "hearing_impairment": "None",      ✅ User-provided
      "access_to_healthcare": "Good"     ✅ User-provided
    },
    "contact": {
      "email": "john@example.com",
      "phone": "+1-555-1234"
    }
  },
  "vitals": {
    "weight_kg": 75                      ✅ User-provided
  }
}
```

## Benefits

1. ✅ **Complete Data Entry**: All patient information can now be entered during creation
2. ✅ **No "Unknown" Spam**: Only fields with actual data are stored
3. ✅ **Consistency**: Form matches the data structure
4. ✅ **Better UX**: Users can fill in all relevant information upfront
5. ✅ **Cleaner Data**: Patient records contain only meaningful information
6. ✅ **Accurate Records**: All demographic and SDOH data captured at intake

## Field Mapping

| Form Field | Data Location | Type | Required |
|------------|---------------|------|----------|
| Salutation | personal_information.salutation | String | No |
| Full Name | personal_information.name | String | Yes |
| Age | personal_information.age | Number | Yes |
| Gender | personal_information.sex | String | Yes |
| Email | personal_information.contact.email | String | No |
| Phone | personal_information.contact.phone | String | No |
| **Ethnicity** | **personal_information.ethnicity** | String | No |
| **Occupation** | **personal_information.occupation** | String | No |
| Smoking Status | personal_information.social_determinants.smoking_status | String | No |
| Physical Activity | personal_information.social_determinants.physical_activity | String | No |
| Diet | personal_information.social_determinants.diet | String | No |
| **Hearing Impairment** | **personal_information.social_determinants.hearing_impairment** | String | No |
| **Access to Healthcare** | **personal_information.social_determinants.access_to_healthcare** | String | No |
| Weight (kg) | vitals.weight_kg | Number | No |
| Blood Pressure | vitals.blood_pressure_mmHg | String | No |
| Heart Rate | vitals.heart_rate_bpm | Number | No |
| SpO2 (%) | vitals.spo2_percent | Number | No |
| Temperature | vitals.temperature | String | No |

## Testing Checklist

### Test Case 1: Minimal Patient
- [ ] Fill only required fields (name, age, sex)
- [ ] Verify no "Unknown" values in JSON
- [ ] Verify only required fields are present

### Test Case 2: Full Patient Data
- [ ] Fill all available fields
- [ ] Verify all data is correctly saved
- [ ] Verify proper data types (strings, numbers)
- [ ] Verify ethnicity and occupation are stored
- [ ] Verify hearing_impairment and access_to_healthcare are in social_determinants

### Test Case 3: Partial SDOH
- [ ] Fill only some SDOH fields
- [ ] Verify only filled fields are stored
- [ ] Verify no "Unknown" for unfilled fields

### Test Case 4: Contact Information
- [ ] Add email and phone
- [ ] Verify stored in contact section
- [ ] Try without email/phone
- [ ] Verify contact section not created if empty

## Migration Notes

**Existing Patients:** The changes are backward compatible. Existing patients with "Unknown" values will continue to work, but new patients won't have this issue.

**Data Cleanup (Optional):** Consider creating a migration script to:
1. Remove "Unknown" values from existing patients
2. Remove empty social_determinants objects
3. Remove empty contact objects

## Summary

✅ **Added 4 new form fields**: ethnicity, occupation, hearing_impairment, access_to_healthcare  
✅ **Frontend properly sends all fields** to backend  
✅ **Backend only stores fields with data** (no "Unknown" spam)  
✅ **Form now matches data structure** completely  
✅ **Better user experience** with comprehensive data entry  
✅ **Cleaner patient records** with meaningful data only  

The patient creation form is now complete and consistent with the stored data structure! 🎉

