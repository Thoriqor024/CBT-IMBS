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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[CBT IMBS ErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'#f7f8fb',fontFamily:'sans-serif'}}>
          <div style={{background:'#fff',padding:'28px 22px',borderRadius:14,boxShadow:'0 4px 18px rgba(0,0,0,0.08)',maxWidth:420,width:'100%',textAlign:'center'}}>
            <div style={{width:44,height:44,borderRadius:12,background:'#fef2f2',color:'#dc2626',display:'grid',placeItems:'center',margin:'0 auto 12px',fontWeight:'bold',fontSize:20}}>!</div>
            <h2 style={{margin:'0 0 6px',color:'#1e293b',fontSize:18,fontWeight:700}}>Terjadi Kendala Tampilan</h2>
            <p style={{fontSize:13,color:'#64748b',lineHeight:1.5,margin:'0 0 16px'}}>
              Sistem mendeteksi galat saat memuat komponen:
              <br/>
              <code style={{fontSize:11,color:'#334155',background:'#f1f5f9',padding:'4px 8px',borderRadius:4,display:'inline-block',marginTop:8,maxWidth:'100%',overflowWrap:'anywhere'}}>
                {this.state.error?.message || 'Error tidak diketahui'}
              </code>
            </p>
            <div style={{display:'flex',gap:8}}>
              <button
                onClick={() => window.location.reload()}
                style={{flex:1,height:42,background:'#f1f5f9',color:'#334155',border:'1px solid #cbd5e1',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}
              >
                Muat Ulang
              </button>
              <button
                onClick={() => {
                  try { localStorage.clear(); sessionStorage.clear(); } catch(e){}
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
                  }
                  if ('caches' in window) {
                    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
                  }
                  setTimeout(() => window.location.reload(true), 300);
                }}
                style={{flex:1,height:42,background:'#258a63',color:'#fff',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}
              >
                Bersihkan Cache
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.MODE !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
