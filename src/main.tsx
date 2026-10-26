import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { App } from './App';
import { ErrorBoundary } from './components/shared/ErrorBoundary';

// If anything crashes, show what happened instead of a black screen.
const crashScreen = (error: Error) => (
  <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center', padding: 24, background: '#141414', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>AxiomLab hit an error</h1>
      <p style={{ opacity: 0.7 }}>Please send this message along. Reloading the page may fix it.</p>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#1a1a1a', padding: 16, borderRadius: 12, fontSize: 13 }}>
        {error.message}
        {'\n\n'}
        {(error.stack ?? '').split('\n').slice(1, 6).join('\n')}
      </pre>
      <button type="button" onClick={() => location.reload()} style={{ marginTop: 8, padding: '10px 20px', borderRadius: 999, border: 0, background: '#fff', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
        Reload
      </button>
    </div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallback={crashScreen}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
