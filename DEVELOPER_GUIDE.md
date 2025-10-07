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
User Calls Toll-Free Number
    ↓
Welcome Message
"Press 1 followed by hash to opt out"
    ↓
Wait for Input (7 seconds)
    ↓
┌─────────────┬──────────────┬───────────────┐
│ Press "1"   │ Press Other  │ No Input      │
│             │              │               │
✓ Success     │ Invalid      │ Timeout       │
Confirmed     │ (Attempt 1)  │ End Call      │
│             │              │               │
End Call      ↓              │               │
              Retry Message  │               │
              │              │               │
              Wait 7s        │               │
              │              │               │
              ├─Press "1"?───┘               │
              │              │               │
              ✓ Success      Invalid         │
              │              (Attempt 2)     │
              │              │               │
              End Call       End Call        │
```

### Audio Messages Required

| ID | Trigger | Purpose | Sample Content |
|-----|---------|---------|----------------|
| **1. WELCOME_MESSAGE** | Initial call | Greet and instruct | "Hello, This is [BRAND]. Thank you for calling. To opt out from SMS campaigns, please press 1 followed by the hash key." |
| **2. FIRST_INVALID** | Invalid input (1st) | Retry instruction | "You have selected an invalid option. To opt out from SMS notifications, please press 1 followed by the hash key." |
| **3. SECOND_INVALID** | Invalid input (2nd) | Final invalid message | "You have selected an invalid option again. We will now end the call. Please call again. Thank you." |
| **4. NO_INPUT_RETRY** | No input (1st) | Hash key reminder | "We did not receive your selection. If you already pressed a number, please press only the hash key now to submit. If not, please press 1 followed by the hash key." |
| **5. CONFIRMATION** | Successful opt-out | Confirmation | "Your selection to opt out from SMS campaigns has been registered. Thank you for calling. Goodbye." |
| **6. NO_INPUT_FINAL** | No input (2nd) | Final timeout message | "No input was received again. Please remember to press the hash key after entering your selection. We will now end the call. Please call again. Thank you." |

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
- **Platform**: Any serverless platform (AWS Lambda, Vercel, Google Cloud Functions, etc.)
- **Language**: Any (JavaScript, Python, Java, PHP, etc.)
- **API Format**: JSON (REST)
- **Voice Provider**: Routee

---

## Routee Integration

### Step 1: Configure Routee Application

1. **Log into Routee Dashboard**
   - Navigate to Voice > Applications

2. **Create/Configure Voice Application**
   - Application Type: `Inbound Voice`
   - Voice URL (Initial Dialplan): 
     ```
     https://YOUR-DOMAIN.com/api/voice/dialplans/opt-out/initial
     ```
   - HTTP Method: `GET` or `POST` (both should be supported)
   - Voice Fallback URL: (Optional) Same URL for redundancy

3. **Assign Toll-Free Number**
   - Purchase or assign a toll-free number
   - Link the number to your Voice Application

### Step 2: Verify Configuration

Test that Routee can reach your endpoint:

```bash
curl https://YOUR-DOMAIN.com/api/voice/dialplans/opt-out/initial
```

Expected response structure:
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

---

## API Endpoints

### 1. Initial Dialplan Endpoint

**URL**: `GET/POST /api/voice/dialplans/opt-out/initial`

**Purpose**: Returns the initial dialplan that Routee executes when a call comes in.

**Request**: No body required (Routee may send call metadata)

**Response**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/1-welcome-message.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://YOUR-DOMAIN.com/api/voice/hooks/collect/opt-out?attempt=1",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/4-no-input-retry.wav",
      "bargeIn": false
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/6-no-input-final.wav",
      "bargeIn": false
    }
  ]
}
```

**Verb Explanation**:
- `PLAY` (1st): Plays welcome/instruction audio file (File 1)
- `COLLECT`: Waits for user to press keys, submits on # press
- `PAUSE` (1st): Gives user 7 seconds to respond
- `PLAY` (2nd): First no-input message with hash reminder (File 4)
- `PAUSE` (2nd): Gives user another 7 seconds to respond
- `PLAY` (3rd): Final no-input message, ends call (File 6)

**Total Time**: Up to 14 seconds for user to respond (2 x 7-second pauses)

---

### 2. Collect Webhook Endpoint

**URL**: `POST /api/voice/hooks/collect/opt-out?attempt={1|2}`

**Purpose**: Receives collected tones from Routee and returns appropriate response.

**Request Body** (sent by Routee):
```json
{
  "from": "+1234567890",
  "to": "+1800XXXYYYY",
  "messageId": "unique-message-id",
  "conversationTrackingId": "unique-conversation-id",
  "collectedTones": "1"
}
```

**Field Descriptions**:
- `from`: Caller's phone number (E.164 format)
- `to`: Your toll-free number (E.164 format)
- `messageId`: Unique Routee message identifier
- `conversationTrackingId`: Routee conversation tracking identifier
- `collectedTones`: Digits pressed by user (empty string if no input)

**Query Parameters**:
- `attempt`: Integer (1 or 2) - indicates which attempt this is

**Response Logic**:

| Condition | Response |
|-----------|----------|
| `collectedTones == "1"` | Play confirmation message, call CIAM |
| `collectedTones != "1"` AND `attempt == 1` | Play retry message, collect again (attempt=2) |
| `collectedTones != "1"` AND `attempt == 2` | Play final invalid message, end call |

**Response (Valid Input - collectedTones = "1")**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/confirmation-message.wav",
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
      "fileURL": "https://YOUR-CDN.com/first-invalid-message.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://YOUR-DOMAIN.com/api/voice/hooks/collect/opt-out?attempt=2",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/second-invalid-message.wav",
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
      "fileURL": "https://YOUR-CDN.com/second-invalid-message.wav",
      "bargeIn": false
    }
  ]
}
```

---

## Implementation Guide

### Generic Implementation (Any Language/Framework)

#### Step 1: Implement Initial Dialplan Endpoint

**Endpoint**: `GET/POST /api/voice/dialplans/opt-out/initial`

```pseudo
FUNCTION handleInitialDialplan(request):
  // Set CORS headers for cross-origin requests
  SET_HEADER("Access-Control-Allow-Origin", "*")
  SET_HEADER("Content-Type", "application/json")
  
  // Get base URL from environment or configuration
  baseUrl = ENV_VAR("BASE_URL") OR "https://YOUR-DOMAIN.com"
  
  // Build response with verbs
  response = {
    "verbs": [
      {
        "type": "PLAY",
        "fileURL": "https://YOUR-CDN.com/1-welcome-message.wav",
        "bargeIn": false
      },
      {
        "type": "COLLECT",
        "eventUrl": baseUrl + "/api/voice/hooks/collect/opt-out?attempt=1",
        "submitOnHash": true,
        "maxDigits": 30
      },
      {
        "type": "PAUSE",
        "duration": 7
      },
      {
        "type": "PLAY",
        "fileURL": "https://YOUR-CDN.com/4-no-input-retry.wav",
        "bargeIn": false
      },
      {
        "type": "PAUSE",
        "duration": 7
      },
      {
        "type": "PLAY",
        "fileURL": "https://YOUR-CDN.com/6-no-input-final.wav",
        "bargeIn": false
      }
    ]
  }
  
  LOG_REQUEST(request, response)
  RETURN JSON(response, 200)
