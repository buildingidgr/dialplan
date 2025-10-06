const { callCIAMToOptOut } = require('../../../../../lib/ciam.js');

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
    const { digits } = req.body;
    const attempt = parseInt(req.query.attempt) || 1;

    console.log(`Collect webhook called - attempt: ${attempt}, digits: "${digits}"`);

    // No input (empty digits or timeout)
    if (!digits || digits === '') {
      console.log('No input received, playing no_input.wav');
      return res.status(200).json({
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/299WXiedo2wCp2y/download/4.wav",
            bargeIn: false
          }
        ]
      });
    }

    // Valid input (digits === "1")
    if (digits === "1") {
      console.log('Valid opt-out input received, calling CIAM');
      
      // Call CIAM to opt out
      await callCIAMToOptOut({
        digits,
        attempt,
        timestamp: new Date().toISOString(),
        phoneNumber: req.body.phoneNumber || 'unknown'
      });

      return res.status(200).json({
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/Aw9oidNF2oxAppq/download/5.wav",
            bargeIn: false
          }
        ]
      });
    }

    // Invalid input handling
    if (attempt === 1) {
      console.log('Invalid input on first attempt, retrying');
      return res.status(200).json({
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/ezLYj4bpG6mmBty/download/2.wav",
            bargeIn: false
          },
          {
            type: "PAUSE",
            length: 7
          },
          {
            type: "COLLECT",
            eventUrl: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://YOUR-VERCEL-APP.vercel.app'}/api/voice/hooks/collect/opt-out?attempt=2`,
            submitOnHash: true,
            maxDigits: 30
          }
        ]
      });
    } else {
      // Invalid input on second attempt
      console.log('Invalid input on second attempt, ending call');
      return res.status(200).json({
        verbs: [
          {
            type: "PLAY",
            fileURL: "https://cdn12.waymore.io/s/Z78YoYbRwjMMZBk/download/3.wav",
            bargeIn: false
          }
        ]
      });
    }

  } catch (error) {
    console.error('Error in collect webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
