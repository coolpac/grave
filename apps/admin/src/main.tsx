import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
// Import UI theme CSS before app styles
import '@ui/styles/theme.css'
import './index.css'

// Apply dark theme
document.documentElement.classList.add('dark')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

