import { useState } from 'react';
import { Check, KeyRound, Plus, X } from 'lucide-react';

export default function TeacherCreateForm({ teacher, classes, subjects, exams = [], rooms = [], tenancyEnabled = false, busy, error, onSave, onCancel }) {
  const [role, setRole] = useState(teacher?.role || 'teacher');
  const [name, setName] = useState(teacher?.name || '');
  const [username, setUsername] = useState(teacher?.username || '');
  const [email, setEmail] = useState(teacher?.email || '');
  const [password, setPassword] = useState('');
  const [selectedClasses, setSelectedClasses] = useState(teacher?.classes || []);
  const [selectedSubjects, setSelectedSubjects] = useState((teacher?.subjectIds || []).map(String));
  const [selectedExams, setSelectedExams] = useState((teacher?.exams || []).map(exam => String(exam.id)));
  const [selectedRooms, setSelectedRooms] = useState((teacher?.rooms || []).map(room => String(room.id)));

  const toggle = (values, value, setValues) => setValues(current => current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value]);

  const submit = event => {
    event.preventDefault();
    const access = {
      role,
      classes: selectedClasses,
      subjectIds: selectedSubjects.map(Number),
      examIds: selectedExams.map(Number),
      roomIds: selectedRooms.map(Number),
    };
    onSave(teacher ? { id: teacher.id, ...access } : { name, username, email, password, ...access });
  };

  return <form className="teacher-create-form" onSubmit={submit}>
    {teacher ? <div className="teacher-account-summary"><b>{teacher.name}</b><code>{teacher.username}</code><small>Password tidak diubah saat mengatur akses.</small></div> : <>
      <label>Nama lengkap guru<input autoFocus maxLength="120" value={name} onChange={event => setName(event.target.value)} placeholder="Nama guru" required/></label>
      <label>Username akses<input autoComplete="off" maxLength="40" value={username} onChange={event => setUsername(event.target.value)} placeholder="Contoh: guru.matematika" pattern="[A-Za-z0-9._-]{3,40}" required/><small>Dipakai guru untuk masuk ke platform.</small></label>
      {tenancyEnabled&&<label>Email login guru<input type="email" autoComplete="email" maxLength="254" value={email} onChange={event=>setEmail(event.target.value)} required/></label>}
      <label>Password awal<input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={password} onChange={event => setPassword(event.target.value)} required/></label>
    </>}
    <label>Role staf<select value={role} onChange={event => setRole(event.target.value)}><option value="teacher">Guru</option><option value="pengawas">Pengawas</option></select><small>{role === 'pengawas' ? 'Pengawas mengikuti ruang ujian dan sesi yang dipilih di sini.' : 'Akses akademik mengikuti kelas dan mata pelajaran yang dipilih.'}</small></label>
    {role === 'pengawas' && <fieldset><legend>Ruang ujian yang diawasi <span className="legend-count">{selectedRooms.length} dipilih</span></legend>
      {rooms.length ? <div className="teacher-access-options">{rooms.map(room => {
        const isSelected = selectedRooms.includes(String(room.id));
        return <label key={room.id} className={`teacher-access-item${isSelected ? ' selected' : ''}`}><input type="checkbox" checked={isSelected} onChange={() => toggle(selectedRooms, String(room.id), setSelectedRooms)}/><span className="access-badge">{isSelected ? <Check size={12}/> : <Plus size={12}/>}</span><span className="access-label-text">{room.name}</span></label>;
      })}</div> : <div className="form-note">Belum ada ruang ujian. Buat plotting di menu Ruang Ujian terlebih dahulu.</div>}
      <div className="form-note"><KeyRound size={15}/> Ujian yang memakai ruang terpilih otomatis dapat dipantau pengawas ini.</div>
    </fieldset>}
    {role === 'pengawas' && <fieldset><legend>Sesi ujian tambahan <span className="legend-count">{selectedExams.length} dipilih</span></legend>
      {exams.length ? <div className="teacher-access-options">{exams.map(exam => {
        const isSelected = selectedExams.includes(String(exam.id));
        return <label key={exam.id} className={`teacher-access-item${isSelected ? ' selected' : ''}`}><input type="checkbox" checked={isSelected} onChange={() => toggle(selectedExams, String(exam.id), setSelectedExams)}/><span className="access-badge">{isSelected ? <Check size={12}/> : <Plus size={12}/>}</span><span className="access-label-text">{exam.title} · {exam.className}</span></label>;
      })}</div> : <div className="form-note">Belum ada sesi ujian.</div>}
      <div className="form-note"><KeyRound size={15}/> Opsional: beri akses ke sesi tertentu di luar ruang yang diawasi.</div>
    </fieldset>}
    {role === 'teacher' && <><fieldset><legend>Kelas yang boleh diakses <span className="legend-count">{selectedClasses.length} dipilih</span></legend><div className="teacher-access-options">{classes.map(className => {
      const isSelected = selectedClasses.includes(className);
      return <label key={className} className={`teacher-access-item${isSelected ? ' selected' : ''}`}><input type="checkbox" checked={isSelected} onChange={() => toggle(selectedClasses, className, setSelectedClasses)}/><span className="access-badge">{isSelected ? <Check size={12}/> : <Plus size={12}/>}</span><span className="access-label-text">{className}</span></label>;
    })}</div></fieldset>
    <fieldset><legend>Mata pelajaran yang boleh diakses <span className="legend-count">{selectedSubjects.length} dipilih</span></legend><div className="teacher-access-options">{subjects.map(subject => {
      const isSelected = selectedSubjects.includes(String(subject.id));
      return <label key={subject.id} className={`teacher-access-item${isSelected ? ' selected' : ''}`}><input type="checkbox" checked={isSelected} onChange={() => toggle(selectedSubjects, String(subject.id), setSelectedSubjects)}/><span className="access-badge">{isSelected ? <Check size={12}/> : <Plus size={12}/>}</span><span className="access-label-text">{subject.name}</span></label>;
    })}</div></fieldset>
    <div className="form-note"><KeyRound size={15}/> Guru hanya dapat membuka data dan membuat bank pada kombinasi kelas dan mata pelajaran yang dipilih.</div></>}
    {error && <div className="question-form-error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}><X size={14}/> Batal</button><button type="submit" className="primary" disabled={busy || (role === 'teacher' && (!selectedClasses.length || !selectedSubjects.length))}>{busy ? 'Menyimpan…' : teacher ? 'Simpan akses' : 'Buat akun staf'}</button></div>
  </form>;
}
