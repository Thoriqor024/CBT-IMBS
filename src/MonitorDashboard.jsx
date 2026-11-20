import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, apiDownload } from './api';
import { isOffline, isOnline } from '../server/monitorPresence.js';
import { RefreshCw, Clock3, ChevronDown, ChevronUp, Wifi, WifiOff, Check, X, CircleAlert, RotateCcw, Search, DoorOpen, ClipboardList, Download } from 'lucide-react';

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

export default function MonitorDashboard({ refreshKey, busy, onReviewEvent, onReviewSession, onViolation, onReset, canRecordViolation = false, isPengawas = false }) {
  const [sessions, setSessions] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [serverRoomSummaries, setServerRoomSummaries] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [room, setRoom] = useState('all');
  const [exam, setExam] = useState(isPengawas ? '' : 'all');
  const selectedExam = exam && exam !== 'all' ? exam : '';

  const refresh = useCallback(async () => {
    setError('');
    try {
      if (selectedExam) {
        const [rows, summary, cover] = await Promise.all([
          api(`/monitor?examId=${encodeURIComponent(selectedExam)}`),
          api(`/monitor/rooms?examId=${encodeURIComponent(selectedExam)}`),
          isPengawas ? Promise.resolve(null) : api(`/exams/${encodeURIComponent(selectedExam)}/proctor-coverage`).catch(() => null),
        ]);
        setSessions(rows);
        setServerRoomSummaries(summary);
        setCoverage(cover);
      } else {
        const all = await api('/monitor');
        setCatalog(all);
        setSessions(all);
        setServerRoomSummaries([]);
        setCoverage(null);
      }
    } catch (err) {
      setError(err.message || 'Data pemantauan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [selectedExam, isPengawas]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(timer); clearInterval(clock); };
  }, [refresh, refreshKey]);

  const isViolation = student => student.status === 'locked' || Number(student.violationCount) > 0 ||
    (student.events || []).some(event => event.code !== 'admin_reset' && ['pending', 'confirmed'].includes(event.reviewStatus));
  const sessionOptions = useMemo(() => {
    const options = new Map();
    [...catalog, ...sessions].forEach(session => {
      const id = String(session.examId);
      if (!options.has(id)) options.set(id, { id, label: monitorSessionLabel(session) });
    });
    return [...options.values()].sort((left, right) => left.label.localeCompare(right.label, 'id-ID'));
  }, [catalog, sessions]);
  useEffect(() => {
    if (!isPengawas) return;
    const ids = sessionOptions.map(option => option.id);
    if (!ids.includes(exam)) setExam(ids[0] || '');
  }, [isPengawas, exam, sessionOptions]);
  const examSessions = useMemo(() => exam === 'all' ? sessions : sessions.filter(session => String(session.examId) === exam), [sessions, exam]);
  const rooms = useMemo(() => [...new Set(examSessions.map(session => session.roomName).filter(Boolean))].sort((left, right) => left.localeCompare(right, 'id-ID')), [examSessions]);
  useEffect(() => {
    if (room !== 'all' && !rooms.includes(room)) setRoom('all');
  }, [room, rooms]);
  const scopedSessions = useMemo(() => room === 'all' ? examSessions : examSessions.filter(session => session.roomName === room), [examSessions, room]);
  const violations = useMemo(() => scopedSessions.filter(isViolation), [scopedSessions]);
  const completed = useMemo(() => scopedSessions.filter(student => student.status === 'completed' && !isViolation(student)), [scopedSessions]);
  const active = useMemo(() => scopedSessions.filter(student => student.status === 'in_progress' && !isViolation(student)), [scopedSessions]);
  const notStarted = useMemo(() => scopedSessions.filter(student => student.status === 'not_started' && !isViolation(student)), [scopedSessions]);
  const offline = useMemo(() => active.filter(student => isOffline(student.lastPingAt, now)), [active, now]);
  const localRoomSummaries = useMemo(() => {
    const summary = new Map();
    scopedSessions.forEach(student => {
      const name = student.roomName || 'Tanpa ruang';
      const entry = summary.get(name) || { name, total: 0, notStarted: 0, active: 0, completed: 0, violations: 0, offline: 0 };
      entry.total += 1;
      if (student.status === 'not_started') entry.notStarted += 1;
      else if (student.status === 'in_progress') entry.active += 1;
      else if (student.status === 'completed') entry.completed += 1;
      if (isViolation(student)) entry.violations += 1;
      if (student.status === 'in_progress' && isOffline(student.lastPingAt, now)) entry.offline += 1;
      summary.set(name, entry);
    });
    return [...summary.values()].sort((left, right) => left.name.localeCompare(right.name, 'id-ID'));
  }, [scopedSessions, now]);
  const roomSummaries = useMemo(() => {
    if (!selectedExam) return localRoomSummaries;
    return serverRoomSummaries
      .filter(item => room === 'all' || item.roomName === room)
      .map(item => ({ ...item, name: item.roomName || 'Tanpa ruang' }));
  }, [selectedExam, serverRoomSummaries, localRoomSummaries, room]);
  const uncoveredRooms = useMemo(() => (coverage?.rooms || []).filter(item => !item.covered), [coverage]);

  const toggle = id => setExpanded(current => ({ ...current, [id]: !current[id] }));
  const showAll = () => setExpanded(Object.fromEntries([...active, ...violations, ...completed, ...notStarted].map(s => [s.id, true])));
  const downloadBeritaAcara = async () => {
    if (!selectedExam || downloading) return;
    setDownloading(true);
    setError('');
    try {
      await apiDownload(`/monitor/rooms/export?examId=${encodeURIComponent(selectedExam)}`, `berita-acara-ujian-${selectedExam}.csv`);
    } catch (err) {
      setError(err.message || 'Berita acara tidak dapat diunduh.');
    } finally {
      setDownloading(false);
    }
  };

  return <>
    <div className="page-title-row">
      <div><div className="eyebrow">PEMANTAUAN LANGSUNG</div><h1>Pantau ujian</h1><p>{isPengawas ? 'Hanya sesi dan ruang yang ditugaskan kepada Anda yang dimuat.' : 'Peserta aktif dan catatan pelanggaran diperbarui otomatis setiap 5 detik.'}</p></div>
      <div className="button-row">{sessionOptions.length > 0 && <label className="monitor-room-filter monitor-session-filter"><ClipboardList size={14}/><select value={isPengawas ? (exam || sessionOptions[0]?.id || '') : exam} onChange={event => setExam(event.target.value)} aria-label="Filter sesi ujian">{!isPengawas && <option value="all">Semua sesi</option>}{sessionOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>}{rooms.length > 0 && <label className="monitor-room-filter"><DoorOpen size={14}/><select value={room} onChange={event => setRoom(event.target.value)} aria-label="Filter ruang ujian"><option value="all">Semua ruang</option>{rooms.map(name => <option key={name} value={name}>{name}</option>)}</select></label>}{selectedExam && <button className="secondary" onClick={downloadBeritaAcara} disabled={downloading || busy}><Download size={15}/> {downloading ? 'Mengunduh…' : 'Berita acara'}</button>}<button className="secondary" onClick={refresh}><RefreshCw size={15}/> Perbarui</button><button className="secondary" onClick={showAll}><Clock3 size={15}/> Tampilkan log</button></div>
    </div>
    {error && <div className="monitor-dashboard-error" role="alert"><CircleAlert size={15}/>{error}</div>}
    {offline.length > 0 && <div className="monitor-watchdog" role="status">
      <WifiOff size={16}/>
      <div><b>{offline.length} peserta terputus lebih dari 90 detik</b><p>{offline.slice(0, 5).map(student => `${student.name}${student.roomName ? ` (${student.roomName})` : ''}`).join(', ')}{offline.length > 5 ? `, +${offline.length - 5} lainnya` : ''}. Periksa koneksi peserta atau minta peserta memuat ulang halaman ujian.</p></div>
    </div>}
    {uncoveredRooms.length > 0 && <div className="monitor-coverage-warning" role="alert">
      <CircleAlert size={16}/>
      <div><b>{uncoveredRooms.length} ruang belum memiliki pengawas</b><p>{uncoveredRooms.map(item => item.roomName).join(', ')}. Peserta di ruang ini tidak tercakup pemantauan pengawas; tugaskan pengawas per ruang dari menu Akun staf.</p></div>
    </div>}
    {roomSummaries.length > 0 && <div className="monitor-room-summary" aria-label="Ringkasan per ruang ujian">
      {roomSummaries.map(item => <article key={item.roomName || item.name} className="monitor-room-card">
        <header><DoorOpen size={13}/><b>{item.name}</b><span>{item.total} siswa</span></header>
        <div><span className="not-started">Belum mulai {item.notStarted}</span><span className="active">Mengerjakan {item.active}</span><span className="done">Selesai {item.completed}</span><span className="flagged">Pelanggaran {item.violations}</span>{Number(item.offline) > 0 && <span className="offline">Terputus {item.offline}</span>}</div>
      </article>)}
    </div>}
    <div className="admin-monitor-grid">
      <MonitorPanel title="Siswa dengan pelanggaran" students={violations} count={violations.length} note="Tinjau bukti sebelum menetapkan keputusan." empty="Belum ada siswa yang terindikasi melanggar." loading={loading}>
        {filtered => <MonitorTable students={filtered} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} showReviewActions />}
      </MonitorPanel>
      <MonitorPanel title="Sedang mengikuti ujian" students={active} count={active.length} note="Log tersedia pada setiap peserta." empty="Tidak ada siswa yang sedang mengerjakan ujian." loading={loading}>
        {filtered => <MonitorTable students={filtered} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} />}
      </MonitorPanel>
      <MonitorPanel title="Selesai ujian" students={completed} count={completed.length} note="Riwayat peserta yang telah mengumpulkan ujian." empty="Belum ada siswa yang menyelesaikan ujian." loading={loading}>
        {filtered => <MonitorTable students={filtered} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} />}
      </MonitorPanel>
      {(loading || notStarted.length > 0) && <MonitorPanel title="Belum mulai" students={notStarted} count={notStarted.length} note="Peserta yang belum memasukkan PIN atau memulai ujian pada sesi ini." empty="Semua peserta sudah memulai ujian." loading={loading}>
        {filtered => <MonitorTable students={filtered} expanded={expanded} toggle={toggle} now={now} busy={busy} onReviewEvent={onReviewEvent} onReviewSession={onReviewSession} onViolation={onViolation} onReset={onReset} canRecordViolation={canRecordViolation} />}
      </MonitorPanel>}
    </div>
  </>;
}

