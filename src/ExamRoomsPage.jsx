import { useMemo, useState } from 'react';
import { DoorOpen, Download, Plus, Trash2, Users, X } from 'lucide-react';
import { api } from './api';
import { exportRoom } from './roomExport.js';

export default function ExamRoomsPage({ rooms = [], unassigned = [], classes = [], busy, onCreate, onUpdate, onDelete }) {
  const [modal, setModal] = useState(null);
  const [name, setName] = useState('');
  const [quotas, setQuotas] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
      <div className="student-table wide">
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
          <span className="teacher-account-actions">
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
