import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import './web.css'

// Vercel Web Analytics는 웹(Vercel) 진입점에만 넣어요. 미니앱 빌드(src/main.tsx)에는 들어가지 않아요.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
