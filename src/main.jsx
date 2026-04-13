import React from 'react'
import ReactDOM from 'react-dom/client'
import { ColorSchemeScript } from '@mantine/core'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ColorSchemeScript defaultColorScheme="auto" localStorageKey="laudos-mantine-color-scheme" />
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