function MonitorPanel({ title, students, count, note, empty, loading, children }) {
  const [query, setQuery] = useState('');
  const filtered = students.filter(student => String(student.name || '').toLocaleLowerCase('id-ID').includes(query.toLocaleLowerCase('id-ID').trim()));
  return <section className="panel admin-monitor-panel">
    <div className="panel-head"><div><h2>{title}</h2><p>{count} siswa · {note}</p></div><span className="monitor-count">{count}</span></div>
    {loading ? <div className="monitor-dashboard-empty">Memuat data pemantauan…</div> : count ? <><label className="monitor-search"><Search size={14}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari nama siswa..." aria-label={`Cari nama siswa pada card ${title}`}/></label>{filtered.length ? children(filtered) : <div className="monitor-dashboard-empty">Tidak ada siswa dengan nama tersebut.</div>}</> : <div className="monitor-dashboard-empty">{empty}</div>}
  </section>;
}

function MonitorTable({ students, expanded, toggle, now, busy, onReviewEvent, onReviewSession, onViolation, onReset, canRecordViolation, showReviewActions = false }) {
  return <div className="admin-monitor-scroll"><table className="admin-monitor-table">
    <thead><tr><th>SISWA</th><th>UJIAN</th><th>STATUS</th><th>LOG</th><th>TINDAKAN</th></tr></thead>
    <tbody>{students.map(student => {
      const events = Array.isArray(student.events) ? [...student.events].reverse() : [];
      const held = student.status === 'in_progress' && Boolean(student.violationReviewRequired);
      const isActive = student.status === 'in_progress';
      const online = isOnline(student.lastPingAt, now);
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
      <td><b>{student.examTitle}</b><small>Kelas {student.className}{student.roomName ? ' · ' + student.roomName : ''}</small></td>
      <td><span className={`admin-monitor-state ${blocked ? 'blocked' : held || violationCount || pendingEvents.length ? 'warning' : ''}`}>{label}</span>{isActive && <small className={`admin-monitor-presence ${online ? 'online' : 'offline'}`} title={student.lastPingAt ? `Ping terakhir ${formatDate(student.lastPingAt)}` : 'Belum ada ping'}>{online ? <Wifi size={11}/> : <WifiOff size={11}/>} {online ? 'Online' : 'Terputus'}</small>}</td>
      <td><button className="admin-monitor-log-button" onClick={toggle} disabled={!events.length} title={events.length ? 'Tampilkan log siswa' : 'Belum ada log'}><Clock3 size={13}/>{events.length}<span>{expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</span></button></td>
      <td><div className="admin-monitor-actions">{canRecordViolation && isActive && student.examStatus === 'active' && !held && <button className="dismiss" disabled={busy} onClick={() => onViolation(student)}><CircleAlert size={12}/> Catat pelanggaran</button>}{held && showReviewActions && <><button className="confirm" disabled={busy} onClick={() => onReviewSession(student, 'block')}><Check size={12}/> Blokir</button><button className="dismiss" disabled={busy} onClick={() => onReviewSession(student, 'false_positive')}><X size={12}/> False positive</button></>}{student.examStatus === 'active' && (blocked || violationCount > 0) && <button className="dismiss" disabled={busy} onClick={() => onReset(student)}><RotateCcw size={12}/> Pulihkan sesi</button>}</div></td>
    </tr>
    {hasActions && canReviewEvents && <tr className="admin-monitor-action-row"><td colSpan="5"><div><b>Perlu keputusan pengawas</b><span>{pendingEvents.length} sinyal menunggu tinjauan</span></div>{pendingEvents.map(event => <div className="admin-monitor-actions" key={event.id}><small>{eventLabels[event.code] || event.code}</small><button className="confirm" disabled={busy} onClick={() => onReviewEvent(student, event, 'confirm')}><Check size={12}/> Konfirmasi</button><button className="dismiss" disabled={busy} onClick={() => onReviewEvent(student, event, 'dismiss')}><X size={12}/> False positive</button></div>)}</td></tr>}
    {expanded && <tr className="admin-monitor-evidence-row"><td colSpan="5">{events.length ? <div className="admin-monitor-evidence">{events.map((event, index) => <article key={`${event.id || event.createdAt}-${index}`}><span className={`monitor-signal ${event.reviewStatus === 'confirmed' ? 'violation' : event.reviewStatus === 'pending' ? 'warning' : 'completed'}`}/><div><b>{eventLabels[event.code] || event.code} · {eventStatus(event)}</b><time>{formatDate(event.createdAt)}</time>{event.detail && <p dir="auto">{event.detail}</p>}{event.reviewReason && <p>Keputusan pengawas: {event.reviewReason}</p>}</div></article>)}</div> : <div className="admin-monitor-no-log">Belum ada log untuk siswa ini.</div>}</td></tr>}
  </>;
}

function monitorSessionLabel(session) {
  const number = Number(session.sessionNumber);
  const date = session.sessionDate ? new Date(`${session.sessionDate}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const title = session.examTitle || 'Ujian';
  return number ? `Sesi ${number}${date ? ` · ${date}` : ''} · ${title}` : title;
}
function statusLabel(status) { return ({ completed: 'SELESAI', not_started: 'BELUM MULAI', locked: 'DIBLOKIR' })[status] || String(status || '').toUpperCase(); }
function eventStatus(event) { return event.code === 'admin_reset' ? 'TINDAKAN PENGAWAS' : event.reviewStatus === 'pending' ? 'MENUNGGU TINJAUAN' : event.reviewStatus === 'confirmed' ? 'DIKONFIRMASI' : 'FALSE POSITIVE'; }
function formatDate(value) { return value ? new Date(value).toLocaleString('id-ID') : 'Waktu tidak tersedia'; }
