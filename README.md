# Routee Voice Opt-Out Flows

A Next.js serverless implementation of the Routee inbound voice opt-out flow using Vercel serverless functions.

## Overview

This project implements a complete voice opt-out flow for Routee telephony services, allowing users to opt out of communications through an interactive voice response (IVR) system.

## Features

- 🎯 **Interactive Voice Response (IVR)** - Multi-step voice prompts with user input collection
- 🔄 **Two-Attempt Retry Logic** - Handles invalid inputs with retry attempts
- 📞 **CIAM Integration** - Stub function ready for Customer Identity and Access Management
- 🚀 **Serverless Architecture** - Built for Vercel deployment
- 📊 **Real-time Monitoring Dashboard** - Live request/response monitoring at `/monitor`
- 🔍 **Comprehensive Logging** - Full request/response logging for debugging
- 🌐 **CORS Support** - Cross-origin request handling
- ⏱️ **Hash Key Detection** - Proper handling of Routee's `submitOnHash` behavior
- 🎵 **Audio Fallback Handling** - Graceful timeout and no-input scenarios

## Quick Start

1. **Deploy to Vercel** (see [Deployment](#deployment) section)
2. **Configure Routee** number with your Dialplan URL
3. **Test** by calling your Routee number
4. **Monitor** at `/monitor` dashboard

## API Endpoints

### 1. Initial Dialplan (Dialplan URL)
**Endpoint:** `POST /api/voice/dialplans/opt-out/initial`  
**Method:** `POST` (also accepts `GET` for testing)

This is the Dialplan URL configured in your Routee number settings. Returns the initial voice prompt and input collection setup.

**Response:**
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
      "eventUrl": "https://YOUR-VERCEL-APP.vercel.app/api/voice/hooks/collect/opt-out?attempt=1",
      "submitOnHash": true,
      "maxDigits": 30
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/yWCEeCTLFK5dQ7Y/download/4.wav",
      "bargeIn": false
    },
    {
      "type": "PAUSE",
      "duration": 7
    },
    {
      "type": "PLAY",
      "fileURL": "https://cdn12.waymore.io/s/NcB6E9Deaecnp94/download/6.wav",
      "bargeIn": false
    }
  ]
}
```

**Verb Sequence Explanation:**
1. **PLAY** - Welcome message (File 1)
2. **COLLECT** - Wait for user to press keys, submit on # press
3. **PAUSE** - Give user 7 seconds to respond
4. **PLAY** - First no-input/timeout message (File 4)
5. **PAUSE** - Give user another 7 seconds to respond  
6. **PLAY** - Final no-input/timeout message (File 6)

**Total Time:** Up to 14 seconds for user to respond (2 × 7-second pauses)

### 2. Collect Endpoint (eventURL)
**Endpoint:** `POST /api/voice/hooks/collect/opt-out`  
**Method:** `POST`  
**Query Parameters:** `attempt=1|2`

This is the eventURL endpoint that handles collected tones from Routee and manages the opt-out flow logic.

**Request Body:**
```json
{
  "collectedTones": "1",
  "from": "+1234567890",
  "to": "+1800XXXYYYY",
  "messageId": "unique-message-id",
  "conversationTrackingId": "unique-conversation-id"
}
```

**Flow Logic:**
- **No Input (collectedTones=""):** Logs for analytics (call already ended)
- **Valid Input (collectedTones="1"):** Calls CIAM and plays confirmation
- **Invalid Input (attempt=1):** Plays retry message and collects again
- **Invalid Input (attempt=2):** Plays final invalid message

### 3. Monitoring Logs API
**Endpoint:** `GET /api/monitor/logs`  
**Method:** `GET`

Returns all logged requests for monitoring and debugging.

**Response:**
```json
{
  "count": 15,
  "logs": [
    {
      "id": 1728394823.456,
      "timestamp": "2025-10-07T09:30:23.456Z",
      "endpoint": "/api/voice/hooks/collect/opt-out",
      "method": "POST",
      "body": { "collectedTones": "1", ... },
      "query": { "attempt": "1" },
      "response": { "verbs": [...] }
    }
  ]
}
```

### 4. Health Check
**Endpoint:** `GET /api/ping`  
**Method:** `GET`

Simple health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-07T09:30:23.456Z"
}
```

## Project Structure

```
├── lib/
│   ├── ciam.js                           # CIAM integration function
│   └── requestLogger.js                  # Request logging utility
├── pages/
│   ├── api/
│   │   ├── monitor/
│   │   │   └── logs.js                   # Monitoring logs API
│   │   ├── ping.js                       # Health check endpoint
│   │   └── voice/
│   │       ├── dialplans/
│   │       │   └── opt-out/
│   │       │       └── initial.js        # Initial dialplan endpoint
│   │       └── hooks/
│   │           └── collect/
│   │               └── opt-out.js        # Collect endpoint (eventURL)
│   ├── index.js                          # Home page
│   └── monitor.js                        # Monitoring dashboard
├── README.md
└── DEVELOPER_GUIDE.md                    # Comprehensive developer guide
```

## Deployment

### Prerequisites
- Node.js 18+ 
- Vercel account
- GitHub repository

