import React from 'react'
import ReactDOM from 'react-dom/client'
import { Home } from './home'
import './index.css'
import './panda.css'
import { Toaster } from './components/ui/toast/toaster'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Toaster />
    <Home />
  </React.StrictMode>,
)
