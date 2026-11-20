import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, CircleAlert } from 'lucide-react';
import { api } from './api';

const actionLabels = {
  'staff.update': 'Perubahan akses staf',
  'staff.assignment': 'Penugasan pengawas',
  'exam.proctors.set': 'Pengawas ujian',
  'room.create': 'Ruang dibuat',
  'room.update': 'Ruang diperbarui',
  'room.delete': 'Ruang dihapus',
};

function listNames(items, key, fallback) {
  return (items || []).map(item => item?.[key] || `${fallback} #${item?.id ?? '-'}`);
}

function assignmentSummary(row) {
  const detail = row.detail || {};
  if (row.action === 'staff.assignment') {
    const next = [...listNames(detail.exams, 'title', 'Ujian'), ...listNames(detail.rooms, 'name', 'Ruang')];
    const previous = [...listNames(detail.previousExams, 'title', 'Ujian'), ...listNames(detail.previousRooms, 'name', 'Ruang')];
    const parts = [];
    if (next.length) parts.push(`Ditugaskan: ${next.join(', ')}`);
    if (previous.length) parts.push(`Sebelumnya: ${previous.join(', ')}`);
    return parts.join(' · ') || 'Tidak ada sesi atau ruang yang ditugaskan.';
  }
  if (row.action === 'exam.proctors.set') {
    const parts = [];
    if (detail.added?.length) parts.push(`Ditambah: ${detail.added.join(', ')}`);
    if (detail.removed?.length) parts.push(`Dilepas: ${detail.removed.join(', ')}`);
    return `${detail.examTitle || `Ujian #${detail.examId ?? '-'}`}${parts.length ? ` · ${parts.join(' · ')}` : ''}`;
  }
  if (row.action === 'staff.update') {
    const next = detail.next || {};
    const parts = [];
    if (detail.previousRole || detail.role) parts.push(`Peran: ${detail.previousRole || '-'} → ${detail.role || '-'}`);
    if (next.roomNames?.length) parts.push(`Ruang: ${next.roomNames.join(', ')}`);
    if (next.examNames?.length) parts.push(`Sesi: ${next.examNames.join(', ')}`);
    if (next.classNames?.length) parts.push(`Kelas: ${next.classNames.join(', ')}`);
    return parts.join(' · ') || 'Akses staf diperbarui.';
  }
  if (String(row.action).startsWith('room.')) return detail.name ? `Ruang ${detail.name}` : 'Perubahan ruang ujian.';
  return '';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString('id-ID') : '-';
}

export default function AssignmentAuditPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await api('/audit/assignments'));
    } catch (err) {
      setError(err.message || 'Audit penugasan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <>
    <div className="page-title-row">
      <div><div className="eyebrow">JEJAK AUDIT</div><h1>Audit penugasan</h1><p>Riwayat penugasan pengawas, perubahan akses staf, dan perubahan ruang ujian terbaru.</p></div>
      <div className="button-row"><button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Perbarui</button></div>
    </div>
    {error && <div className="monitor-dashboard-error" role="alert"><CircleAlert size={15}/>{error}</div>}
    <section className="panel audit-panel">
      <div className="panel-head"><div><h2>Riwayat penugasan</h2><p>{rows.length} entri terakhir · maksimal 200 entri</p></div><ClipboardList size={16}/></div>
      <div className="student-table wide audit-table"><table><thead><tr><th>WAKTU</th><th>AKTOR</th><th>AKTIVITAS</th><th>RINCIAN</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.id}><td>{formatDate(row.createdAt)}</td><td>{row.actorName}</td><td><span className="audit-action">{actionLabels[row.action] || row.action}</span></td><td className="audit-detail">{assignmentSummary(row)}</td></tr>)}
      </tbody></table>{!rows.length && !loading && <div className="results-table-empty">Belum ada aktivitas penugasan yang tercatat.</div>}{loading && <div className="results-table-empty">Memuat riwayat penugasan…</div>}</div>
    </section>
  </>;
}
