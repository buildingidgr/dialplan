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

  // Return a simple dialplan with just a SAY verb
  const response = {
    verbs: [
      {
        type: "SAY",
        text: "Hello, this is a test message from the simple dialplan. Thank you for calling.",
        language: "en-US",
        bargeIn: false
      }
    ]
  };

  res.status(200).json(response);
}
