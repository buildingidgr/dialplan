// In-memory request log storage (note: this resets on deployment)
const requestLogs = [];
const MAX_LOGS = 100; // Keep last 100 requests

function logRequest(endpoint, method, body, query, headers, response) {
  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    endpoint,
    method,
    body: body || {},
    query: query || {},
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      'x-forwarded-for': headers['x-forwarded-for']
    },
    response,
  };

  requestLogs.unshift(log);

  // Keep only last MAX_LOGS entries
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.pop();
  }

  return log;
}

function getRequestLogs() {
  return requestLogs;
}

function clearRequestLogs() {
  requestLogs.length = 0;
}

module.exports = { logRequest, getRequestLogs, clearRequestLogs };
