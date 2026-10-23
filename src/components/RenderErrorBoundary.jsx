import React from 'react';

export default class RenderErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error al abrir una sección de ELARA:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" style={{ minHeight: '100vh', boxSizing: 'border-box', padding: 32, background: '#f3f5f8', color: '#1f2937', fontFamily: 'system-ui, sans-serif' }}>
        <h1>No se pudo abrir esta sección</h1>
        <p>ELARA registró el error para poder corregirlo. Reinicia la aplicación para volver a intentarlo.</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, background: '#fff', border: '1px solid #ccd3df', borderRadius: 8 }}>{String(this.state.error?.message || this.state.error)}</pre>
        <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 18px', fontSize: 16, cursor: 'pointer' }}>Reiniciar ELARA</button>
      </main>
    );
  }
}
