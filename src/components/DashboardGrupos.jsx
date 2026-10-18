import React, { useState, useEffect } from 'react';
import './DashboardGrupos.css';
import './SchoolGroups.css';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

export default function DashboardGrupos({ onSelectGrupo }) {
  const [grupos, setGrupos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [grupoEditar, setGrupoEditar] = useState(null);
  const [escuelaFiltro, setEscuelaFiltro] = useState('');
  const [nuevoGrupo, setNuevoGrupo] = useState({
    grado: 1,
    seccion: 'A',
    escuela: '',
    disciplina_id: '',
    tipo: 'Materia Regular',
    ciclo_escolar: '2026-2027'
  });
  
  const [disciplinas, setDisciplinas] = useState([]);

  useEffect(() => {
    cargarGrupos();
  }, []);

  useEffect(() => {
    cargarDisciplinas(nuevoGrupo.grado);
  }, [nuevoGrupo.grado]);

  const cargarGrupos = async () => {
    if (ipcRenderer) {
      const res = await ipcRenderer.invoke('get-grupos');
      setGrupos(res || []);
    }
  };

  const cargarDisciplinas = async (grado) => {
    if (ipcRenderer) {
      const res = await ipcRenderer.invoke('get-disciplinas-por-grado', grado);
      setDisciplinas(res || []);
      // Resetear la selección de disciplina si la lista cambia
      setNuevoGrupo(prev => ({ ...prev, disciplina_id: prev.disciplina_id && res?.some(d => String(d.id) === String(prev.disciplina_id)) ? prev.disciplina_id : '' }));
    }
  };

  const handleCrearGrupo = async (e) => {
    e.preventDefault();
    if (!nuevoGrupo.disciplina_id) {
      alert("Debes seleccionar una asignatura");
      return;
    }
    if (ipcRenderer) {
      try {
        if (grupoEditar) await ipcRenderer.invoke('update-grupo', {...nuevoGrupo, id: grupoEditar.id});
        else await ipcRenderer.invoke('add-grupo', nuevoGrupo);
        setMostrarModal(false); setGrupoEditar(null); cargarGrupos();
      } catch (error) { alert(error.message || 'No se pudo guardar el grupo.'); }
    }
  };

  const abrirEdicion = (event, grupo) => {
    event.stopPropagation();
    setGrupoEditar(grupo);
    setNuevoGrupo({ ...grupo, escuela: grupo.escuela || '', ciclo_escolar: grupo.ciclo_escolar || '2026-2027' });
    setMostrarModal(true);
  };

  const handleEliminarGrupo = async (e, id) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este grupo?")) {
      if (ipcRenderer) {
        await ipcRenderer.invoke('delete-grupo', id);
        cargarGrupos();
      }
    }
  };

  const escuelas = [...new Set(grupos.map(g => (g.escuela || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  const gruposVisibles = escuelaFiltro ? grupos.filter(g => (g.escuela || '') === escuelaFiltro) : grupos;
  const materias = gruposVisibles.filter(g => g.tipo === 'Materia Regular');
  const asesorados = gruposVisibles.filter(g => g.tipo === 'Grupo Asesorado');
  const talleres = gruposVisibles.filter(g => g.tipo === 'Taller');

  const renderCard = (grupo) => {
    const disciplina = grupo.nombre_disciplina || disciplinas.find(d => d.id === parseInt(grupo.disciplina_id))?.nombre || 'Materia del grupo';
    return (
      <div key={grupo.id} className="grupo-card" onClick={() => onSelectGrupo({...grupo, nombre_disciplina: disciplina})} style={{position: 'relative'}}>
        <button 
          onClick={(e) => handleEliminarGrupo(e, grupo.id)} 
          title="Eliminar Grupo" 
          style={{position: 'absolute', top: 5, right: 5, background: '#ff7675', color: 'white', border: 'none', borderRadius: '50%', width: 25, height: 25, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px'}}
        >
          ✕
        </button>
        <div className="grupo-grado">{grupo.grado}º {grupo.seccion}</div>
        <div className="grupo-disciplina">{disciplina}</div>
        <div className="grupo-escuela">🏫 {grupo.escuela || 'Escuela sin asignar'}</div>
        <button type="button" className="grupo-editar" onClick={event => abrirEdicion(event, grupo)}>Editar sección y escuela</button>
        <div className="grupo-tipo">{grupo.tipo}</div>
      </div>
    );
  };

  return (
    <div className="dashboard-grupos-container">
      <header className="dashboard-header">
        <h1>Mi Organización Escolar</h1>
        <button className="btn-crear-grupo" onClick={() => {setGrupoEditar(null);setNuevoGrupo({grado:1,seccion:'A',escuela:'',disciplina_id:'',tipo:'Materia Regular',ciclo_escolar:'2026-2027'});setMostrarModal(true);}}>
          + Crear Nuevo Grupo
        </button>
      </header>

      <main className="dashboard-main">
        <label className="escuela-filtro">Filtrar por escuela <select value={escuelaFiltro} onChange={e=>setEscuelaFiltro(e.target.value)}><option value="">Todas las escuelas</option>{escuelas.map(escuela=><option key={escuela} value={escuela}>{escuela}</option>)}</select></label>
        <section className="grupo-seccion">
          <h2>📚 Mis Materias</h2>
          {materias.length === 0 && <p className="empty-msg">No has agregado ninguna materia regular.</p>}
          <div className="grupo-grid">
            {materias.map(renderCard)}
          </div>
        </section>

        <section className="grupo-seccion">
          <h2>🤝 Mi Grupo Asesorado (Tutoría)</h2>
          {asesorados.length === 0 && <p className="empty-msg">No tienes un grupo de tutoría asignado.</p>}
          <div className="grupo-grid">
            {asesorados.map(renderCard)}
          </div>
        </section>

        <section className="grupo-seccion">
          <h2>🛠️ Mis Talleres / Clubes</h2>
          {talleres.length === 0 && <p className="empty-msg">No impartes ningún taller o club.</p>}
          <div className="grupo-grid">
            {talleres.map(renderCard)}
          </div>
        </section>
      </main>

      {mostrarModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{grupoEditar ? `Editar ${grupoEditar.grado}º${grupoEditar.seccion}` : 'Crear Nuevo Grupo'}</h3>
            <form onSubmit={handleCrearGrupo}>
              <div className="form-group">
                <label>Tipo de Grupo:</label>
                <select value={nuevoGrupo.tipo} onChange={(e) => setNuevoGrupo({...nuevoGrupo, tipo: e.target.value})}>
                  <option value="Materia Regular">Materia Regular</option>
                  <option value="Grupo Asesorado">Grupo Asesorado (Tutoría)</option>
                  <option value="Taller">Taller / Club</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Grado:</label>
                  <select value={nuevoGrupo.grado} onChange={(e) => setNuevoGrupo({...nuevoGrupo, grado: parseInt(e.target.value)})}>
                    <option value={1}>1º Secundaria</option>
                    <option value={2}>2º Secundaria</option>
                    <option value={3}>3º Secundaria</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sección / Letra:</label>
                  <input type="text" maxLength="3" autoComplete="off" aria-label="Seccion o letra del grupo" value={nuevoGrupo.seccion} onChange={(e) => setNuevoGrupo({...nuevoGrupo, seccion: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})} required />
                </div>
              </div>

              <div className="form-group">
                <label>Escuela:</label>
                <input type="text" maxLength="120" value={nuevoGrupo.escuela || ''} list="escuelas-conocidas" placeholder="Nombre de la escuela" onChange={e=>setNuevoGrupo({...nuevoGrupo,escuela:e.target.value})} />
                <datalist id="escuelas-conocidas">{escuelas.map(escuela=><option key={escuela} value={escuela}/>)}</datalist>
              </div>
              <div className="form-group">
                <label>Asignatura:</label>
                <select value={nuevoGrupo.disciplina_id} onChange={(e) => setNuevoGrupo({...nuevoGrupo, disciplina_id: e.target.value})} required>
                  <option value="">-- Selecciona una disciplina --</option>
                  {disciplinas.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => {setMostrarModal(false);setGrupoEditar(null);}}>Cancelar</button>
                <button type="submit" className="btn-save">{grupoEditar ? 'Guardar Cambios' : 'Guardar Grupo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
