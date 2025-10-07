import { useState, useEffect } from 'react';

export default function Monitor() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/monitor/logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      try {
        await fetch('/api/monitor/logs', { method: 'DELETE' });
        setLogs([]);
      } catch (error) {
        console.error('Error clearing logs:', error);
      }
    }
  };

  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', color: '#333' }}>📊 Voice API Monitor</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#666' }}>Auto-refresh (3s)</span>
            </label>
            <button 
              onClick={fetchLogs}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔄 Refresh Now
            </button>
            <button 
              onClick={clearLogs}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#e00', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ Clear Logs
            </button>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#333', 
          color: '#0f0', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1rem',
          fontSize: '14px'
        }}>
          <strong>Total Requests:</strong> {logs.length} | <strong>Status:</strong> {autoRefresh ? '🟢 Live' : '⚪ Paused'}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            backgroundColor: 'white', 
            borderRadius: '8px',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '1rem' }}>📭 No requests logged yet</p>
            <p style={{ fontSize: '14px' }}>Requests will appear here in real-time</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {logs.map((log) => (
              <div 
                key={log.id} 
                style={{ 
                  backgroundColor: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${log.method === 'POST' ? '#0070f3' : '#10b981'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ 
                      backgroundColor: log.method === 'POST' ? '#0070f3' : '#10b981',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginRight: '0.5rem'
                    }}>
                      {log.method}
                    </span>
                    <span style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>
                      {log.endpoint}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Request Body */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      📥 Request Body:
                    </div>
                    <pre style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '0.75rem', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      margin: 0,
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(log.body, null, 2)}
                    </pre>
                  </div>

                  {/* Response */}
                  <div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      📤 Response:
                    </div>
                    <pre style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '0.75rem', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      margin: 0,
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(log.response, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Query Parameters */}
                {Object.keys(log.query).length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      🔍 Query Params:
                    </div>
                    <pre style={{ 
                      backgroundColor: '#f8f9fa', 
                      padding: '0.75rem', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      margin: 0,
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(log.query, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Headers */}
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}>
                    🔐 Headers (click to expand)
                  </summary>
                  <pre style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '0.75rem', 
                    borderRadius: '4px',
                    fontSize: '12px',
                    margin: '0.5rem 0 0 0',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(log.headers, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