### Deploy to Vercel

1. **Connect Repository**
   ```bash
   git clone https://github.com/cantoniouwaymore/dialplan.git
   cd dialplan
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import `cantoniouwaymore/dialplan`
   - Deploy automatically

3. **Update URLs**
   The application automatically uses `process.env.VERCEL_URL` for dynamic URL generation.

## Environment Variables

No additional environment variables are required. The application uses:
- `VERCEL_URL` - Automatically set by Vercel for URL generation

## Testing

### Test Initial Dialplan
```bash
curl -X GET https://your-app.vercel.app/api/voice/dialplans/opt-out/initial
```

### Test Collect Endpoint
```bash
curl -X POST https://your-app.vercel.app/api/voice/hooks/collect/opt-out?attempt=1 \
  -H "Content-Type: application/json" \
  -d '{
    "collectedTones": "1",
    "from": "+1234567890",
    "to": "+1800XXXYYYY",
    "messageId": "test-msg-123",
    "conversationTrackingId": "test-conv-123"
  }'
```

## Routee Configuration

### Configure Your Routee Number

1. **Log into Routee Dashboard**
   - Navigate to **Voice > Numbers** (or **Number / My numbers**)

2. **Configure Inbound Call Settings**
   - Click on your number to edit settings
   - Navigate to **Inbound Call Settings** section
   - In the **Forward to** dropdown, select: `Dialplan`
   - In the **Dialplan URL** field, enter:
     ```
     https://your-app.vercel.app/api/voice/dialplans/opt-out/initial
     ```
   - Save the configuration

3. **Test Your Configuration**
   - Call your Routee number
   - Verify the IVR flow works as expected

## Monitoring Dashboard

Access the real-time monitoring dashboard at:
```
https://your-app.vercel.app/monitor
```

**Features:**
- View all incoming requests in real-time
- See request/response details
- Auto-refresh every 3 seconds
- Clear logs functionality
- Track call flow and debugging information

## Audio Files

The following audio files are currently hosted on CDN:

| File | URL | Purpose |
|------|-----|---------|
| **File 1** | `https://cdn12.waymore.io/s/pTXaaw7KDLcjBnt/download/1.wav` | Welcome/initial opt-out message |
| **File 2** | (Configure in code) | First invalid input retry message |
| **File 3** | (Configure in code) | Second invalid input message |
| **File 4** | `https://cdn12.waymore.io/s/yWCEeCTLFK5dQ7Y/download/4.wav` | No input retry message (with hash reminder) |
| **File 5** | (Configure in code) | Opt-out confirmation message |
| **File 6** | `https://cdn12.waymore.io/s/NcB6E9Deaecnp94/download/6.wav` | Final no-input/timeout message |

**Audio Requirements:**
- Format: WAV (preferred) or MP3
- Sample Rate: 8kHz (phone quality)
- Channels: Mono
- Bit Depth: 16-bit
- Encoding: PCM

**Note:** Update the audio file URLs in your endpoint code (`pages/api/voice/hooks/collect/opt-out.js`) to point to your own CDN or audio hosting service.

## CIAM Integration

The `lib/ciam.js` file contains a stub function for CIAM integration:

```javascript
export async function callCIAMToOptOut(payload) {
  console.log("Simulated CIAM opt-out call with payload:", payload);
}
```

Replace this with your actual CIAM service integration.

## Logging

All endpoints include comprehensive logging:
- Request details (method, URL, query params)
- User input and attempt numbers
- Flow decisions and responses
- Error handling and debugging information

View logs in the Vercel dashboard under Functions → View Function Logs.

## Error Handling

- **405 Method Not Allowed** - Invalid HTTP methods
- **500 Internal Server Error** - Server-side errors with detailed logging
- **CORS Support** - Proper headers for cross-origin requests

## Development

### Local Development
```bash
npm install
npm run dev
```

### File Structure
- API routes follow Next.js conventions (`pages/api/`)
- All endpoints return JSON with proper Content-Type headers
- CORS headers included for cross-origin support

## License

This project is part of the Routee voice opt-out implementation.

## Important Routee Behaviors

⚠️ **Hash Key Requirement:**
- Routee uses `submitOnHash: true`, which means users **must press the hash (#) key** after entering their digit
- If a user presses "1" but forgets "#", Routee will **not** POST to the eventURL
- The call will proceed through the PAUSE and fallback PLAY, then end
- After the call ends, Routee posts `collectedTones: ""` (empty string)
- Always instruct users to "press 1 followed by the hash key"

**Field Names:**
- Routee sends collected digits as `collectedTones`, not `digits`
- Request includes: `from`, `to`, `messageId`, `conversationTrackingId`

## Documentation

For comprehensive documentation, see:
- **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** - Complete technical guide with:
  - Detailed business logic and call flow
  - Routee integration details
  - Implementation examples (JavaScript, Python, PHP, Java)
  - Troubleshooting guide
  - Testing strategies
  - Best practices

## Support

For issues or questions:
1. Check the Vercel function logs
2. Review the monitoring dashboard at `/monitor`
3. Consult the [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
4. Contact the development team