END FUNCTION
```

#### Step 2: Implement Collect Webhook Endpoint

**Endpoint**: `POST /api/voice/hooks/collect/opt-out?attempt={1|2}`

```pseudo
FUNCTION handleCollectWebhook(request):
  // Set CORS headers
  SET_HEADER("Access-Control-Allow-Origin", "*")
  SET_HEADER("Content-Type", "application/json")
  
  // Parse request
  collectedTones = request.body.collectedTones OR ""
  attempt = INTEGER(request.query.attempt) OR 1
  from = request.body.from
  to = request.body.to
  messageId = request.body.messageId
  conversationTrackingId = request.body.conversationTrackingId
  
  // Get base URL from environment
  baseUrl = ENV_VAR("BASE_URL") OR "https://YOUR-DOMAIN.com"
  
  // Log for debugging
  LOG("Collect webhook - attempt:", attempt, "collectedTones:", collectedTones)
  LOG("Full request:", JSON_STRINGIFY(request.body))
  
  // Handle empty collectedTones (call already ended)
  IF collectedTones == "":
    LOG("Empty collectedTones - call already ended, logging for analytics only")
    response = { "message": "Call already ended, no action needed" }
    LOG_REQUEST(request, response)
    RETURN JSON(response, 200)
  END IF
  
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
          "fileURL": "https://YOUR-CDN.com/5-confirmation-message.wav",
          "bargeIn": false
        }
      ]
    }
    LOG_REQUEST(request, response)
    RETURN JSON(response, 200)
  END IF
  
  // Invalid input - Attempt 1
  IF attempt == 1:
    LOG("Invalid input on first attempt (collectedTones:", collectedTones, "), retrying")
    response = {
      "verbs": [
        {
          "type": "PLAY",
          "fileURL": "https://YOUR-CDN.com/2-first-invalid-message.wav",
          "bargeIn": false
        },
        {
          "type": "COLLECT",
          "eventUrl": baseUrl + "/api/voice/hooks/collect/opt-out?attempt=2",
          "submitOnHash": true,
          "maxDigits": 30
        },
        {
          "type": "PAUSE",
          "duration": 7
        },
        {
          "type": "PLAY",
          "fileURL": "https://YOUR-CDN.com/3-second-invalid-message.wav",
          "bargeIn": false
        }
      ]
    }
    LOG_REQUEST(request, response)
    RETURN JSON(response, 200)
  END IF
  
  // Invalid input - Attempt 2
  LOG("Invalid input on second attempt (collectedTones:", collectedTones, "), ending call")
  response = {
    "verbs": [
      {
        "type": "PLAY",
        "fileURL": "https://YOUR-CDN.com/second-invalid-message.wav",
        "bargeIn": false
      }
    ]
  }
  LOG_REQUEST(request, response)
  RETURN JSON(response, 200)
END FUNCTION
```

#### Step 3: Implement CIAM Integration

```pseudo
FUNCTION callCIAMToOptOut(data):
  LOG("Calling CIAM to register opt-out:", data)
  
  // Build CIAM request payload
  ciamRequest = {
    "phoneNumber": data.from,
    "optOutType": "SMS_CAMPAIGNS",
    "source": "VOICE_IVR",
    "timestamp": data.timestamp,
    "externalMessageId": data.messageId,
    "externalConversationId": data.conversationTrackingId
  }
  
  TRY:
    response = HTTP_POST(
      url: ENV_VAR("CIAM_API_URL") + "/opt-outs",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + ENV_VAR("CIAM_API_KEY")
      },
      body: JSON_STRINGIFY(ciamRequest),
      timeout: 5000 // 5 second timeout
    )
    
    IF response.status == 200 OR response.status == 201:
      LOG("Opt-out registered successfully")
      RETURN SUCCESS
    ELSE:
      LOG("Error registering opt-out - status:", response.status)
      // Continue anyway - user already heard confirmation
      RETURN ERROR
    END IF
  CATCH error:
    LOG("Exception calling CIAM:", error)
    // Queue for retry
    QUEUE_FOR_RETRY(ciamRequest)
    RETURN ERROR
  END TRY
END FUNCTION
```

---

## Routee Integration

### Configuration Steps

1. **Routee Dashboard Setup**
   - Log into Routee dashboard
   - Navigate to Voice > Applications
   - Create new application or edit existing

2. **Application Settings**
   - **Name**: "SMS Opt-Out IVR"
   - **Type**: Inbound Voice
   - **Voice URL**: `https://YOUR-DOMAIN.com/api/voice/dialplans/opt-out/initial`
   - **Method**: POST (GET also supported for testing)
   - **Fallback URL**: Same as Voice URL (optional)

3. **Number Assignment**
   - Purchase or select toll-free number
   - Assign to the voice application
   - Test by calling the number

### Important Routee Behaviors

⚠️ **Critical**: Routee has specific behaviors you must handle:

1. **Field Name**: Routee sends collected digits as `collectedTones`, not `digits`

2. **Hash Key Requirement**: 
   - When `submitOnHash: true` is set, Routee **will NOT POST to the eventURL** unless the user presses the hash key (`#`)
   - **This means**: If a user presses "1" but forgets to press "#", you will receive NO webhook call
   - The PAUSE verb will complete, the fallback PLAY will execute, and the call will end
   - **Developer Impact**: You cannot track partial input. You'll only receive complete submissions (with #) or empty/timeout submissions
   - **User Instructions**: Always instruct users to "press 1 followed by the hash key" in your audio messages

3. **Empty Input Behavior**: 
   - Routee posts `collectedTones: ""` **when the call ends**
   - This happens if the user doesn't press "#" before the dialplan completes
   - The PAUSE → fallback PLAY sequence keeps the call alive long enough for users to respond
   - Empty `collectedTones` indicates the user didn't complete input (either pressed digits without "#" or pressed nothing at all)

4. **Timing**: If call ends before PAUSE completes, Routee may not POST to webhook at all

### Solution for Timing Issue

The dialplan structure `PLAY → COLLECT → PAUSE → PLAY` ensures:
- User has 7 seconds to respond during PAUSE
- If user presses "1#", Routee interrupts and POSTs to webhook
- If no input, fallback PLAY executes and call ends gracefully
- This prevents premature call termination

### Hash Key Behavior - Visual Explanation

```
Scenario 1: User presses "1#" (CORRECT)
───────────────────────────────────────
PLAY (welcome) → COLLECT starts → User presses "1#"
                                      ↓
                        Routee immediately POSTs to webhook
                                      ↓
                        POST { "collectedTones": "1" }
                                      ↓
                        Webhook returns PLAY(confirmation)
                                      ↓
                        Call ends with confirmation


Scenario 2: User presses "1" without "#" (MISSING HASH)
────────────────────────────────────────────────────────
PLAY (welcome) → COLLECT starts → User presses "1" (no #)
                                      ↓
                        Routee waits... (no POST sent)
                                      ↓
                        PAUSE begins (7 seconds)
                                      ↓
                        User does nothing OR presses more digits (no #)
                                      ↓
                        PAUSE completes
                                      ↓
                        Fallback PLAY starts (no-input message)
                                      ↓
                        Fallback PLAY completes
                                      ↓
                        **Call ends - dialplan complete**
                                      ↓
                        Routee POSTs { "collectedTones": "" }
                                      ↓
                        Webhook receives empty input
                        (but call already ended - too late to respond)


Scenario 3: User presses nothing
──────────────────────────────────
PLAY (welcome) → COLLECT starts → User silent
                                      ↓
                        Routee waits...
                                      ↓
                        PAUSE begins (7 seconds)
                                      ↓
                        User still silent
                                      ↓
                        PAUSE completes
                                      ↓
                        Fallback PLAY starts (no-input message)
                                      ↓
                        Fallback PLAY completes
                                      ↓
                        **Call ends - dialplan complete**
                                      ↓
                        Routee POSTs { "collectedTones": "" }
                                      ↓
                        Webhook receives empty input
                        (but call already ended - too late to respond)
```

