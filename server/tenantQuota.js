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

async function assertQuotaInTransaction(client, { query, maximum, additionalCount, assertQuota, limitKey }) {
  if (!Number.isSafeInteger(maximum) || maximum <= 0) return;
  await client.query('SELECT id FROM school_settings WHERE id=1 FOR UPDATE');
  const result = await client.query(query);
  assertQuota({ currentCount: result.rows[0]?.count, additionalCount, [limitKey]: maximum });
}

export function assertStudentQuotaInTransaction(client, { additionalCount = 1, maxStudents }) {
  return assertQuotaInTransaction(client, {
    query: "SELECT count(*)::int AS count FROM users WHERE role='student' AND active=TRUE",
    maximum: maxStudents,
    additionalCount,
    assertQuota: assertStudentQuota,
    limitKey: 'maxStudents',
  });
}

export function assertTeacherQuotaInTransaction(client, { additionalCount = 1, maxTeachers }) {
  return assertQuotaInTransaction(client, {
    query: "SELECT count(*)::int AS count FROM users WHERE role IN ('teacher','pengawas') AND active=TRUE",
    maximum: maxTeachers,
    additionalCount,
    assertQuota: assertTeacherQuota,
    limitKey: 'maxTeachers',
  });
}

