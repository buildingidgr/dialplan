# Routee Voice Opt-Out Flow

A Next.js serverless implementation of the Routee inbound voice opt-out flow using Vercel serverless functions.

## Overview

This project implements a complete voice opt-out flow for Routee telephony services, allowing users to opt out of communications through an interactive voice response (IVR) system.

## Features

- 🎯 **Interactive Voice Response (IVR)** - Multi-step voice prompts with user input collection
- 🔄 **Retry Logic** - Handles invalid inputs with retry attempts
- 📞 **CIAM Integration** - Stub function ready for Customer Identity and Access Management
- 🚀 **Serverless Architecture** - Built for Vercel deployment
- 📊 **Comprehensive Logging** - Full request/response logging for debugging
- 🌐 **CORS Support** - Cross-origin request handling

## API Endpoints

### 1. Initial Dialplan
**Endpoint:** `POST /api/voice/dialplans/opt-out/initial`  
**Method:** `POST` (also accepts `GET` for testing)

Returns the initial voice prompt and input collection setup.

**Response:**
```json
{
  "verbs": [
    {
      "type": "PLAY",
      "fileURL": "https://waymore.io/recordings/Opt_out_Voice_message_upon_dialling_TFN.wav",
      "bargeIn": false
    },
    {
      "type": "COLLECT",
      "eventUrl": "https://YOUR-VERCEL-APP.vercel.app/api/voice/hooks/collect/opt-out?attempt=1",
      "submitOnHash": true
    }
  ]
}
```

### 2. Collect Webhook
**Endpoint:** `POST /api/voice/hooks/collect/opt-out`  
**Method:** `POST`  
**Query Parameters:** `attempt=1|2`

Handles user input and manages the opt-out flow logic.

**Request Body:**
```json
{
  "digits": "1"
}
```

**Flow Logic:**
- **No Input:** Plays `no_input.wav`
- **Valid Input (digits="1"):** Calls CIAM and plays confirmation
- **Invalid Input (attempt=1):** Plays retry message and collects again
- **Invalid Input (attempt=2):** Plays final invalid message

## Project Structure

```
├── lib/
│   └── ciam.js                           # CIAM integration function
├── pages/
│   └── api/
│       └── voice/
│           ├── dialplans/
│           │   └── opt-out/
│           │       └── initial.js         # Initial dialplan endpoint
│           └── hooks/
│               └── collect/
│                   └── opt-out.js         # Collect webhook endpoint
└── README.md
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

### Test Collect Webhook
```bash
curl -X POST https://your-app.vercel.app/api/voice/hooks/collect/opt-out?attempt=1 \
  -H "Content-Type: application/json" \
  -d '{"digits": "1"}'
```

## Audio Files

The following audio files are expected to be hosted at `https://waymore.io/recordings/`:

- `Opt_out_Voice_message_upon_dialling_TFN.wav` - Initial opt-out message
- `no_input.wav` - No input timeout message
- `opt_out_confirmed.wav` - Successful opt-out confirmation
- `first_invalid_opt_out.wav` - First invalid input retry message
- `second_invalid_opt_out.wav` - Final invalid input message

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

## Support

For issues or questions, please check the Vercel function logs or contact the development team.
