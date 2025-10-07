export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Allow both GET and POST methods
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Set content type to JSON
  res.setHeader('Content-Type', 'application/json');

  // Return the initial dialplan response
  const response = {
    verbs: [
      {
        type: "PLAY",
        fileURL: "https://cdn12.waymore.io/s/pTXaaw7KDLcjBnt/download/1.wav",
        bargeIn: false
      },
      {
        type: "COLLECT",
        eventUrl: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://YOUR-VERCEL-APP.vercel.app'}/api/voice/hooks/collect/opt-out?attempt=1`,
        submitOnHash: true,
        maxDigits: 30
      },
      {
        type: "PAUSE",
        duration: 7 // seconds
      }
    ]
  };

  res.status(200).json(response);
}
