import { useState } from 'react';
import { KeyRound, X } from 'lucide-react';

export default function ProfileEditForm({ user, busy, error, onSave, onCancel }) {
  const [name, setName] = useState(user.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordRequested = Boolean(currentPassword || newPassword || confirmPassword);
  const hasChanges = name.trim() !== user.name || passwordRequested;

  const submit = event => {
    event.preventDefault();
    onSave({ name, currentPassword, newPassword, confirmPassword });
  };

  return <form className="profile-edit-form" onSubmit={submit}>
    <label>Nama tampilan
      <input autoFocus maxLength="120" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required/>
    </label>
    <label>Password saat ini
      <input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/>
    </label>
    <label>Password baru
      <input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={newPassword} onChange={event => setNewPassword(event.target.value)}/>
    </label>
    <label>Konfirmasi password baru
      <input type="password" autoComplete="new-password" minLength="8" maxLength="128" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/>
    </label>
    <small><KeyRound size={13}/> Kosongkan semua kolom password jika hanya ingin mengubah nama.</small>
    {error && <div className="question-form-error" role="alert">{error}</div>}
    <div className="modal-actions">
      <button type="button" className="secondary" disabled={busy} onClick={onCancel}><X size={14}/> Batal</button>
      <button type="submit" className="primary" disabled={busy || !name.trim() || !hasChanges}>{busy ? 'Menyimpan…' : 'Simpan profil'}</button>
    </div>
  </form>;
}