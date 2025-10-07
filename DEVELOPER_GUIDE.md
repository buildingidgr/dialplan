# Routee Voice Opt-Out Flow - Developer Guide

## Table of Contents
1. [Overview](#overview)
2. [Business Logic](#business-logic)
3. [Technical Architecture](#technical-architecture)
4. [Routee Integration](#routee-integration)
5. [API Endpoints](#api-endpoints)
6. [Request/Response Examples](#requestresponse-examples)
7. [Implementation Guide](#implementation-guide)
8. [Testing](#testing)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This voice opt-out flow allows customers to opt out of SMS campaigns by calling a toll-free number and pressing "1" followed by the hash key. The system provides clear voice instructions, handles invalid inputs with retry logic, and integrates with your CIAM system to register opt-outs.

### Key Features
- ✅ Two-attempt retry logic for invalid inputs
- ✅ Clear voice instructions at each step
- ✅ Automatic timeout handling (7 seconds)
- ✅ CIAM integration for opt-out registration
- ✅ Real-time monitoring dashboard
- ✅ Comprehensive logging

---

## Business Logic

### Call Flow Overview

```
User Calls TFN
    ↓
Welcome Message (1.wav)
"Press 1 followed by hash to opt out"
    ↓
Wait for Input (7 seconds)
    ↓
┌─────────────┬──────────────┬───────────────┐
│ Press "1"   │ Press Other  │ No Input      │
│             │              │               │
✓ Success     │ Invalid      │ Timeout       │
Confirmed     │ (Attempt 1)  │ End Call      │
(5.wav)       │              │ (4.wav)       │
│             ↓              │               │
End Call      Retry Message  │               │
              (2.wav)        │               │
              │              │               │
              Wait 7s        │               │
              │              │               │
              ├─Press "1"?───┘               │
              │              │               │
              ✓ Success      Invalid         │
              (5.wav)        (Attempt 2)     │
              │              │               │
              End Call       End Call        │
                             (3.wav)         │
```

### Audio Messages

| File | Trigger | Content |
|------|---------|---------|
| **1.wav** | Initial call | "Hello, This is SK-II. Thank you for calling. To opt out from SMS campaigns, please press 1 followed by the hash key." |
| **2.wav** | Invalid input (1st) | "You have selected an invalid option. To opt out from SMS notifications, please press 1 followed by the hash key." |
| **3.wav** | Invalid input (2nd) | "You have selected an invalid option again. We will now end the call. Please call again. Thank you." |
| **4.wav** | No input/timeout | "No input was received. We will now end the call. Please call again." |
| **5.wav** | Successful opt-out | "Your selection to opt-out from SMS campaigns has been registered. Thank you!" |

---

## Technical Architecture

### System Components

```
┌─────────────────┐
│  Customer Calls │
│   Toll-Free #   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     Routee      │
│  Voice Gateway  │
└────────┬────────┘
         │
         │ (1) GET Initial Dialplan
         ↓
┌─────────────────────────────────────────┐
│  /api/voice/dialplans/opt-out/initial  │
│  Returns: PLAY → COLLECT → PAUSE → PLAY│
└────────┬────────────────────────────────┘
         │
         │ (2) User presses keys
         ↓
┌─────────────────────────────────────────┐
│  Routee collects tones during PAUSE     │
└────────┬────────────────────────────────┘
         │
         │ (3) POST collected tones
         ↓
┌─────────────────────────────────────────┐
│  /api/voice/hooks/collect/opt-out      │
│  - Validates input                      │
│  - Calls CIAM if valid                  │
│  - Returns appropriate response         │
└────────┬────────────────────────────────┘
         │
         ↓
┌─────────────────┐
│   CIAM System   │
│  Registers      │
│  Opt-out        │
└─────────────────┘
```

### Technology Stack
- **Platform**: Next.js on Vercel (Serverless Functions)
- **Language**: JavaScript/Node.js
- **API Format**: JSON (REST)
- **Voice Provider**: Routee
- **Monitoring**: Built-in request logger + dashboard

---

## Routee Integration

### Step 1: Configure Routee Application

1. **Log into Routee Dashboard**
   - Go to [https://www.routee.net/](https://www.routee.net/)
   - Navigate to Voice > Applications

2. **Create/Configure Voice Application**
   - Application Type: `Inbound Voice`
   - Voice URL (Initial Dialplan): 
     ```
     https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/dialplans/opt-out/initial
     ```
   - HTTP Method: `GET` or `POST` (both supported)
   - Voice Fallback URL: (Optional) Same URL for redundancy

3. **Assign Toll-Free Number**
   - Purchase or assign a toll-free number (e.g., +18336224406)
   - Link the number to your Voice Application

### Step 2: Test Configuration

```bash
# Test initial dialplan
curl https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/dialplans/opt-out/initial
```

Expected response:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/pTXaaw7KDLcjBnt/download/1.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/hooks/collect/opt-out?attempt=1",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/299WXiedo2wCp2y/download/4.wav",
      "bargeIn": false
    }
  ]
}
```

---

## API Endpoints

### 1. Initial Dialplan Endpoint

**URL**: `GET/POST /api/voice/dialplans/opt-out/initial`

**Purpose**: Returns the initial dialplan that Routee executes when a call comes in.

**Request**: No body required

**Response**:
```json
{
  "verbs": [
    { "type": "PLAY", "fileURL": "...", "bargeIn": false },
    { "type": "COLLECT", "eventUrl": "...", "submitOnHash": true, "maxDigits": 30 },
    { "type": "PAUSE", "duration": 7 },
    { "type": "PLAY", "fileURL": "...", "bargeIn": false }
  ]
}
```

**Verb Explanation**:
- `PLAY`: Plays audio file (1.wav - welcome message)
- `COLLECT`: Waits for user to press keys, submits on # press
- `PAUSE`: Gives user 7 seconds to respond
- `PLAY`: Fallback message if no input (4.wav)

---

### 2. Collect Webhook Endpoint

**URL**: `POST /api/voice/hooks/collect/opt-out?attempt={1|2}`

**Purpose**: Receives collected tones from Routee and returns appropriate response.

**Request Body** (sent by Routee):
```json
{
  "from": "+1302394020350",
  "to": "+18336224406",
  "messageId": "b0e254fa-9986-4e72-83e4-987eb5dd5bbd",
  "conversationTrackingId": "4b44843d-a087-4cb5-8cd6-9aacb1728380",
  "collectedTones": "1"
}
```

**Field Descriptions**:
- `from`: Caller's phone number
- `to`: Your toll-free number
- `messageId`: Unique Routee message ID
- `conversationTrackingId`: Routee conversation tracking ID
- `collectedTones`: Digits pressed by user (empty string if no input)

**Response (Valid Input - collectedTones = "1")**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/Aw9oidNF2oxAppq/download/5.wav",
      "bargeIn": false
    }
  ]
}
```

**Response (Invalid Input - Attempt 1)**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/ezLYj4bpG6mmBty/download/2.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/hooks/collect/opt-out?attempt=2",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
      "bargeIn": false
    }
  ]
}
```

**Response (Invalid Input - Attempt 2)**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
      "bargeIn": false
    }
  ]
}
```

---

## Implementation Guide

### Generic Implementation (Any Language/Framework)

#### Step 1: Implement Initial Dialplan Endpoint

```pseudo
FUNCTION handleInitialDialplan(request):
  // Set CORS headers for cross-origin requests
  SET_HEADER("Access-Control-Allow-Origin", "*")
  SET_HEADER("Content-Type", "application/json")
  
  // Build response with verbs
  response = {
    "verbs": [
      {
        "type": "PLAY",
        "fileURL": "https://cdn12.waymore.io/s/pTXaaw7KDLcjBnt/download/1.wav",
        "bargeIn": false
      },
      {
        "type": "COLLECT",
        "eventUrl": "https://YOUR-DOMAIN/api/voice/hooks/collect/opt-out?attempt=1",
        "submitOnHash": true,
        "maxDigits": 30
      },
      {
        "type": "PAUSE",
        "duration": 7
      },
      {
        "type": "PLAY",
        "fileURL": "https://cdn12.waymore.io/s/299WXiedo2wCp2y/download/4.wav",
        "bargeIn": false
      }
    ]
  }
  
  RETURN JSON(response, 200)
END FUNCTION
```

#### Step 2: Implement Collect Webhook Endpoint

```pseudo
FUNCTION handleCollectWebhook(request):
  // Set CORS headers
  SET_HEADER("Access-Control-Allow-Origin", "*")
  SET_HEADER("Content-Type", "application/json")
  
  // Parse request
  collectedTones = request.body.collectedTones OR ""
  attempt = request.query.attempt OR 1
  from = request.body.from
  to = request.body.to
  messageId = request.body.messageId
  conversationTrackingId = request.body.conversationTrackingId
  
  // Log for debugging
  LOG("Collect webhook called - attempt:", attempt, "collectedTones:", collectedTones)
  
  // Valid input: "1"
  IF collectedTones == "1":
    // Call CIAM to register opt-out
    CALL_CIAM_OPT_OUT({
      collectedTones: collectedTones,
      from: from,
      to: to,
      messageId: messageId,
      conversationTrackingId: conversationTrackingId,
      attempt: attempt,
      timestamp: CURRENT_TIMESTAMP()
    })
    
    // Return confirmation message
    response = {
      "verbs": [
        {
          "type": "PLAY",
          "fileURL": "https://cdn12.waymore.io/s/Aw9oidNF2oxAppq/download/5.wav",
          "bargeIn": false
        }
      ]
    }
    RETURN JSON(response, 200)
  END IF
  
  // Invalid input - Attempt 1
  IF attempt == 1:
    LOG("Invalid input on first attempt, retrying")
    response = {
      "verbs": [
        {
          "type": "PLAY",
          "fileURL": "https://cdn12.waymore.io/s/ezLYj4bpG6mmBty/download/2.wav",
          "bargeIn": false
        },
        {
          "type": "COLLECT",
          "eventUrl": "https://YOUR-DOMAIN/api/voice/hooks/collect/opt-out?attempt=2",
          "submitOnHash": true,
          "maxDigits": 30
        },
        {
          "type": "PAUSE",
          "duration": 7
        },
        {
          "type": "PLAY",
          "fileURL": "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
          "bargeIn": false
        }
      ]
    }
    RETURN JSON(response, 200)
  END IF
  
  // Invalid input - Attempt 2
  LOG("Invalid input on second attempt, ending call")
  response = {
    "verbs": [
      {
        "type": "PLAY",
        "fileURL": "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
        "bargeIn": false
      }
    ]
  }
  RETURN JSON(response, 200)
END FUNCTION
```

#### Step 3: Implement CIAM Integration

```pseudo
FUNCTION callCIAMToOptOut(data):
  LOG("Calling CIAM to register opt-out:", data)
  
  // Example: HTTP POST to your CIAM API
  ciamRequest = {
    "phoneNumber": data.from,
    "optOutType": "SMS_CAMPAIGNS",
    "source": "VOICE_IVR",
    "timestamp": data.timestamp,
    "routeeMessageId": data.messageId,
    "conversationId": data.conversationTrackingId
  }
  
  TRY:
    response = HTTP_POST(
      url: "https://your-ciam-api.com/opt-outs",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY"
      },
      body: JSON.stringify(ciamRequest)
    )
    
    IF response.status == 200:
      LOG("Opt-out registered successfully")
    ELSE:
      LOG("Error registering opt-out:", response.status)
    END IF
  CATCH error:
    LOG("Exception calling CIAM:", error)
  END TRY
END FUNCTION
```

---

## Request/Response Examples

### Example 1: Successful Opt-Out

**Call Flow**:
1. User calls toll-free number
2. Routee requests initial dialplan
3. User hears message and presses "1#"
4. Routee posts to collect webhook
5. System confirms opt-out

**Request to Collect Webhook**:
```http
POST /api/voice/hooks/collect/opt-out?attempt=1
Content-Type: application/json

{
  "from": "+1302394020350",
  "to": "+18336224406",
  "messageId": "b0e254fa-9986-4e72-83e4-987eb5dd5bbd",
  "conversationTrackingId": "4b44843d-a087-4cb5-8cd6-9aacb1728380",
  "collectedTones": "1"
}
```

**Response**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/Aw9oidNF2oxAppq/download/5.wav",
      "bargeIn": false
    }
  ]
}
```

---

### Example 2: Invalid Input with Retry

**Call Flow**:
1. User calls and presses "9#"
2. Routee posts to collect webhook (attempt=1)
3. System returns retry message

**Request**:
```http
POST /api/voice/hooks/collect/opt-out?attempt=1
Content-Type: application/json

