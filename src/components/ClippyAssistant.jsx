import React, { useState, useEffect, useRef } from 'react';
import './ClippyAssistant.css';
import { getLocalResponse, getRandomTip } from './assistantRules';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

// =====================================================================
// ⚠️ ATENCIÓN: PEGA TU API KEY DE OPENAI AQUÍ ADENTRO DE LAS COMILLAS
// =====================================================================
const MI_OPENAI_API_KEY = window.openaiApiKey || ""; 

const ChatInput = React.memo(React.forwardRef(({ onSend, isTyping }, ref) => {
  const [value, setValue] = useState('');
  
  React.useImperativeHandle(ref, () => ({
    appendValue: (text) => {
      setValue(prev => (prev ? prev + ' ' : '') + text);
    },
    focus: () => {
      inputElRef.current?.focus();
    }
  }));

  const inputElRef = React.useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value);
    setValue('');
  };

  return (
    <form className="clippy-input-area" onSubmit={handleSubmit}>
      <input 
        ref={inputElRef}
        type="text" 
        placeholder="Escribe una directriz a ELARA..." 
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={isTyping}
      />
      <button type="submit" disabled={isTyping || !value.trim()}>➤</button>
    </form>
  );
}));

const ClippyAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('elara_muted') === 'true');
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('elara_muted', String(newMuted));
  };
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Soy ELARA, tu motor cognitivo. Sincronizo tu salud (pasos diarios), controlo tus alarmas de celular en segundo plano y asisto tu planificación escolar. ¿Qué directriz deseas ejecutar hoy?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [tooltip, setTooltip] = useState('');
  
  const messagesEndRef = useRef(null);
  
  // Dragging logic
  const [pos, setPos] = useState({ x: window.innerWidth - 385, y: window.innerHeight - 585 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const wasDragged = useRef(false);
  const currentAudioRef = useRef(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const wsRef = useRef(null);
  
  useEffect(() => {
    const sessionId = 'planner-' + Math.random().toString(36).substring(7);
    let isConnected = false;
    let ws = null;

    const connectWS = async () => {
      let token = 'ELARA-personal-key-2026';
      if (ipcRenderer) {
        try {
          const proof = await ipcRenderer.invoke('get-license-proof');
          if (proof && proof.licenseKey) {
            token = proof.licenseKey;
          }
        } catch (e) {
          console.error("Error fetching license proof for WS:", e);
        }
      }

      const wsUrl = `ws://34.50.189.82:8000/api/v1/chat/ws/${sessionId}?token=${token}&device=PLANNER`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Conectado a ELARA WebSocket');
        setTooltip('Conectado al servidor ELARA');
        isConnected = true;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'stream_chunk' && data.content) {
            setIsTyping(false);
            setMessages(prev => {
              const newMsgs = [...prev];
              // If the last message is from bot, append to it
              if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].sender === 'bot') {
                 newMsgs[newMsgs.length - 1].text += data.content;
              } else {
                 newMsgs.push({ sender: 'bot', text: data.content });
              }
              return newMsgs;
            });
          } else if (data.type === 'action' && data.action === 'canvas_render') {
            setIsTyping(false);
            setMessages(prev => [...prev, { sender: 'bot', text: data.payload?.content || '' }]);
          }
        } catch (e) {
          console.error("Error WS:", e);
        }
      };

      ws.onclose = () => {
        isConnected = false;
        setTimeout(connectWS, 3000);
      };
      
      ws.onerror = (err) => {
        ws.close();
      };
    };
    
    connectWS();
    
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Autofocus input when chat box is opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Posición inicial segura en la esquina inferior derecha
  useEffect(() => {
    setPos({ x: window.innerWidth - 385, y: window.innerHeight - 585 });
    
    const handleGlobalPointerMove = (e) => {
      if (!isDragging.current) return;
      wasDragged.current = true;
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;
      
      // Boundaries (para contenedor de 350x550px)
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > window.innerWidth - 350) newX = window.innerWidth - 350;
      if (newY > window.innerHeight - 550) newY = window.innerHeight - 550;
      
      setPos({ x: newX, y: newY });
    };

    const handleGlobalPointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, []);

  // Random tooltips de ELARA
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setTooltip(getRandomTip());
        setTimeout(() => setTooltip(''), 5000);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const toggleMic = async () => {
    const hasOpenAI = MI_OPENAI_API_KEY && MI_OPENAI_API_KEY.length > 2;

    if (hasOpenAI) {
      if (isListening) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        setIsListening(false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioChunksRef.current = [];
          
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            stream.getTracks().forEach(track => track.stop());

            setIsTyping(true);
            try {
              const formData = new FormData();
              formData.append('file', audioBlob, 'speech.webm');
              formData.append('model', 'whisper-1');
              formData.append('language', 'es');

              const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
                },
                body: formData
              });

              if (!response.ok) throw new Error(`Whisper Error: ${response.status}`);
              const data = await response.json();
              if (data.text) {
                inputRef.current?.appendValue(data.text.trim());
              }
            } catch (err) {
              console.error("Error transcribiendo audio con Whisper:", err);
            } finally {
              setIsTyping(false);
            }
          };

          mediaRecorder.start();
          setIsListening(true);
        } catch (err) {
          console.error("Error al acceder al micrófono:", err);
          alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
        }
      }
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
        return;
      }

      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      } else {
        const rec = new SpeechRecognition();
        rec.lang = 'es-MX';
        rec.continuous = false;
        rec.interimResults = false;

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event) => {
          const text = event.results[0][0].transcript;
          inputRef.current?.appendValue(text);
        };

        rec.onerror = (e) => {
          console.error("Error de reconocimiento de voz:", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
        rec.start();
      }
    }
  };

  // Text-To-Speech (TTS)
  const speakText = async (text) => {
    if (isMuted) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    // Limpiar texto de caracteres especiales para lectura fluida
    const cleanText = text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "")
                          .replace(/\[.*?\]/g, "")
                          .replace(/[#*`_~➤]/g, "")
                          .trim();

    if (!cleanText) return;

    // 1. Intentar usar la API oficial de TTS de OpenAI (Voz Nova de alta calidad)
    if (window.openaiApiKey || MI_OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.openaiApiKey || MI_OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: cleanText,
            voice: 'nova'
          })
        });
        if (response.ok) {
          const blob = await response.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          await audio.play();
          return;
        }
      } catch (err) {
        console.error("Error con OpenAI TTS, intentando local:", err);
      }
    }

    // 2. Fallback: usar la síntesis local edge-tts
    if (ipcRenderer) {
      try {
        const audioUrl = await ipcRenderer.invoke('elara-speak', cleanText);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        await audio.play();
        return;
      } catch (err) {
        console.error("Error al reproducir voz nativa de ELARA (edge-tts):", err);
      }
    }

    // 3. Fallback final: utilizar síntesis nativa del navegador si falla o no está en Electron
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-MX';
      const voices = window.speechSynthesis.getVoices();
      
      const esVoices = voices.filter(v => {
        const lang = v.lang.toLowerCase();
        return lang.includes('es-mx') || lang.includes('es-es') || lang.includes('es-us') || lang.startsWith('es');
      });
      
      let esVoice = esVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('sabina') || 
               name.includes('helena') || 
               name.includes('dalia') || 
               name.includes('maria') || 
               name.includes('google') || 
               name.includes('female');
      });
      
      if (!esVoice) {
        esVoice = esVoices.find(v => {
          const name = v.name.toLowerCase();
          return !name.includes('david') && !name.includes('raul') && !name.includes('pablo') && !name.includes('male');
        });
      }
      
      if (!esVoice && esVoices.length > 0) {
        esVoice = esVoices[0];
      }
      
      if (esVoice) utterance.voice = esVoice;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'bot') {
        speakText(lastMsg.text);
      }
    }
  }, [messages]);

  const handleSend = async (userText) => {
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const lowerMsg = userText.toLowerCase();
      let actedLocally = false;
      let botResponse = "";

      // Fail-safe parser local para creación de grupos/talleres
      if (lowerMsg.includes('crea') && (lowerMsg.includes('grupo') || lowerMsg.includes('materia') || lowerMsg.includes('taller') || lowerMsg.includes('clase') || lowerMsg.includes('asignatura'))) {
        let gradoLocal = 1;
        if (lowerMsg.includes('1') || lowerMsg.includes('primero')) gradoLocal = 1;
        else if (lowerMsg.includes('2') || lowerMsg.includes('segundo')) gradoLocal = 2;
        else if (lowerMsg.includes('3') || lowerMsg.includes('tercero')) gradoLocal = 3;
        else if (lowerMsg.includes('4') || lowerMsg.includes('cuarto')) gradoLocal = 4;
        else if (lowerMsg.includes('5') || lowerMsg.includes('quinto')) gradoLocal = 5;
        else if (lowerMsg.includes('6') || lowerMsg.includes('sexto')) gradoLocal = 6;
        
        let seccionLocal = 'A';
        const secMatch = lowerMsg.match(/(?:grupo|sección|seccion)\s*([a-f])/i) || lowerMsg.match(/\b([a-f])\b/i);
        if (secMatch) seccionLocal = secMatch[1].toUpperCase();
        
        let materiaNombre = 'Lenguajes';
        if (lowerMsg.includes('español') || lowerMsg.includes('lengua') || lowerMsg.includes('lenguajes')) materiaNombre = 'Lenguajes';
        else if (lowerMsg.includes('mate') || lowerMsg.includes('saberes') || lowerMsg.includes('ciencia')) materiaNombre = 'Saberes';
        else if (lowerMsg.includes('historia') || lowerMsg.includes('ética') || lowerMsg.includes('etica') || lowerMsg.includes('sociedad') || lowerMsg.includes('geografía') || lowerMsg.includes('geografia')) materiaNombre = 'Ética';
        else if (lowerMsg.includes('tutor') || lowerMsg.includes('asesor')) materiaNombre = 'Tutoría';
        
        if (ipcRenderer) {
          try {
            const disciplinasList = await ipcRenderer.invoke('get-disciplinas');
            let matchedD = disciplinasList.find(d => d.nombre.toLowerCase().includes(materiaNombre.toLowerCase()));
            const finalId = matchedD ? matchedD.id : 1;
            
            await ipcRenderer.invoke('add-grupo', {
              grado: gradoLocal,
              seccion: seccionLocal,
              disciplina_id: finalId,
              tipo: lowerMsg.includes('taller') ? 'Taller' : (lowerMsg.includes('asesor') ? 'Grupo Asesorado' : 'Materia Regular'),
              ciclo_escolar: '2025-2026'
            });
            
            botResponse = `¡Entendido! He creado localmente en SQLite el grupo de ${gradoLocal}º${seccionLocal} con la asignatura de ${matchedD?.nombre || 'Lenguajes'}.`;
            actedLocally = true;
            
            if (window.plannerContext && window.plannerContext.setVista) {
              const current = window.plannerContext.vista;
              window.plannerContext.setVista('MENU');
              setTimeout(() => {
                window.plannerContext.setVista(current);
              }, 100);
            }
          } catch (err) {
            console.error("Error en creador de grupo local:", err);
          }
        }
      }

      // Fail-safe parser local para criterios de evaluación / rúbricas
      if (!actedLocally && (lowerMsg.includes('criterio') || lowerMsg.includes('evalua') || lowerMsg.includes('%') || lowerMsg.includes('porcentaj'))) {
        const regex = /([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)*)\s*(?:el|de|del)?\s*(\d+)\s*%/gi;
        let match;
        const criteriosLocales = [];
        let sumaPorcentaje = 0;
        
        while ((match = regex.exec(userText)) !== null) {
          let nombre = match[1].trim();
          nombre = nombre.replace(/\s+(?:el|del|de|y|al|la|los|las)$/i, '').trim();
          nombre = nombre.replace(/^[y\s,]+/, '').trim();
          const nombreCap = nombre.charAt(0).toUpperCase() + nombre.slice(1);
          const porcentaje = parseFloat(match[2]);
          if (nombreCap && !isNaN(porcentaje)) {
            criteriosLocales.push({ nombre: nombreCap, porcentaje });
            sumaPorcentaje += porcentaje;
          }
        }
        
        if (criteriosLocales.length > 0) {
          const ctx = window.plannerContext;
          if (ctx) {
            let activeGrupo = ctx.grupoActual;
            
            if (!activeGrupo && ipcRenderer) {
              try {
                const grupos = await ipcRenderer.invoke('get-grupos');
                const matchGrupo = lowerMsg.match(/([123])\s*[º°]?[o°]?\s*([a-f])/i);
                if (matchGrupo) {
                  const grad = parseInt(matchGrupo[1]);
                  const sec = matchGrupo[2].toUpperCase();
                  const found = grupos.find(g => g.grado === grad && g.seccion === sec);
                  if (found) {
                    const disciplinas = await ipcRenderer.invoke('get-disciplinas');
                    const discName = disciplinas.find(d => d.id === found.disciplina_id)?.nombre || 'Desconocida';
                    const fullGrupo = { ...found, nombre_disciplina: discName };
                    
                    ctx.setGrupoActual(fullGrupo);
                    ctx.setGrado(fullGrupo.grado);
                    localStorage.setItem('grado', fullGrupo.grado);
                    activeGrupo = fullGrupo;
                    if (ctx.showToast) {
                      ctx.showToast(`👥 Grupo ${fullGrupo.grado}º${fullGrupo.seccion} seleccionado automáticamente.`);
                    }
                  }
                }
              } catch (err) {}
            }
            
            if (!activeGrupo) {
              botResponse = "Por favor, selecciona primero un grupo en la pantalla principal antes de asignar criterios, o dime para qué grupo (ej. '1ºA') quieres configurarlos.";
              actedLocally = true;
            } else if (ctx.setCriterios) {
              const criteriosConId = criteriosLocales.map((c, idx) => ({
                ...c,
                frontId: `temp-${ctx.campoActual || 'LENGUAJES'}-${Date.now()}-${idx}`
              }));
              ctx.setCriterios(criteriosConId);
              
              if (ctx.guardarConfig) {
                ctx.guardarConfig(criteriosConId, activeGrupo.id);
              }
              
              botResponse = `¡Entendido! He configurado los criterios para el grupo de ${activeGrupo.grado}º${activeGrupo.seccion} (${activeGrupo.nombre_disciplina}): ${criteriosLocales.map(c => `${c.nombre} (${c.porcentaje}%)`).join(', ')}. Suma total: ${sumaPorcentaje}%.`;
              actedLocally = true;
            }
          }
        }
      }

      if (actedLocally) {
        setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
        setIsTyping(false);
        return;
      }

      // Si no actuó localmente, enviar a WebSocket de ELARA
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
         setMessages(prev => [...prev, { sender: 'bot', text: '' }]);
         
         wsRef.current.send(JSON.stringify({
             type: 'message',
             mode: 'normal',
             message: userText
         }));
      } else {
         await new Promise(r => setTimeout(r, 600));
         botResponse = getLocalResponse(userText);
         setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
         setIsTyping(false);
      }
    } catch (err) {
      console.error("Error en handleSend:", err);
      setMessages(prev => [...prev, { sender: 'bot', text: "Lo siento, ocurrió un error inesperado al procesar la directiva." }]);
      setIsTyping(false);
    }
  };

  const handlePointerDown = (e) => {
    isDragging.current = true;
    wasDragged.current = false;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  const handleAvatarClick = () => {
    if (!wasDragged.current) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="clippy-container" style={{ left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }}>
      {!isOpen && tooltip && (
        <div className="clippy-tooltip" style={{ right: '80px', bottom: '15px' }}>
          {tooltip}
        </div>
      )}

      <div className={`clippy-chat-box ${isOpen ? 'open' : 'hidden'}`} style={{ position: 'absolute', bottom: '80px', right: '0' }}>
        <div className="clippy-header">
          <span>🧬 Motor Cognitivo ELARA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button"
              onClick={toggleMute} 
              title={isMuted ? "Activar voz de ELARA" : "Silenciar voz de ELARA"}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button onClick={() => setIsOpen(false)}>✖</button>
          </div>
        </div>

        <div className="clippy-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`clippy-message ${msg.sender}`}>
              <div>{msg.text}</div>
              {msg.imageUrl && (
                <img 
                  src={msg.imageUrl} 
                  alt="Imagen generada" 
                  style={{ width: '100%', borderRadius: '12px', marginTop: '10px', display: 'block', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', cursor: 'pointer' }}
                  onClick={() => {
                    if (msg.imageUrl.startsWith("data:")) {
                      ipcRenderer.invoke("open-base64-image", msg.imageUrl);
                    } else {
                      window.open(msg.imageUrl);
                    }
                  }}
                />
              )}
            </div>
          ))}
          {isTyping && <div className="clippy-message bot">Inferencia en curso... 🧬</div>}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput ref={inputRef} onSend={handleSend} isTyping={isTyping} />
      </div>

      <div 
        className={`elara-chat-avatar ${!isOpen ? 'bouncing' : ''}`}
        onPointerDown={handlePointerDown}
        onClick={handleAvatarClick}
        title="Arrastrar o hacer clic para abrir a ELARA"
      >
        <div className="elara-orb-core">
          <span className="elara-orb-pulse-ring"></span>
          <span className="elara-orb-inner">🧬</span>
        </div>
      </div>
    </div>
  );
};

export default ClippyAssistant;
