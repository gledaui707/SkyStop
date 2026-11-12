import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { DeviceFrame, presentation } from './DeviceFrame'
import { LaunchSplash } from './features/splash/LaunchSplash'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {presentation() === 'frame' ? <DeviceFrame /> : <LaunchSplash><App /></LaunchSplash>}
  </React.StrictMode>,
)
