const { callCIAMToOptOut } = require('../../../../../lib/ciam.js');
const { logRequest } = require('../../../../../lib/requestLogger.js');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set content type to JSON
  res.setHeader('Content-Type', 'application/json');

  try {
    // Routee sends "collectedTones" not "digits"
    const collectedTones = req.body.collectedTones || req.body.digits || '';
    const attempt = parseInt(req.query.attempt) || 1;

    console.log(`Collect webhook called - attempt: ${attempt}, collectedTones: "${collectedTones}"`);
    console.log(`Full request body:`, JSON.stringify(req.body));
    
    // Note: If collectedTones is empty, the call has already ended
    // This POST is informational only - our response will be ignored
    if (!collectedTones || collectedTones === '') {
      console.log('Empty collectedTones received - call already ended, logging for analytics only');
      const response = { message: 'Call already ended, no action needed' };
      logRequest('/api/voice/hooks/collect/opt-out', req.method, req.body, req.query, req.headers, response);
      return res.status(200).json(response);
    }

    // Valid input (collectedTones === "1")
    if (collectedTones === "1") {
      console.log('Valid opt-out input received, calling CIAM');
      
      // Call CIAM to opt out
      await callCIAMToOptOut({
        collectedTones,
        from: req.body.from,
        to: req.body.to,
        messageId: req.body.messageId,
        conversationTrackingId: req.body.conversationTrackingId,
        attempt,
        timestamp: new Date().toISOString()
      });

      const response = {
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/Aw9oidNF2oxAppq/download/5.wav",
            bargeIn: false
          }
        ]
      };
      logRequest('/api/voice/hooks/collect/opt-out', req.method, req.body, req.query, req.headers, response);
      return res.status(200).json(response);
    }

    // Invalid input handling (including empty collectedTones)
    // Routee posts empty collectedTones even when user doesn't press anything
    if (attempt === 1) {
      console.log(`Invalid input on first attempt (collectedTones: "${collectedTones}"), retrying`);
      const response = {
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/ezLYj4bpG6mmBty/download/2.wav",
            bargeIn: false
          },
          {
            type: "COLLECT",
            eventUrl: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://YOUR-VERCEL-APP.vercel.app'}/api/voice/hooks/collect/opt-out?attempt=2`,
            submitOnHash: true,
            maxDigits: 30
          },
          {
            type: "PAUSE",
            duration: 7
          },
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
            bargeIn: false
          }
        ]
      };
      logRequest('/api/voice/hooks/collect/opt-out', req.method, req.body, req.query, req.headers, response);
      return res.status(200).json(response);
    } else {
      // Invalid input on second attempt
      console.log(`Invalid input on second attempt (collectedTones: "${collectedTones}"), ending call`);
      const response = {
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
            bargeIn: false
          }
        ]
      };
      logRequest('/api/voice/hooks/collect/opt-out', req.method, req.body, req.query, req.headers, response);
      return res.status(200).json(response);
    }

  } catch (error) {
    console.error('Error in collect webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
