import { generateCompletion } from '../services/aiService';
import { handleTeacherRequest } from '../services/teacherAdvisor';
import React, { useState, useEffect, useRef } from 'react';
import './ClippyAssistant.css';
import { EVENTO_PREFERENCIAS_ELARA, leerPreferenciasElara, guardarPreferenciasElara } from '../elaraPreferences';
import { getRandomTip } from './assistantRules';
import {
  buildChatTools,
  buildGeminiContents,
  buildGeminiTools,
  buildSystemPrompt,
  callGeminiGenerateContent
} from '../services/geminiChatService';

const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;


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
  const [preferencias, setPreferencias] = useState(leerPreferenciasElara);
  const ocultarElara = () => guardarPreferenciasElara({ ...preferencias, visible: false });
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('elara_muted') === 'true');
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('elara_muted', String(newMuted));
  };
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Soy ELARA, tu Asistente Pedagógica de la NEM. Estoy configurada de manera privada en tu equipo para asistirte en planeaciones, gestión de proyectos y evaluación formativa. ¿Qué deseas planificar hoy?' }
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

  useEffect(() => {
    const actualizar = () => setPreferencias(leerPreferenciasElara());
    window.addEventListener(EVENTO_PREFERENCIAS_ELARA, actualizar);
    window.addEventListener('storage', actualizar);
    return () => {
      window.removeEventListener(EVENTO_PREFERENCIAS_ELARA, actualizar);
      window.removeEventListener('storage', actualizar);
    };
  }, []);

  useEffect(() => {
    if (preferencias.visible) return;
    setIsOpen(false);
    setTooltip('');
    isDragging.current = false;
    currentAudioRef.current?.pause();
    recognitionRef.current?.abort();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsListening(false);
  }, [preferencias.visible]);

  // Los consejos se detienen al abrir el chat, ocultar ELARA o desactivarlos.
  useEffect(() => {
    setTooltip('');
    if (isOpen || !preferencias.visible || !preferencias.consejos) return;
    let timeout;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        setTooltip(getRandomTip());
        timeout = setTimeout(() => setTooltip(''), 5000);
      }
    }, 45000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [isOpen, preferencias.visible, preferencias.consejos]);

  const toggleMic = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX'; recognition.continuous = false; recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = event => inputRef.current?.appendValue(event.results[0][0].transcript);
    recognition.onerror = error => { console.error("Error de reconocimiento de voz:", error); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition; recognition.start();
  };

  // Text-To-Speech (TTS)
  const speakText = async (text) => {
    if (isMuted || !leerPreferenciasElara().visible) return;
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

    // Voz local del dispositivo.
    // 2. Fallback: usar la síntesis local edge-tts
    if (ipcRenderer) {
      try {
        const audioUrl = await ipcRenderer.invoke('elara-speak', cleanText);
        if (!leerPreferenciasElara().visible) return;
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
      if (!leerPreferenciasElara().visible) return;
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
    const history = [...messages];
    setMessages(previous => [...previous, { sender: 'user', text: userText }]);
    setIsTyping(true);
    try {
      const response = await handleTeacherRequest({
        text: userText, history, context: window.plannerContext, level: 'secundaria',
        generate: args => generateCompletion({ ...args, advisor: true }),
        getContext: () => window.plannerContext
      });
      setMessages(previous => [...previous, { sender: 'bot', text: response }]);
    } catch (error) {
      console.error('Error en el asesor docente:', error);
      setMessages(previous => [...previous, { sender: 'bot', text: 'No pude conectar con el asesor. Inténtalo de nuevo.' }]);
    } finally {
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
    e.target.setPointerCapture(e.pointerId);
  };

  const handleAvatarClick = () => {
    if (!wasDragged.current) {
      setIsOpen(!isOpen);
    }
  };

  if (!preferencias.visible) return null;

  return (
    <div className="clippy-container" style={{ left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }}>
      {!isOpen && preferencias.consejos && tooltip && (
        <div className="clippy-tooltip" style={{ right: '80px', bottom: '15px' }}>
          {tooltip}
        </div>
      )}

      <div className={`clippy-chat-box ${isOpen ? 'open' : 'hidden'}`} style={{ position: 'absolute', bottom: '80px', right: '0' }}>
        <div className="clippy-header">
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><img src="./cutout_avatar.png" alt="ELARA" style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover" }} /> Asistente ELARA</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              type="button"
              onClick={toggleMute} 
              title={isMuted ? "Activar voz de ELARA" : "Silenciar voz de ELARA"}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: 0 }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button type="button" onClick={ocultarElara} title="Ocultar icono y consejos de ELARA">Ocultar</button>
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
                  onClick={() => window.open(msg.imageUrl)}
                />
              )}
            </div>
          ))}
          {isTyping && <div className="clippy-message bot">Inferencia en curso... 🧬</div>}
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput ref={inputRef} onSend={handleSend} isTyping={isTyping} />
      </div>

      <button type="button" className="elara-hide-button" onClick={ocultarElara}
        title="Ocultar ELARA. Puedes volver a mostrarla en Ajustes Ciclo."
        aria-label="Ocultar icono y consejos de ELARA">×</button>
      <div 
        className={`elara-chat-avatar ${!isOpen ? 'bouncing' : ''}`}
        onPointerDown={handlePointerDown}
        onClick={handleAvatarClick}
        title="Arrastrar o hacer clic para abrir a ELARA"
      >
        <div className="elara-orb-core" style={{ overflow: "hidden", borderRadius: "50%" }}>
          <span className="elara-orb-pulse-ring"></span>
          <img src="./cutout_avatar.png" alt="ELARA" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
    </div>
  );
};

export default ClippyAssistant;
