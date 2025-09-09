import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './utils/debugProductSuggestions' // Debug tool
import './utils/setupRealisticDemoData' // Realistic demo data
import './utils/debugExactMatching' // Exact matching debug
import './utils/debugServiceStatus' // Service status debug
import './utils/directTestExactMatching' // Direct test exact matching
import './utils/debugDataFlow' // Data flow debug

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
