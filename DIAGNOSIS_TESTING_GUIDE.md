# AI Diagnosis Testing Guide

## Quick Start

This guide helps you test the AI diagnosis feature end-to-end.

## Prerequisites Checklist

Before testing, ensure all services are running:

### 1. Start Ollama
```bash
ollama serve
```

**Verify it's running:**
```bash
curl http://localhost:11434
```
Expected output: `Ollama is running`

### 2. Pull MedGemma Model
```bash
ollama pull amsaravi/medgemma-4b-it:q6
```

**Verify model is available:**
```bash
ollama list
```
You should see `amsaravi/medgemma-4b-it:q6` in the list.

### 3. Start Flask Backend
```bash
cd backend
python app.py
```

**Expected output:**
```
============================================================
🚀 Starting MIDAS Backend Server
   Host: 0.0.0.0
   Port: 5000
   Debug Mode: True
   Time: 2025-11-01 10:30:00
============================================================
```

**Verify it's running:**
```bash
curl http://localhost:5000/ping
```
Expected: `{"status":"ok","message":"pong"}`

### 4. Start Next.js Frontend
```bash
cd frontend
npm run dev
```

**Expected output:**
```
Ready - started server on 0.0.0.0:3000
```

## Test Scenarios

### Test 1: Basic Diagnosis Flow ✅

**Objective**: Verify the complete flow works end-to-end

**Steps:**
1. Open browser to `http://localhost:3000`
2. Click on any patient (e.g., P001, P002, P003)
3. In the session panel (right side), upload a medical image:
   - Click "Add Lab Report" or "Add Imaging"
   - Select a medical image (X-ray, CT scan, etc.)
4. Add optional context:
   - Click "Add Note" and enter clinical observations
   - Click "Add Symptoms" and list symptoms
   - Record or upload audio transcription
5. Click "Get AI Diagnosis" button at the bottom right
6. Wait for processing (30-60 seconds)
7. Review the diagnosis displayed

**Expected Result:**
- Diagnosis appears with "DIAGNOSIS:" and "REASONING:" sections
- Content is medically relevant (not template text)
- "Regenerate" and "Download" buttons appear
- No error messages

**Backend Log Check:**
```
→ REQUEST: POST /diagnose
Starting AI diagnosis generation
Parsing patient data...
Processing image: medical-image.jpg
Calling MedGemma model: amsaravi/medgemma-4b-it:q6
Sending request to Ollama...
✅ Received response from Ollama
✅ Successfully parsed diagnosis: ...
✅ Diagnosis generated successfully
← RESPONSE: 200 | Duration: 45000.00ms
```

### Test 2: No Medical Image Error ❌

**Objective**: Verify error handling when no image is provided

**Steps:**
1. Navigate to patient page
2. Add only text entries (notes, symptoms, meds)
3. Do NOT add any medical images
4. Click "Get AI Diagnosis"

**Expected Result:**
- Error message: "Unable to generate diagnosis: No medical image provided. Please add a medical image to the session."
- Diagnosis text shows the error
- No crash or freeze

### Test 3: Backend Not Running ❌

**Objective**: Verify error handling when Flask is not available

**Steps:**
1. Stop the Flask backend (Ctrl+C)
2. Navigate to patient page with medical image
3. Click "Get AI Diagnosis"

**Expected Result:**
- Error message about connection failure
- Helpful message: "Please ensure the backend server is running"
- Frontend remains responsive

**Frontend Console:**
```
Error processing AI diagnosis request: fetch failed
```

### Test 4: Ollama Not Running ❌

**Objective**: Verify error handling when Ollama is unavailable

**Steps:**
1. Stop Ollama (Ctrl+C on `ollama serve`)
2. Navigate to patient page with medical image
3. Click "Get AI Diagnosis"

**Expected Result:**
- Error message: "Unable to connect to Ollama. Make sure Ollama is running locally on port 11434."
- Frontend shows the error gracefully

**Backend Log:**
```
❌ Cannot connect to Ollama
```

### Test 5: Multiple Diagnoses 🔄

**Objective**: Verify regeneration works

**Steps:**
1. Complete Test 1 successfully
2. Click "Regenerate" button
3. Wait for new diagnosis

**Expected Result:**
- New diagnosis is generated
- May be similar or different (temperature = 0 means consistent)
- Both diagnoses are based on the same data

### Test 6: PDF Download 📄

**Objective**: Verify PDF generation works

**Steps:**
1. Complete Test 1 successfully
2. Click "Download" button
3. Check downloads folder

**Expected Result:**
- PDF file downloads: `medical-report-P00X-2025-11-01.pdf`
- PDF contains:
  - Patient information
  - Vitals
  - Symptoms
  - Medications
  - Clinical notes
  - AI diagnosis

### Test 7: Different Image Types 🖼️

**Objective**: Verify different medical image formats work

**Test with:**
- JPEG/JPG images
- PNG images
- X-rays
- CT scans
- Lab reports

**Expected Result:**
All formats should be processed successfully and provide relevant diagnoses.

### Test 8: Complex Session 📊

**Objective**: Test with multiple session entries

**Steps:**
1. Add multiple entries:
   - 2-3 medical images
   - Clinical notes
   - Symptoms list
   - Medications
   - Audio transcription
