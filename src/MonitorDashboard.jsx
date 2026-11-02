import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { RefreshCw, Clock3, ChevronDown, ChevronUp, Wifi, WifiOff, Check, X, CircleAlert, RotateCcw } from 'lucide-react';

const eventLabels = {
  tab_hidden: 'Tab ujian tersembunyi',
  window_blur: 'Jendela kehilangan fokus',
  fullscreen_exit: 'Keluar dari layar penuh',
  blocked_shortcut: 'Pintasan terlarang',
  clipboard: 'Akses clipboard',
  context_menu: 'Menu klik kanan',
  admin_report: 'Catatan pengawas',
  admin_reset: 'Sesi dipulihkan oleh pengawas',
};

export default function MonitorDashboard({ refreshKey, busy, onReviewEvent, onReviewSession, onViolation, onReset, canRecordViolation = false }) {
  const [sessions, setSessions] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    setError('');
    try {
      setSessions(await api('/monitor'));
    } catch (err) {
      setError(err.message || 'Data pemantauan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, [refresh, refreshKey]);

  const isViolation = student => student.status === 'locked' || Number(student.violationCount) > 0 ||
    (student.events || []).some(event => event.code !== 'admin_reset' && ['pending', 'confirmed'].includes(event.reviewStatus));
  const violations = useMemo(() => sessions.filter(isViolation), [sessions]);
  const completed = useMemo(() => sessions.filter(student => student.status === 'completed' && !isViolation(student)), [sessions]);
  const active = useMemo(() => sessions.filter(student => student.status === 'in_progress' && !isViolation(student)), [sessions]);

  const toggle = id => setExpanded(current => ({ ...current, [id]: !current[id] }));
  const showAll = () => setExpanded(Object.fromEntries([...active, ...violations, ...completed].map(s => [s.id, true])));

  return <>
    <div className="page-title-row">
      <div><div className="eyebrow">PEMANTAUAN LANGSUNG</div><h1>Pantau ujian</h1><p>Peserta aktif dan catatan pelanggaran diperbarui otomatis setiap 5 detik.</p></div>
      <div className="button-row"><button className="secondary" onClick={refresh}><RefreshCw size={15}/> Perbarui</button><button className="secondary" onClick={showAll}><Clock3 size={15}/> Tampilkan log</button></div>
    </div>
    {error && <div className="monitor-dashboard-error" role="alert"><CircleAlert size={15}/>{error}</div>}
    <div className="admin-monitor-grid">
      <MonitorPanel title="Siswa dengan pelanggaran" count={violations.length} note="Tinjau bukti sebelum menetapkan keputusan." empty="Belum ada siswa yang terindikasi melanggar." loading={loading}>
        <MonitorTable students={violations} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} showReviewActions />
      </MonitorPanel>
      <MonitorPanel title="Sedang mengikuti ujian" count={active.length} note="Log tersedia pada setiap peserta." empty="Tidak ada siswa yang sedang mengerjakan ujian." loading={loading}>
        <MonitorTable students={active} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} />
      </MonitorPanel>
      <MonitorPanel title="Selesai ujian" count={completed.length} note="Riwayat peserta yang telah mengumpulkan ujian." empty="Belum ada siswa yang menyelesaikan ujian." loading={loading}>
        <MonitorTable students={completed} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} />
      </MonitorPanel>
    </div>
  </>;
}

function MonitorPanel({ title, count, note, empty, loading, children }) {
  return <section className="panel admin-monitor-panel">
    <div className="panel-head"><div><h2>{title}</h2><p>{count} siswa · {note}</p></div><span className="monitor-count">{count}</span></div>
    {loading ? <div className="monitor-dashboard-empty">Memuat data pemantauan…</div> : count ? children : <div className="monitor-dashboard-empty">{empty}</div>}
  </section>;
}

function MonitorTable({ students, expanded, toggle, now, busy, onReviewEvent, onReviewSession, onViolation, onReset, canRecordViolation, showReviewActions = false }) {
  return <div className="admin-monitor-scroll"><table className="admin-monitor-table">
    <thead><tr><th>SISWA</th><th>UJIAN</th><th>STATUS</th><th>LOG</th><th>TINDAKAN</th></tr></thead>
    <tbody>{students.map(student => {
      const events = Array.isArray(student.events) ? [...student.events].reverse() : [];
      const held = student.status === 'in_progress' && Boolean(student.violationReviewRequired);
      const isActive = student.status === 'in_progress';
      const online = Boolean(student.lastPingAt && now - Date.parse(student.lastPingAt) < 35000);
      return <FragmentRow key={`${student.examId}-${student.id}`} student={student} events={events} expanded={Boolean(expanded[student.id])} toggle={() => toggle(student.id)} held={held} isActive={isActive} online={online} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} showReviewActions={showReviewActions} />;
    })}</tbody>
  </table></div>;
}

