import React, { useState, useEffect } from 'react';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Licencia = ({ onActivated }) => {
  const [status, setStatus] = useState(null);
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = () => {
    if (ipcRenderer) {
      ipcRenderer.invoke('get-license-status').then(res => {
        setStatus(res);
        setCargando(false);
      });
    }
  };

  const handleActivar = () => {
    if (!clave.trim()) return;
    setError('');
    ipcRenderer.invoke('activate-license', clave).then(res => {
      if (res.success) {
        onActivated();
      } else {
        setError(res.error || 'Clave inválida.');
      }
    });
  };

  const handlePrueba = () => {
    ipcRenderer.invoke('start-trial').then(res => {
      if (res.success) {
        onActivated();
      } else {
        setError(res.error || 'No se pudo iniciar la prueba.');
      }
    });
  };

  const copiarCodigo = () => {
    navigator.clipboard.writeText(status?.installationCode || '');
    alert('Código copiado al portapapeles');
  };

  if (cargando) return <div style={{textAlign: 'center', marginTop: 100}}>Cargando...</div>;

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      height: '100vh', backgroundColor: '#f0f2f5', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: 'white', padding: '40px', borderRadius: '12px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%',
        textAlign: 'center'
      }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🔐 Activación Requerida</h1>
        
        {status?.isTrialValid === false && status?.trialDaysRemaining <= 0 && status?.trialStartDate ? (
            <p style={{color: '#e74c3c', fontWeight: 'bold'}}>Tu periodo de prueba ha expirado.</p>
        ) : (
            <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>
              Para usar el Planificador Docente de forma ilimitada, adquiere una licencia permanente.
            </p>
        )}

        <div style={{
          background: '#ecf0f1', padding: '20px', borderRadius: '8px', marginBottom: '30px'
        }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#34495e' }}>
            Tu Código de Instalación:
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <code style={{
              fontSize: '1.5rem', fontWeight: 'bold', color: '#2980b9', 
              letterSpacing: '2px', userSelect: 'all'
            }}>
              {status?.installationCode}
            </code>
            <button 
              onClick={copiarCodigo}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem'
              }}
              title="Copiar Código"
            >
              📋
            </button>
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.8rem', color: '#7f8c8d' }}>
            Envía este código al desarrollador para recibir tu Clave de Activación.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            style={{
              width: '100%', padding: '15px', fontSize: '1.2rem', textAlign: 'center',
              border: '2px solid #bdc3c7', borderRadius: '8px', outline: 'none',
              textTransform: 'uppercase', letterSpacing: '1px'
            }}
          />
        </div>

        {error && <p style={{ color: '#e74c3c', marginTop: '-10px', marginBottom: '15px', fontWeight: 'bold' }}>{error}</p>}

        <button 
          onClick={handleActivar}
          style={{
            width: '100%', padding: '15px', background: '#27ae60', color: 'white',
            border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold',
            cursor: 'pointer', marginBottom: '15px', transition: 'background 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = '#2ecc71'}
          onMouseOut={(e) => e.target.style.background = '#27ae60'}
        >
          ACTIVAR LICENCIA
        </button>

        {(!status?.isTrialValid && !status?.trialStartDate) && (
          <div>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
            <button 
              onClick={handlePrueba}
              style={{
                width: '100%', padding: '12px', background: 'transparent', color: '#3498db',
                border: '2px solid #3498db', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold',
                cursor: 'pointer', transition: 'all 0.3s'
              }}
              onMouseOver={(e) => { e.target.style.background = '#3498db'; e.target.style.color = 'white'; }}
              onMouseOut={(e) => { e.target.style.background = 'transparent'; e.target.style.color = '#3498db'; }}
            >
              Iniciar Prueba Gratuita de 7 Días
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Licencia;