**Key Takeaways**: 
- Routee only POSTs when the **call ends** or when user presses "#"
- Without hash key, Scenarios 2 and 3 are identical to your webhook
- The empty `collectedTones` POST arrives **after the call has ended**
- You cannot respond to empty submissions - the fallback PLAY already executed
- This is why the fallback PLAY is essential - it handles the no-input case within the call flow

**Important for Developers**:
- When you receive `collectedTones: ""`, the call has already ended
- Your webhook response will be **ignored** by Routee (call is over)
- This POST is informational only - log it for analytics but don't try to respond
- The actual user experience was already handled by the fallback PLAY in the dialplan
- This is why we include fallback audio in the initial dialplan structure

---

## Request/Response Examples

### Example 1: Successful Opt-Out

**Initial Request** (Routee to your server):
```http
GET /api/voice/dialplans/opt-out/initial
Host: YOUR-DOMAIN.com
```

**Initial Response**:
```json
{
  "verbs": [
    { "type": "PLAY", "fileURL": "https://YOUR-CDN.com/1-welcome-message.wav", "bargeIn": false },
    { "type": "COLLECT", "eventUrl": "https://YOUR-DOMAIN.com/api/voice/hooks/collect/opt-out?attempt=1", "submitOnHash": true, "maxDigits": 30 },
    { "type": "PAUSE", "duration": 7 },
    { "type": "PLAY", "fileURL": "https://YOUR-CDN.com/4-no-input-retry.wav", "bargeIn": false },
    { "type": "PAUSE", "duration": 7 },
    { "type": "PLAY", "fileURL": "https://YOUR-CDN.com/6-no-input-final.wav", "bargeIn": false }
  ]
}
```

**Collect Request** (User pressed "1#"):
```http
POST /api/voice/hooks/collect/opt-out?attempt=1
Content-Type: application/json
Host: YOUR-DOMAIN.com

{
  "from": "+1234567890",
  "to": "+1800XXXYYYY",
  "messageId": "msg-12345",
  "conversationTrackingId": "conv-67890",
  "collectedTones": "1"
}
```

**Collect Response**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/5-confirmation-message.wav",
      "bargeIn": false
    }
  ]
}
```

---

### Example 2: Invalid Input with Retry

**Collect Request** (User pressed "9#"):
```http
POST /api/voice/hooks/collect/opt-out?attempt=1
Content-Type: application/json

{
  "from": "+1234567890",
  "to": "+1800XXXYYYY",
  "messageId": "msg-12346",
  "conversationTrackingId": "conv-67891",
  "collectedTones": "9"
}
```

**Response**:
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/2-first-invalid-message.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://YOUR-DOMAIN.com/api/voice/hooks/collect/opt-out?attempt=2",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://YOUR-CDN.com/3-second-invalid-message.wav",
      "bargeIn": false
    }
  ]
}
```

---

### Example 3: No Input (Empty collectedTones)

