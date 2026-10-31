// PlatformOwnerConsole.jsx
// UI for Platform Owner to provision tenants and manage existing ones.
// This component is rendered when the logged‑in user has role "platform_owner".

import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { Copy, Download, Check, X, RefreshCw, CircleAlert } from 'lucide-react';

// Helper to copy text to clipboard and show a temporary tooltip.
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) {
    return false;
  }
};

export default function PlatformOwnerConsole({ user, onLogout }) {
  // ---------- state ----------
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tenants, setTenants] = useState([]);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showCreds, setShowCreds] = useState(null); // holds credential object after onboarding
  const [form, setForm] = useState({
    schoolCode: '',
    schoolName: '',
    adminName: '',
    adminEmail: '',
    trialDays: '30',
    maxStudents: '400',
    maxTeachers: '25',
  });

  // ---------- data loading ----------
  const loadTenants = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/platform/tenants');
      setTenants(data.tenants || []);
    } catch (e) {
      setError(e.message ?? 'Gagal memuat daftar tenant.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // ---------- onboarding ----------
  const handleOnboard = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        schoolCode: form.schoolCode.trim(),
        schoolName: form.schoolName.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
        trialDays: Number(form.trialDays),
        maxStudents: Number(form.maxStudents),
        maxTeachers: Number(form.maxTeachers),
      };
      const result = await api('/platform/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // result contains admin credentials and tenant metadata
      setShowCreds(result);
      setShowOnboard(false);
      await loadTenants();
    } catch (e) {
      setError(e.message ?? 'Gagal membuat tenant.');
    }
  };

  // ---------- status toggle ----------
  const toggleStatus = async (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api(`/platform/tenants/${tenantId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      await loadTenants();
    } catch (e) {
      setError(e.message ?? 'Gagal mengubah status tenant.');
    }
  };

  // ---------- CSV download for credentials ----------
  const downloadCredsCsv = (creds) => {
    const header = 'nama,email,username,password,schoolCode\n';
    const row = `${creds.admin?.name},${creds.admin?.email},${creds.admin?.username},${creds.initialPassword},${creds.schoolCode}\n`;
    const blob = new Blob([header + row], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kredensial-${creds.schoolCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- render ----------
  return (
    <div className="platform-owner-console">
      <header className="po-header">
        <h2>Panel Pemilik Platform</h2>
        <button onClick={onLogout} className="secondary">
          Keluar
        </button>
      </header>

      {error && (
        <div className="error-banner">
          <CircleAlert size={16} /> {error}
        </div>
      )}

      <section className="po-actions">
        <button onClick={() => setShowOnboard(true)} className="primary">
          Tambah Sekolah (Tenant)
        </button>
        <button onClick={loadTenants} className="secondary">
          Refresh Daftar
        </button>
      </section>

      {loading ? (
        <p>Memuat tenant…</p>
      ) : (
        <table className="tenant-table">
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Sekolah</th>
              <th>Database</th>
              <th>Status</th>
              <th>Kuota Siswa</th>
              <th>Kuota Guru</th>
              <th>Berakhir Trial</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.code}</td>
                <td>{t.displayName}</td>
                <td>{t.database}</td>
                <td>{t.status}</td>
                <td>{t.maxStudents}</td>
                <td>{t.maxTeachers}</td>
                <td>{new Date(t.trialEndsAt).toLocaleDateString()}</td>
                <td>
                  <button
                    onClick={() => toggleStatus(t.id, t.status)}
                    className="small"
                  >
                    {t.status === 'active' ? 'Suspend' : 'Aktifkan'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ---------- onboarding modal ---------- */}
      {showOnboard && (
        <div className="modal-backdrop" onClick={() => setShowOnboard(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Onboarding Sekolah Baru</h3>
            <form onSubmit={handleOnboard} className="onboard-form">
              <label>
                Kode Sekolah
                <input
                  required
                  value={form.schoolCode}
                  onChange={(e) => setForm({ ...form, schoolCode: e.target.value })}
                />
              </label>
              <label>
                Nama Sekolah
                <input
                  required
                  value={form.schoolName}
                  onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
                />
              </label>
              <label>
                Nama Lengkap Admin
                <input
                  required
                  value={form.adminName}
                  onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                />
              </label>
              <label>
                Email Admin
                <input
                  type="email"
                  required
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                />
              </label>
              <label>
                Masa Trial (hari)
                <input
                  type="number"
                  min="1"
                  required
                  value={form.trialDays}
                  onChange={(e) => setForm({ ...form, trialDays: e.target.value })}
                />
              </label>
              <label>
                Kuota Siswa (default 400)
                <input
                  type="number"
                  min="1"
                  required
                  value={form.maxStudents}
                  onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                />
              </label>
              <label>
                Kuota Guru (default 25)
                <input
                  type="number"
                  min="1"
                  required
                  value={form.maxTeachers}
                  onChange={(e) => setForm({ ...form, maxTeachers: e.target.value })}
                />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowOnboard(false)} className="secondary">
                  Batal
                </button>
                <button type="submit" className="primary">
                  Buat Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- credentials modal ---------- */}
      {showCreds && (
        <div className="modal-backdrop" onClick={() => setShowCreds(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Kredensial Admin Sekolah</h3>
            <p>
              <strong>Nama:</strong> {showCreds.admin?.name}<br />
              <strong>Email:</strong> {showCreds.admin?.email}<br />
              <strong>Username:</strong> {showCreds.admin?.username}<br />
              <strong>Password (sekali pakai):</strong> {showCreds.initialPassword}<br />
            </p>
            <div className="modal-actions">
              <button
                onClick={async () => {
                  const ok = await copyToClipboard(showCreds.initialPassword);
                  if (ok) alert('Password disalin ke clipboard');
                }}
                className="secondary"
              >
                <Copy size={14} /> Salin
              </button>
              <button
                onClick={() => downloadCredsCsv(showCreds)}
                className="secondary"
              >
                <Download size={14} /> Unduh CSV
              </button>
              <button onClick={() => setShowCreds(null)} className="primary">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

