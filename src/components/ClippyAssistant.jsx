import React, { useState, useEffect, useRef } from 'react';
import './ClippyAssistant.css';
import { getLocalResponse, getRandomTip } from './assistantRules';

// =====================================================================
// ⚠️ ATENCIÓN: PEGA TU API KEY DE OPENAI AQUÍ ADENTRO DE LAS COMILLAS
// =====================================================================
const MI_OPENAI_API_KEY = "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"; 

const ClippyAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: '¡Hola! Soy tu asistente de planeación impulsado por IA. ¿En qué te ayudo hoy?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [tooltip, setTooltip] = useState('');
  
  const messagesEndRef = useRef(null);
  
  // Dragging logic
  const [pos, setPos] = useState({ x: window.innerWidth - 350, y: window.innerHeight - 500 });
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const wasDragged = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Posición inicial segura en la esquina inferior derecha
  useEffect(() => {
    setPos({ x: window.innerWidth - 100, y: window.innerHeight - 100 });
    
    const handleGlobalPointerMove = (e) => {
      if (!isDragging.current) return;
      wasDragged.current = true;
      let newX = e.clientX - dragOffset.current.x;
      let newY = e.clientY - dragOffset.current.y;
      
      // Boundaries
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX > window.innerWidth - 70) newX = window.innerWidth - 70;
      if (newY > window.innerHeight - 70) newY = window.innerHeight - 70;
      
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

  // Random tooltips
  useEffect(() => {
    if (isOpen) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setTooltip(getRandomTip());
        setTimeout(() => setTooltip(''), 5000);
      }
    }, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [isOpen]);

  const getOpenAIResponse = async (userText, chatHistory) => {
    try {
      const contextStr = window.plannerContext ? JSON.stringify({
        vista_actual: window.plannerContext.vista,
        pdas_activos_semana: window.plannerContext.pdasSemana,
        proyecto_actual_problematica: window.plannerContext.proyectoActual?.problemática
      }) : 'No hay contexto disponible.';

      const systemPrompt = `Eres un experto en la Nueva Escuela Mexicana (NEM) y asistes a maestros de educación básica. 
El usuario está trabajando en su software de planeación. Contexto actual de su pantalla: ${contextStr}.
Si el usuario pide crear actividades, planear o llenar la semana, DEBES usar la función "fill_planner_form" para insertar los datos directamente en su pantalla. Crea actividades dinámicas, humanistas y basadas en proyectos.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.filter(m => m.sender !== 'system').map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: userText }
      ];

      const tools = [
        {
          type: "function",
          function: {
            name: "fill_planner_form",
            description: "Llena automáticamente el formulario de planeación semanal.",
            parameters: {
              type: "object",
              properties: {
                lunes_inicio: { type: "string", description: "Inicio Lunes" },
                lunes_desarrollo: { type: "string", description: "Desarrollo Lunes" },
                lunes_cierre: { type: "string", description: "Cierre Lunes" },
                martes_inicio: { type: "string" }, martes_desarrollo: { type: "string" }, martes_cierre: { type: "string" },
                miercoles_inicio: { type: "string" }, miercoles_desarrollo: { type: "string" }, miercoles_cierre: { type: "string" },
                jueves_inicio: { type: "string" }, jueves_desarrollo: { type: "string" }, jueves_cierre: { type: "string" },
                viernes_inicio: { type: "string" }, viernes_desarrollo: { type: "string" }, viernes_cierre: { type: "string" },
                recursos: { type: "string", description: "Materiales necesarios" },
                evaluacion: { type: "string", description: "Formativa, Rúbricas, etc." }
              }
            }
          }
        }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MI_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: apiMessages,
          tools: tools,
          tool_choice: "auto",
          temperature: 0.7
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const responseMessage = data.choices[0].message;

      // Handle function calling
      if (responseMessage.tool_calls) {
        for (const toolCall of responseMessage.tool_calls) {
          if (toolCall.function.name === 'fill_planner_form') {
            const args = JSON.parse(toolCall.function.arguments);
            if (window.plannerContext && window.plannerContext.setPlanData) {
              window.plannerContext.setPlanData(prev => ({ ...prev, ...args }));
            }
          }
        }
        return "¡Listo! He rellenado los campos de tu planeación. Revísalos y modifícalos si lo necesitas.";
      }

      return responseMessage.content;
    } catch (error) {
      console.error("Fallo la conexión a OpenAI, usando modo local:", error);
      return null;
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    const currentChat = [...messages];
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInputValue('');
    setIsTyping(true);

    let botResponse = null;
    
    if (MI_OPENAI_API_KEY && MI_OPENAI_API_KEY.startsWith('sk-')) {
      botResponse = await getOpenAIResponse(userText, currentChat);
    }
    
    if (!botResponse) {
      await new Promise(r => setTimeout(r, 600));
      botResponse = getLocalResponse(userText);
    }

    setMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    setIsTyping(false);
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

  return (
    <div className="clippy-container" style={{ left: pos.x, top: pos.y, bottom: 'auto', right: 'auto' }}>
      {/* Tooltip flotante aleatorio */}
      {!isOpen && tooltip && (
        <div className="clippy-tooltip" style={{ right: '80px', bottom: '15px' }}>
          {tooltip}
        </div>
      )}

      {/* Ventana de Chat */}
      <div className={`clippy-chat-box ${isOpen ? 'open' : 'hidden'}`} style={{ position: 'absolute', bottom: '80px', right: '0' }}>
        <div className="clippy-header">
          <span>🤖 Asistente Docente</span>
          <div>
            <button onClick={() => setIsOpen(false)}>✖</button>
          </div>
        </div>

        <div className="clippy-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`clippy-message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isTyping && <div className="clippy-message bot">Escribiendo... ✍️</div>}
          <div ref={messagesEndRef} />
        </div>
        
        <form className="clippy-input-area" onSubmit={handleSend}>
          <input 
            type="text" 
            placeholder="Pregúntame sobre la NEM..." 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" disabled={isTyping || !inputValue.trim()}>➤</button>
        </form>
      </div>

      {/* Avatar Flotante */}
      <div 
        className={`clippy-avatar ${!isOpen ? 'bouncing' : ''}`}
        onPointerDown={handlePointerDown}
        onClick={handleAvatarClick}
        title="Arrastrame o dale clic para preguntar"
      >
        <img 
          src="./teacher_avatar.png" 
          alt="Profe IA" 
          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', pointerEvents: 'none' }} 
        />
      </div>
    </div>
  );
};

export default ClippyAssistant;