**Collect Request** (User didn't press anything):
```http
POST /api/voice/hooks/collect/opt-out?attempt=1
Content-Type: application/json

{
  "from": "+1234567890",
  "to": "+1800XXXYYYY",
  "messageId": "msg-12347",
  "conversationTrackingId": "conv-67892",
  "collectedTones": ""
}
```

**Response**: 
```json
{
  "message": "Call already ended, no action needed"
}
```

**Note**: This POST arrives after the call has already ended (after the fallback PLAY verbs executed in the initial dialplan). The webhook logs this for analytics but the response is ignored by Routee since the call is over.

---

## Implementation Guide

### Language-Specific Examples

#### JavaScript/Node.js (Express)

```javascript
// Initial Dialplan
app.get('/api/voice/dialplans/opt-out/initial', (req, res) => {
  res.json({
    verbs: [
      {
        type: "PLAY",
        fileURL: process.env.WELCOME_AUDIO_URL,
        bargeIn: false
      },
      {
        type: "COLLECT",
        eventUrl: `${process.env.BASE_URL}/api/voice/hooks/collect/opt-out?attempt=1`,
        submitOnHash: true,
        maxDigits: 30
      },
      {
        type: "PAUSE",
        duration: 7
      },
      {
        type: "PLAY",
        fileURL: process.env.NO_INPUT_AUDIO_URL,
        bargeIn: false
      }
    ]
  });
});

// Collect Webhook
app.post('/api/voice/hooks/collect/opt-out', async (req, res) => {
  const { collectedTones, from, to, messageId, conversationTrackingId } = req.body;
  const attempt = parseInt(req.query.attempt) || 1;

  console.log(`Collect webhook - attempt: ${attempt}, collectedTones: "${collectedTones}"`);

  // Valid input
  if (collectedTones === "1") {
    await callCIAMToOptOut({
      collectedTones,
      from,
      to,
      messageId,
      conversationTrackingId,
      attempt,
      timestamp: new Date().toISOString()
    });

    return res.json({
      verbs: [
        {
          type: "PLAY",
          fileURL: process.env.CONFIRMATION_AUDIO_URL,
          bargeIn: false
        }
      ]
    });
  }

  // Invalid input - Attempt 1
  if (attempt === 1) {
    return res.json({
      verbs: [
        {
          type: "PLAY",
          fileURL: process.env.FIRST_INVALID_AUDIO_URL,
          bargeIn: false
        },
        {
          type: "COLLECT",
          eventUrl: `${process.env.BASE_URL}/api/voice/hooks/collect/opt-out?attempt=2`,
          submitOnHash: true,
          maxDigits: 30
        },
        {
          type: "PAUSE",
          duration: 7
        },
        {
          type: "PLAY",
          fileURL: process.env.SECOND_INVALID_AUDIO_URL,
          bargeIn: false
        }
      ]
    });
  }

  // Invalid input - Attempt 2
  return res.json({
    verbs: [
      {
        type: "PLAY",
        fileURL: process.env.SECOND_INVALID_AUDIO_URL,
        bargeIn: false
      }
    ]
  });
});
```

#### Python (Flask)

```python
from flask import Flask, request, jsonify
import os
import logging

app = Flask(__name__)

@app.route('/api/voice/dialplans/opt-out/initial', methods=['GET', 'POST'])
def initial_dialplan():
    response = {
        "verbs": [
            {
                "type": "PLAY",
                "fileURL": os.environ.get('WELCOME_AUDIO_URL'),
                "bargeIn": False
            },
            {
                "type": "COLLECT",
                "eventUrl": f"{os.environ.get('BASE_URL')}/api/voice/hooks/collect/opt-out?attempt=1",
                "submitOnHash": True,
                "maxDigits": 30
            },
            {
                "type": "PAUSE",
                "duration": 7
            },
            {
                "type": "PLAY",
                "fileURL": os.environ.get('NO_INPUT_AUDIO_URL'),
                "bargeIn": False
            }
        ]
    }
    return jsonify(response)

@app.route('/api/voice/hooks/collect/opt-out', methods=['POST'])
def collect_webhook():
    data = request.get_json()
    collected_tones = data.get('collectedTones', '')
    attempt = int(request.args.get('attempt', 1))
    
    logging.info(f"Collect webhook - attempt: {attempt}, collectedTones: {collected_tones}")
    logging.info(f"Full request: {data}")
    
    # Valid input
    if collected_tones == "1":
        call_ciam_to_opt_out({
            'collectedTones': collected_tones,
            'from': data.get('from'),
            'to': data.get('to'),
            'messageId': data.get('messageId'),
            'conversationTrackingId': data.get('conversationTrackingId'),
            'attempt': attempt,
            'timestamp': datetime.now().isoformat()
        })
        
        return jsonify({
            "verbs": [
                {
                    "type": "PLAY",
                    "fileURL": os.environ.get('CONFIRMATION_AUDIO_URL'),
                    "bargeIn": False
                }
            ]
        })
    
    # Invalid input - Attempt 1
    if attempt == 1:
        return jsonify({
            "verbs": [
                {
                    "type": "PLAY",
                    "fileURL": os.environ.get('FIRST_INVALID_AUDIO_URL'),
                    "bargeIn": False
                },
                {
                    "type": "COLLECT",
                    "eventUrl": f"{os.environ.get('BASE_URL')}/api/voice/hooks/collect/opt-out?attempt=2",
                    "submitOnHash": True,
                    "maxDigits": 30
                },
                {
                    "type": "PAUSE",
                    "duration": 7
                },
                {
                    "type": "PLAY",
                    "fileURL": os.environ.get('SECOND_INVALID_AUDIO_URL'),
                    "bargeIn": False
                }
            ]
        })
    
    # Invalid input - Attempt 2
    return jsonify({
        "verbs": [
            {
                "type": "PLAY",
                "fileURL": os.environ.get('SECOND_INVALID_AUDIO_URL'),
                "bargeIn": False
            }
        ]
    })
```

#### PHP (Laravel)

```php
<?php

// routes/api.php
Route::match(['get', 'post'], '/voice/dialplans/opt-out/initial', 'VoiceController@initialDialplan');
Route::post('/voice/hooks/collect/opt-out', 'VoiceController@collectWebhook');

// app/Http/Controllers/VoiceController.php
class VoiceController extends Controller
{
    public function initialDialplan(Request $request)
    {
        $response = [
            'verbs' => [
                [
                    'type' => 'PLAY',
                    'fileURL' => env('WELCOME_AUDIO_URL'),
                    'bargeIn' => false
                ],
                [
                    'type' => 'COLLECT',
                    'eventUrl' => env('BASE_URL') . '/api/voice/hooks/collect/opt-out?attempt=1',
                    'submitOnHash' => true,
                    'maxDigits' => 30
                ],
                [
                    'type' => 'PAUSE',
                    'duration' => 7
                ],
                [
                    'type' => 'PLAY',
                    'fileURL' => env('NO_INPUT_AUDIO_URL'),
                    'bargeIn' => false
                ]
            ]
        ];

        return response()->json($response);
    }

    public function collectWebhook(Request $request)
    {
        $collectedTones = $request->input('collectedTones', '');
        $attempt = $request->query('attempt', 1);
        $from = $request->input('from');
        $to = $request->input('to');
        $messageId = $request->input('messageId');
        $conversationTrackingId = $request->input('conversationTrackingId');

        Log::info("Collect webhook - attempt: {$attempt}, collectedTones: {$collectedTones}");
        Log::info("Full request: " . json_encode($request->all()));

        // Valid input
        if ($collectedTones === "1") {
            $this->callCIAMToOptOut([
                'collectedTones' => $collectedTones,
                'from' => $from,
                'to' => $to,
                'messageId' => $messageId,
                'conversationTrackingId' => $conversationTrackingId,
                'attempt' => $attempt,
                'timestamp' => now()->toIso8601String()
            ]);

            return response()->json([
                'verbs' => [
                    [
                        'type' => 'PLAY',
                        'fileURL' => env('CONFIRMATION_AUDIO_URL'),
                        'bargeIn' => false
                    ]
                ]
            ]);
        }

        // Invalid input - Attempt 1
        if ($attempt == 1) {
            return response()->json([
                'verbs' => [
                    [
                        'type' => 'PLAY',
                        'fileURL' => env('FIRST_INVALID_AUDIO_URL'),
                        'bargeIn' => false
                    ],
                    [
                        'type' => 'COLLECT',
                        'eventUrl' => env('BASE_URL') . '/api/voice/hooks/collect/opt-out?attempt=2',
                        'submitOnHash' => true,
                        'maxDigits' => 30
                    ],
                    [
                        'type' => 'PAUSE',
                        'duration' => 7
                    ],
                    [
                        'type' => 'PLAY',
                        'fileURL' => env('SECOND_INVALID_AUDIO_URL'),
                        'bargeIn' => false
                    ]
                ]
            ]);
        }

        // Invalid input - Attempt 2
        return response()->json([
            'verbs' => [
                [
                    'type' => 'PLAY',
                    'fileURL' => env('SECOND_INVALID_AUDIO_URL'),
                    'bargeIn' => false
                ]
            ]
        ]);
    }

    private function callCIAMToOptOut($data)
    {
        Log::info("Calling CIAM to register opt-out", $data);
        
        // Implement your CIAM API call here
        // Example using Guzzle HTTP client
        try {
            $client = new \GuzzleHttp\Client();
            $response = $client->post(env('CIAM_API_URL') . '/opt-outs', [
                'headers' => [
                    'Content-Type' => 'application/json',
                    'Authorization' => 'Bearer ' . env('CIAM_API_KEY')
                ],
                'json' => [
                    'phoneNumber' => $data['from'],
                    'optOutType' => 'SMS_CAMPAIGNS',
                    'source' => 'VOICE_IVR',
                    'timestamp' => $data['timestamp']
                ]
            ]);
            
            Log::info("Opt-out registered successfully");
        } catch (\Exception $e) {
            Log::error("Error calling CIAM: " . $e->getMessage());
        }
    }
}
```

#### Java (Spring Boot)

```java
@RestController
@RequestMapping("/api/voice")
public class VoiceController {

    @Value("${base.url}")
    private String baseUrl;

    @Value("${audio.welcome}")
    private String welcomeAudioUrl;

    @Value("${audio.no-input}")
    private String noInputAudioUrl;

    @Value("${audio.confirmation}")
    private String confirmationAudioUrl;

    @Value("${audio.first-invalid}")
    private String firstInvalidAudioUrl;

    @Value("${audio.second-invalid}")
    private String secondInvalidAudioUrl;

    @GetMapping("/dialplans/opt-out/initial")
    @PostMapping("/dialplans/opt-out/initial")
    public ResponseEntity<Map<String, Object>> initialDialplan() {
        List<Map<String, Object>> verbs = Arrays.asList(
            Map.of(
                "type", "PLAY",
                "fileURL", welcomeAudioUrl,
                "bargeIn", false
            ),
            Map.of(
                "type", "COLLECT",
                "eventUrl", baseUrl + "/api/voice/hooks/collect/opt-out?attempt=1",
                "submitOnHash", true,
                "maxDigits", 30
            ),
            Map.of(
                "type", "PAUSE",
                "duration", 7
            ),
            Map.of(
                "type", "PLAY",
                "fileURL", noInputAudioUrl,
                "bargeIn", false
            )
        );

        return ResponseEntity.ok(Map.of("verbs", verbs));
    }

    @PostMapping("/hooks/collect/opt-out")
    public ResponseEntity<Map<String, Object>> collectWebhook(
            @RequestBody Map<String, Object> body,
            @RequestParam(defaultValue = "1") int attempt) {
        
        String collectedTones = (String) body.getOrDefault("collectedTones", "");
        String from = (String) body.get("from");
        String to = (String) body.get("to");
        String messageId = (String) body.get("messageId");
        String conversationTrackingId = (String) body.get("conversationTrackingId");

        logger.info("Collect webhook - attempt: {}, collectedTones: {}", attempt, collectedTones);
        logger.info("Full request: {}", body);

        // Valid input
        if ("1".equals(collectedTones)) {
            callCIAMToOptOut(collectedTones, from, to, messageId, conversationTrackingId, attempt);

            List<Map<String, Object>> verbs = List.of(
                Map.of(
                    "type", "PLAY",
                    "fileURL", confirmationAudioUrl,
                    "bargeIn", false
                )
            );
            return ResponseEntity.ok(Map.of("verbs", verbs));
        }

        // Invalid input - Attempt 1
        if (attempt == 1) {
            List<Map<String, Object>> verbs = Arrays.asList(
                Map.of(
                    "type", "PLAY",
                    "fileURL", firstInvalidAudioUrl,
                    "bargeIn", false
                ),
                Map.of(
                    "type", "COLLECT",
                    "eventUrl", baseUrl + "/api/voice/hooks/collect/opt-out?attempt=2",
                    "submitOnHash", true,
                    "maxDigits", 30
                ),
                Map.of(
                    "type", "PAUSE",
                    "duration", 7
                ),
                Map.of(
                    "type", "PLAY",
                    "fileURL", secondInvalidAudioUrl,
                    "bargeIn", false
                )
            );
            return ResponseEntity.ok(Map.of("verbs", verbs));
        }

        // Invalid input - Attempt 2
        List<Map<String, Object>> verbs = List.of(
            Map.of(
                "type", "PLAY",
                "fileURL", secondInvalidAudioUrl,
                "bargeIn", false
            )
        );
        return ResponseEntity.ok(Map.of("verbs", verbs));
    }

    private void callCIAMToOptOut(String collectedTones, String from, String to, 
                                   String messageId, String conversationTrackingId, int attempt) {
        logger.info("Calling CIAM to register opt-out");
        
        // Implement your CIAM API call here
        // Example using RestTemplate
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(ciamApiKey);

            Map<String, Object> payload = Map.of(
                "phoneNumber", from,
                "optOutType", "SMS_CAMPAIGNS",
                "source", "VOICE_IVR",
                "timestamp", Instant.now().toString()
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                ciamApiUrl + "/opt-outs", 
                entity, 
                String.class
            );

            logger.info("Opt-out registered successfully");
        } catch (Exception e) {
            logger.error("Error calling CIAM", e);
        }
    }
}
```

---

## Environment Variables

Configure these environment variables in your deployment:

```bash
# Base URL for your application
BASE_URL=https://YOUR-DOMAIN.com

# Audio file URLs (6 files required)
WELCOME_AUDIO_URL=https://YOUR-CDN.com/1-welcome-message.wav
FIRST_INVALID_AUDIO_URL=https://YOUR-CDN.com/2-first-invalid-message.wav
SECOND_INVALID_AUDIO_URL=https://YOUR-CDN.com/3-second-invalid-message.wav
NO_INPUT_RETRY_AUDIO_URL=https://YOUR-CDN.com/4-no-input-retry.wav
CONFIRMATION_AUDIO_URL=https://YOUR-CDN.com/5-confirmation-message.wav
NO_INPUT_FINAL_AUDIO_URL=https://YOUR-CDN.com/6-no-input-final.wav

# CIAM Integration
CIAM_API_URL=https://your-ciam-api.com
CIAM_API_KEY=your-secret-api-key
```

---

## Testing

### Manual Testing via Phone

1. **Test Valid Opt-Out**:
   - Call your configured toll-free number
   - Wait for welcome message
   - Press: `1` then `#`
   - Expected: Hear confirmation message
   - Verify: Check CIAM system for registered opt-out

2. **Test Invalid Input with Retry**:
   - Call toll-free number
   - Press: `9` then `#` (any digit except "1")
   - Expected: Hear retry message
   - Press: `1` then `#`
   - Expected: Hear confirmation
   - Verify: Check CIAM system for registered opt-out

3. **Test Second Invalid**:
   - Call toll-free number
   - Press: `9` then `#`
   - Expected: Hear retry message
   - Press: `5` then `#` (any digit except "1")
   - Expected: Hear "call ended" message

4. **Test No Input (Timeout)**:
   - Call toll-free number
   - Don't press anything
   - Wait 7+ seconds
   - Expected: Hear retry message (attempt 1) or end call message (attempt 2)

### Automated API Testing

```bash
BASE_URL="https://YOUR-DOMAIN.com"

# Test 1: Initial Dialplan
echo "Test 1: Initial Dialplan"
curl -X GET "${BASE_URL}/api/voice/dialplans/opt-out/initial" | jq .

# Test 2: Valid Opt-Out
echo "Test 2: Valid Opt-Out"
curl -X POST "${BASE_URL}/api/voice/hooks/collect/opt-out?attempt=1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+1800XXXYYYY",
    "messageId": "test-msg-001",
    "conversationTrackingId": "test-conv-001",
    "collectedTones": "1"
  }' | jq .

# Test 3: Invalid Input (Attempt 1)
echo "Test 3: Invalid Input (Attempt 1)"
curl -X POST "${BASE_URL}/api/voice/hooks/collect/opt-out?attempt=1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+1800XXXYYYY",
    "messageId": "test-msg-002",
    "conversationTrackingId": "test-conv-002",
    "collectedTones": "9"
  }' | jq .

# Test 4: Invalid Input (Attempt 2)
echo "Test 4: Invalid Input (Attempt 2)"
curl -X POST "${BASE_URL}/api/voice/hooks/collect/opt-out?attempt=2" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+1800XXXYYYY",
    "messageId": "test-msg-003",
    "conversationTrackingId": "test-conv-003",
    "collectedTones": "5"
  }' | jq .

# Test 5: No Input (Empty collectedTones)
echo "Test 5: No Input"
curl -X POST "${BASE_URL}/api/voice/hooks/collect/opt-out?attempt=1" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+1234567890",
    "to": "+1800XXXYYYY",
    "messageId": "test-msg-004",
    "conversationTrackingId": "test-conv-004",
    "collectedTones": ""
  }' | jq .
```

---

## Monitoring

### Built-in Monitoring Dashboard

If you're using the provided implementation, access the monitoring dashboard:

**URL**: `https://YOUR-DOMAIN.com/monitor`

**Features**:
- ✅ Real-time request tracking
- ✅ Auto-refresh every 3 seconds
- ✅ Request/response details
- ✅ Full request body display
- ✅ Query parameters
- ✅ Timestamps
- ✅ Clear logs functionality

### Monitoring API Endpoints

**Get All Logs**:
```http
GET /api/monitor/logs
```

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
      "body": {
        "collectedTones": "1",
        "from": "+1234567890",
        "to": "+1800XXXYYYY"
      },
      "query": { "attempt": "1" },
      "response": { "verbs": [...] }
    }
  ]
}
```

**Clear Logs**:
```http
DELETE /api/monitor/logs
```

### Custom Monitoring Integration

If you want to integrate with your own monitoring system:

```pseudo
FUNCTION logToMonitoring(event, data):
  // Send to your monitoring service
  HTTP_POST(
    url: ENV_VAR("MONITORING_API_URL") + "/events",
    headers: { "Authorization": "Bearer " + ENV_VAR("MONITORING_API_KEY") },
    body: {
      "service": "voice-opt-out",
      "event": event,
      "data": data,
      "timestamp": CURRENT_TIMESTAMP(),
      "environment": ENV_VAR("ENVIRONMENT")
    }
  )
