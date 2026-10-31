import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import './overrides.css';
import './functional.css';
import './monitor.css';
import './exam.css';
import './exam-hardening.css';
import './review.css';
import './question-bank.css';
import './question-import.css';
import 'katex/dist/katex.min.css';
import './question-content.css';
import './admin-actions.css';
import './settings.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);

if ('serviceWorker' in navigator && import.meta.env.MODE !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