{
  "from": "+1302394020350",
  "to": "+18336224406",
  "messageId": "c14949a1-ee5b-4552-a091-74cefa123a4e",
  "conversationTrackingId": "80fc650e-a7ca-4671-804e-cf0bfe89d27f",
  "collectedTones": "9"
}
```

**Response**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/ezLYj4bpG6mmBty/download/2.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://YOUR-DOMAIN/api/voice/hooks/collect/opt-out?attempt=2",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
      "bargeIn": false
    }
  ]
}
```

---

### Example 3: No Input (Timeout)

**Call Flow**:
1. User calls but doesn't press anything
2. After 7 seconds, Routee posts empty collectedTones
3. System treats as invalid input

**Request**:
```http
POST /api/voice/hooks/collect/opt-out?attempt=1
Content-Type: application/json

{
  "from": "+1302394020350",
  "to": "+18336224406",
  "messageId": "d15050b2-ff6c-5663-b192-85dfgb234b5e",
  "conversationTrackingId": "91gd761f-b8db-5782-915e-dg1cgf90e38e",
  "collectedTones": ""
}
```

**Response**: Same as invalid input (retry on attempt 1, end call on attempt 2)

---

## Testing

### Manual Testing via Phone

1. **Test Valid Opt-Out**:
   - Call: +18336224406 (your toll-free number)
   - Wait for message
   - Press: `1` then `#`
   - Expected: Hear confirmation message