END FUNCTION

// Usage
logToMonitoring("opt-out-success", { phoneNumber: from, attempt: attempt })
logToMonitoring("opt-out-invalid", { phoneNumber: from, attempt: attempt, input: collectedTones })
```

---

## Troubleshooting

### Issue 1: Routee Not Posting to Webhook

**Symptoms**: 
- User presses "1#" but doesn't hear confirmation message
- No POST requests appearing in logs

**Diagnostic Steps**:
1. Check monitoring dashboard for incoming requests
2. Verify webhook URL in Routee application settings
3. Test webhook URL manually with curl
4. Check server logs for connection attempts

**Possible Causes**:
- Webhook URL incorrect in Routee config
- Firewall blocking Routee IPs
- SSL certificate issues
- Network connectivity problems

**Solutions**:
1. Verify exact webhook URL matches your endpoint
2. Whitelist Routee IP addresses if firewall enabled
3. Ensure valid SSL certificate (required for HTTPS)
4. Test endpoint accessibility from external network
5. Check CORS headers are properly set

---

### Issue 2: Empty collectedTones Always Received

**Symptoms**: 
- Routee always posts `collectedTones: ""`
- Even when user reports pressing "1"
- No webhook POST received when user presses digit without "#"

**Diagnostic Steps**:
1. Check if `submitOnHash` is set to `true`
2. Verify PAUSE duration is adequate (7 seconds recommended)
3. Ask user if they pressed the hash (#) key
4. Test yourself by calling and pressing "1" without "#"
5. Check audio quality of instruction message

**Root Cause**:
⚠️ **Most Common**: User is pressing "1" but **NOT pressing the hash key (#)**

When `submitOnHash: true`:
- Routee **will NOT POST** to webhook until "#" is pressed
- If "#" is never pressed, Routee waits through entire dialplan (COLLECT → PAUSE → fallback PLAY)
- **When the call ends** (after fallback PLAY completes), Routee posts `collectedTones: ""` (empty)
- This empty POST arrives **after** the call has already ended, so your webhook response is ignored
- From your logs, this looks like "no input", but the user may have pressed "1" (you can't tell)

**Possible Causes**:
1. **User not pressing hash key** (MOST COMMON - 90% of cases)
2. Audio instructions not clear about hash key requirement
3. Phone keypad not sending DTMF tones correctly
4. Poor audio quality making instructions unclear
5. PAUSE duration too short (user hasn't finished input)

**Solutions**:
1. **Make hash key instruction VERY clear in audio**:
   - ✅ "Please press 1 followed by the hash key"
   - ✅ "Press 1, then press the hash or pound key"
   - ❌ "Please press 1" (missing hash instruction)
2. Ensure `submitOnHash: true` in COLLECT verb
3. Consider adding example in audio: "For example, press one, then hash"
4. Increase PAUSE duration to 10+ seconds if users need more time
5. Test with multiple phone types (mobile, landline)
6. Review audio message volume and clarity
7. Add SAY verb before COLLECT repeating hash key instruction
8. Consider alternative: `submitOnHash: false` with `maxDigits: 1` (no hash required, but less standard)

---

### Issue 3: Call Ends Prematurely

**Symptoms**: 
- Call disconnects before user can enter input
- No webhook POST received

**Diagnostic Steps**:
1. Verify PAUSE verb exists after COLLECT
2. Check PAUSE duration (should be 7+ seconds)
3. Confirm fallback PLAY exists after PAUSE
4. Review Routee application timeout settings

**Possible Causes**:
- Missing PAUSE between COLLECT and PLAY
- PAUSE duration too short
- Routee default call timeout
- Network latency issues

**Solutions**:
1. Add PAUSE verb: `{ "type": "PAUSE", "duration": 7 }`
2. Increase PAUSE duration to 10-15 seconds if needed
3. Add fallback PLAY after PAUSE (keeps call alive)
4. Configure Routee call timeout in application settings
5. Test during different times of day (network conditions)

---

### Issue 4: CIAM Integration Not Working

**Symptoms**: 
- User hears confirmation but opt-out not registered in CIAM
- CIAM logs show no incoming requests

**Diagnostic Steps**:
1. Check server logs for CIAM API calls
2. Verify CIAM API endpoint URL
3. Test CIAM API directly with curl
4. Check authentication credentials
5. Review CIAM API rate limits

**Possible Causes**:
- Incorrect CIAM API endpoint URL
- Invalid API key or credentials
- Network timeout
- CIAM API rate limiting
- Request payload format mismatch

**Solutions**:
1. Verify CIAM API URL and credentials in environment variables
2. Test CIAM API independently
3. Add timeout handling (retry failed calls)
4. Implement queue for reliability
5. Add exponential backoff for retries
6. Log full CIAM request/response for debugging

---

### Issue 5: Audio Files Not Playing

**Symptoms**: 
- Silence during call
- Call flows correctly but no audio

**Diagnostic Steps**:
1. Test audio file URLs directly in browser
2. Verify audio file format and encoding
3. Check CDN availability and CORS headers
4. Test with alternative audio files

**Possible Causes**:
- CDN URL not accessible from Routee
- Audio file format incompatible with Routee
- Missing CORS headers on CDN
- Audio file corrupted or wrong codec

**Solutions**:
1. Ensure audio files are publicly accessible (no authentication)
2. Use WAV format (8kHz, mono, 16-bit PCM)
3. Enable CORS on CDN: `Access-Control-Allow-Origin: *`
4. Test audio URLs in browser and with curl
5. Keep backup files on multiple CDNs
6. Verify file size is reasonable (<5MB per file)

---

### Issue 6: High Latency

**Symptoms**: 
- Delays between user input and response
- Long pauses during call

**Diagnostic Steps**:
1. Monitor API response times
2. Check CIAM API latency
3. Review server performance metrics
4. Test from different geographic locations

**Possible Causes**:
- Slow CIAM API response
- Server overload
- Network latency
- Database query delays

**Solutions**:
1. Optimize CIAM API calls (async, non-blocking)
2. Implement caching where appropriate
3. Use CDN for audio files (geographic distribution)
4. Scale server resources if needed
5. Add timeouts to external API calls
6. Consider queueing CIAM calls (respond to user first, register later)

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully without disrupting the user experience:

```pseudo
FUNCTION callCIAMToOptOut(data):
  TRY:
    result = HTTP_POST(CIAM_API_URL, data)
    IF result.success:
      LOG("Opt-out registered successfully")
      RETURN SUCCESS
    ELSE:
      LOG_ERROR("CIAM returned error:", result.status)
      // Still return success to user
      QUEUE_FOR_RETRY(data)
      RETURN SUCCESS // Don't fail the call
    END IF
  CATCH error:
    LOG_ERROR("Exception calling CIAM:", error)
    // Queue for background retry
    QUEUE_FOR_RETRY(data)
    // User already heard confirmation, don't fail
    RETURN SUCCESS
  END TRY
