import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { ShieldCheck, Settings, LogOut, ChevronRight, RefreshCw, Users, KeyRound, Check, Plus, CircleCheck, CircleAlert, LockKeyhole, Layers3, Copy, Download, X, Menu } from "lucide-react";

function PlatformMetric({ label, value, detail, icon: Icon, tone }) {
  return <article className={"platform-metric platform-metric-" + tone}>
    <span className="platform-metric-icon"><Icon size={18}/></span>
    <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
  </article>;
}

export default function PlatformOwnerConsole({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState({
    schoolCode: '',
    displayName: '',
    adminName: '',
    adminEmail: '',
    trialDays: '30',
    maxStudents: '400',
    maxTeachers: '25',
  });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mobile, setMobile] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ovData, tData] = await Promise.all([
        api('/platform/overview'),
        api('/platform/tenants').catch(() => ({ tenants: [] })),
      ]);
      setOverview(ovData);
      setTenants(tData?.tenants || []);
    } catch {
      setOverview(prev => prev || {
        mode: 'local-safe-pilot',
        tenantModeEnabled: false,
        localDeployment: true,
        controlPlaneReady: false,
        provisioningReady: false,
        productionGuard: true,
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitOnboarding = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        schoolCode: form.schoolCode.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        trialDays: Number(form.trialDays) || 30,
        maxStudents: Number(form.maxStudents) || 400,
        maxTeachers: Number(form.maxTeachers) || 25,
      };
      const result = await api('/platform/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCredentialsModal(result);
      setMessage({ type: 'success', text: `Sekolah "${result.displayName}" (${result.schoolCode}) berhasil diprovisioning.` });
      setForm({
        schoolCode: '',
        displayName: '',
        adminName: '',
        adminEmail: '',
        trialDays: '30',
        maxStudents: '400',
        maxTeachers: '25',
      });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Onboarding gagal.' });
    } finally {
      setBusy(false);
    }
  };

  const handleStatusToggle = async (tenant) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    setActionBusyId(tenant.id);
    try {
      await api(`/platform/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData();
    } catch (err) {
      alert(`Gagal mengubah status: ${err.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({ maxStudents: '400', maxTeachers: '25', extendTrialDays: '0', status: 'active' });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const openEditModal = (t) => {
    setEditingTenant(t);
    setEditForm({
      maxStudents: String(t.maxStudents || 400),
      maxTeachers: String(t.maxTeachers || 25),
      extendTrialDays: '0',
      status: t.status || 'active',
    });
    setEditError('');
  };

  const submitEditTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditBusy(true);
    setEditError('');
    try {
      const payload = {
        maxStudents: Number(editForm.maxStudents),
        maxTeachers: Number(editForm.maxTeachers),
        status: editForm.status,
      };
      const days = Number(editForm.extendTrialDays);
      if (days > 0) payload.extendTrialDays = days;
      await api(`/platform/tenants/${editingTenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEditingTenant(null);
      await loadData();
      setMessage({ type: 'success', text: `Paket & kuota sekolah "${editingTenant.displayName}" berhasil diperbarui.` });
    } catch (err) {
      setEditError(err.message || 'Gagal memperbarui kuota tenant.');
    } finally {
      setEditBusy(false);
    }
  };

  const copyCredentials = () => {
    if (!credentialsModal) return;
    const text = [
      `=== KREDENSIAL SEKOLAH BARU ===`,
      `Kode Sekolah: ${credentialsModal.schoolCode}`,
      `Nama Sekolah: ${credentialsModal.displayName}`,
      `Database: ${credentialsModal.databaseName}`,
      `Admin Username: ${credentialsModal.admin?.username}`,
      `Admin Email: ${credentialsModal.admin?.email}`,
      `Password Awal: ${credentialsModal.initialPassword}`,
      `Trial Berakhir: ${credentialsModal.trialEndsAt ? new Date(credentialsModal.trialEndsAt).toLocaleDateString('id-ID') : '-'}`,
      `Catatan: Password ini hanya tampil sekali saat provisioning.`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const downloadCredentialsCsv = () => {
    if (!credentialsModal) return;
    const headers = ['Kode Sekolah', 'Nama Sekolah', 'Database', 'Admin Username', 'Admin Email', 'Password Awal', 'Trial Berakhir'];
    const row = [
      `"${credentialsModal.schoolCode}"`,
      `"${credentialsModal.displayName}"`,
      `"${credentialsModal.databaseName}"`,
      `"${credentialsModal.admin?.username}"`,
      `"${credentialsModal.admin?.email}"`,
      `"${credentialsModal.initialPassword}"`,
      `"${credentialsModal.trialEndsAt || ''}"`,
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), row.join(',')].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `kredensial-${credentialsModal.schoolCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;

  return (
    <div className="app-shell platform-owner-console">
      <aside className={`sidebar platform-sidebar ${mobile ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div>
            <b>Platform<span> Control</span></b>
            <small>PBM / SaaS Provisioner</small>
          </div>
          <button className="mobile-close" type="button" aria-label="Tutup menu" onClick={() => setMobile(false)}><X size={17}/></button>
        </div>
        <div className="nav-caption">OPERASI</div>
        <nav>
          <button className="nav-item selected" type="button" onClick={() => setMobile(false)}><Settings size={18} /><span>Overview</span></button>
          <button className="nav-item" type="button" onClick={() => { setMobile(false); onLogout(); }}><LogOut size={18} /><span>Keluar</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">PO</div>
            <div className="profile-text">
              <b>{user.name}</b>
              <small>Pemilik Platform</small>
            </div>
          </div>
        </div>
      </aside>
      {mobile && <button className="scrim" type="button" aria-label="Tutup menu" onClick={() => setMobile(false)} />}
      <main className="main-area platform-main-area">
        <header className="topbar platform-topbar">
          <div className="top-left">
            <button className="mobile-menu" type="button" aria-label="Buka menu" onClick={() => setMobile(true)}><Menu size={17}/></button>
            <div className="crumb">Platform <ChevronRight size={14}/> <strong>Multi-Tenant Control</strong></div>
          </div>
          <div className="top-actions">
            <button className="secondary text-button" onClick={loadData} title="Perbarui Data">
              <RefreshCw size={15}/> Segarkan
            </button>
            <div className="session-pill">
              <span/> {overview?.provisioningReady ? 'Provisioner Aktif' : 'Provisioner Dikunci'}
            </div>
          </div>
        </header>
        <div className="content platform-content">
          <section className="platform-page-heading">
            <div>
              <span className="platform-eyebrow">PLATFORM OPERATIONS</span>
              <h1>Multi-Tenant Control</h1>
              <p>Pantau kesiapan layanan dan kelola provisioning sekolah.</p>
            </div>
            <div className={`platform-readiness ${overview?.provisioningReady ? 'is-ready' : 'is-locked'}`}>
              <span className="platform-readiness-dot" />
              {overview?.provisioningReady ? 'Provisioner aktif' : 'Provisioner dikunci'}
            </div>
          </section>
          <section className="platform-metrics" aria-label="Status platform">
            <PlatformMetric label="Sekolah terdaftar" value={totalTenants} detail={activeTenants + ' aktif · ' + trialTenants + ' trial'} icon={Users} tone="blue" />
            <PlatformMetric label="Control-plane" value={overview?.controlPlaneReady ? 'Siap' : 'Belum siap'} detail="cbt_control_plane terhubung" icon={KeyRound} tone="violet" />
            <PlatformMetric label="Provisioning engine" value={overview?.provisioningReady ? 'Siap' : 'Terkunci'} detail={overview?.provisioningReady ? 'Dedicated DB & role generator' : 'Belum terhubung'} icon={ShieldCheck} tone="amber" />
            <PlatformMetric label="Isolasi cbt_imbs" value="100% Aman" detail="Database legacy IMBS tidak tersentuh" icon={Check} tone="green" />
          </section>

          <div className="platform-overview-grid">
            <section className="panel platform-panel platform-onboarding-panel">
              <div className="platform-section-head">
                <div>
                  <span className="platform-section-kicker">ONBOARDING</span>
                  <h2>Provisioning sekolah baru</h2>
                  <p>Membuat database PostgreSQL dedicated, role migration & aplikasi, serta akun admin sekolah.</p>
                </div>
              </div>
              <form onSubmit={submitOnboarding} className="platform-onboarding-form">
                <label className="platform-field">
                  Kode sekolah (slug)
                  <input
                    value={form.schoolCode}
                    onChange={(event) => setForm({ ...form, schoolCode: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="misal: sekolah-demo-a"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                  <small className="platform-field-help">Hanya huruf kecil, angka, dan tanda hubung.</small>
                </label>
                <label className="platform-field">
                  Nama sekolah
                  <input
                    value={form.displayName}
                    onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                    placeholder="misal: SMA Negeri 1 Demo"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <label className="platform-field">
                  Nama admin sekolah
                  <input
                    value={form.adminName}
                    onChange={(event) => setForm({ ...form, adminName: event.target.value })}
                    placeholder="misal: Budi Santoso, S.Kom"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <label className="platform-field">
                  Email admin sekolah
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => setForm({ ...form, adminEmail: event.target.value })}
                    placeholder="misal: admin@sekolah-demo.id"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <label className="platform-field platform-field-trial">
                  Durasi masa uji coba (Hari)
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.trialDays}
                    onChange={(event) => setForm({ ...form, trialDays: event.target.value })}
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <div className="platform-quota-fields">
                  <label className="platform-field">
                    Batas siswa
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={form.maxStudents}
                      onChange={(event) => setForm({ ...form, maxStudents: event.target.value })}
                      required
                      disabled={!overview?.provisioningReady || busy}
                    />
                  </label>
                  <label className="platform-field">
                    Batas guru
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={form.maxTeachers}
                      onChange={(event) => setForm({ ...form, maxTeachers: event.target.value })}
                      required
                      disabled={!overview?.provisioningReady || busy}
                    />
                  </label>
                </div>
                <div className="platform-form-submit">
                  <button className="primary" type="submit" disabled={busy || !overview?.provisioningReady}>
                    <Plus size={16} /> {busy ? 'Memproses provisioning database & schema…' : 'Provisioning Sekolah Baru'}
                  </button>
                </div>
                {message && (
                  <div className={`platform-message platform-message-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
                    {message.type === 'success' ? <CircleCheck size={16} /> : <CircleAlert size={16} />} {message.text}
                  </div>
                )}
              </form>
            </section>

            <section className="panel platform-panel platform-architecture-panel">
              <div className="platform-section-head">
                <div>
                  <span className="platform-section-kicker">KEAMANAN & ISOLASI</span>
                  <h2>Arsitektur multi-tenant</h2>
                  <p>Status isolasi dan kendali database control-plane.</p>
                </div>
              </div>
              <div className="platform-architecture-list">
                <div className="platform-architecture-item"><span><b>Mode sistem</b><small>{overview?.mode || 'local-safe-pilot'}</small></span><ShieldCheck size={17}/></div>
                <div className="platform-architecture-item"><span><b>Control-plane registry</b><small>cbt_control_plane.tenants</small></span><KeyRound size={17}/></div>
                <div className="platform-architecture-item"><span><b>Kriptografi rahasia database</b><small>AES-256-GCM via master key</small></span><LockKeyhole size={17}/></div>
                <div className="platform-architecture-item"><span><b>Isolasi data database</b><small>Dedicated DB (cbt_t_*) per sekolah</small></span><Layers3 size={17}/></div>
                <div className="platform-architecture-item"><span><b>Perlindungan cbt_imbs</b><small>Read/write legacy IMBS terpisah</small></span><Check size={17}/></div>
              </div>
            </section>
          </div>

          <section className="panel platform-panel platform-tenants-panel">
            <div className="platform-section-head platform-tenants-heading">
              <div>
                <span className="platform-section-kicker">REGISTRY</span>
                <h2>Daftar tenant / sekolah terdaftar</h2>
                <p>Seluruh sekolah terisolasi yang telah diprovisioning pada control-plane.</p>
              </div>
              <button className="secondary platform-refresh-button" onClick={loadData}>
                <RefreshCw size={14}/> Segarkan
              </button>
            </div>
            <div className="platform-table-scroll">
              {tenants.length === 0 ? (
                <div className="platform-empty-state">
                  Belum ada tenant sekolah terdaftar. Gunakan formulir di atas untuk melakukan provisioning sekolah pertama.
                </div>
              ) : (
                <table className="platform-tenant-table">
                  <thead><tr><th>Kode</th><th>Nama sekolah</th><th>Database</th><th>Kuota</th><th>Masa aktif</th><th>Status</th><th>Tindakan</th></tr></thead>
                  <tbody>{tenants.map((t) => (
                    <tr key={t.id}>
                      <td className="mono platform-tenant-code">{t.schoolCode}</td>
                      <td className="platform-tenant-name" title={t.displayName}>{t.displayName}</td>
                      <td className="mono platform-tenant-database" title={t.databaseName}>{t.databaseName}</td>
                      <td className="platform-tenant-quota">{t.maxStudents} siswa <span>/</span> {t.maxTeachers} guru</td>
                      <td className="platform-tenant-expiry">{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('id-ID') : '-'}</td>
                      <td><span className={`platform-status platform-status-${t.status}`}>{t.status}</span></td>
                      <td><div className="platform-tenant-actions">
                        <button className="secondary" onClick={() => openEditModal(t)}>Ubah Paket</button>
                        <button className="secondary" disabled={actionBusyId === t.id} onClick={() => handleStatusToggle(t)}>
                          {actionBusyId === t.id ? '…' : t.status === 'suspended' ? 'Aktifkan' : 'Tangguhkan'}
                        </button>
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {credentialsModal && (
        <div className="modal-backdrop" onClick={() => setCredentialsModal(null)}>
          <div className="modal platform-modal platform-credentials-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Kredensial Admin Sekolah</h2>
                <p>Simpan kredensial ini sekarang. Kata sandi ini hanya ditampilkan satu kali.</p>
              </div>
              <button className="icon-btn" onClick={() => setCredentialsModal(null)}><X size={18}/></button>
            </div>
            <div className="platform-modal-body">
              <div className="platform-warning">
                <CircleAlert size={16} />
                <strong>Perhatian:</strong> Kredensial akun admin pertama untuk tenant ini tidak disimpan dalam bentuk teks biasa. Harap salin atau unduh sebelum menutup jendela ini.
              </div>
              <div className="platform-credentials-list">
                <div className="quick-item"><span><b>Kode Sekolah</b><small className="mono">{credentialsModal.schoolCode}</small></span></div>
                <div className="quick-item"><span><b>Nama Sekolah</b><small>{credentialsModal.displayName}</small></span></div>
                <div className="quick-item"><span><b>Database Dedicated</b><small className="mono">{credentialsModal.databaseName}</small></span></div>
                <div className="quick-item"><span><b>Username Admin</b><small className="mono">{credentialsModal.admin?.username}</small></span></div>
                <div className="quick-item"><span><b>Email Admin</b><small className="mono">{credentialsModal.admin?.email}</small></span></div>
                <div className="platform-credential-password">
                  <span>
                    <b>Kata Sandi Awal</b>
                    <div className="mono platform-password-value">
                      {credentialsModal.initialPassword}
                    </div>
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-foot platform-modal-actions">
              <button className="secondary" onClick={copyCredentials}>
                <Copy size={15}/> {copied ? 'Tersalin!' : 'Salin Teks'}
              </button>
              <button className="secondary" onClick={downloadCredentialsCsv}>
                <Download size={15}/> Unduh CSV
              </button>
              <button className="primary" onClick={() => setCredentialsModal(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTenant && (
        <div className="modal-backdrop" onClick={() => setEditingTenant(null)}>
          <div className="modal platform-modal platform-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Ubah Paket & Kuota Sekolah</h2>
                <p>{editingTenant.displayName} <span className="mono">({editingTenant.schoolCode})</span></p>
              </div>
              <button className="icon-btn" onClick={() => setEditingTenant(null)}><X size={18}/></button>
            </div>
            <form onSubmit={submitEditTenant} className="platform-modal-form">
              <div className="platform-edit-quotas">
                <label>
                  Batas Siswa
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={editForm.maxStudents}
                    onChange={(e) => setEditForm({ ...editForm, maxStudents: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Batas Guru
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={editForm.maxTeachers}
                    onChange={(e) => setEditForm({ ...editForm, maxTeachers: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                Tambah Masa Aktif (+ Hari)
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={editForm.extendTrialDays}
                  onChange={(e) => setEditForm({ ...editForm, extendTrialDays: e.target.value })}
                  placeholder="0 (tidak menambah)"
                />
                <small className="platform-field-help">
                  Masa aktif saat ini: {editingTenant.trialEndsAt ? new Date(editingTenant.trialEndsAt).toLocaleDateString('id-ID') : '-'}
                </small>
              </label>
              <label>
                Status Tenant
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">Active (Aktif)</option>
                  <option value="trial">Trial (Uji Coba)</option>
                  <option value="suspended">Suspended (Ditangguhkan)</option>
                  <option value="closed">Closed (Ditutup)</option>
                </select>
              </label>
              {editError && (
                <div className="login-error"><CircleAlert size={15}/> {editError}</div>
              )}
              <div className="platform-modal-actions">
                <button type="button" className="secondary" onClick={() => setEditingTenant(null)}>Batal</button>
                <button type="submit" className="primary" disabled={editBusy}>
                  {editBusy ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
