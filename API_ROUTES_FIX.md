# API Routes Fix - 404 Error Resolution

## Problem
The patients list was not loading and giving a 404 error on localhost:3000 because the API routes were in the wrong directory.

## Root Cause
The API routes were located in the **root** `app/api/` directory, but the Next.js application is actually running from the `frontend/` directory. Next.js looks for API routes in `[app-root]/app/api/`, so with the app in `frontend/`, the routes need to be in `frontend/app/api/`.

## Solution
Moved all API routes from `app/api/` to `frontend/app/api/`:

### Files Created/Moved:

1. ✅ **`frontend/app/api/patients/route.ts`**
   - GET endpoint to fetch all patients
   - POST endpoint to create new patient

2. ✅ **`frontend/app/api/patients/[id]/route.ts`**
   - GET endpoint to fetch specific patient
   - PUT endpoint to update patient

3. ✅ **`frontend/app/api/transcribe/route.ts`**
   - POST endpoint to transcribe audio

4. ✅ **`frontend/app/api/ai-diagnosis/route.ts`**
   - POST endpoint to generate AI diagnosis

## Directory Structure (Corrected)

```
MIDAS/
├── frontend/                      ← Next.js app root
│   ├── app/
│   │   ├── api/                  ← ✅ API routes HERE (CORRECT)
│   │   │   ├── patients/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts
│   │   │   ├── transcribe/
│   │   │   │   └── route.ts
│   │   │   └── ai-diagnosis/
│   │   │       └── route.ts
│   │   ├── page.tsx              ← Main patients list page
│   │   └── patient/
│   │       └── page.tsx          ← Patient detail page
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── app/                           ← ❌ Old location (INCORRECT)
│   └── api/                      ← These were in wrong place
│       └── ...
│
└── backend/
    ├── app.py                    ← Flask backend
    └── utils/
        └── patients.py
```

## How It Works Now

1. **Frontend Request**: `http://localhost:3000/` loads the patients list page
2. **API Call**: Page makes request to `/api/patients`
3. **Next.js API Route**: `frontend/app/api/patients/route.ts` receives request
4. **Proxy to Backend**: Forwards request to Flask at `http://localhost:5000/patients`
5. **Backend Response**: Flask returns patient data from JSON files
6. **Response to Frontend**: Data flows back through Next.js API route to the page

## Testing

### 1. Make sure Flask backend is running:
```bash
cd backend
python app.py
```

### 2. Make sure Next.js frontend is running:
```bash
cd frontend
npm run dev
```

### 3. Access the application:
- Open browser to `http://localhost:3000`
- You should now see the patients list loading correctly
- No more 404 errors!

## What Each API Route Does

### `/api/patients` (GET)
- **Frontend calls**: `/api/patients`
- **Proxies to**: `http://localhost:5000/patients`
- **Returns**: List of all patients with minimal fields

### `/api/patients` (POST)
- **Frontend calls**: `/api/patients`
- **Proxies to**: `http://localhost:5000/patients`
- **Creates**: New patient with auto-generated ID

### `/api/patients/[id]` (GET)
- **Frontend calls**: `/api/patients/P001`
- **Proxies to**: `http://localhost:5000/patients/P001`
- **Returns**: Complete patient data

### `/api/patients/[id]` (PUT)
- **Frontend calls**: `/api/patients/P001`
- **Proxies to**: `http://localhost:5000/patients/P001`
- **Updates**: Patient data

### `/api/transcribe` (POST)
- **Frontend calls**: `/api/transcribe`
- **Proxies to**: `http://localhost:5000/transcribe`
- **Transcribes**: Audio to text

### `/api/ai-diagnosis` (POST)
- **Frontend calls**: `/api/ai-diagnosis`
- **Generates**: AI-powered diagnosis summary

## Verification

All API routes are now in the correct location:
- ✅ No linter errors
- ✅ Correct directory structure
- ✅ All routes forwarding to Flask backend
- ✅ Frontend pages can access API routes

## Important Notes

1. **Flask Backend Must Be Running**: The Next.js API routes are just proxies. They forward requests to the Flask backend, so Flask must be running on port 5000.

2. **Port Configuration**: 
   - Next.js: `http://localhost:3000`
   - Flask: `http://localhost:5000`

3. **CORS**: Already configured in Flask with `flask-cors`

4. **Development vs Production**: In production, you may want to configure these URLs via environment variables instead of hardcoding `localhost:5000`.

## Cleanup (Optional)

The old API routes in the root `app/api/` directory can now be deleted as they are no longer used:
- `app/api/patients/route.ts` (old)
- `app/api/patients/[id]/route.ts` (old)
- `app/api/transcribe/route.ts` (old)
- `app/api/ai-diagnosis/route.ts` (old)

## Success! 🎉

The 404 error should now be resolved, and the patients list should load correctly at `http://localhost:3000`.

