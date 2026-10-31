import { useState } from 'react';
import { ArrowUpRight, CircleAlert, KeyRound } from 'lucide-react';

export default function PlatformOwnerLogin({ onLogin, busy, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="brand login-brand">
          <div className="brand-mark"><KeyRound size={22} /></div>
          <div><b>Platform<span> Control</span></b><small>LOCAL OWNER ACCESS</small></div>
        </div>
        <div className="eyebrow"><KeyRound size={14} /> PEMILIK PLATFORM</div>
        <h1>Masuk ke platform</h1>
        <p>Gunakan email pemilik control-plane.</p>
        <form onSubmit={event => onLogin(event, { platformOwner: true, email, password })}>
          <label>Email pemilik<input type="email" autoFocus value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required /></label>
          <label>Kata sandi<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required /></label>
          {error && <div className="login-error"><CircleAlert size={15} />{error}</div>}
          <button className="primary login-submit" disabled={busy || !email || !password}>
            {busy ? 'Memeriksa...' : 'Masuk sebagai pemilik'}<ArrowUpRight size={16} />
          </button>
        </form>
        <a href="/" className="text-button">Kembali ke login sekolah</a>
      </div>
    </div>
  );
}