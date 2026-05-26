import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#070d1a', color: '#f1f5f9', padding: '2rem', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#ef4444' }}>Something went wrong</h2>
          <pre style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '1rem', fontSize: '0.8rem', color: '#94a3b8', maxWidth: '600px', overflow: 'auto', marginBottom: '1.5rem' }}>
            {this.state.error?.message}
          </pre>
          <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}>
            Clear Session & Go to Login
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
