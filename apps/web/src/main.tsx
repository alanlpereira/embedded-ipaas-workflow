import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Registrar Service Worker do PWA para Cache Estático e Inicialização Offline
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('⚡ [PWA SERVICE WORKER] Registrado com sucesso:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ [PWA SERVICE WORKER WARN] Falha ao registrar:', err);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
