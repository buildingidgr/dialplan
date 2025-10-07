const { getRequestLogs, clearRequestLogs } = require('../../../lib/requestLogger.js');

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Set content type to JSON
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    // Return all logs
    const logs = getRequestLogs();
    return res.status(200).json({ 
      count: logs.length, 
      logs 
    });
  } else if (req.method === 'DELETE') {
    // Clear all logs
    clearRequestLogs();
    return res.status(200).json({ message: 'Logs cleared' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
