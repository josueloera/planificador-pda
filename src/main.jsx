import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RenderErrorBoundary from './components/RenderErrorBoundary.jsx'
import ClippyAssistant from './components/ClippyAssistant.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RenderErrorBoundary><App /></RenderErrorBoundary>
    <ClippyAssistant />
  </StrictMode>,
)
