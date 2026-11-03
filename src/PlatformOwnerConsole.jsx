import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import {
  ShieldCheck, Settings, LogOut, ChevronRight, RefreshCw, Users, KeyRound, Check,
  Plus, CircleCheck, CircleAlert, LockKeyhole, Layers3, Copy, Download, X, Menu,
  Database, RotateCcw, Zap, CheckCircle2, AlertTriangle, FileCheck, Server, Upload
} from "lucide-react";

function PlatformMetric({ label, value, detail, icon: Icon, tone }) {
  return <article className={"platform-metric platform-metric-" + tone}>
    <span className="platform-metric-icon"><Icon size={18}/></span>
    <div><small>{label}</small><strong>{value}</strong><span>{detail}</span></div>
  </article>;
}

export default function PlatformOwnerConsole({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
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
  const [copiedHash, setCopiedHash] = useState(null);
  const [mobile, setMobile] = useState(false);

  // Backup & Restore states
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupActionBusy, setBackupActionBusy] = useState(false);
  const [stagingResult, setStagingResult] = useState(null);
  const [stagingModalOpen, setStagingModalOpen] = useState(false);
  const [confirmMaintenance, setConfirmMaintenance] = useState(false);
  const [latestCutover, setLatestCutover] = useState(null);

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

  const selectedTenant = tenants.find(t => t.id === selectedTenantId) || tenants[0] || null;

  useEffect(() => {
    if (!selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId]);

  const loadBackups = useCallback(async (tenantId) => {
    if (!tenantId) return;
    setBackupLoading(true);
    try {
      const res = await api(`/platform/tenants/${tenantId}/backups`);
      setBackups(res?.backups || []);
    } catch {
      setBackups([]);
    } finally {
      setBackupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'backup-restore' && selectedTenant?.id) {
      loadBackups(selectedTenant.id);
    }
  }, [activeTab, selectedTenant?.id, loadBackups]);

  const handleCreateBackup = async () => {
    if (!selectedTenant) return;
    setBackupActionBusy(true);
    setMessage(null);
    try {
      const res = await api(`/platform/tenants/${selectedTenant.id}/backups`, {
        method: 'POST',
      });
      setMessage({
        type: 'success',
        text: `Backup berhasil dibuat untuk "${selectedTenant.displayName}" (${(res.sizeBytes / 1024).toFixed(1)} KB, SHA-256: ${res.manifest?.databaseHash?.slice(0, 12)}…). Paket terenkripsi tersimpan.`,
      });
      await loadBackups(selectedTenant.id);
    } catch (err) {
      setMessage({ type: 'error', text: `Gagal membuat backup: ${err.message}` });
    } finally {
      setBackupActionBusy(false);
    }
  };

  const handleDownloadBackup = (backup) => {
    const url = `/api/platform/backups/${backup.filename}/download?token=${backup.downloadToken}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleRestoreToStaging = async (filename) => {
    if (!selectedTenant) return;
    setBackupActionBusy(true);
    setMessage(null);
    try {
      const res = await api(`/platform/tenants/${selectedTenant.id}/restore/staging`, {
        method: 'POST',
        body: JSON.stringify({ filename }),
      });
      setStagingResult(res);
      setStagingModalOpen(true);
      setConfirmMaintenance(false);
    } catch (err) {
      setMessage({ type: 'error', text: `Gagal memulihkan ke database staging: ${err.message}` });
    } finally {
      setBackupActionBusy(false);
    }
  };

  const handleCutover = async () => {
    if (!selectedTenant || !stagingResult) return;
    setBackupActionBusy(true);
    try {
      const res = await api(`/platform/tenants/${selectedTenant.id}/restore/cutover`, {
        method: 'POST',
        body: JSON.stringify({
          stagingDatabaseName: stagingResult.stagingDatabaseName,
          confirmMaintenance,
        }),
      });
      setLatestCutover(res);
      setStagingModalOpen(false);
      setStagingResult(null);
      setMessage({
        type: 'success',
        text: `Cutover berhasil! Tenant aktif dialihkan ke "${res.activeDatabase}". Database lama "${res.preservedDatabase}" dipertahankan untuk opsi rollback.`,
      });
      await loadData();
      await loadBackups(selectedTenant.id);
    } catch (err) {
      alert(`Cutover gagal: ${err.message}`);
    } finally {
      setBackupActionBusy(false);
    }
  };

  const handleAutoRestore = async (filename) => {
    if (!selectedTenant) return;
    const ok = window.confirm(
      `Jalankan 1-Klik Pulihkan & Cutover Otomatis untuk "${selectedTenant.displayName}"?\n\nSistem akan otomatis: restore ke staging, memvalidasi 5 poin (skema, relasi, data, ujian, media), dan melakukan cutover bila seluruh pengujian lulus. Jika gagal, tenant tetap aman pada database lama.`
    );
    if (!ok) return;

    setBackupActionBusy(true);
    setMessage(null);
    try {
      const res = await api(`/platform/tenants/${selectedTenant.id}/restore/auto`, {
        method: 'POST',
        body: JSON.stringify({ filename, confirmMaintenance: true }),
      });
      if (res.aborted) {
        setMessage({
          type: 'error',
          text: `Proses otomatis dihentikan: ${res.message}. Tenant tetap aman pada database "${res.activeDatabase}".`,
        });
        setStagingResult({ stagingDatabaseName: res.stagingDatabaseName, verification: res.verification });
        setStagingModalOpen(true);
      } else {
        setLatestCutover(res);
        setMessage({
          type: 'success',
          text: `1-Klik Cutover Otomatis berhasil! Tenant aktif dialihkan ke "${res.activeDatabase}". Database lama "${res.preservedDatabase}" dipertahankan.`,
        });
        await loadData();
        await loadBackups(selectedTenant.id);
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Auto restore gagal: ${err.message}` });
    } finally {
      setBackupActionBusy(false);
    }
  };

  const handleRollback = async (targetDb) => {
    if (!selectedTenant || !targetDb) return;
    const ok = window.confirm(`Kembalikan (rollback) rute database tenant "${selectedTenant.displayName}" ke database lama "${targetDb}"?`);
    if (!ok) return;
    setBackupActionBusy(true);
    try {
      const res = await api(`/platform/tenants/${selectedTenant.id}/restore/rollback`, {
        method: 'POST',
        body: JSON.stringify({ targetDatabaseName: targetDb }),
      });
      setMessage({ type: 'success', text: `Rollback berhasil: Tenant dialihkan kembali ke "${res.activeDatabase}".` });
      setLatestCutover(null);
      await loadData();
      await loadBackups(selectedTenant.id);
    } catch (err) {
      alert(`Rollback gagal: ${err.message}`);
    } finally {
      setBackupActionBusy(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenant) return;
    setBackupActionBusy(true);
    setMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/platform/tenants/${selectedTenant.id}/backups/upload`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Unggah backup gagal.');
      }
      setMessage({ type: 'success', text: `Berkas backup "${file.name}" berhasil diunggah.` });
      await loadBackups(selectedTenant.id);
    } catch (err) {
      setMessage({ type: 'error', text: `Unggah backup gagal: ${err.message}` });
    } finally {
      setBackupActionBusy(false);
      e.target.value = '';
    }
  };

  const copyHash = (hash) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    });
  };

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
          <button
            className={`nav-item ${activeTab === 'overview' ? 'selected' : ''}`}
            type="button"
            onClick={() => { setActiveTab('overview'); setMobile(false); }}
          >
            <Settings size={18} /><span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'backup-restore' ? 'selected' : ''}`}
            type="button"
            onClick={() => { setActiveTab('backup-restore'); setMobile(false); }}
          >
            <Database size={18} /><span>Backup & Restore</span>
          </button>
          <button className="nav-item" type="button" onClick={() => { setMobile(false); onLogout(); }}>
            <LogOut size={18} /><span>Keluar</span>
          </button>
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
            <div className="crumb">Platform <ChevronRight size={14}/> <strong>{activeTab === 'overview' ? 'Multi-Tenant Control' : 'Backup & Disaster Recovery'}</strong></div>
          </div>
          <div className="top-actions">
            <button className="secondary text-button" onClick={() => { loadData(); if (selectedTenant?.id) loadBackups(selectedTenant.id); }} title="Perbarui Data">
              <RefreshCw size={15}/> Segarkan
            </button>
            <div className="session-pill">
              <span/> {overview?.provisioningReady ? 'Provisioner Aktif' : 'Provisioner Dikunci'}
            </div>
          </div>
        </header>
        <div className="content platform-content">
          {message && (
            <div className={`platform-message platform-message-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'} style={{ marginBottom: 16 }}>
              {message.type === 'success' ? <CircleCheck size={16} /> : <CircleAlert size={16} />} {message.text}
            </div>
          )}

          {activeTab === 'overview' ? (
            <>
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
            </>
          ) : (
            <>
              <section className="platform-page-heading">
                <div>
                  <span className="platform-eyebrow">DISASTER RECOVERY & ISOLASI TENANT</span>
                  <h1>Backup, Download & Restore Tenant</h1>
                  <p>Pencadangan terenkripsi AES-256, verifikasi otomatis 5-lapis staging, dan cutover aman tanpa downtime.</p>
                </div>
                <div className="platform-readiness is-ready">
                  <span className="platform-readiness-dot" />
                  Engine DR Siap
                </div>
              </section>

              <div className="platform-backup-controls">
                <div className="platform-tenant-picker">
                  <span>Pilih Sekolah / Tenant:</span>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    disabled={backupActionBusy || backupLoading}
                  >
                    {tenants.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.displayName} ({t.schoolCode}) — {t.databaseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="platform-backup-toolbar">
                  <button
                    className="primary"
                    onClick={handleCreateBackup}
                    disabled={!selectedTenant || backupActionBusy}
                  >
                    <Plus size={15}/> {backupActionBusy ? 'Memproses backup…' : 'Buat Backup Baru'}
                  </button>
                  <label className="platform-upload-btn" title="Unggah berkas .cbtenc untuk dipulihkan">
                    <Upload size={14}/> Unggah Berkas .cbtenc
                    <input
                      type="file"
                      accept=".cbtenc"
                      disabled={!selectedTenant || backupActionBusy}
                      onChange={handleUploadFile}
                    />
                  </label>
                  <button
                    className="secondary text-button"
                    onClick={() => selectedTenant && loadBackups(selectedTenant.id)}
                    disabled={backupLoading}
                  >
                    <RefreshCw size={14}/> {backupLoading ? 'Memuat…' : 'Segarkan'}
                  </button>
                </div>
              </div>

              {selectedTenant && (
                <div className="platform-backup-summary-card">
                  <div className="platform-backup-summary-item">
                    <small>Nama Sekolah</small>
                    <strong>{selectedTenant.displayName}</strong>
                    <span>Kode: <span className="mono">{selectedTenant.schoolCode}</span></span>
                  </div>
                  <div className="platform-backup-summary-item">
                    <small>Database Aktif Saat Ini</small>
                    <strong className="mono">{selectedTenant.databaseName}</strong>
                    <span>Status: <span className={`platform-status platform-status-${selectedTenant.status}`}>{selectedTenant.status}</span></span>
                  </div>
                  <div className="platform-backup-summary-item">
                    <small>Kriptografi Paket</small>
                    <strong>AES-256-GCM Terisolasi</strong>
                    <span>Master key terlindungi server</span>
                  </div>
                  <div className="platform-backup-summary-item">
                    <small>Total Snapshot Tersedia</small>
                    <strong>{backups.length} Berkas</strong>
                    <span>Penyimpanan: ./backups</span>
                  </div>
                </div>
              )}

              {latestCutover?.preservedDatabase && (
                <div className="platform-rollback-banner">
                  <div>
                    <strong>Rollback Tersedia:</strong> Database lama <span className="mono">{latestCutover.preservedDatabase}</span> masih dipertahankan sementara.
                  </div>
                  <button
                    className="secondary"
                    onClick={() => handleRollback(latestCutover.preservedDatabase)}
                    disabled={backupActionBusy}
                  >
                    <RotateCcw size={14}/> Kembalikan ke Database Lama (Rollback)
                  </button>
                </div>
              )}

              <section className="panel platform-panel">
                <div className="platform-section-head">
                  <div>
                    <span className="platform-section-kicker">DAFTAR SNAPSHOT TERENKRIPSI</span>
                    <h2>Daftar Paket Backup Tenant</h2>
                    <p>Paket terenkripsi AES-256 mencakup seluruh data tabel, berkas media fisik yang dirujuk, serta manifest kriptografis.</p>
                  </div>
                </div>
                <div className="platform-table-scroll">
                  {backupLoading ? (
                    <div className="platform-empty-state">Memuat daftar backup tenant…</div>
                  ) : backups.length === 0 ? (
                    <div className="platform-empty-state">
                      Belum ada paket backup untuk sekolah ini. Klik "Buat Backup Baru" untuk membuat cadangan terenkripsi pertama.
                    </div>
                  ) : (
                    <table className="platform-tenant-table">
                      <thead>
                        <tr>
                          <th>Berkas & Tanggal</th>
                          <th>Ukuran & Baris</th>
                          <th>Media</th>
                          <th>Hash SHA-256 (Dump)</th>
                          <th>Verifikasi</th>
                          <th>Tindakan Pemulihan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backups.map((b) => (
                          <tr key={b.filename}>
                            <td>
                              <b className="mono" style={{ fontSize: 12 }}>{b.filename}</b>
                              <div style={{ color: '#68807d', fontSize: 11 }}>
                                {b.createdAt ? new Date(b.createdAt).toLocaleString('id-ID') : '-'}
                              </div>
                            </td>
                            <td>
                              <strong>{(b.sizeBytes / 1024).toFixed(1)} KB</strong>
                              <div style={{ color: '#68807d', fontSize: 11 }}>
                                {b.manifest?.verification?.checks?.totalRows || Object.values(b.manifest?.tablesSummary || {}).reduce((x, y) => x + y, 0)} baris data
                              </div>
                            </td>
                            <td>
                              <span>{b.manifest?.mediaCount || 0} berkas</span>
                            </td>
                            <td>
                              <span className="platform-hash-badge">
                                {b.manifest?.databaseHash?.slice(0, 14)}…
                                <button type="button" title="Salin Full Hash SHA-256" onClick={() => copyHash(b.manifest?.databaseHash)}>
                                  {copiedHash === b.manifest?.databaseHash ? <Check size={12}/> : <Copy size={12}/>}
                                </button>
                              </span>
                            </td>
                            <td>
                              <span className="platform-status platform-status-active">
                                {b.manifest?.verification?.verified ? 'Terverifikasi' : 'Siap'}
                              </span>
                            </td>
                            <td>
                              <div className="platform-tenant-actions">
                                <button
                                  className="secondary"
                                  onClick={() => handleDownloadBackup(b)}
                                  title="Unduh paket terenkripsi (tautan terbatas waktu)"
                                >
                                  <Download size={13}/> Unduh
                                </button>
                                <button
                                  className="secondary"
                                  disabled={backupActionBusy}
                                  onClick={() => handleRestoreToStaging(b.filename)}
                                  title="Pulihkan ke staging dan jalankan 5 poin pengujian"
                                >
                                  <Server size={13}/> Uji Staging
                                </button>
                                <button
                                  className="primary platform-btn-zap"
                                  disabled={backupActionBusy}
                                  onClick={() => handleAutoRestore(b.filename)}
                                  title="Satu klik otomatis: staging, validasi 5 poin, lalu cutover bila lulus"
                                >
                                  <Zap size={13}/> 1-Klik Auto
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Modal Verifikasi Staging & Konfirmasi Cutover */}
      {stagingModalOpen && stagingResult && (
        <div className="modal-backdrop" onClick={() => setStagingModalOpen(false)}>
          <div className="modal platform-modal platform-edit-modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Hasil Pengujian Database Staging</h2>
                <p>Target staging: <span className="mono">{stagingResult.stagingDatabaseName}</span></p>
              </div>
              <button className="icon-btn" onClick={() => setStagingModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="platform-modal-body">
              {stagingResult.verification?.passed ? (
                <div className="platform-message platform-message-success" style={{ margin: 0 }}>
                  <CircleCheck size={16}/> Seluruh 5 poin pengujian staging lulus. Aman untuk melakukan cutover koneksi aplikasi.
                </div>
              ) : (
                <div className="platform-message platform-message-error" style={{ margin: 0 }}>
                  <CircleAlert size={16}/> Terdapat pemeriksaan yang belum memenuhi syarat. Cutover dicegah sampai semua poin valid.
                </div>
              )}

              <div className="platform-verification-checklist">
                <div className={`platform-verification-item ${stagingResult.verification?.schema?.passed ? 'is-passed' : 'is-failed'}`}>
                  <span className="platform-verification-icon">
                    {stagingResult.verification?.schema?.passed ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#991b1b" />}
                  </span>
                  <div className="platform-verification-body">
                    <strong>1. Skema Database & Kolom Inti</strong>
                    <span>{stagingResult.verification?.schema?.detail}</span>
                  </div>
                </div>

                <div className={`platform-verification-item ${stagingResult.verification?.relations?.passed ? 'is-passed' : 'is-failed'}`}>
                  <span className="platform-verification-icon">
                    {stagingResult.verification?.relations?.passed ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#991b1b" />}
                  </span>
                  <div className="platform-verification-body">
                    <strong>2. Integritas Relasi (Foreign Key)</strong>
                    <span>{stagingResult.verification?.relations?.detail}</span>
                  </div>
                </div>

                <div className={`platform-verification-item ${stagingResult.verification?.dataCounts?.passed ? 'is-passed' : 'is-failed'}`}>
                  <span className="platform-verification-icon">
                    {stagingResult.verification?.dataCounts?.passed ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#991b1b" />}
                  </span>
                  <div className="platform-verification-body">
                    <strong>3. Kecocokan Jumlah Baris Data</strong>
                    <span>{stagingResult.verification?.dataCounts?.detail}</span>
                  </div>
                </div>

                <div className={`platform-verification-item ${stagingResult.verification?.loginAndExams?.passed ? 'is-passed' : 'is-failed'}`}>
                  <span className="platform-verification-icon">
                    {stagingResult.verification?.loginAndExams?.passed ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#991b1b" />}
                  </span>
                  <div className="platform-verification-body">
                    <strong>4. Kesiapan Login Admin & Sesi Ujian Aktif</strong>
                    <span>{stagingResult.verification?.loginAndExams?.detail}</span>
                  </div>
                </div>

                <div className={`platform-verification-item ${stagingResult.verification?.media?.passed ? 'is-passed' : 'is-failed'}`}>
                  <span className="platform-verification-icon">
                    {stagingResult.verification?.media?.passed ? <CheckCircle2 size={16} color="#166534" /> : <AlertTriangle size={16} color="#991b1b" />}
                  </span>
                  <div className="platform-verification-body">
                    <strong>5. Integritas Berkas Media Fisik</strong>
                    <span>{stagingResult.verification?.media?.detail}</span>
                  </div>
                </div>
              </div>

              {stagingResult.verification?.passed && (
                <div style={{ marginTop: 12, padding: 12, background: '#f8faf9', border: '1px solid #dbe6e2', borderRadius: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', fontSize: 12, color: '#1d3934' }}>
                    <input
                      type="checkbox"
                      checked={confirmMaintenance}
                      onChange={(e) => setConfirmMaintenance(e.target.checked)}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <strong>Konfirmasi Cutover Maintenance:</strong> Saya memahami bahwa koneksi aktif tenant akan dikuras (drained) dan diarahkan ke database staging. Database lama (<span className="mono">{selectedTenant?.databaseName}</span>) dipertahankan agar opsi rollback tetap tersedia.
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div className="modal-foot platform-modal-actions">
              <button type="button" className="secondary" onClick={() => setStagingModalOpen(false)}>
                Tutup
              </button>
              <button
                type="button"
                className="primary"
                disabled={!stagingResult.verification?.passed || !confirmMaintenance || backupActionBusy}
                onClick={handleCutover}
              >
                {backupActionBusy ? 'Menguras koneksi & cutover…' : 'Lakukan Cutover ke Tenant Aktif'}
              </button>
            </div>
          </div>
        </div>
      )}

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
