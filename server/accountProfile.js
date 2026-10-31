const invalidProfile = message => Object.assign(new Error(message), { status: 400 });

export function prepareAccountProfile(body = {}) {
  const name = String(body?.name ?? '').trim();
  const currentPassword = String(body?.currentPassword ?? '');
  const newPassword = String(body?.newPassword ?? '');
  const confirmPassword = String(body?.confirmPassword ?? '');
  const passwordRequested = Boolean(currentPassword || newPassword || confirmPassword);

  if (!name || name.length > 120) throw invalidProfile('Nama wajib diisi dan maksimal 120 karakter.');
  if (passwordRequested && (!currentPassword || !newPassword || !confirmPassword))
    throw invalidProfile('Isi password saat ini, password baru, dan konfirmasi password.');
  if (passwordRequested && (newPassword.length < 8 || newPassword.length > 128))
    throw invalidProfile('Password baru harus berisi 8–128 karakter.');
  if (passwordRequested && newPassword !== confirmPassword)
    throw invalidProfile('Konfirmasi password baru tidak cocok.');

  return { name, currentPassword, newPassword, passwordRequested };
}