2. Click "Get AI Diagnosis"

**Expected Result:**
- Uses first medical image for diagnosis
- Includes all text data in context
- Diagnosis considers all provided information

## Debugging

### Enable Verbose Logging

**Backend:**
Already enabled! Check the terminal running `python app.py`

**Frontend:**
Open browser DevTools (F12) → Console tab

### Check Network Traffic

**In Browser DevTools:**
1. Go to Network tab
2. Filter: "Fetch/XHR"
3. Click "Get AI Diagnosis"
4. Look for requests to:
   - `/api/ai-diagnosis` (Next.js API)
   - Should see 200 status

**Expected timing:**
- `/api/ai-diagnosis`: 35-65 seconds (waiting for model)

### Common Issues

#### Issue: "Failed to generate AI diagnosis"
**Causes:**
- Flask backend not running
- Wrong `FLASK_BACKEND_URL`

**Fix:**
```bash
# Check Flask is running
curl http://localhost:5000/ping

# If not, start it
cd backend
python app.py
```

#### Issue: "Unable to connect to Ollama"
**Causes:**
- Ollama not running
- Wrong port

**Fix:**
```bash
# Start Ollama
ollama serve

# Verify in another terminal
curl http://localhost:11434
```

#### Issue: "Request timed out"
**Causes:**
- Model is too slow
- System resources exhausted
- Large image size

**Fix:**
- Wait longer (first request is slower)
- Check system resources
- Reduce image size
- Consider GPU acceleration

#### Issue: Slow performance
**Tips:**
- First request is always slower (model loading)
- Subsequent requests are faster
- GPU significantly speeds up inference
- Close other applications to free resources

## Performance Benchmarks

### Expected Timings

| Step | Time |
|------|------|
| Frontend processing | < 1s |
| Image encoding | < 1s |
| Network transfer | < 1s |
| MedGemma inference (CPU) | 40-90s |
| MedGemma inference (GPU) | 10-30s |
| Response processing | < 1s |
| **Total (CPU)** | **45-95s** |
| **Total (GPU)** | **15-35s** |

### System Requirements

**Minimum:**
- CPU: 4 cores
- RAM: 8 GB
- Disk: 5 GB (for model)

**Recommended:**
- CPU: 8+ cores or GPU
- RAM: 16 GB
- GPU: NVIDIA with 6+ GB VRAM
- Disk: 10 GB

## Sample Test Data

### Test Patients

Use existing patients in `data/` folder:
- **P001**: Basic patient data
- **P002**: Has existing X-ray in `data/images/xrays/P002_cxr.jpeg`
- **P003**: Multiple symptoms
- **P004**: Complete medical history
- **P005**: Various medications

### Sample Medical Images

You can use sample X-rays from:
- `data/images/xrays/P002_cxr.jpeg` (if exists)
- Any chest X-ray image
- Any CT scan image
- Lab report photos

## Validation Checklist

After testing, verify:

- [ ] Diagnosis generates successfully with medical image
- [ ] Error message appears when no image provided
- [ ] Error handling works when backend is down
- [ ] Error handling works when Ollama is down
- [ ] Regenerate button works
- [ ] Download PDF works
- [ ] PDF contains all expected sections
- [ ] Multiple images can be uploaded (uses first)
- [ ] Different image formats work (JPEG, PNG)
- [ ] Backend logs show detailed processing steps
- [ ] Frontend console shows API calls
- [ ] Response time is reasonable (< 2 minutes)
- [ ] System remains responsive during processing
- [ ] Multiple consecutive diagnoses work

## Success Criteria

The feature is working correctly if:

1. ✅ Real diagnosis generated (not template)
2. ✅ Medically relevant analysis
3. ✅ Proper error messages
4. ✅ Backend logs show Ollama calls
5. ✅ PDF downloads successfully
6. ✅ No crashes or freezes
7. ✅ Response time under 2 minutes

## Reporting Issues

If you find issues, collect:

1. **Frontend Console Logs**: Copy from DevTools Console
2. **Backend Logs**: Copy from Flask terminal
3. **Steps to Reproduce**: Exact sequence
4. **Screenshots**: Error messages
5. **System Info**: OS, RAM, CPU/GPU
6. **Timing**: How long before error/timeout

## Next Steps

After successful testing:

1. Test with real medical images
2. Test with actual patient data
3. Gather feedback from medical professionals
4. Monitor performance metrics
5. Optimize prompt for better diagnoses
6. Consider adding multiple image support
7. Implement diagnosis history

## Useful Commands

```bash
# Check if Ollama is running
curl http://localhost:11434

# Check if Flask is running
curl http://localhost:5000/ping

# List available Ollama models
ollama list

# Test Ollama directly
ollama run amsaravi/medgemma-4b-it:q6 "Hello"

# View Flask logs with timestamps
cd backend && python app.py | tee logs.txt

# Monitor system resources
htop  # Linux/Mac
Task Manager  # Windows
```

## Support

For issues or questions:
1. Check backend logs first
2. Check frontend console
3. Verify all services are running
4. Review this testing guide
5. Check `DIAGNOSIS_FLOW_DOCUMENTATION.md` for architecture details

---

**Happy Testing! 🎉**

