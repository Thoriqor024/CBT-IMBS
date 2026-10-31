export function assertStudentQuota({ currentCount, additionalCount = 1, maxStudents }) {
  if (!Number.isSafeInteger(maxStudents) || maxStudents <= 0) return;
  const current = Number(currentCount || 0);
  const additional = Number(additionalCount || 0);
  if (current + additional > maxStudents) {
    const remaining = Math.max(0, maxStudents - current);
    const error = new Error(
      additional === 1
        ? `Kuota siswa sekolah telah penuh. Batas maksimal paket Anda adalah ${maxStudents} siswa. Hubungi administrator platform untuk menambah kuota.`
        : `Kuota siswa tidak mencukupi untuk mengimpor ${additional} siswa. Kuota tersisa ${remaining} dari total batas ${maxStudents} siswa.`
    );
    error.status = 403;
    error.code = 'TENANT_STUDENT_QUOTA_EXCEEDED';
    throw error;
  }
}

export function assertTeacherQuota({ currentCount, additionalCount = 1, maxTeachers }) {
  if (!Number.isSafeInteger(maxTeachers) || maxTeachers <= 0) return;
  const current = Number(currentCount || 0);
  const additional = Number(additionalCount || 0);
  if (current + additional > maxTeachers) {
    const error = new Error(
      `Kuota guru sekolah telah penuh. Batas maksimal paket Anda adalah ${maxTeachers} guru. Hubungi administrator platform untuk menambah kuota.`
    );
    error.status = 403;
    error.code = 'TENANT_TEACHER_QUOTA_EXCEEDED';
    throw error;
  }
}