END FUNCTION
```

### 2. Comprehensive Logging

Log all critical events for debugging and compliance:

```pseudo
// Log incoming requests
LOG("Call received", { from: phoneNumber, to: tollFreeNumber, timestamp: now() })

// Log user actions
LOG("User pressed", { collectedTones: tones, attempt: attempt })

// Log CIAM interactions
LOG("CIAM request sent", { phoneNumber: phoneNumber, payload: ciamData })
LOG("CIAM response", { status: response.status, data: response.data })

// Log final outcomes
LOG("Call completed", { outcome: "opt-out-success", phoneNumber: phoneNumber })
```

### 3. Monitoring & Alerts

Set up alerts for critical issues:

**Alert Thresholds**:
- Error rate > 5% in 1 hour
- CIAM API failures > 3 in 15 minutes
- Response time > 2 seconds
- Unusual collectedTones patterns
- High call volume (possible spam)

**Metrics to Track**:
- Total calls per hour
- Opt-out success rate
- Invalid input rate
- Average call duration
- CIAM API latency
- Webhook response time

### 4. Security Considerations

**Validate Webhook Source**:
```pseudo
FUNCTION validateRouteeWebhook(request):
  // Option 1: IP Whitelist
  allowedIPs = ["ROUTEE_IP_1", "ROUTEE_IP_2", "ROUTEE_IP_3"]
  IF request.ip NOT IN allowedIPs:
    LOG_SECURITY("Unauthorized webhook attempt from:", request.ip)
    RETURN 403_FORBIDDEN
  END IF
  
  // Option 2: Signature Verification (if Routee provides)
  signature = request.headers["X-Routee-Signature"]
  IF NOT VERIFY_SIGNATURE(signature, request.body, SECRET_KEY):
    LOG_SECURITY("Invalid signature")
    RETURN 403_FORBIDDEN
  END IF
  
  RETURN TRUE
