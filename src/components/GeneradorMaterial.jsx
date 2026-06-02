import React, { useState } from 'react';

// =====================================================================
// ⚠️ ATENCIÓN: LA LLAVE SE LEE DESDE EL ARCHIVO OCULTO .env O CLIPPY
// =====================================================================
const MI_OPENAI_API_KEY = "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";

const GeneradorMaterial = ({ onVolver, pdasDisponibles = [], grado }) => {
  const [tema, setTema] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('EXAMEN_OPCION_MULTIPLE');
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState(null);

  // Filtrar PDAs del grado actual (aproximado)
  const pdasSugeridos = pdasDisponibles.slice(0, 10); // Solo mostramos algunos por simplicidad

  const generarConIA = async () => {
    if (!tema.trim()) {
      alert("Por favor, ingresa un tema o selecciona un PDA.");
      return;
    }
    
    setGenerando(true);
    setResultado(null);

    let systemPrompt = "Eres un asistente experto en creación de material didáctico para la Nueva Escuela Mexicana.";
    let userPrompt = "";

    if (tipoMaterial === 'EXAMEN_OPCION_MULTIPLE') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"preguntas\": [ { \"pregunta\": \"...\", \"opciones\": [\"A) ...\", \"B) ...\", \"C) ...\"], \"respuesta_correcta\": 0 } ] }";
      userPrompt = `Genera un examen de opción múltiple de 5 preguntas sobre el tema: "${tema}". Adecuado para ${grado}º grado de primaria.`;
    } else if (tipoMaterial === 'PREGUNTAS_ABIERTAS') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"preguntas\": [ \"pregunta 1\", \"pregunta 2\" ] }";
      userPrompt = `Genera un cuestionario de 5 preguntas abiertas de análisis y reflexión sobre el tema: "${tema}". Adecuado para ${grado}º grado de primaria.`;
    } else if (tipoMaterial === 'SOPA_LETRAS_VOCABULARIO') {
      systemPrompt += " Devuelve ÚNICAMENTE un JSON con este formato: { \"titulo\": \"...\", \"palabras\": [ { \"palabra\": \"...\", \"pista\": \"...\" } ] }";
      userPrompt = `Genera una lista de 10 palabras clave y sus definiciones o pistas para armar una sopa de letras o crucigrama sobre el tema: "${tema}". Adecuado para ${grado}º grado de primaria. La palabra debe estar en mayúsculas y sin espacios.`;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Intentar parsear el JSON
      const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonStr);
      setResultado({ tipo: tipoMaterial, data: parsed });

    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar el material. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  };

  const imprimirMaterial = () => {
    window.print();
  };

  return (
    <div className="pantalla-dosificador" style={{ padding: '20px', overflowY: 'auto' }}>
      <div className="header-dosificador" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>🧩 Generador de Material Didáctico IA</h2>
        <button className="btn-volver" onClick={onVolver} style={{ background: '#e67e22' }}>
          ↩ Volver al Menú
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', '@media print': { display: 'none' } }} className="no-print">
        {/* Panel Izquierdo: Configuración */}
        <div style={{ flex: '1', background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3>1. Elige el Tema</h3>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Escribe el tema libremente o pega un PDA:</p>
          <textarea 
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ejemplo: La Revolución Mexicana, El Ciclo del Agua, Fracciones..."
            style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px' }}
          />

          <h3>2. Tipo de Material</h3>
          <select 
            value={tipoMaterial} 
            onChange={(e) => setTipoMaterial(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '20px', fontSize: '1rem' }}
          >
            <option value="EXAMEN_OPCION_MULTIPLE">📝 Examen de Opción Múltiple</option>
            <option value="PREGUNTAS_ABIERTAS">❓ Cuestionario (Preguntas Abiertas)</option>
            <option value="SOPA_LETRAS_VOCABULARIO">🔠 Vocabulario (Sopa de Letras / Crucigrama)</option>
          </select>

          <button 
            onClick={generarConIA} 
            disabled={generando}
            style={{ 
              width: '100%', padding: '15px', background: generando ? '#95a5a6' : '#6C5CE7', 
              color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', cursor: generando ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {generando ? '🤖 Generando magia...' : '✨ Generar Material'}
          </button>
        </div>

        {/* Panel Derecho: Sugerencias */}
        <div style={{ flex: '1', background: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px dashed #ccc' }}>
          <h3>💡 Inspiración (Tus PDAs)</h3>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>Haz clic en un PDA para usarlo como tema:</p>
          <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pdasSugeridos.length > 0 ? pdasSugeridos.map((pda, i) => (
              <div 
                key={i} 
                onClick={() => setTema(pda.descripcion)}
                style={{ padding: '10px', background: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', border: '1px solid #eee' }}
              >
                {pda.descripcion}
              </div>
            )) : (
              <p>No hay PDAs cargados. Escribe el tema manualmente.</p>
            )}
          </div>
        </div>
      </div>

      {/* Área de Visualización del Resultado */}
      {resultado && (
        <div style={{ marginTop: '30px', background: 'white', padding: '40px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} className="print-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="no-print">
            <h3 style={{ color: '#2ecc71' }}>✅ Material Listo</h3>
            <button onClick={imprimirMaterial} style={{ padding: '10px 20px', background: '#34495e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>🖨️ Imprimir / Guardar PDF</button>
          </div>
          
          <hr style={{ margin: '20px 0' }} className="no-print" />

          {/* Renderizado de Examen Opción Múltiple */}
          {resultado.tipo === 'EXAMEN_OPCION_MULTIPLE' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              {resultado.data.preguntas.map((q, i) => (
                <div key={i} style={{ marginBottom: '25px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>{i + 1}. {q.pregunta}</p>
                  <div style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.opciones.map((op, j) => (
                      <label key={j} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '15px', height: '15px', border: '1px solid #000', borderRadius: '50%' }}></div>
                        {op}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Renderizado de Preguntas Abiertas */}
          {resultado.tipo === 'PREGUNTAS_ABIERTAS' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{resultado.data.titulo}</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
                  <span>Nombre del alumno: _________________________________________</span>
                  <span>Fecha: ______________</span>
                </div>
              </div>
              
              {resultado.data.preguntas.map((q, i) => (
                <div key={i} style={{ marginBottom: '40px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px' }}>{i + 1}. {q}</p>
                  <div style={{ borderBottom: '1px dashed #ccc', height: '30px' }}></div>
                  <div style={{ borderBottom: '1px dashed #ccc', height: '30px' }}></div>
                  <div style={{ borderBottom: '1px dashed #ccc', height: '30px' }}></div>
                </div>
              ))}
            </div>
          )}

          {/* Renderizado de Vocabulario */}
          {resultado.tipo === 'SOPA_LETRAS_VOCABULARIO' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '1.5rem', textTransform: 'uppercase' }}>{resultado.data.titulo}</h1>
                <p>Lista de palabras y pistas para armar tus juegos didácticos.</p>
              </div>
              
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f2f2f2' }}>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Palabra</th>
                    <th style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'left' }}>Pista / Definición</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.data.palabras.map((p, i) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #ddd', padding: '12px', fontWeight: 'bold', letterSpacing: '2px' }}>{p.palabra}</td>
                      <td style={{ border: '1px solid #ddd', padding: '12px' }}>{p.pista}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GeneradorMaterial;
