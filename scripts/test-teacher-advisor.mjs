import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const { requestsFullForm, buildAdvisorContext, formTemplate, handleTeacherRequest } = await import(new URL('../src/services/teacherAdvisor.js', import.meta.url));
const fields = [{key:'proposito',label:'Propósito'}, {key:'actividad_desarrollo',label:'Actividad de desarrollo'}];
function fixture(project = false) {
 let ctx = {vista:project ? 'PROYECTOS' : 'PLANNER',modoEdicionProy:true,grupoActual:{id:5,grado:3},grado:3,semanaPlan:4,configCiclo:{fechaInicioStr:'2026-08-31'},planData:{lunes_inicio:'Original',apartados:{observaciones:'Conservar'}},proyectoActual:{id:7,nombre:'Agua',metodologia:'ABP',pdas_seleccionados:[12],fases_contenido:'{"0":"Original"}'},pdasDisponibles:[{id:12,descripcion:'PDA seleccionado'},{id:13,descripcion:'No enviar'}],pdasSemana:[],metodologias:{ABP:{fases:['Presentemos','Recolectemos','Problema','Experiencia','Resultados']}},apartadosAsistente:{planeacion:fields,proyecto:fields}};
 let applied = 0;
 ctx.setPlanData = fn => {ctx.planData=fn(ctx.planData);applied++;};
 ctx.setProyectoActual = fn => {ctx.proyectoActual=fn(ctx.proyectoActual);applied++;};
 const template = formTemplate(buildAdvisorContext(ctx,'primaria', project?'proyecto':'planeacion'));
 const fill = value => Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='object'?fill(v):'Propuesta específica desarrollada para el aula.']));
 return {ctx, data:fill(template), applied:()=>applied, run: (generate, text='llena todos los apartados del plano didactico y todas las actividades estructuradas')=>handleTeacherRequest({text,context:ctx,level:'primaria',getContext:()=>ctx,generate})};
}
test('Reconoce la frase de la captura, tildes y solicitudes naturales; distingue consultas y campos puntuales',()=>{
 for(const text of ['llena todos los apartados del plano didactico y todas las actividades estructuradas','completa la planeación','redacta el proyecto abierto','haz todas las actividades']) assert.equal(requestsFullForm(text),true,text);
 for(const text of ['¿Cómo lleno la planeación?','No llenes el proyecto','explica el propósito','completa el propósito','redacta una pregunta detonadora']) assert.equal(requestsFullForm(text),false,text);
});
test('Llenado semanal aplica 15 momentos, recursos, evaluación, adecuaciones y apartados',async()=>{
 const f=fixture(); const result=await f.run(async()=>({accion:'aplicar',datos:f.data}));
 assert.equal(f.applied(),1); assert.ok(result.includes('todos los apartados')); assert.ok(f.ctx.planData.viernes_cierre); assert.equal(f.ctx.planData.apartados.observaciones,'Conservar');
});
test('Proyecto conserva identidad y PDA y completa exactamente las fases visibles',async()=>{
 const f=fixture(true); let prompt;
 await f.run(async args=>{prompt=JSON.parse(args.userPrompt);return {accion:'aplicar',datos:f.data};});
 assert.equal(f.ctx.proyectoActual.id,7);assert.deepEqual(f.ctx.proyectoActual.pdas_seleccionados,[12]);assert.equal(Object.keys(f.ctx.proyectoActual.fases_contenido).length,5);assert.equal(prompt.contexto.pdas.length,1);
});
test('Repara una respuesta parcial antes de escribir y rechaza dos respuestas incompletas',async()=>{
 const f=fixture();let calls=0;
 await f.run(async()=>({accion:'aplicar',datos:++calls===1?{lunes_inicio:'Parcial'}:f.data}));assert.equal(calls,2);assert.equal(f.applied(),1);
 const g=fixture();await g.run(async()=>({accion:'aplicar',datos:{lunes_inicio:'Parcial'}}));assert.equal(g.applied(),0);
});
test('No sobrescribe al cambiar semana, grupo, texto o selección de PDA durante la generación',async()=>{
 for(const change of [f=>f.ctx.semanaPlan++,f=>f.ctx.grupoActual={id:9},f=>f.ctx.planData.lunes_inicio='Edición manual',f=>f.ctx.pdasSemana=[{pda:'Nuevo'}]]){
 const f=fixture(); const result=await f.run(async()=>{change(f);return {accion:'aplicar',datos:f.data};}); assert.equal(f.applied(),0);assert.ok(result.includes('cambió'));
 }
});
test('Consulta y falta de tema asesoran sin editar',async()=>{
 const f=fixture();assert.equal(await f.run(async()=>({accion:'asesorar',respuesta:'¿Qué tema deseas trabajar?'})),'¿Qué tema deseas trabajar?');assert.equal(f.applied(),0);
});
test('La edición puntual conserva el resto y descarta campos de identidad enviados por el modelo',async()=>{
 const f=fixture();await f.run(async()=>({accion:'aplicar',datos:{id:999,grupo_id:900,apartados:{proposito:'Propósito mejorado'}}}),'mejora el propósito');
 assert.equal(f.ctx.planData.lunes_inicio,'Original');assert.equal(f.ctx.planData.apartados.proposito,'Propósito mejorado');assert.equal(f.ctx.planData.id,undefined);
});
test('Fallo de red no aplica plantillas ni afirma éxito',async()=>{
 const f=fixture();const result=await f.run(async()=>{throw Error('HTTP 503');});assert.equal(f.applied(),0);assert.ok(result.includes('No pude'));
});
test('Exige grupo y proyecto abierto antes de generar',async()=>{
 const f=fixture();f.ctx.grupoActual=null;let calls=0;await f.run(async()=>{calls++;});assert.equal(calls,0);
 const g=fixture(true);g.ctx.modoEdicionProy=false;await g.run(async()=>{calls++;});assert.equal(calls,0);
});
