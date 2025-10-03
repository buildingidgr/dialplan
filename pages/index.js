export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Routee Voice Opt-Out Flow</h1>
      <p>This is a Next.js application for Routee voice opt-out functionality.</p>
      <h2>Available Endpoints:</h2>
      <ul>
        <li>
          <strong>Initial Dialplan:</strong>{' '}
          <code>GET /api/voice/dialplans/opt-out/initial</code>
        </li>
        <li>
          <strong>Collect Webhook:</strong>{' '}
          <code>POST /api/voice/hooks/collect/opt-out</code>
        </li>
      </ul>
      <h2>Test the API:</h2>
      <p>
        <a 
          href="/api/voice/dialplans/opt-out/initial" 
          target="_blank"
          style={{ 
            display: 'inline-block', 
            padding: '10px 20px', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '5px' 
          }}
        >
          Test Initial Dialplan
        </a>
      </p>
    </div>
  );
}