2. **Test Invalid Input with Retry**:
   - Call toll-free number
   - Press: `9` then `#`
   - Expected: Hear retry message
   - Press: `1` then `#`
   - Expected: Hear confirmation

3. **Test Second Invalid**:
   - Call toll-free number
   - Press: `9` then `#`
   - Expected: Hear retry message
   - Press: `5` then `#`
   - Expected: Hear "call ended" message

4. **Test No Input**:
   - Call toll-free number
   - Don't press anything
   - Wait 7+ seconds
   - Expected: Hear retry message

### Automated API Testing

```bash
# Test 1: Initial Dialplan
curl -X GET https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/dialplans/opt-out/initial

# Test 2: Valid Opt-Out
curl -X POST "https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/hooks/collect/opt-out?attempt=1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+18336224406",
    "messageId": "test-123",
    "conversationTrackingId": "conv-456",
    "collectedTones": "1"
  }'

# Test 3: Invalid Input (Attempt 1)
curl -X POST "https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/hooks/collect/opt-out?attempt=1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+18336224406",
    "messageId": "test-124",
    "conversationTrackingId": "conv-457",
    "collectedTones": "9"
  }'

# Test 4: Invalid Input (Attempt 2)
curl -X POST "https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/hooks/collect/opt-out?attempt=2" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+18336224406",
    "messageId": "test-125",
    "conversationTrackingId": "conv-458",
    "collectedTones": "5"
  }'

# Test 5: No Input
curl -X POST "https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/api/voice/hooks/collect/opt-out?attempt=1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+18336224406",
    "messageId": "test-126",
    "conversationTrackingId": "conv-459",
    "collectedTones": ""
  }'
```

