# Patient Creation Fix

## Problem
When creating a new patient, most fields were being set to "Unknown" or empty even though they were collected in the form. The created patient JSON file (e.g., P004.json) had many empty or default values.

## Root Cause
Two issues were identified:

1. **Frontend Issue**: The form was collecting SDOH (Social Determinants of Health) and vitals data, but only sending basic fields (name, salutation, age, sex, email, phone) to the backend.

2. **Backend Issue**: The `create_patient` function was setting all optional fields to "Unknown" or default values, even when data wasn't provided. It also wasn't handling email and phone fields properly.

## Solution

### 1. Frontend Fix (`frontend/app/page.tsx`)

**Before:**
```typescript
body: JSON.stringify({
  name: formData.name,
  salutation: formData.salutation,
  age: parseInt(formData.age),
  sex: formData.sex,
  email: formData.email,
  phone: formData.phone,
}),
```

**After:**
```typescript
body: JSON.stringify({
  name: formData.name,
  salutation: formData.salutation,
  age: parseInt(formData.age),
  sex: formData.sex,
  email: formData.email,
  phone: formData.phone,
  // SDOH fields
  smoking_status: formData.smoking_status || undefined,
  physical_activity: formData.physical_activity || undefined,
  diet: formData.diet || undefined,
  // Vitals fields
  weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
  blood_pressure_mmHg: formData.blood_pressure_mmHg || undefined,
  heart_rate_bpm: formData.heart_rate_bpm ? parseInt(formData.heart_rate_bpm) : undefined,
  spo2_percent: formData.spo2_percent ? parseFloat(formData.spo2_percent) : undefined,
  temperature: formData.temperature || undefined,
}),
```

**Changes:**
- Now sends all SDOH fields (smoking_status, physical_activity, diet)
- Now sends all vitals fields (weight_kg, blood_pressure_mmHg, heart_rate_bpm, spo2_percent, temperature)
- Uses `undefined` for empty values so backend knows they weren't provided
- Properly parses numeric values (parseFloat for decimals, parseInt for integers)

### 2. Backend Fix (`backend/utils/patients.py`)

**Key Changes:**

1. **Smart Field Handling**: Only include optional fields if they're actually provided
   ```python
   # Build social determinants - only include if provided
   social_determinants = {}
   if patient_data.get("smoking_status"):
       social_determinants["smoking_status"] = patient_data.get("smoking_status")
   # ... etc
   ```

2. **Contact Information**: Added support for email and phone
   ```python
   contact_info = {}
   if patient_data.get("email"):
       contact_info["email"] = patient_data.get("email")
   if patient_data.get("phone"):
       contact_info["phone"] = patient_data.get("phone")
   ```

3. **Conditional Sections**: Only add sections if they have data
   ```python
   # Add social_determinants only if there are any values
   if social_determinants:
       new_patient["personal_information"]["social_determinants"] = social_determinants
   
   # Add contact info only if there are any values
   if contact_info:
       new_patient["personal_information"]["contact"] = contact_info
   ```

4. **Proper Vitals Handling**: Use actual values instead of defaults
   ```python
   weight_kg = patient_data.get("weight_kg")
   heart_rate_bpm = patient_data.get("heart_rate_bpm")
   spo2_percent = patient_data.get("spo2_percent")
   
   "vitals": {
       "weight_kg": weight_kg if weight_kg is not None else 0,
       "heart_rate_bpm": heart_rate_bpm if heart_rate_bpm is not None else 0,
       "spo2_percent": spo2_percent if spo2_percent is not None else 0,
       # ...
   }
   ```

## Example: Creating a Patient

### Form Input
- **Name**: John Doe
- **Salutation**: Mr
- **Age**: 45
- **Sex**: Male
- **Email**: john.doe@example.com
- **Phone**: +1-555-1234
- **Smoking Status**: Non-smoker
- **Physical Activity**: Moderate
- **Weight**: 75 kg
- **Blood Pressure**: 120/80
- **Heart Rate**: 72 bpm

### Before Fix (P004.json)
```json
{
  "personal_information": {
    "salutation": "Mrs",
    "name": "dummy 1",
    "age": 55,
    "sex": "Male",
    "ethnicity": "Unknown",
    "occupation": "Unknown",
    "social_determinants": {
      "smoking_status": "Unknown",
      "physical_activity": "Unknown",
      "diet": "Unknown",
      "hearing_impairment": "None reported",
      "access_to_healthcare": "Unknown"
    }
  },
  "vitals": {
    "weight_kg": 0,
    "blood_pressure_mmHg": "",
    "heart_rate_bpm": 0,
    // ...
  }
}
```
❌ All optional fields set to "Unknown" even when not provided
❌ Email and phone not saved
❌ Vitals all 0 or empty

