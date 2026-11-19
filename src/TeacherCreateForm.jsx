import { useState } from 'react';
import { Check, KeyRound, Plus, Search, X } from 'lucide-react';

function bankMatchesAccess(bank, classes = [], subjectIds = []) {
  const subjectId = String(bank.subjectId ?? bank.subject_id ?? '');
  if (!subjectIds.map(String).includes(subjectId)) return false;
  const grade = String(bank.grade || '').trim();
  if (!grade) return false;
  return classes.some(className => {
    const normalized = String(className).trim().replace(/^(kelas|kls|class)\s*[-:]?\s*/i, '');
    return normalized === grade || normalized.startsWith(grade + ' ') || normalized.startsWith(grade + '-');
  });
}

function initials(name = '') {
  return String(name).split(' ').filter(Boolean).map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'ST';
}

export default function TeacherCreateForm({ teacher, classes, subjects, exams = [], rooms = [], banks = [], tenancyEnabled = false, busy, error, onSave, onCancel }) {
  const [role, setRole] = useState(teacher?.role || 'teacher');
  const [name, setName] = useState(teacher?.name || '');
  const [username, setUsername] = useState(teacher?.username || '');
  const [email, setEmail] = useState(teacher?.email || '');
  const [password, setPassword] = useState('');
  const [selectedClasses, setSelectedClasses] = useState(teacher?.classes || []);
  const [selectedSubjects, setSelectedSubjects] = useState((teacher?.subjectIds || []).map(String));
  const [selectedExams, setSelectedExams] = useState((teacher?.exams || []).map(exam => String(exam.id)));
  const [selectedRooms, setSelectedRooms] = useState((teacher?.rooms || []).map(room => String(room.id)));
  const [selectedBanks, setSelectedBanks] = useState(() => (teacher
    ? (teacher.banks || []).filter(bank => bank.source !== 'excluded')
    : []).map(bank => String(bank.id)));
  const [excludedBanks, setExcludedBanks] = useState(() => (teacher
    ? (teacher.banks || []).filter(bank => bank.source === 'excluded')
    : []).map(bank => String(bank.id)));
  const [autoBankIds, setAutoBankIds] = useState(() => (teacher
    ? (teacher.banks || []).filter(bank => bank.source === 'auto')
    : []).map(bank => String(bank.id)));
  const [subjectQuery, setSubjectQuery] = useState('');
  const [bankQuery, setBankQuery] = useState('');

  const visibleSubjects = subjects.filter(subject => String(subject.name || '').toLowerCase().includes(subjectQuery.trim().toLowerCase()));
  const visibleBanks = banks.filter(bank => [bank.subject, bank.grade, bank.topic]
    .map(value => String(value || '')).join(' ').toLowerCase().includes(bankQuery.trim().toLowerCase()));

  const toggle = (values, value, setValues) => setValues(current => current.includes(value)
    ? current.filter(item => item !== value)
    : [...current, value]);

  // Bank yang cocok dengan kelas + mapel terpilih otomatis dicentang,
  // kecuali admin sudah melepasnya secara manual.
  const reconcileBanks = (nextClasses, nextSubjects) => {
    const eligibleIds = banks
      .filter(bank => bankMatchesAccess(bank, nextClasses, nextSubjects))
      .map(bank => String(bank.id));
    const nextAutoIds = eligibleIds.filter(id => !excludedBanks.includes(id));
    setSelectedBanks(current => {
      const manualIds = current.filter(id => !autoBankIds.includes(id));
      return [...new Set([...manualIds, ...nextAutoIds])];
    });
    setAutoBankIds(nextAutoIds);
  };

  const updateBanks = (ids, selected) => {
    const idSet = new Set(ids.map(String));
    setSelectedBanks(current => selected
      ? [...new Set([...current, ...idSet])]
      : current.filter(id => !idSet.has(id)));
    setExcludedBanks(current => selected
      ? current.filter(id => !idSet.has(id))
      : [...new Set([...current, ...idSet])]);
    setAutoBankIds(current => current.filter(id => !idSet.has(id)));
  };

  const toggleClass = className => {
    const next = selectedClasses.includes(className) ? selectedClasses.filter(item => item !== className) : [...selectedClasses, className];
    setSelectedClasses(next);
    reconcileBanks(next, selectedSubjects);
  };

  const toggleSubject = subjectId => {
    const next = selectedSubjects.includes(subjectId) ? selectedSubjects.filter(item => item !== subjectId) : [...selectedSubjects, subjectId];
    setSelectedSubjects(next);
    reconcileBanks(selectedClasses, next);
  };

  const toggleBank = bankId => updateBanks([bankId], !selectedBanks.includes(bankId));

  const selectAllClasses = () => {
    const next = [...new Set([...selectedClasses, ...classes])];
    setSelectedClasses(next);
    reconcileBanks(next, selectedSubjects);
  };
  const clearClasses = () => setSelectedClasses([]);

  const selectAllSubjects = () => {
    const next = [...new Set([...selectedSubjects, ...visibleSubjects.map(subject => String(subject.id))])];
    setSelectedSubjects(next);
    reconcileBanks(selectedClasses, next);
  };
  const clearSubjects = () => setSelectedSubjects([]);

  const selectAllBanks = () => updateBanks(visibleBanks.map(bank => String(bank.id)), true);
  const clearBanks = () => updateBanks(banks.map(bank => String(bank.id)), false);

  const submit = event => {
    event.preventDefault();
    const access = {
      role,
      classes: selectedClasses,
      subjectIds: selectedSubjects.map(Number),
      examIds: selectedExams.map(Number),
      roomIds: selectedRooms.map(Number),
      bankIds: role === 'teacher' ? selectedBanks.map(Number) : [],
    };
    onSave(teacher ? { id: teacher.id, ...access } : { name, username, email, password, ...access });
  };

  return <form className="teacher-create-form staff-access-form" onSubmit={submit}>
    {teacher ? <div className="staff-account-card">
      <span className="staff-avatar">{initials(teacher.name)}</span>
      <div className="staff-account-copy">
        <b>{teacher.name}</b>
        <span><code>{teacher.username}</code><em>{role === 'pengawas' ? 'Pengawas' : 'Guru'}</em></span>
        <small>Password tidak diubah saat mengatur akses.</small>
      </div>
    </div> : <section className="staff-form-section">
      <header className="staff-form-section-head"><div><h3>Akun staf</h3><p>Isi identitas dan kredensial login staf.</p></div></header>
      <div className="staff-field-grid">
        <label className="staff-field staff-field-wide">Nama lengkap<input autoFocus maxLength="120" value={name} onChange={event => setName(event.target.value)} placeholder="Nama guru" required /></label>
        <label className="staff-field">Username akses<input autoComplete="off" maxLength="40" value={username} onChange={event => setUsername(event.target.value)} placeholder="Contoh: guru.matematika" pattern="[A-Za-z0-9._-]{3,40}" required /><small>Dipakai untuk masuk ke platform, 3–40 karakter.</small></label>
        {tenancyEnabled && <label className="staff-field">Email login<input type="email" autoComplete="email" maxLength="254" value={email} onChange={event => setEmail(event.target.value)} required /></label>}
        <label className="staff-field">Password awal<input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={password} onChange={event => setPassword(event.target.value)} required /><small>Minimal 8 karakter.</small></label>
      </div>
    </section>}

    <section className="staff-form-section">
      <header className="staff-form-section-head"><div><h3>Role staf</h3><p>Role menentukan modul dan data yang dapat diakses.</p></div></header>
      <div className="staff-role-picker" role="radiogroup" aria-label="Role staf">
        {[['teacher', 'Guru', 'Mengajar, membuat bank soal, dan menyusun ujian.'], ['pengawas', 'Pengawas', 'Memantau ujian pada ruang atau sesi yang ditugaskan.']].map(([value, label, description]) => (
          <button key={value} type="button" role="radio" aria-checked={role === value} className={`staff-role-option${role === value ? ' selected' : ''}`} onClick={() => setRole(value)}>
            <span className="staff-role-radio" />
            <span><b>{label}</b><small>{description}</small></span>
          </button>
        ))}
      </div>
    </section>

    {role === 'pengawas' && <div className="staff-access-columns">
      <AccessSection title="Ruang ujian yang diawasi" description="Ujian yang memakai ruang ini otomatis dapat dipantau." count={selectedRooms.length}
        toolbar={<BulkActions onSelectAll={() => setSelectedRooms(rooms.map(room => String(room.id)))} onClear={() => setSelectedRooms([])} />}>
        {rooms.length ? <div className="staff-choice-grid scroll">{rooms.map(room => {
          const isSelected = selectedRooms.includes(String(room.id));
          return <Choice key={room.id} selected={isSelected} onToggle={() => toggle(selectedRooms, String(room.id), setSelectedRooms)}>
            <b>{room.name}</b>
            <small>{room.studentCount ?? 0} siswa terplotting</small>
          </Choice>;
        })}</div> : <div className="staff-empty">Belum ada ruang ujian. Buat plotting di menu Ruang Ujian terlebih dahulu.</div>}
      </AccessSection>
      <AccessSection title="Sesi ujian tambahan" description="Opsional, untuk sesi di luar ruang yang diawasi." count={selectedExams.length}
        toolbar={<BulkActions onSelectAll={() => setSelectedExams(exams.map(exam => String(exam.id)))} onClear={() => setSelectedExams([])} />}>
        {exams.length ? <div className="staff-choice-grid scroll">{exams.map(exam => {
          const isSelected = selectedExams.includes(String(exam.id));
          return <Choice key={exam.id} selected={isSelected} onToggle={() => toggle(selectedExams, String(exam.id), setSelectedExams)}>
            <b>{exam.title}</b>
            <small>{exam.className}{exam.sessionDate ? ` · Sesi ${exam.sessionNumber}` : ''}</small>
          </Choice>;
        })}</div> : <div className="staff-empty">Belum ada sesi ujian.</div>}
      </AccessSection>
    </div>}

    {role === 'teacher' && <>
      <div className="staff-access-columns">
        <AccessSection title="Kelas yang boleh diakses" description="Data siswa pada kelas ini dapat dibuka guru." count={selectedClasses.length}
          toolbar={<BulkActions onSelectAll={selectAllClasses} onClear={clearClasses} />}>
          <div className="staff-choice-grid">{classes.map(className => {
            const isSelected = selectedClasses.includes(className);
            return <Choice key={className} selected={isSelected} onToggle={() => toggleClass(className)}>
              <b>{className}</b>
            </Choice>;
          })}</div>
        </AccessSection>

        <AccessSection title="Mata pelajaran yang boleh diakses" description="Guru dapat membuat dan mengelola bank pada mapel ini." count={selectedSubjects.length}
          toolbar={<>
            <label className="staff-search"><Search size={14} /><input value={subjectQuery} onChange={event => setSubjectQuery(event.target.value)} placeholder="Cari mata pelajaran..." /></label>
            <BulkActions onSelectAll={selectAllSubjects} onClear={clearSubjects} />
          </>}>
          {visibleSubjects.length ? <div className="staff-choice-grid scroll">{visibleSubjects.map(subject => {
            const isSelected = selectedSubjects.includes(String(subject.id));
            return <Choice key={subject.id} selected={isSelected} onToggle={() => toggleSubject(String(subject.id))}>
              <b>{subject.name}</b>
            </Choice>;
          })}</div> : <div className="staff-empty">{subjects.length ? 'Tidak ada mata pelajaran yang sesuai pencarian.' : 'Belum ada mata pelajaran. Tambahkan di menu Mata Pelajaran.'}</div>}
        </AccessSection>
      </div>

      <AccessSection title="Bank soal yang boleh diakses" description="Centang bank yang boleh dibuka guru. Bank yang cocok dengan kelas dan mapel terpilih otomatis dicentang." count={selectedBanks.length}
        className="staff-bank-card"
        toolbar={<>
          <label className="staff-search"><Search size={14} /><input value={bankQuery} onChange={event => setBankQuery(event.target.value)} placeholder="Cari mapel, tingkat, atau topik bank..." /></label>
          <BulkActions onSelectAll={selectAllBanks} onClear={clearBanks} />
        </>}
        note={<><KeyRound size={14} /> Bank baru otomatis terhubung sesuai mata pelajaran dan tingkat. Lepas centang untuk mengecualikan guru ini dari bank tersebut.</>}>
        {visibleBanks.length ? <div className="staff-choice-grid staff-bank-grid">{visibleBanks.map(bank => {
          const isSelected = selectedBanks.includes(String(bank.id));
          return <Choice key={bank.id} selected={isSelected} onToggle={() => toggleBank(String(bank.id))}>
            <b>{bank.subject}</b>
            <span>{bank.topic}</span>
            <small>Kelas {bank.grade} · {bank.count ?? 0} soal · {bank.mc ?? 0} PG / {bank.essay ?? 0} essay</small>
          </Choice>;
        })}</div> : <div className="staff-empty">{banks.length ? 'Tidak ada bank soal yang sesuai pencarian.' : 'Belum ada bank soal. Buat bank soal terlebih dahulu di menu Bank Soal.'}</div>}
      </AccessSection>
    </>}

    {error && <div className="question-form-error" role="alert">{error}</div>}
    <div className="modal-actions staff-form-actions">
      <span className="staff-form-hint">{role === 'teacher' && (!selectedClasses.length || !selectedSubjects.length)
        ? 'Pilih minimal satu kelas dan satu mata pelajaran untuk guru.'
        : 'Perubahan akses berlaku setelah disimpan.'}</span>
      <button type="button" className="secondary" disabled={busy} onClick={onCancel}><X size={14} /> Batal</button>
      <button type="submit" className="primary" disabled={busy || (role === 'teacher' && (!selectedClasses.length || !selectedSubjects.length))}>
        {busy ? 'Menyimpan…' : teacher ? 'Simpan akses' : 'Buat akun staf'}
      </button>
    </div>
  </form>;
}

function AccessSection({ title, description, count, toolbar, note, className = '', children }) {
  return <section className={`staff-access-card${className ? ` ${className}` : ''}`}>
    <header className="staff-access-head">
      <div><h3>{title}</h3>{description && <p>{description}</p>}</div>
      <span className="staff-access-count">{count} dipilih</span>
    </header>
    {toolbar && <div className="staff-list-toolbar">{toolbar}</div>}
    {children}
    {note && <p className="staff-bank-note">{note}</p>}
  </section>;
}

function Choice({ selected, onToggle, children }) {
  return <label className={`staff-choice${selected ? ' selected' : ''}`}>
    <input type="checkbox" checked={selected} onChange={onToggle} />
    <span className="staff-choice-check">{selected ? <Check size={12} /> : <Plus size={12} />}</span>
    <span className="staff-choice-body">{children}</span>
  </label>;
}

function BulkActions({ onSelectAll, onClear }) {
  return <div className="staff-bulk">
    <button type="button" onClick={onSelectAll}>Pilih semua</button>
    <button type="button" onClick={onClear}>Kosongkan</button>
  </div>;
}