function FragmentRow({ student, events, expanded, toggle, held, isActive, online, busy, onReviewEvent, onReviewSession, onViolation, onReset, canRecordViolation, showReviewActions }) {
  const violationCount = Number(student.violationCount) || 0;
  const blocked = student.status === 'locked';
  const pendingEvents = events.filter(event => event.reviewStatus === 'pending');
  const label = blocked ? 'DIBLOKIR' : held ? 'MENUNGGU PENGAWAS' : violationCount ? `${violationCount} PELANGGARAN` : pendingEvents.length ? `${pendingEvents.length} SINYAL PENDING` : isActive ? 'MENGERJAKAN' : statusLabel(student.status);
  const canReviewEvents = showReviewActions && !held && pendingEvents.length > 0;
  const hasActions = showReviewActions && ((held && isActive) || canReviewEvents);
  return <>
    <tr className={blocked || violationCount ? 'admin-monitor-violation' : pendingEvents.length ? 'admin-monitor-pending' : ''}>
      <td><b>{student.name}</b><small>{student.username} · {student.className}</small></td>
      <td><b>{student.examTitle}</b><small>Kelas {student.className}</small></td>
      <td><span className={`admin-monitor-state ${blocked ? 'blocked' : held || violationCount || pendingEvents.length ? 'warning' : ''}`}>{label}</span>{isActive && <small className={`admin-monitor-presence ${online ? 'online' : 'offline'}`}>{online ? <Wifi size={11}/> : <WifiOff size={11}/>} {online ? 'Online' : 'Terputus'}</small>}</td>
      <td><button className="admin-monitor-log-button" onClick={toggle} disabled={!events.length} title={events.length ? 'Tampilkan log siswa' : 'Belum ada log'}><Clock3 size={13}/>{events.length}<span>{expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</span></button></td>
      <td><div className="admin-monitor-actions">{canRecordViolation && isActive && student.examStatus === 'active' && !held && <button className="dismiss" disabled={busy} onClick={() => onViolation(student)}><CircleAlert size={12}/> Catat pelanggaran</button>}{held && showReviewActions && <><button className="confirm" disabled={busy} onClick={() => onReviewSession(student, 'block')}><Check size={12}/> Blokir</button><button className="dismiss" disabled={busy} onClick={() => onReviewSession(student, 'false_positive')}><X size={12}/> False positive</button></>}{student.examStatus === 'active' && (blocked || violationCount > 0) && <button className="dismiss" disabled={busy} onClick={() => onReset(student)}><RotateCcw size={12}/> Pulihkan sesi</button>}</div></td>
    </tr>
    {hasActions && canReviewEvents && <tr className="admin-monitor-action-row"><td colSpan="5"><div><b>Perlu keputusan pengawas</b><span>{pendingEvents.length} sinyal menunggu tinjauan</span></div>{pendingEvents.map(event => <div className="admin-monitor-actions" key={event.id}><small>{eventLabels[event.code] || event.code}</small><button className="confirm" disabled={busy} onClick={() => onReviewEvent(student, event, 'confirm')}><Check size={12}/> Konfirmasi</button><button className="dismiss" disabled={busy} onClick={() => onReviewEvent(student, event, 'dismiss')}><X size={12}/> False positive</button></div>)}</td></tr>}
    {expanded && <tr className="admin-monitor-evidence-row"><td colSpan="5">{events.length ? <div className="admin-monitor-evidence">{events.map((event, index) => <article key={`${event.id || event.createdAt}-${index}`}><span className={`monitor-signal ${event.reviewStatus === 'confirmed' ? 'violation' : event.reviewStatus === 'pending' ? 'warning' : 'completed'}`}/><div><b>{eventLabels[event.code] || event.code} · {eventStatus(event)}</b><time>{formatDate(event.createdAt)}</time>{event.detail && <p dir="auto">{event.detail}</p>}{event.reviewReason && <p>Keputusan pengawas: {event.reviewReason}</p>}</div></article>)}</div> : <div className="admin-monitor-no-log">Belum ada log untuk siswa ini.</div>}</td></tr>}
  </>;
}

function statusLabel(status) { return ({ completed: 'SELESAI', not_started: 'BELUM MULAI', locked: 'DIBLOKIR' })[status] || String(status || '').toUpperCase(); }
function eventStatus(event) { return event.code === 'admin_reset' ? 'TINDAKAN PENGAWAS' : event.reviewStatus === 'pending' ? 'MENUNGGU TINJAUAN' : event.reviewStatus === 'confirmed' ? 'DIKONFIRMASI' : 'FALSE POSITIVE'; }
function formatDate(value) { return value ? new Date(value).toLocaleString('id-ID') : 'Waktu tidak tersedia'; }
