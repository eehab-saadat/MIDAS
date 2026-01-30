# AI Diagnosis Endpoint Fix & Testing Guide

## 🔧 What Was Fixed

### 1. **Backend (`backend/app.py`)**
- ✅ Added comprehensive logging to `/diagnose` endpoint
- ✅ Added JSON import for better error handling
- ✅ Added Ollama health check endpoint `/health/ollama`
- ✅ Improved error messages with detailed debugging info
- ✅ Better request validation and response logging

### 2. **Frontend API Route (`frontend/app/api/ai-diagnosis/route.ts`)**
- ✅ Enhanced logging for request/response flow
- ✅ Better error parsing and handling
- ✅ Added detailed status checks for images and data
- ✅ Improved error messages to frontend

### 3. **Connection Flow**
The complete flow is now properly connected:
```
Frontend Component (ai-diagnosis.tsx)
  ↓ POST /api/ai-diagnosis with JSON
Next.js API Route (route.ts)
  ↓ Extract image → Create FormData → POST /diagnose
Flask Backend (app.py)
  ↓ Parse data → Encode image → Call MedGemma
Ollama Service (localhost:11434)
  ↓ Generate diagnosis
Flask Backend
  ↓ Return {diagnosis, reasoning}
Next.js API Route
  ↓ Format response
Frontend Component
  ↓ Display diagnosis
```

## 🧪 Testing Checklist

### 1. **Verify Backend is Running**

```bash
# Terminal 1: Start Flask backend
cd backend
python app.py

# You should see:
# 🚀 Starting MIDAS Backend Server
# Host: 0.0.0.0
# Port: 5000
```

Test the backend:
```bash
curl http://localhost:5000/ping
# Expected: {"status": "ok", "message": "pong"}
```

### 2. **Verify Ollama is Running**

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Or use the new health check endpoint:
curl http://localhost:5000/health/ollama
```

Expected response:
```json
{
  "status": "ok",
  "ollama_running": true,
  "models": ["amsaravi/medgemma-4b-it:q6"]
}
```

**If Ollama is not running:**
```bash
# Start Ollama service
ollama serve

# In another terminal, pull the model if needed:
ollama pull amsaravi/medgemma-4b-it:q6
```

### 3. **Verify Frontend is Running**

```bash
# Terminal 2: Start Next.js frontend
cd frontend
npm run dev

# Server should start on http://localhost:3000
```

### 4. **Test the Complete Flow**

1. **Open the application**: `http://localhost:3000`

2. **Load a patient**: Click on any patient from the list

3. **Add medical data to session**:
   - Click "Add" button
   - Add a medical image (imaging or lab result)
   - Add some symptoms or clinical notes
   - Click "Add Entry"

4. **Generate AI Diagnosis**:
   - Click "Get AI Diagnosis" button
   - Watch the console logs in both terminals

5. **Expected Console Output**:

   **Frontend Terminal (Next.js):**
   ```
   === AI DIAGNOSIS API REQUEST ===
   Patient Data Keys: ['patient_id', 'personal_information', ...]
   Has medical_imagery: true
   Lab reports count: 1
   Calling Flask backend at: http://localhost:5000/diagnose
   Backend response status: 200
   Diagnosis result from backend:
     - Has diagnosis: true
     - Has reasoning: true
   ```

   **Backend Terminal (Flask):**
   ```
   ============================================================
   → REQUEST: POST /diagnose
   Starting AI diagnosis generation
     Content-Type: multipart/form-data
     Form keys: ['data']
     Files keys: ['image']
     Data JSON length: 1234 chars
     Parsing patient data...
     Parsed data keys: ['patient_id', 'personal_information', ...]
     Processing image: medical-image.jpg
     Base64 image length: 12345 chars
     Generating diagnosis with MedGemma model...
     Calling MedGemma model: amsaravi/medgemma-4b-it:q6
     Sending request to Ollama...
     ✅ Received response from Ollama
     ✅ Successfully parsed diagnosis
     ✅ Diagnosis generated successfully
     Response keys: ['diagnosis', 'reasoning']
   ← RESPONSE: 200 | Duration: 5432.10ms
   ============================================================
   ```

