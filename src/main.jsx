import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RenderErrorBoundary from './components/RenderErrorBoundary.jsx'
import ClippyAssistant from './components/ClippyAssistant.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RenderErrorBoundary><Suspense fallback={<div style={{minHeight:"100vh",display:"grid",placeItems:"center"}}>Cargando...</div>}><App /></Suspense></RenderErrorBoundary>
    <ClippyAssistant />
  </StrictMode>,
)