---

## Monitoring

### Real-Time Monitoring Dashboard

Access the monitoring dashboard to see all incoming requests in real-time:

**URL**: `https://diaplan-o2bqxrhwx-cantoniou-waymoreios-projects.vercel.app/monitor`

**Features**:
- ✅ Auto-refresh every 3 seconds
- ✅ Request method badges (POST/GET)
- ✅ Full request body details
- ✅ Response data
- ✅ Query parameters
- ✅ Request headers
- ✅ Timestamps
- ✅ Clear logs button

### Monitoring API

**Get Logs**: `GET /api/monitor/logs`

Response:
```json
{
  "count": 15,
  "logs": [
    {
      "id": 1728394823.456,
      "timestamp": "2025-10-07T09:30:23.456Z",
      "endpoint": "/api/voice/hooks/collect/opt-out",
      "method": "POST",
      "body": { "collectedTones": "1", "from": "+1234567890" },
      "query": { "attempt": "1" },
      "headers": { "user-agent": "Routee/1.0", "content-type": "application/json" },
      "response": { "verbs": [...] }
    }
  ]
}
```

**Clear Logs**: `DELETE /api/monitor/logs`

### Vercel Function Logs

1. Go to: https://vercel.com/dashboard
2. Select your project: `diaplan`
3. Click "Functions" tab
4. Select function: `/api/voice/hooks/collect/opt-out`
5. Click "View Function Logs"

---

## Troubleshooting

### Issue 1: Routee Not Posting to Webhook

**Symptoms**: User presses "1" but doesn't hear confirmation message

**Possible Causes**:
- Webhook URL incorrect in Routee config
- Firewall blocking Routee IPs
- SSL certificate issues

**Solutions**:
1. Verify webhook URL in Routee dashboard
2. Check Routee IP whitelist requirements
3. Ensure HTTPS is properly configured
4. Check Vercel function logs for errors

---

### Issue 2: Empty collectedTones

**Symptoms**: Routee always posts `collectedTones: ""`

**Possible Causes**:
- COLLECT timeout too short
- User not pressing hash key
- Phone keypad not sending DTMF tones

**Solutions**:
1. Verify `submitOnHash: true` in COLLECT verb
2. Instruct users to press # after digit
3. Check PAUSE duration (currently 7 seconds)
4. Test with different phones

---

### Issue 3: Call Ends Prematurely

**Symptoms**: Call ends before user can press keys

