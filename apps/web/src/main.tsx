import React from 'react'
import ReactDOM from 'react-dom/client'
// Why Did You Render - только в development
if (import.meta.env.DEV) {
  import('./utils/wdyr')
}
import App from './App.tsx'
// Import UI theme CSS before app styles
import '@ui/styles/theme.css'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