END FUNCTION
```

**Rate Limiting**:
```pseudo
FUNCTION checkRateLimit(phoneNumber):
  callCount = COUNT_CALLS(phoneNumber, LAST_HOUR)
  
  IF callCount > 10:
    LOG_SECURITY("Rate limit exceeded for:", phoneNumber)
    RETURN RATE_LIMIT_RESPONSE
  END IF
  
  RETURN CONTINUE
END FUNCTION
```

**Input Sanitization**:
```pseudo
FUNCTION sanitizeInput(collectedTones):
  // Only allow digits
  cleaned = REGEX_REPLACE(collectedTones, "[^0-9]", "")
  
  // Limit length
  IF LENGTH(cleaned) > 30:
    cleaned = SUBSTRING(cleaned, 0, 30)
  END IF
  
  RETURN cleaned
END FUNCTION
```

### 5. Reliability & Resilience

**Retry Queue for CIAM Calls**:
```pseudo
FUNCTION handleOptOut(data):
  TRY:
    result = callCIAMToOptOut(data)
    IF result.success:
      RETURN SUCCESS
    ELSE:
      // Queue for retry
      QUEUE.add({
        payload: data,
        retries: 0,
        maxRetries: 3,
        nextAttempt: NOW() + 60_SECONDS
      })
      RETURN SUCCESS // User already got confirmation
    END IF
  CATCH error:
    LOG_ERROR("CIAM call failed:", error)
    QUEUE.add({
      payload: data,
      retries: 0,
      maxRetries: 3,
      nextAttempt: NOW() + 60_SECONDS
    })
    RETURN SUCCESS
  END TRY
END FUNCTION

// Background worker
FUNCTION processRetryQueue():
  WHILE TRUE:
    items = QUEUE.getPending()
    FOR EACH item IN items:
      IF item.retries < item.maxRetries:
        TRY:
          result = callCIAMToOptOut(item.payload)
          IF result.success:
            QUEUE.remove(item)
            LOG("Retry successful for:", item.payload.from)
          ELSE:
            item.retries++
            item.nextAttempt = NOW() + (60_SECONDS * item.retries)
            QUEUE.update(item)
          END IF
        CATCH error:
          item.retries++
          item.nextAttempt = NOW() + (60_SECONDS * item.retries)
          QUEUE.update(item)
        END TRY
      ELSE:
        LOG_ERROR("Max retries exceeded:", item.payload)
        QUEUE.remove(item)
        SEND_ALERT("CIAM integration failure", item.payload)
      END IF
    END FOR
    SLEEP(30_SECONDS)
  END WHILE
END FUNCTION
```

### 6. Performance Optimization

**Async Processing**:
```pseudo
FUNCTION handleCollectWebhook(request):
  // Parse request
  data = PARSE_REQUEST(request)
  
  // Return response immediately (don't block)
  response = BUILD_RESPONSE(data)
  
  // Process CIAM call asynchronously
  IF data.collectedTones == "1":
    ASYNC_CALL(callCIAMToOptOut, data) // Non-blocking
  END IF
  
  RETURN response
END FUNCTION
```

**Caching Audio URLs**:
```pseudo
// Cache audio URLs to avoid repeated environment lookups
CACHE audioUrls = {
  "welcome": ENV_VAR("WELCOME_AUDIO_URL"),
  "noInput": ENV_VAR("NO_INPUT_AUDIO_URL"),
  "confirmation": ENV_VAR("CONFIRMATION_AUDIO_URL"),
  "firstInvalid": ENV_VAR("FIRST_INVALID_AUDIO_URL"),
  "secondInvalid": ENV_VAR("SECOND_INVALID_AUDIO_URL")
}

FUNCTION getAudioUrl(type):
  RETURN audioUrls[type]
END FUNCTION
```

---

## Deployment Checklist

Before going to production, verify:

### Pre-Deployment
- [ ] All audio files uploaded to CDN
- [ ] Audio files tested (8kHz, mono, WAV format)
- [ ] Environment variables configured
- [ ] CIAM API integration tested
- [ ] Toll-free number purchased
- [ ] Routee application configured
- [ ] Webhook URLs verified
- [ ] CORS headers enabled
- [ ] SSL certificate valid

### Testing
- [ ] Test successful opt-out (press "1")
- [ ] Test first invalid input (press other digit)
- [ ] Test second invalid input
- [ ] Test no input timeout
- [ ] Test from different phones (mobile, landline)
- [ ] Verify CIAM receives opt-out data
- [ ] Check monitoring dashboard shows requests

### Monitoring
- [ ] Monitoring dashboard accessible
- [ ] Logs showing request/response data
- [ ] Alerts configured for errors
- [ ] Performance metrics tracked
- [ ] CIAM integration status monitored

### Documentation
- [ ] Internal documentation updated
- [ ] Runbook created for on-call team
- [ ] Contact information for escalation
- [ ] Known issues documented

---

## Appendix

### A. Routee Verb Reference

**PLAY Verb**
```json
{
  "type": "PLAY",
  "fileURL": "https://YOUR-CDN.com/audio-file.wav",
  "bargeIn": false
}
```
- `fileURL`: Full URL to audio file (must be publicly accessible)
- `bargeIn`: 
  - `false` - User must listen to entire audio
  - `true` - User can interrupt by pressing keys

**COLLECT Verb**
```json
{
  "type": "COLLECT",
  "eventUrl": "https://YOUR-DOMAIN.com/webhook-endpoint",
  "submitOnHash": true,
  "maxDigits": 30
}
```
- `eventUrl`: Webhook URL where Routee will POST collected tones
- `submitOnHash`: 
  - `true` - Submit when user presses `#` (recommended)
  - `false` - Submit after maxDigits reached
