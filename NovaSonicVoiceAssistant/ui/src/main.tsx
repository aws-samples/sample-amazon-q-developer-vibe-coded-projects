import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Amplify } from 'aws-amplify'
import { applicationConfig } from './context/amplify-config.ts'
import { closeSharedAudioContext } from './utils'

// Import Amplify UI styles globally
import '@aws-amplify/ui-react/styles.css';

// Configure Amplify with the configuration from amplify-config.ts
Amplify.configure(applicationConfig);

// Add event listener to close the shared AudioContext when the page is unloaded
window.addEventListener('beforeunload', () => {
  closeSharedAudioContext();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
