import { useState } from 'react';

function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function guardarGrupoAndroid(payload) {
  const native = window.planificadorAndroid?.native;
  if (!native) throw new Error('No se encontró el selector de archivos de Android.');
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (bytes.length > 128 * 1024 * 1024) throw new Error('El archivo del grupo supera 128 MB.');
  const result = await native.beginDocumentSave({ mime: 'application/json', name: `Grupo-${payload.grupo.grado}${payload.grupo.seccion}.elara.json` });
  if (result?.cancelled) return { cancelled: true };
  try {
    for (let offset = 0; offset < bytes.length; offset += 32768) {
      await native.appendDocumentChunk({ sessionId: result.sessionId, base64: base64(bytes.subarray(offset, offset + 32768)) });
    }
    return await native.finishDocumentSave({ sessionId: result.sessionId, expectedBytes: bytes.length });
  } catch (error) {
    await native.cancelDocumentSave({ sessionId: result.sessionId }).catch(() => {});
    throw error;
  }
}

async function leerGrupoAndroid() {
  const native = window.planificadorAndroid?.native;
  if (!native) throw new Error('No se encontró el selector de archivos de Android.');
  const session = await native.selectGroupRoster();
  if (session?.cancelled) return null;
  try {
    if (!Number.isSafeInteger(session.size) || session.size < 1 || session.size > 128 * 1024 * 1024) throw new Error('El archivo del grupo debe pesar como máximo 128 MB.');
    const decoder = new TextDecoder(); let text = '';
    for (let offset = 0; offset < session.size; offset += 32768) {
      const part = await native.readGroupRosterChunk({ sessionId: session.sessionId, offset, length: Math.min(32768, session.size - offset) });
      const binary = atob(part.base64); const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      text += decoder.decode(bytes, { stream: offset + bytes.length < session.size });
    }
    return JSON.parse(text);
  } finally { await native.closeGroupRosterRead({ sessionId: session.sessionId }).catch(() => {}); }
}

export default function TransferenciaGrupo({ ipc, grupo, onImported }) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');
  const ejecutar = async accion => {
    if (ocupado || !grupo?.id) return;
    if (accion === 'grupo-importar-lista' && !window.confirm('Se agregarán al grupo actual los alumnos, sus datos de perfil y los documentos de sus expedientes. No se reemplazará información del grupo ni de los alumnos que ya tienes. ¿Continuar?')) return;
    setOcupado(true); setAviso(''); setError('');
    try {
      const android = Boolean(window.planificadorAndroid?.native);
      let result;
      if (android && accion === 'grupo-exportar-lista') {
        const payload = await ipc.invoke('grupo-exportar-datos', grupo.id);
        result = await guardarGrupoAndroid(payload);
        if (!result?.cancelled) result.count = payload.alumnos.length;
      } else if (android && accion === 'grupo-importar-lista') {
        const payload = await leerGrupoAndroid();
        if (!payload) return;
        result = await ipc.invoke('grupo-importar-datos', grupo.id, payload);
      } else result = await ipc.invoke(accion, grupo.id);
      if (result?.cancelled) return;
      if (accion === 'grupo-importar-lista') {
        await onImported?.();
        setAviso(`Se importaron ${result.count} alumnos con sus expedientes al grupo actual.`);
      } else setAviso(`Se exportaron ${result.count} alumnos con sus expedientes.`);
    } catch (e) { setError(e.message || 'No se pudo completar la transferencia.'); }
    finally { setOcupado(false); }
  };
  return <section aria-label="Compartir grupo" style={{ margin: '16px 0', padding: 16, border: '1px solid #cbd5e1', borderRadius: 10, background: '#f8fafc' }}>
    <h3 style={{ marginTop: 0 }}>Compartir lista y expedientes del grupo</h3>
    <p>Exporta los nombres, perfiles y documentos de los alumnos para que otro docente los importe en su grupo, aunque imparta otra materia. Comparte el archivo solo con docentes autorizados.</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <button type="button" disabled={ocupado || !grupo?.id} onClick={() => ejecutar('grupo-exportar-lista')}>Exportar grupo y expedientes</button>
      <button type="button" disabled={ocupado || !grupo?.id} onClick={() => ejecutar('grupo-importar-lista')}>Importar al grupo actual</button>
    </div>
    {ocupado && <p role="status">Procesando lista y expedientes…</p>}
    {aviso && <p role="status">{aviso}</p>}
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
  </section>;
}