### After Fix
```json
{
  "personal_information": {
    "salutation": "Mr",
    "name": "John Doe",
    "age": 45,
    "sex": "Male",
    "ethnicity": "Unknown",
    "occupation": "Unknown",
    "family_history": {},
    "social_determinants": {
      "smoking_status": "Non-smoker",
      "physical_activity": "Moderate"
    },
    "contact": {
      "email": "john.doe@example.com",
      "phone": "+1-555-1234"
    }
  },
  "vitals": {
    "weight_kg": 75,
    "bmi_estimate": 0,
    "blood_pressure_mmHg": "120/80",
    "heart_rate_bpm": 72,
    "spo2_percent": 0,
    "temperature": "",
    "blood_glucose": "Unknown"
  }
}
```
✅ Only provided SDOH fields included (no "Unknown" spam)
✅ Email and phone properly saved in contact section
✅ Vitals contain actual values entered
✅ Cleaner JSON structure

## Fields Supported

### Required Fields
- `name` (string)
- `age` (integer)
- `sex` (string)

### Optional Personal Information
- `salutation` (string) - Mr, Mrs, Ms, Dr
- `email` (string)
- `phone` (string)
- `ethnicity` (string)
- `occupation` (string)

### Optional SDOH (Social Determinants of Health)
- `smoking_status` (string) - Non-smoker, Former smoker, Current smoker
- `physical_activity` (string) - Sedentary, Low, Moderate, High
- `diet` (string) - Free text
- `hearing_impairment` (string)
- `access_to_healthcare` (string)

### Optional Vitals
- `weight_kg` (float)
- `blood_pressure_mmHg` (string) - Format: "120/80"
- `heart_rate_bpm` (integer)
- `spo2_percent` (float) - Oxygen saturation
- `temperature` (string) - Can be Celsius or Fahrenheit

## Benefits

1. **Cleaner Data**: No unnecessary "Unknown" values cluttering the database
2. **Accurate Information**: All form fields are now properly captured and saved
3. **Contact Information**: Email and phone are now saved in a dedicated contact section
4. **Proper Data Types**: Numbers are properly parsed (integers vs floats)
5. **Optional Fields**: Optional sections only appear if data is provided
6. **Better UX**: Users see their entered data correctly saved

## Testing

### Test Case 1: Minimal Patient (Required Fields Only)
```json
POST /api/patients
{
  "name": "Jane Smith",
  "age": 30,
  "sex": "Female"
}
```

**Expected Result:**
- Patient created with only required fields
- No "Unknown" values for SDOH
- No empty contact section
- Vitals set to 0 or empty strings (defaults)

### Test Case 2: Full Patient (All Fields)
```json
POST /api/patients
{
  "name": "John Doe",
  "salutation": "Mr",
  "age": 45,
  "sex": "Male",
  "email": "john@example.com",
  "phone": "+1-555-1234",
  "smoking_status": "Non-smoker",
  "physical_activity": "Moderate",
  "diet": "Balanced",
  "weight_kg": 75.5,
  "blood_pressure_mmHg": "120/80",
  "heart_rate_bpm": 72,
  "spo2_percent": 98.0,
  "temperature": "98.6"
}
```

**Expected Result:**
- All fields properly saved
- SDOH section with only provided fields
- Contact section with email and phone
- Vitals with actual values

### Test Case 3: Partial Data (Some SDOH, Some Vitals)
```json
POST /api/patients
{
  "name": "Alice Brown",
  "age": 35,
  "sex": "Female",
  "smoking_status": "Former smoker",
  "weight_kg": 65
}
```

**Expected Result:**
- SDOH section with only smoking_status (no other "Unknown" fields)
- Vitals with weight_kg = 65, others default
- No contact section (since no email/phone)

## Migration Notes

**Existing Patients:** The fix doesn't affect existing patient records. They will continue to work as before.

**Future Enhancement:** Consider adding a data migration script to clean up existing patients with "Unknown" values if needed.

## Summary

✅ Frontend now sends all form fields to backend
✅ Backend properly handles email and phone
✅ Backend only includes optional fields when provided
✅ No more "Unknown" spam in patient records
✅ Cleaner, more accurate patient data
✅ Better user experience

The patient creation process now accurately captures and stores all the information users enter in the form!

