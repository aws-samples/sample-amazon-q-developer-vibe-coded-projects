import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { Amplify } from 'aws-amplify'
import { applicationConfig } from './context/amplify-config.ts'

// Import Amplify UI styles globally
import '@aws-amplify/ui-react/styles.css';

// Configure Amplify with the configuration from amplify-config.ts
Amplify.configure(applicationConfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
