import React from 'react'
import { createRoot } from 'react-dom/client'
import AuthGate from './auth/AuthGate.jsx'
import DemoGate from './DemoGate.jsx'
import './styles.css'

const reviewMode = new URLSearchParams(window.location.search).get('review') === '1'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {reviewMode ? <DemoGate /> : <AuthGate />}
  </React.StrictMode>
)
