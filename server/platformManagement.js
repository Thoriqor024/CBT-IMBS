export function createPlatformManagement({ controlPool, createTenantProvisioner, defaultLimit = 25 } = {}) {
  if (!controlPool || typeof controlPool.query !== 'function') {
    throw new TypeError('A control-plane pool is required for platform management.');
  }
  if (defaultLimit && (!Number.isInteger(defaultLimit) || defaultLimit < 1 || defaultLimit > 200)) {
    throw new TypeError('defaultLimit must be an integer between 1 and 200.');
  }

  const listTenants = async ({ status, limit = defaultLimit } = {}) => {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      throw Object.assign(new Error('Batas tenant tidak valid.'), { status: 400, code: 'INVALID_TENANT_LIMIT' });
    }

    const clauses = [];
    const values = [];
    if (status) {
      clauses.push('status = $1');
      values.push(String(status).trim());
    }

    const query = `
      SELECT
        id,
        school_code AS "schoolCode",
        display_name AS "displayName",
        status,
        database_name AS "databaseName",
        database_secret_ref AS "databaseSecretRef",
        schema_version AS "schemaVersion",
        max_students AS "maxStudents",
        max_teachers AS "maxTeachers",
        trial_ends_at AS "trialEndsAt",
        service_ends_at AS "serviceEndsAt",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM control_plane.tenants
      ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1}
    `;

    const result = await controlPool.query(query, [...values, parsedLimit]);
    return result.rows;
  };

  const provisionTenant = async (input) => {
    if (!createTenantProvisioner || typeof createTenantProvisioner.provision !== 'function') {
      throw Object.assign(new Error('Tenant provisioning is not configured for the platform.'), {
        status: 503,
        code: 'TENANT_PROVISIONER_UNAVAILABLE',
      });
    }
    return createTenantProvisioner.provision(input);
  };

  const updateTenant = async ({
    tenantId,
    status,
    maxStudents,
    maxTeachers,
    extendTrialDays,
    serviceEndsAt,
    actorId = null,
  }) => {
    if (!tenantId || typeof tenantId !== 'string') {
      throw Object.assign(new Error('Tenant ID wajib diisi.'), { status: 400, code: 'INVALID_TENANT_ID' });
    }
    const updates = [];
    const values = [];
    const auditDetail = {};

    if (status !== undefined) {
      const validStatuses = ['trial', 'active', 'suspended', 'closed'];
      const normalizedStatus = String(status || '').trim().toLowerCase();
      if (!validStatuses.includes(normalizedStatus)) {
        throw Object.assign(new Error('Status tenant tidak valid.'), { status: 400, code: 'INVALID_TENANT_STATUS' });
      }
      values.push(normalizedStatus);
      updates.push(`status = $${values.length}`);
      auditDetail.newStatus = normalizedStatus;
    }

    if (maxStudents !== undefined) {
      const n = Number(maxStudents);
      if (!Number.isInteger(n) || n < 1 || n > 100000) {
        throw Object.assign(new Error('Batas siswa harus antara 1 sampai 100.000.'), { status: 400, code: 'INVALID_STUDENT_QUOTA' });
      }
      values.push(n);
      updates.push(`max_students = $${values.length}`);
      auditDetail.maxStudents = n;
    }

    if (maxTeachers !== undefined) {
      const n = Number(maxTeachers);
      if (!Number.isInteger(n) || n < 1 || n > 10000) {
        throw Object.assign(new Error('Batas guru harus antara 1 sampai 10.000.'), { status: 400, code: 'INVALID_TEACHER_QUOTA' });
      }
      values.push(n);
      updates.push(`max_teachers = $${values.length}`);
      auditDetail.maxTeachers = n;
    }

    if (extendTrialDays !== undefined) {
      const days = Number(extendTrialDays);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        throw Object.assign(new Error('Perpanjangan masa aktif harus antara 1 sampai 365 hari.'), { status: 400, code: 'INVALID_EXTEND_DAYS' });
      }
      values.push(days);
      updates.push(`trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + ($${values.length}::int * INTERVAL '1 day')`);
      auditDetail.extendedTrialDays = days;
    }

    if (serviceEndsAt !== undefined) {
      const date = new Date(serviceEndsAt);
      if (Number.isNaN(date.getTime())) {
        throw Object.assign(new Error('Format tanggal berakhir layanan tidak valid.'), { status: 400, code: 'INVALID_DATE' });
      }
      values.push(date.toISOString());
      updates.push(`service_ends_at = $${values.length}`);
      auditDetail.serviceEndsAt = date.toISOString();
    }

    if (!updates.length) {
      throw Object.assign(new Error('Tidak ada data yang diperbarui.'), { status: 400, code: 'NO_UPDATES' });
    }

    updates.push('updated_at = NOW()');
    values.push(tenantId);

    const query = `
      UPDATE control_plane.tenants
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, school_code AS "schoolCode", display_name AS "displayName", status,
        max_students AS "maxStudents", max_teachers AS "maxTeachers",
        trial_ends_at AS "trialEndsAt", service_ends_at AS "serviceEndsAt", updated_at AS "updatedAt"
    `;

    const result = await controlPool.query(query, values);
    if (!result.rowCount) {
      throw Object.assign(new Error('Tenant tidak ditemukan.'), { status: 404, code: 'TENANT_NOT_FOUND' });
    }

    await controlPool.query(
      `INSERT INTO control_plane.platform_audit_logs (actor_id, tenant_id, action, detail)
       VALUES ($1, $2, 'tenant.update', $3::jsonb)`,
      [actorId, tenantId, JSON.stringify(auditDetail)],
    );

    return result.rows[0];
  };

  const updateTenantStatus = async ({ tenantId, status, actorId = null }) => {
    return updateTenant({ tenantId, status, actorId });
  };

  return {
    listTenants,
    provisionTenant,
    updateTenant,
    updateTenantStatus,
    provisioningReady: Boolean(createTenantProvisioner && typeof createTenantProvisioner.provision === 'function'),
  };
}
