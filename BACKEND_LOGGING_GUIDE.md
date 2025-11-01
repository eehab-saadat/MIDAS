# Backend Logging Guide

## Overview
The Flask backend now includes comprehensive smart logging to make debugging easier. Every request, response, and operation is logged with detailed information.

## Features

### 1. **Automatic Request/Response Logging**
Every API request is automatically logged with:
- HTTP method and path
- Query parameters (if any)
- Request body (for POST/PUT/PATCH)
- Response status code
- Request duration in milliseconds

### 2. **Emoji-Based Visual Indicators**
Logs use emojis for quick visual scanning:
- 🚀 Server startup
- 🏓 Health check
- 📋 List operations
- 👤 Single patient operations
- ➕ Create operations
- ✏️  Update operations
- 🎤 Transcription operations
- ✅ Success
- ❌ Error
- ⚠️  Warning

### 3. **Detailed Operation Tracking**
Each endpoint logs:
- Operation start
- Key steps during processing
- Success/failure outcomes
- Error details with full stack traces

## Log Format

```
YYYY-MM-DD HH:MM:SS [LEVEL] module_name - message
```

Example:
```
2025-11-01 15:30:45 [INFO] __main__ - 📋 Fetching all patients
```

## Example Output

### Server Startup
```
============================================================
🚀 Starting MIDAS Backend Server
   Host: 0.0.0.0
   Port: 5000
   Debug Mode: True
   Time: 2025-11-01 15:30:00
============================================================
```

### GET Request to List Patients
```
============================================================
→ REQUEST: GET /patients
📋 Fetching all patients
  ✅ Retrieved 3 patients
← RESPONSE: 200 | Duration: 45.23ms
============================================================
```

### POST Request to Create Patient
```
============================================================
→ REQUEST: POST /patients
  Request Body: {'name': 'John Doe', 'age': 35, 'sex': 'Male'}
➕ Creating new patient
  Patient data received: John Doe, Age: 35, Sex: Male
  ✅ Patient created successfully: P004 - John Doe
← RESPONSE: 201 | Duration: 123.45ms
============================================================
```

### GET Single Patient
```
============================================================
→ REQUEST: GET /patients/P001
👤 Fetching patient: P001
  ✅ Retrieved patient: Yasmeen Pervaiz
← RESPONSE: 200 | Duration: 34.12ms
============================================================
```

### Update Patient
```
============================================================
→ REQUEST: PUT /patients/P001
  Request Body: {'vitals': {'weight_kg': 68}}
✏️  Updating patient: P001
  Update fields: ['vitals']
  ✅ Patient updated successfully: Yasmeen Pervaiz
← RESPONSE: 200 | Duration: 67.89ms
============================================================
```

### Audio Transcription
```
============================================================
→ REQUEST: POST /transcribe
  Form Data: ['audio']
🎤 Starting audio transcription
  Audio file saved: /tmp/tmpxyz123.webm (Size: 245.67KB)
  Processing transcription...
  ✅ Transcription successful (Length: 234 chars)
  Cleaned up temp file: /tmp/tmpxyz123.webm
← RESPONSE: 200 | Duration: 1234.56ms
============================================================
```

### Error Example
```
============================================================
→ REQUEST: GET /patients/P999
👤 Fetching patient: P999
  ⚠️  Patient not found: P999
← RESPONSE: 404 | Duration: 12.34ms
============================================================
```

### Exception Example
```
============================================================
→ REQUEST: POST /patients
  Request Body: {'name': 'Test'}
➕ Creating new patient
  Patient data received: Test, Age: N/A, Sex: N/A
  ❌ Missing required fields: age, sex
← RESPONSE: 400 | Duration: 8.91ms
============================================================
```

## Log Levels

### INFO (Default)
- Request/response details
- Operation start/completion
- Success messages
- Server startup

### WARNING
- Missing data
- Not found resources
- Validation failures

### ERROR
- Exceptions
- Failed operations
- System errors
- Includes full stack trace

### DEBUG (Optional)
- Detailed patient information
- Extra processing details
- Enable by changing `level=logging.DEBUG` in the code

## Enabling Debug Mode

To see more detailed logs, change the logging level in `backend/app.py`:

```python
logging.basicConfig(
    level=logging.DEBUG,  # Change from INFO to DEBUG
    format='%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
```

## What Gets Logged

### Health Check (`/ping`)
- Request received
- Response sent

### List Patients (`GET /patients`)
- Number of patients retrieved
- Patient IDs and names (DEBUG level)

### Get Patient (`GET /patients/<id>`)
- Patient ID being fetched
- Patient name, age, sex (DEBUG level)
- Not found warnings

### Create Patient (`POST /patients`)
- Patient data received
- Validation checks
- Generated patient ID
- Success/failure

### Update Patient (`PUT /patients/<id>`)
- Patient ID being updated
- Fields being updated
- Success/failure

### Transcribe Audio (`POST /transcribe`)
- File size
- Processing steps
- Transcription length
- Temp file cleanup

## Benefits

1. **Easy Debugging**: See exactly what's happening at each step
2. **Performance Monitoring**: Track request duration
3. **Error Tracking**: Full stack traces for exceptions
4. **Request Tracing**: Follow the complete request lifecycle
5. **Quick Scanning**: Emoji indicators for rapid visual scanning
6. **Production Ready**: Structured format suitable for log aggregation tools

## Tips

### Viewing Logs in Real-Time
```bash
cd backend
python app.py
```

### Filtering Logs
```bash
# Only show errors
python app.py 2>&1 | grep ERROR

# Only show warnings and errors
python app.py 2>&1 | grep -E "WARNING|ERROR"

# Only show patient operations
python app.py 2>&1 | grep -E "📋|👤|➕|✏️"
```

### Saving Logs to File
```bash
python app.py > logs.txt 2>&1
```

### Monitoring Specific Operations
```bash
# Watch patient creation
python app.py 2>&1 | grep "➕"

# Watch all patient operations
python app.py 2>&1 | grep -E "patient|Patient"
```

## Integration with Monitoring Tools

The structured log format works well with:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Splunk**
- **Datadog**
- **CloudWatch**
- **Grafana Loki**

## Future Enhancements

Potential additions:
1. Request ID tracking for tracing across services
2. User authentication logging
3. Audit trail for data changes
4. Performance metrics (database query time, etc.)
5. Log rotation for production environments
6. Structured JSON logging for better parsing

## Example: Debugging a Failed Request

When a request fails, you'll see:

```
============================================================
→ REQUEST: POST /patients
  Request Body: {'age': 35, 'sex': 'Male'}
➕ Creating new patient
  Patient data received: N/A, Age: 35, Sex: Male
  ❌ Missing required fields: name
← RESPONSE: 400 | Duration: 5.67ms
============================================================
```

This immediately tells you:
1. What was sent (no name field)
2. What went wrong (missing required field)
3. How long it took (5.67ms)
4. What response code was returned (400)

## Conclusion

The smart logging system provides:
- ✅ Complete request/response visibility
- ✅ Easy error debugging
- ✅ Performance insights
- ✅ Visual clarity with emojis
- ✅ Production-ready structure

Happy debugging! 🐛🔍

