import React, { useState } from 'react';

const GUIA_INICIAL = [
  ['Prepara el grupo', 'Abre Mi grupo y crea o selecciona el grupo que atenderás. Elige grado, grupo y asignatura antes de capturar información.'],
  ['Configura el ciclo escolar', 'En Ajustes del ciclo define el ciclo, la fecha de inicio y los datos de escuela y docente. Guarda los cambios.'],
  ['Define trimestres y fechas', 'Revisa los tres periodos y ajusta el nombre, la fecha inicial y final de cada trimestre según el calendario de tu escuela.'],
  ['Agrega a tus alumnos', 'En Mi grupo registra la lista del grupo. Puedes capturar alumnos o usar la importación disponible. Verifica que cada estudiante esté en el grupo correcto.'],
  ['Completa sus datos', 'Abre Alumnos para agregar o corregir los datos de cada estudiante y consultar su perfil. Captura solo la información necesaria para tu trabajo escolar.'],
  ['Organiza la evaluación', 'En Evaluación elige grupo, asignatura y fecha. Configura criterios y porcentajes antes de registrar calificaciones; confirma que sumen según tu forma de evaluar.'],
  ['Vincula códigos QR', 'En Exámenes crea la evaluación y genera sus hojas QR. En Control QR vincula cada código con grupo, evaluación y alumnos; prueba una lectura y confirma resultados.'],
  ['Empieza el trabajo diario', 'Registra asistencia y actividades, captura resultados en Evaluación y consulta el reporte trimestral. Planeación, Dosificador y Proyectos apoyan el trabajo del ciclo.'],
];

const GUIAS = {
  GRUPO: ['Selecciona grado, grupo y asignatura que vas a trabajar.', 'Agrega o importa la lista y verifica los nombres.', 'Abre la ficha de cada alumno para completar sus datos.', 'Usa el grupo activo en Evaluación, asistencia y reportes.'],
  ALUMNO: ['Busca al alumno dentro del grupo activo.', 'Abre su perfil y completa o corrige sus datos.', 'Consulta calificaciones y expediente desde las secciones disponibles.', 'Guarda cada cambio antes de salir.'],
  CONFIG: ['Escribe los datos de escuela y docente.', 'Define el ciclo y la fecha de inicio.', 'Revisa las fechas inicial y final de cada trimestre.', 'Guarda y confirma que corresponda al calendario escolar.'],
  EVAL: ['Elige grupo, asignatura y fecha de evaluación.', 'Configura criterios y porcentajes antes de capturar calificaciones.', 'Registra resultados y revisa fecha y alumno en cada fila.', 'Consulta promedios y pendientes antes de cerrar el periodo.'],
  CONTROL_QR: ['Selecciona el grupo y abre Control QR.', 'Vincula el código con alumno y evaluación correspondiente.', 'Escanea y confirma que nombre y fecha sean correctos.', 'Revisa lecturas pendientes y corrige cualquier asignación antes de guardar.'],
  EXAMSCAN: ['Crea el examen, sus preguntas y respuestas correctas.', 'Genera e imprime las hojas QR.', 'Asigna cada hoja al alumno y confirma su grupo.', 'Escanea las respuestas y revisa las marcas dudosas antes de guardar.'],
  TRIMESTRAL: ['Elige grupo y trimestre.', 'Comprueba que las fechas del periodo estén configuradas.', 'Revisa resultados y alumnos con información pendiente.', 'Exporta el reporte cuando los datos estén completos.'],
  CTE: ['Abre o crea la sesión de CTE.', 'Agrega acuerdos, responsables y fechas de seguimiento.', 'Adjunta evidencias o notas de avance.', 'Revisa pendientes antes de cerrar la sesión.'],
  LAN: ['Conecta ambos dispositivos a la misma red wifi.', 'Inicia el envío en el dispositivo que tiene los datos.', 'En el otro dispositivo elige recibir y sigue las instrucciones mostradas.', 'Confirma que terminó y revisa los grupos recibidos.'],
  ANALITICO: ['Selecciona grado y grupo.', 'Registra el diagnóstico y las necesidades del contexto.', 'Vincula contenidos y PDA pertinentes.', 'Guarda y revisa el programa antes de exportarlo.'],
  PLANNER: ['Selecciona semana, grupo y asignatura.', 'Distribuye actividades de inicio, desarrollo y cierre.', 'Agrega materiales, evaluación y adecuaciones.', 'Guarda y exporta la planeación.'],
  DOSIF: ['Selecciona grado y periodo.', 'Distribuye contenidos en las semanas disponibles.', 'Comprueba la secuencia y las fechas.', 'Guarda y exporta la dosificación si la necesitas.'],
  CALENDARIO: ['Navega al mes que quieres consultar.', 'Revisa fechas escolares y eventos.', 'Activa la configuración para agregar o ajustar un evento.', 'Guarda y confirma la fecha correcta.'],
  COMISIONES: ['Agrega descripción, tipo y fecha de la comisión.', 'Registra responsables y acuerdos.', 'Actualiza su avance cuando realices cada tarea.', 'Revisa la lista para dar seguimiento.'],
  PROYECTOS: ['Crea un proyecto e indica nombre, metodología y duración.', 'Vincula los PDA relacionados.', 'Completa actividades y fases con materiales y evidencias.', 'Guarda el proyecto para consultarlo después.'],
  BITACORA: ['Selecciona al alumno relacionado.', 'Agrega la observación con fecha y detalles claros.', 'Guarda y consulta el historial.', 'Actualiza el seguimiento cuando haya nuevos acuerdos o avances.'],
  MATERIALES: ['Elige el material o recurso que necesitas.', 'Selecciona grado y tema.', 'Revisa las actividades generadas antes de utilizarlas.', 'Guarda o imprime desde las opciones disponibles.'],
};

