import { useMemo, useState } from 'react';
import { ClipboardList, DoorOpen, Download, Plus, Trash2, Users, X } from 'lucide-react';
import { api } from './api';
import { attendanceSessionLabel, exportAttendancePdf, formatAttendanceTime } from './attendanceExport.js';
import { exportRoom } from './roomExport.js';

const examStatusLabel = status => ({ draft: 'Draf', scheduled: 'Terjadwal', active: 'Berlangsung', completed: 'Selesai' }[status] || status || '—');

export default function ExamRoomsPage({ rooms = [], unassigned = [], classes = [], schoolName = '', busy, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [quotas, setQuotas] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [attendanceExamId, setAttendanceExamId] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');

  const unassignedMap = useMemo(() => new Map(unassigned.map(item => [item.className, Number(item.count) || 0])), [unassigned]);
  const totalStudents = rooms.reduce((total, room) => total + Number(room.studentCount || 0), 0);
  const totalUnassigned = unassigned.reduce((total, item) => total + Number(item.count || 0), 0);

  const openCreate = () => {
    setName('');
    setQuotas({});
    setError('');
    setModal({ mode: 'form', room: null });
  };

  const openEdit = room => {
    setName(room.name);
    setQuotas(Object.fromEntries((room.quotas || []).map(quota => [quota.className, String(quota.count)])));
    setError('');
    setModal({ mode: 'form', room });
  };

  const openDetail = async room => {
    setModal({ mode: 'detail', room });
    setDetail(null);
    setError('');
    setDetailLoading(true);
    try {
      setDetail(await api(`/rooms/${room.id}`));
    } catch (err) {
      setError(err.message || 'Data ruang ujian tidak dapat dimuat.');
    } finally {
      setDetailLoading(false);
    }
  };

  const openAttendance = async room => {
    setModal({ mode: 'attendance', room });
    setAttendance(null);
    setAttendanceExamId('');
    setAttendanceError('');
    setAttendanceLoading(true);
    try {
      const data = await api(`/rooms/${room.id}/attendance`);
      setAttendance(data);
      setAttendanceExamId(data.exam ? String(data.exam.id) : '');
    } catch (err) {
      setAttendanceError(err.message || 'Data absensi tidak dapat dimuat.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const changeAttendanceExam = async event => {
    const examId = event.target.value;
    if (!examId || !modal?.room) return;
    const previousId = attendance?.exam ? String(attendance.exam.id) : '';
    setAttendanceExamId(examId);
    setAttendanceError('');
    setAttendanceLoading(true);
    try {
      const data = await api(`/rooms/${modal.room.id}/attendance?examId=${encodeURIComponent(examId)}`);
      setAttendance(data);
      setAttendanceExamId(data.exam ? String(data.exam.id) : '');
    } catch (err) {
      setAttendanceExamId(previousId);
      setAttendanceError(err.message || 'Absensi ujian tidak dapat dimuat.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const downloadAttendance = () => {
    if (!attendance?.exam) return;
    try {
      exportAttendancePdf({ ...attendance, schoolName });
    } catch (err) {
      setAttendanceError(err.message || 'Absensi tidak dapat diekspor.');
    }
  };

  const submit = async event => {
    event.preventDefault();
    setError('');
    const selected = classes
      .map(className => ({ className, count: Number(quotas[className] || 0) }))
      .filter(quota => quota.count > 0);
    if (!name.trim()) {
      setError('Nama ruang ujian wajib diisi.');
      return;
    }
    if (!selected.length) {
      setError('Isi kuota minimal 1 siswa pada salah satu kelas.');
      return;
    }
    setSaving(true);
    try {
      if (modal?.room) await onUpdate({ id: modal.room.id, name: name.trim(), quotas: selected });
      else await onCreate({ name: name.trim(), quotas: selected });
      setModal(null);
    } catch (err) {
      setError(err.message || 'Ruang ujian tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const download = async room => {
    try {
      const data = await api(`/rooms/${room.id}`);
      exportRoom(data);
    } catch (err) {
      setError(err.message || 'Ruang ujian tidak dapat diekspor.');
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModal(null);
    setDetail(null);
    setAttendance(null);
    setAttendanceExamId('');
    setAttendanceError('');
    setError('');
  };

  return <>
    <div className="page-title-row">
      <div>
        <div className="eyebrow">MANAJEMEN RUANG</div>
        <h1>Ruang ujian</h1>
        <p>Plotting siswa otomatis berdasarkan kuota per kelas. Ujian dan pengawas mengikuti ruang ini.</p>
      </div>
      <button className="primary" onClick={openCreate}><Plus size={17}/> Buat ruang ujian</button>
    </div>
    {error && !modal && <div className="question-form-error" role="alert">{error}</div>}
    <section className="panel full-panel">
      <div className="panel-head">
        <div>
          <h2>Daftar ruang</h2>
          <p>{rooms.length} ruang · {totalStudents} siswa terplotting · {totalUnassigned} siswa belum mendapat ruang</p>
        </div>
      </div>
      <div className="student-table wide room-table">
        <div className="table-row table-label">
          <span>NAMA RUANG</span>
          <span>KUOTA KELAS</span>
          <span>SISWA</span>
          <span>SEBARAN KELAS</span>
          <span style={{textAlign:'right'}}>AKSI</span>
        </div>
        {rooms.map(room => <div className="table-row" key={room.id}>
          <span className="student-name"><DoorOpen size={16}/> {room.name}</span>
          <span>{(room.quotas || []).map(quota => `${quota.className}: ${quota.count}`).join(' · ') || 'Belum diatur'}</span>
          <span><Users size={13}/> {room.studentCount} siswa</span>
          <span>{(room.classCounts || []).map(item => `${item.className} (${item.count})`).join(' · ') || '-'}</span>
          <span className="teacher-account-actions room-actions">
            <button className="secondary" onClick={() => openAttendance(room)}><ClipboardList size={13}/> Absensi</button>
            <button className="secondary" onClick={() => openDetail(room)}>Lihat siswa</button>
            <button className="secondary" onClick={() => openEdit(room)}>Atur</button>
            <button className="secondary" onClick={() => download(room)}><Download size={13}/> Excel</button>
            <button className="teacher-delete-button" aria-label={`Hapus ${room.name}`} onClick={() => onDelete(room)}><Trash2 size={13}/> Hapus</button>
          </span>
        </div>)}
        {!rooms.length && <div className="room-empty"><DoorOpen size={22}/><b>Belum ada ruang ujian</b><span>Buat ruang pertama dan tentukan kuota siswa dari setiap kelas.</span></div>}
      </div>
    </section>

    {modal?.mode === 'form' && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeModal()}>
      <form className="modal room-modal" onSubmit={submit}>
        <div className="modal-head">
          <div><div className="eyebrow">PLOTTING PESERTA</div><h2>{modal.room ? `Atur ${modal.room.name}` : 'Buat ruang ujian'}</h2></div>
          <button type="button" className="icon-button" onClick={closeModal}><X size={18}/></button>
        </div>
        <label>Nama ruang ujian<input autoFocus maxLength="60" value={name} onChange={event => setName(event.target.value)} placeholder="Contoh: Ruang 01" required/></label>
        <div className="room-quota-head">
          <b>Kuota siswa per kelas</b>
          <small>Sistem mengambil siswa yang belum mendapat ruang, berurutan sesuai nama.</small>
        </div>
        <div className="room-quota-grid">
          {classes.map(className => <label className="room-quota-row" key={className}>
            <span>{className}<small>{unassignedMap.get(className) ?? 0} siswa belum terplotting</small></span>
            <input type="number" min="0" max="1000" step="1" inputMode="numeric" value={quotas[className] ?? ''} onChange={event => setQuotas(current => ({ ...current, [className]: event.target.value }))} placeholder="0"/>
          </label>)}
        </div>
        <div className="form-note">Siswa yang sudah memiliki ruang tidak akan diambil lagi. Mengubah ruang akan mem-plotting ulang siswa pada ruang ini.</div>
        {error && <div className="question-form-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary" disabled={saving} onClick={closeModal}>Batal</button>
          <button type="submit" className="primary" disabled={saving || busy}>{saving ? 'Menyimpan…' : 'Simpan ruang'}</button>
        </div>
      </form>
    </div>}

    {modal?.mode === 'attendance' && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeModal()}>
      <div className="modal attendance-modal">
        <div className="modal-head">
          <div><div className="eyebrow">ABSENSI PESERTA</div><h2>{modal.room.name}</h2></div>
          <button type="button" className="icon-button" onClick={closeModal}><X size={18}/></button>
        </div>

        {attendanceLoading && !attendance ? <div className="room-empty"><ClipboardList size={22}/><span>Memuat data absensi…</span></div>
          : attendanceError && !attendance ? <div className="question-form-error" role="alert">{attendanceError}</div>
            : attendance ? <>
              {attendance.exams.length > 0 && <label className="attendance-picker">Ujian
                <select value={attendanceExamId} onChange={changeAttendanceExam} disabled={attendanceLoading}>
                  {attendance.exams.map(exam => <option key={exam.id} value={exam.id}>
                    {exam.title} — {attendanceSessionLabel(exam)} ({examStatusLabel(exam.status)})
                  </option>)}
                </select>
              </label>}

              {attendanceLoading ? <div className="room-empty"><span>Memuat absensi ujian…</span></div>
                : !attendance.exams.length ? <div className="room-empty"><ClipboardList size={22}/><b>Belum ada ujian pada ruang ini</b><span>Hubungkan ujian ke ruang agar absensi peserta dapat dicatat.</span></div>
                  : attendance.exam ? <>
                    {attendanceError && <div className="question-form-error" role="alert">{attendanceError}</div>}
                    <div className="attendance-summary">
                      <div className="attendance-stat present"><span>Hadir</span><b>{attendance.summary.present}</b></div>
                      <div className="attendance-stat absent"><span>Alpa</span><b>{attendance.summary.absent}</b></div>
                      <div className="attendance-stat"><span>Total peserta</span><b>{attendance.summary.total}</b></div>
                    </div>
                    <div className="attendance-meta">
                      <span>{attendance.exam.subject || 'Mata pelajaran —'}</span>
                      <span>{attendance.exam.className || 'Kelas —'}</span>
                      <span>{attendanceSessionLabel(attendance.exam)}</span>
                      <span>Status: {examStatusLabel(attendance.exam.status)}</span>
                    </div>
                    <div className="attendance-table-wrap">
                      <table className="attendance-table">
                        <thead><tr><th>No</th><th>Nama siswa</th><th>Kelas</th><th>Sesi ujian</th><th>Status</th><th>Masuk</th></tr></thead>
                        <tbody>
                          {attendance.students.map((student, index) => <tr key={student.sessionId}>
                            <td className="number">{index + 1}</td>
                            <td className="name">{student.name}</td>
                            <td>{student.className}</td>
                            <td>{attendanceSessionLabel(attendance.exam)}</td>
                            <td><span className={`attendance-status ${student.present ? 'present' : 'absent'}`}>{student.present ? 'Hadir' : 'Alpa'}</span></td>
                            <td className="time">{student.present ? formatAttendanceTime(student.startedAt) : '—'}</td>
                          </tr>)}
                          {!attendance.students.length && <tr><td colSpan="6" className="attendance-empty">Tidak ada peserta pada ujian ini.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    {attendance.canExport
                      ? <div className="attendance-note export">Dialog cetak akan terbuka. Pilih “Simpan sebagai PDF”.</div>
                      : <div className="attendance-note">Ekspor PDF aktif setelah seluruh sesi ujian selesai.</div>}
                  </> : <div className="question-form-error" role="alert">Ujian tidak ditemukan pada ruang ini.</div>}
            </> : null}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={closeModal}>Tutup</button>
          <button type="button" className="primary" disabled={!attendance?.canExport || !attendance?.students?.length} onClick={downloadAttendance} title={attendance?.canExport ? 'Buka dialog cetak untuk menyimpan PDF' : 'Aktif setelah seluruh sesi ujian selesai'}>
            <Download size={14}/> Ekspor PDF
          </button>
        </div>
      </div>
    </div>}

    {modal?.mode === 'detail' && <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && closeModal()}>
      <div className="modal room-modal room-detail-modal">
        <div className="modal-head">
          <div><div className="eyebrow">PESERTA RUANG</div><h2>{modal.room.name}</h2></div>
          <button type="button" className="icon-button" onClick={closeModal}><X size={18}/></button>
        </div>
        {detailLoading ? <div className="room-empty"><span>Memuat daftar siswa…</span></div> : detail ? <>
          <div className="room-detail-meta">
            <span><Users size={14}/> {detail.students?.length || 0} siswa</span>
            <span>{(detail.quotas || []).map(quota => `${quota.className}: ${quota.count}`).join(' · ')}</span>
          </div>
          <div className="room-student-list">
            {detail.students?.map((student, index) => <div className="room-student-row" key={student.id}>
              <i>{index + 1}</i>
              <b>{student.name}</b>
              <span>{student.className}</span>
              <code>{student.username}</code>
            </div>)}
            {!detail.students?.length && <div className="room-empty"><span>Belum ada siswa pada ruang ini.</span></div>}
          </div>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={() => download(modal.room)}><Download size={14}/> Excel</button>
            <button type="button" className="primary" onClick={closeModal}>Tutup</button>
          </div>
        </> : <div className="question-form-error" role="alert">{error || 'Data ruang tidak tersedia.'}</div>}
      </div>
    </div>}
  </>;
}