**Possible Causes**:
- Missing PAUSE between COLLECT and PLAY
- PAUSE duration too short
- Routee timeout configuration

**Solutions**:
1. Verify PAUSE verb exists: `{ "type": "PAUSE", "duration": 7 }`
2. Increase PAUSE duration if needed
3. Add fallback PLAY after PAUSE
4. Check Routee call timeout settings

---

### Issue 4: CIAM Not Receiving Opt-Outs

**Symptoms**: User hears confirmation but opt-out not registered

**Possible Causes**:
- CIAM API endpoint incorrect
- Authentication failure
- Network timeout

**Solutions**:
1. Verify CIAM API URL and credentials
2. Check CIAM API logs
3. Add retry logic for failed CIAM calls
4. Implement queue for reliability

---

### Issue 5: Audio Not Playing

**Symptoms**: Silence instead of voice messages

**Possible Causes**:
- CDN URL not accessible
- Audio file format incompatible
- Network issues

**Solutions**:
1. Test CDN URLs directly in browser:
   - https://cdn12.waymore.io/s/pTXaaw7KDLcjBnt/download/1.wav
2. Verify audio format (should be WAV, 8kHz, mono)
3. Check CDN availability
4. Upload backup files to alternative CDN

---

## Best Practices

### 1. Error Handling
```pseudo
TRY:
  result = callCIAMToOptOut(data)
CATCH error:
  LOG_ERROR("CIAM call failed:", error)
  // Still return success to user
  // Queue for retry in background
  QUEUE_FOR_RETRY(data)
END TRY
```

### 2. Logging
```pseudo
// Log all critical events
LOG("Call received from:", phoneNumber)
LOG("Collected tones:", collectedTones)
LOG("CIAM response:", ciamResponse)
LOG("Final response sent:", finalResponse)
```

### 3. Monitoring Alerts
- Set up alerts for:
  - High failure rate (>5% in 1 hour)
  - CIAM API errors
  - Unexpected collectedTones values
  - Long response times (>2 seconds)

### 4. Rate Limiting
```pseudo
// Prevent abuse
IF request_count_from_phone(phoneNumber, last_hour) > 10:
  RETURN JSON({"error": "Rate limit exceeded"}, 429)
END IF
```

### 5. Security
- ✅ Validate webhook source (Routee IPs)
- ✅ Use HTTPS only
- ✅ Sanitize input data
- ✅ Rate limit by phone number
- ✅ Log security events

---

## Support

### Documentation
- Routee API Docs: https://docs.routee.net/docs/voice-api
- Vercel Docs: https://vercel.com/docs

### Contact
For technical issues or questions:
1. Check monitoring dashboard first
2. Review Vercel function logs
3. Contact development team with:
   - Phone number tested
   - Timestamp of call
   - Expected vs actual behavior
   - Request/response logs

---

## Changelog

### Version 1.0 (Current)
- ✅ Initial implementation
- ✅ Two-attempt retry logic
- ✅ CIAM integration
- ✅ Real-time monitoring
- ✅ Comprehensive logging
- ✅ Support for `collectedTones` (Routee format)
- ✅ 7-second PAUSE between COLLECT and fallback PLAY

---

## Appendix

### A. Routee Verb Reference

**PLAY**
```json
{
  "type": "PLAY",
  "fileURL": "https://example.com/audio.wav",
  "bargeIn": false
}
```
- `fileURL`: URL to audio file (WAV format recommended)
- `bargeIn`: Allow user to interrupt (false = must listen fully)

**COLLECT**
```json
{
  "type": "COLLECT",
  "eventUrl": "https://example.com/webhook",
  "submitOnHash": true,
  "maxDigits": 30
}
```
- `eventUrl`: Where to POST collected tones
- `submitOnHash`: Submit when # pressed (true recommended)
- `maxDigits`: Maximum digits to collect

**PAUSE**
```json
{
  "type": "PAUSE",
  "duration": 7
}
```
- `duration`: Seconds to wait

### B. HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200  | OK | Successful request |
| 400  | Bad Request | Invalid input data |
| 405  | Method Not Allowed | Wrong HTTP method |
| 429  | Too Many Requests | Rate limit exceeded |
| 500  | Internal Server Error | Server error |

### C. Audio File Requirements

- **Format**: WAV (preferred) or MP3
- **Sample Rate**: 8kHz (phone quality)
- **Channels**: Mono (1 channel)
- **Bit Depth**: 16-bit
- **Max Duration**: 60 seconds per file
- **Encoding**: PCM (WAV) or MP3

---

**End of Developer Guide**

*For updates and latest documentation, visit the project repository.*

