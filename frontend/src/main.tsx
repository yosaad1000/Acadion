import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Updated to use HTTPS API domain: https://api.acadion.online
// Triggering deployment with proper Vercel token from secrets
// Fixed workflow to use prebuilt deployment approach

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
