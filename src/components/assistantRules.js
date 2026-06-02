export const getLocalResponse = (message) => {
  const lowerMsg = message.toLowerCase();
  
  if (lowerMsg.includes('hola') || lowerMsg.includes('saludos')) {
    return "¡Hola, maestro! Soy tu Asistente Inteligente. Estoy aquí para ayudarte con tus planeaciones y dudas sobre la NEM. Si ingresas tu Clave API de ChatGPT en la configuración, ¡podré crear proyectos completos para ti!";
  }
  
  if (lowerMsg.includes('nem') || lowerMsg.includes('nueva escuela mexicana')) {
    return "La Nueva Escuela Mexicana (NEM) busca una educación humanista, inclusiva y con equidad. Se basa en 4 campos formativos y 7 ejes articuladores. ¿En qué campo te gustaría enfocar tu proyecto?";
  }
  
  if (lowerMsg.includes('pda') || lowerMsg.includes('proceso de desarrollo')) {
    return "Los Procesos de Desarrollo de Aprendizaje (PDA) son las metas que los alumnos deben alcanzar. En la pestaña 'Cargar Todo' puedes ver los PDAs filtrados por grado y campo formativo automáticamente.";
  }
  
  if (lowerMsg.includes('proyecto') || lowerMsg.includes('planeacion')) {
    return "Para crear un proyecto, ve a la sección de 'Planeación'. Te sugiero usar la metodología de Aprendizaje Basado en Proyectos Comunitarios o STEM según tu campo formativo.";
  }

  if (lowerMsg.includes('evaluacion') || lowerMsg.includes('calificar')) {
    return "La evaluación formativa es clave en la NEM. Te recomiendo diseñar rúbricas o listas de cotejo basadas en los PDA que seleccionaste en tu planeación.";
  }

  if (lowerMsg.includes('api') || lowerMsg.includes('chatgpt')) {
    return "Para desbloquear todo mi poder inteligente, haz clic en el botón del engranaje (⚙️) aquí en el chat, pega tu 'API Key' de OpenAI y gárdala. Así podré redactarte textos originales, proyectos enteros y exámenes.";
  }

  return "Esa es una excelente pregunta. En mi versión gratuita puedo guiarte sobre el uso de este programa y conceptos de la NEM. Para que te redacte sugerencias y hojas de trabajo, por favor configura tu API Key de OpenAI (ChatGPT) en el icono del engranaje (⚙️).";
};

export const getRandomTip = () => {
  const tips = [
    "💡 Tip: Puedes arrastrar y soltar tus planeaciones para cambiar su orden.",
    "💡 Tip: Agrega actividades de inicio, desarrollo y cierre para una mejor estructura.",
    "💡 Tip: No olvides conectar tus proyectos con los Ejes Articuladores de la NEM.",
    "💡 Tip: Si conectas tu API de ChatGPT, puedo redactarte rubricas de evaluación automáticas.",
    "💡 Tip: Selecciona cuidadosamente los PDA para no saturar tu proyecto."
  ];
  return tips[Math.floor(Math.random() * tips.length)];
};