- `maxDigits`: Maximum number of digits to collect (1-30)

**PAUSE Verb**
```json
{
  "type": "PAUSE",
  "duration": 7
}
```
- `duration`: Number of seconds to pause (1-60)
- Purpose: Give user time to respond before next verb executes

**SAY Verb** (Alternative to PLAY)
```json
{
  "type": "SAY",
  "text": "Your message text here",
  "language": "en-US",
  "bargeIn": false
}
```
- `text`: Text to convert to speech
- `language`: Language code (en-US, en-GB, es-ES, etc.)
- `bargeIn`: Allow user to interrupt

### B. HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Successful request, valid response |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Valid auth but not allowed |
| 405 | Method Not Allowed | Wrong HTTP method (e.g., DELETE on GET endpoint) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service (CIAM) error |
| 503 | Service Unavailable | Temporary maintenance or overload |

### C. Audio File Requirements

**Format Specifications**:
- **Format**: WAV (preferred) or MP3
- **Sample Rate**: 8kHz (phone quality standard)
- **Channels**: Mono (1 channel)
- **Bit Depth**: 16-bit
- **Encoding**: PCM (WAV) or MP3
- **Max Duration**: 60 seconds per file (shorter is better)
- **Max File Size**: 5MB per file

**Best Practices**:
- Keep messages under 30 seconds
- Use professional voice talent
- Normalize audio levels
- Remove background noise
- Test on actual phone before production
- Provide transcripts for accessibility

**Sample ffmpeg Conversion**:
```bash
# Convert any audio to Routee-compatible WAV
ffmpeg -i input.mp3 -ar 8000 -ac 1 -ab 128k -f wav output.wav
```

### D. Environment Variables Template

```bash
# ======================
# Application Settings
# ======================
BASE_URL=https://YOUR-DOMAIN.com
ENVIRONMENT=production

# ======================
# Audio File URLs
# ======================
WELCOME_AUDIO_URL=https://YOUR-CDN.com/audio/welcome.wav
NO_INPUT_AUDIO_URL=https://YOUR-CDN.com/audio/no-input.wav
CONFIRMATION_AUDIO_URL=https://YOUR-CDN.com/audio/confirmation.wav
FIRST_INVALID_AUDIO_URL=https://YOUR-CDN.com/audio/first-invalid.wav
SECOND_INVALID_AUDIO_URL=https://YOUR-CDN.com/audio/second-invalid.wav

# ======================
# CIAM Integration
# ======================
CIAM_API_URL=https://your-ciam-api.com/v1
CIAM_API_KEY=your-secret-api-key-here
CIAM_TIMEOUT=5000

# ======================
# Monitoring (Optional)
# ======================
MONITORING_API_URL=https://your-monitoring-service.com
MONITORING_API_KEY=your-monitoring-api-key

# ======================
# Feature Flags
# ======================
ENABLE_REQUEST_LOGGING=true
ENABLE_MONITORING_DASHBOARD=true
ENABLE_RATE_LIMITING=true
```

### E. Testing Checklist

**Functional Tests**:
- [ ] User presses "1#" → hears confirmation
- [ ] User presses "2#" → hears retry message
- [ ] User presses "1#" on retry → hears confirmation
- [ ] User presses "9#" twice → hears final message
- [ ] User doesn't press anything → hears retry message
- [ ] User doesn't press anything twice → call ends

**Integration Tests**:
- [ ] Initial dialplan returns correct JSON structure
- [ ] Webhook receives POST from Routee
- [ ] CIAM receives opt-out data
- [ ] Monitoring logs capture all requests
- [ ] Error cases handled gracefully

**Load Tests**:
- [ ] Handle 100 concurrent calls
- [ ] No memory leaks during extended use
- [ ] Response time < 500ms under load
- [ ] Database connections managed properly

**Security Tests**:
- [ ] Webhook only accepts POST method
- [ ] Rate limiting prevents abuse
- [ ] Input validation prevents injection
- [ ] CORS headers properly configured
- [ ] HTTPS enforced (no HTTP)

---

## Support & Resources

### Routee Documentation
- Voice API: https://docs.routee.net/docs/voice-api
- Voice Verbs: https://docs.routee.net/docs/voice-verbs
- COLLECT Verb: https://docs.routee.net/docs/collect-verb
- Webhooks: https://docs.routee.net/docs/voice-webhooks

### Contact Support

For technical issues:
1. Check monitoring dashboard first
2. Review server logs
3. Test with curl commands
4. Contact support with:
   - Phone number tested
   - Timestamp of call
   - Expected vs actual behavior
   - Request/response logs
   - Error messages

---

## Changelog

### Version 1.0 (Current)
- ✅ Initial implementation
- ✅ Two-attempt retry logic
- ✅ CIAM integration
- ✅ Real-time monitoring dashboard
- ✅ Comprehensive logging
- ✅ Support for Routee `collectedTones` field
- ✅ 7-second PAUSE between COLLECT and fallback PLAY
- ✅ Generic implementation guide for any language/framework

---

## FAQ

**Q: Why do we need PAUSE after COLLECT?**  
A: The PAUSE gives users 7 seconds to press keys. Without it, the call would proceed immediately to the next verb (ending the call). During the PAUSE, if the user presses "1#", Routee interrupts the flow and POSTs to the webhook.

**Q: Why is there a PLAY after PAUSE?**  
A: This is the fallback message that plays if the user doesn't respond during the PAUSE. It ensures the call ends gracefully with appropriate messaging rather than just disconnecting.

**Q: What happens if CIAM API is down?**  
A: The system still plays the confirmation message to the user (good UX), but queues the opt-out request for retry. This prevents failed calls due to downstream service issues.

**Q: Can we customize the retry count?**  
A: Yes. The current implementation allows 2 attempts. You can modify the logic to support 3+ attempts by adding additional `attempt` values and corresponding audio messages.

**Q: Why `maxDigits: 30` instead of `maxDigits: 1`?**  
A: Routee requires a higher maxDigits value to properly detect input with `submitOnHash`. Setting it to 1 may cause issues with hash key detection.

**Q: What if user presses "1" without pressing "#"?**  
A: **CRITICAL**: With `submitOnHash: true`, Routee will **NOT POST to the eventURL** at all if the hash key is not pressed. 

**What happens**:
1. User presses "1" (no hash)
2. PAUSE duration completes (7 seconds)
3. Fallback PLAY executes (no-input or invalid message)
4. Call ends
5. **No webhook POST is sent** - you never receive the "1" that was pressed

**What you receive instead**:
- After PAUSE completes without "#", Routee posts `collectedTones: ""` (empty)
- Your system treats this as invalid input and gives a retry

**Developer Implications**:
- You cannot detect partial input (digits without #)
- You only receive either complete submissions (with #) or timeout submissions (empty)
- This is why clear audio instructions saying "press 1 followed by the hash key" are essential
- Monitor dashboard will only show completed submissions or timeouts, never partial input

**Q: Can we support multiple valid options (1, 2, 3, etc.)?**  
A: Yes. Modify the validation logic to check `collectedTones IN ["1", "2", "3"]` and route accordingly. You'll need different CIAM calls for each option.

**Q: How long are request logs stored?**  
A: The provided implementation stores the last 100 requests in memory. For persistent storage, integrate a database or logging service.

---

**End of Developer Guide**

*This guide is technology-agnostic and can be implemented in any programming language or framework that supports HTTP requests and JSON responses.*
