const {test}=require('node:test');const assert=require('node:assert/strict');
const {generateTeacherResponse}=require('../electron/teacherAi.cjs');
test('La saturación usa un modelo alternativo y solicita JSON',async()=>{
 let count=0;
 const result=await generateTeacherResponse({key:'test',groqKey:'test-groq',model:'modelo-principal',prompt:'prueba',systemPrompt:'asesor',fetchImpl:async(url,options)=>{
  if (++count===1) { assert.match(url,/generativelanguage/); return {ok:false,status:503}; }
  assert.match(url,/api.groq.com/);
  const request=JSON.parse(options.body);
  assert.equal(request.response_format.type,'json_object');
  return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'{"accion":"asesorar"}'}}]})};
 }});
 assert.equal(count,2);assert.equal(result.success,true);assert.equal(result.provider,'groq');assert.equal(result.text,'{"accion":"asesorar"}');
});
test('Errores de autorización y truncamiento no se presentan como éxito',async()=>{
 for(const response of [{ok:false,status:403},{ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"incompleto"'}]}}]})}]){
 const result=await generateTeacherResponse({key:'test',model:'test',prompt:'test',systemPrompt:'test',fetchImpl:async()=>response});assert.equal(result.success,false);
 }
});
