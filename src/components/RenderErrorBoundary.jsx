import React from 'react';

export default class RenderErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error in ELARA section:', this.props.sectionName || 'unknown', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main role="alert" style={{ minHeight: '100vh', boxSizing: 'border-box', padding: 32, background: '#f3f5f8', color: '#1f2937', fontFamily: 'system-ui, sans-serif' }}>
        <h1>No se pudo abrir {this.props.sectionName || 'esta seccion'}</h1>
        <p>El error aparece abajo. Regresa al menu e intenta de nuevo.</p>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', padding: 16, background: '#fff', border: '1px solid #ccd3df', borderRadius: 8 }}>{String(this.state.error?.message || this.state.error)}</pre>
        {this.props.onBack
          ? <button type="button" onClick={this.props.onBack} style={{ padding: '10px 18px', fontSize: 16, cursor: 'pointer' }}>Regresar al menu</button>
          : <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 18px', fontSize: 16, cursor: 'pointer' }}>Reiniciar ELARA</button>}
      </main>
    );
  }
}