const TITULOS = {GRUPO:'Mi grupo', ALUMNO:'Alumnos', CONFIG:'Ajustes del ciclo', EVAL:'Evaluación', CONTROL_QR:'Control QR', EXAMSCAN:'Exámenes QR', TRIMESTRAL:'Reporte trimestral', CTE:'Consejo Técnico Escolar', LAN:'Conectar dispositivos', ANALITICO:'Programa analítico', PLANNER:'Planeación', DOSIF:'Dosificador', CALENDARIO:'Calendario', COMISIONES:'Comisiones', PROYECTOS:'Proyectos', BITACORA:'Bitácora', MATERIALES:'Materiales'};

export default function TutorialDocente({ vista, inicial = false, open = false, onOpen, onClose }) {
  const [paso, setPaso] = useState(0); const [mostrar, setMostrar] = useState(false);
  const activo = open || mostrar; const titulo = inicial ? 'Primeros pasos en ELARA' : (TITULOS[vista] || 'Esta sección');
  const pasos = inicial ? GUIA_INICIAL.map(([title, text]) => `${title}: ${text}`) : (GUIAS[vista] || ['Revisa grupo, periodo o fecha seleccionados.', 'Completa la información y revísala antes de guardar.', 'Consulta las opciones de seguimiento o exportación disponibles.']);
  const abrir = () => { setPaso(0); setMostrar(true); onOpen?.(); }; const cerrar = () => { setMostrar(false); onClose?.(); };
  return <>
    {!inicial && !open && <button type="button" onClick={abrir} aria-label={`Abrir tutorial de ${titulo}`} style={boton}>📘 Tutorial paso a paso</button>}
    {activo && <div role="presentation" onMouseDown={e => { if(e.target === e.currentTarget) cerrar(); }} style={fondo}><section role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo" style={dialogo}>
      <div style={{display:'flex', justifyContent:'space-between', gap:12}}><div><p style={{margin:'0 0 6px', color:'#3b5b9a', fontWeight:700}}>GUÍA PARA DOCENTES</p><h2 id="tutorial-titulo" style={{margin:'0 0 16px'}}>{titulo}</h2></div><button type="button" onClick={cerrar} aria-label="Cerrar tutorial" style={cerrarBtn}>✕</button></div>
      <p aria-live="polite" style={{fontSize:'1.05rem', lineHeight:1.65, minHeight:100}}><strong>{paso+1}. </strong>{pasos[paso]}</p><p style={{color:'#536174', fontSize:14}}>Paso {paso+1} de {pasos.length}</p>
      <div style={{display:'flex', justifyContent:'space-between', gap:10}}><button type="button" onClick={() => setPaso(Math.max(0,paso-1))} disabled={paso===0} style={secundario}>Anterior</button>{paso<pasos.length-1 ? <button type="button" onClick={() => setPaso(paso+1)} style={primario}>Siguiente</button> : <button type="button" onClick={cerrar} style={primario}>Terminar</button>}</div>
    </section></div>}
  </>;
}

const boton={position:'fixed', right:18, bottom:18, zIndex:9000, padding:'12px 16px', border:0, borderRadius:24, color:'#fff', background:'#244b85', boxShadow:'0 4px 14px #0003', fontWeight:700, cursor:'pointer'};
const fondo={position:'fixed', inset:0, zIndex:10000, display:'grid', placeItems:'center', padding:16, background:'rgba(12,24,44,.62)'};
const dialogo={width:'min(560px, 100%)', maxHeight:'90dvh', overflowY:'auto', padding:24, borderRadius:18, background:'#fff', color:'#182235', boxShadow:'0 20px 70px #0005', fontFamily:'system-ui,sans-serif'};
const cerrarBtn={border:0, background:'transparent', padding:8, fontSize:20, cursor:'pointer'};
const primario={border:0, borderRadius:10, padding:'11px 18px', color:'#fff', background:'#244b85', fontWeight:700, cursor:'pointer'};
const secundario={...primario, color:'#26344a', background:'#e8edf5'};