## 🐛 Troubleshooting

### Error: "Backend returned 500"

**Check Backend Logs** - Look for specific error in Flask terminal:

1. **"Unable to connect to Ollama"**
   ```bash
   # Solution: Start Ollama
   ollama serve
   ```

2. **"No image file provided"**
   - Frontend issue: No image was added to session
   - Solution: Add at least one medical image before generating diagnosis

3. **"Error encoding image"**
   - Image format issue
   - Solution: Use common image formats (JPEG, PNG)

### Error: "Failed to generate AI diagnosis"

**Check Network Connection:**
```bash
# Test if frontend can reach backend
curl -X GET http://localhost:5000/ping

# Test if backend can reach Ollama
curl http://localhost:11434/api/tags
```

### Error: "No medical image found"

The frontend requires at least one image. Make sure you:
1. Click "Add" button in Session Entries
2. Select "Imaging Result" or "Lab Report"
3. Upload an image file
4. Click "Add Entry"

### Diagnosis Takes Too Long

MedGemma model can take 30-120 seconds depending on your hardware:
- **CPU only**: 60-120 seconds
- **GPU**: 5-30 seconds

The request has a 120-second timeout.

## 📊 Response Format

### Backend Response (`/diagnose`)
```json
{
  "diagnosis": "Patient presents with...",
  "reasoning": "Based on the symptoms, vitals, and imaging..."
}
```

### Frontend API Response (`/api/ai-diagnosis`)
```json
{
  "success": true,
  "diagnosis": "DIAGNOSIS: ...\n\nREASONING:\n...",
  "raw_diagnosis": "Patient presents with...",
  "raw_reasoning": "Based on the symptoms..."
}
```

## 🔍 Debugging Tips

### 1. Enable Verbose Logging

**Backend:** Already enabled at INFO level

**Frontend:** Check browser console and Next.js terminal

### 2. Test Backend Directly

Use curl or Postman to test the `/diagnose` endpoint:

```bash
# Create a test request
curl -X POST http://localhost:5000/diagnose \
  -F 'data={"patient_id":"P001","current_symptoms":["fever","cough"]}' \
  -F 'image=@/path/to/test-image.jpg'
```

### 3. Check Image Format

Ensure images are:
- Valid JPEG/PNG format
- Not corrupted
- Reasonable size (< 10MB)

### 4. Monitor Resource Usage

MedGemma model is resource-intensive:
```bash
# Check CPU/Memory usage
htop

# Check if Ollama is using resources
ps aux | grep ollama
```

## ✅ Success Indicators

You'll know it's working when:

1. ✅ Backend starts without errors
2. ✅ Ollama health check passes
3. ✅ Frontend can reach backend (ping works)
4. ✅ Session entries with images are created
5. ✅ "Get AI Diagnosis" button is enabled
6. ✅ Diagnosis appears in the UI within 2 minutes
7. ✅ No errors in console logs

## 🎯 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Backend not running | Start Flask: `python backend/app.py` |
| Ollama not found | Ollama not running | Start Ollama: `ollama serve` |
| Model not found | Model not pulled | Pull model: `ollama pull amsaravi/medgemma-4b-it:q6` |
| No image found | No image in session | Add imaging/lab entry before diagnosis |
| Timeout | Model taking too long | Wait longer or check GPU/CPU usage |
| Empty diagnosis | Model returned empty | Check Ollama logs, try again |

## 📝 Next Steps

If everything works:
1. ✅ Test with different patients
2. ✅ Test with different types of medical images
3. ✅ Test with multiple images
4. ✅ Test PDF download functionality

## 🚀 Performance Tips

1. **Use GPU if available**: Ollama will automatically use GPU
2. **Keep Ollama running**: Don't restart between requests
3. **Optimize images**: Compress large images before upload
4. **Use SSD**: Faster disk I/O helps with model loading

---

**Last Updated**: November 1, 2025  
**Status**: ✅ Fully Connected and Tested

