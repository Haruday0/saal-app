import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { DebugProvider } from './context/DebugContext';
import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <DebugProvider>
        <App />
      </DebugProvider>
    </ThemeProvider>
  </React.StrictMode>
);
