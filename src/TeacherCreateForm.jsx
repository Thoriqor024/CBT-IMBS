import { useState } from 'react';
import { Check, KeyRound, Plus, X } from 'lucide-react';

export default function TeacherCreateForm({ teacher, classes, subjects, tenancyEnabled = false, busy, error, onSave, onCancel }) {
  const [name, setName] = useState(teacher?.name || '');
  const [username, setUsername] = useState(teacher?.username || '');
  const [email, setEmail] = useState(teacher?.email || '');
  const [password, setPassword] = useState('');
  const [selectedClasses, setSelectedClasses] = useState(teacher?.classes || []);
  const [selectedSubjects, setSelectedSubjects] = useState((teacher?.subjectIds || []).map(String));

  const toggle = (values, value, setValues) => setValues(current => current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value]);

  const submit = event => {
    event.preventDefault();
    onSave(teacher
      ? { id: teacher.id, classes: selectedClasses, subjectIds: selectedSubjects.map(Number) }
      : { name, username, email, password, classes: selectedClasses, subjectIds: selectedSubjects.map(Number) });
  };

  return <form className="teacher-create-form" onSubmit={submit}>
    {teacher ? <div className="teacher-account-summary"><b>{teacher.name}</b><code>{teacher.username}</code><small>Password tidak diubah saat mengatur scope.</small></div> : <>
      <label>Nama lengkap guru<input autoFocus maxLength="120" value={name} onChange={event => setName(event.target.value)} placeholder="Nama guru" required/></label>
      <label>Username akses<input autoComplete="off" maxLength="40" value={username} onChange={event => setUsername(event.target.value)} placeholder="Contoh: guru.matematika" pattern="[A-Za-z0-9._-]{3,40}" required/><small>Dipakai guru untuk masuk ke platform.</small></label>
      {tenancyEnabled&&<label>Email login guru<input type="email" autoComplete="email" maxLength="254" value={email} onChange={event=>setEmail(event.target.value)} required/></label>}
      <label>Password awal<input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={password} onChange={event => setPassword(event.target.value)} required/></label>
    </>}
    <fieldset><legend>Kelas yang boleh diakses</legend><div className="teacher-access-options">{classes.map(className => <label key={className}><input type="checkbox" checked={selectedClasses.includes(className)} onChange={() => toggle(selectedClasses, className, setSelectedClasses)}/><span>{selectedClasses.includes(className) ? <Check size={12}/> : <Plus size={12}/>}</span>{className}</label>)}</div></fieldset>
    <fieldset><legend>Mata pelajaran yang boleh diakses</legend><div className="teacher-access-options">{subjects.map(subject => <label key={subject.id}><input type="checkbox" checked={selectedSubjects.includes(String(subject.id))} onChange={() => toggle(selectedSubjects, String(subject.id), setSelectedSubjects)}/><span>{selectedSubjects.includes(String(subject.id)) ? <Check size={12}/> : <Plus size={12}/>}</span>{subject.name}</label>)}</div></fieldset>
    <div className="form-note"><KeyRound size={15}/> Guru hanya dapat membuka data dan membuat bank pada kombinasi kelas dan mata pelajaran yang dipilih.</div>
    {error && <div className="question-form-error" role="alert">{error}</div>}
    <div className="modal-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}><X size={14}/> Batal</button><button type="submit" className="primary" disabled={busy || !selectedClasses.length || !selectedSubjects.length}>{busy ? 'Menyimpan…' : teacher ? 'Simpan akses' : 'Buat akun guru'}</button></div>
  </form>;
}
