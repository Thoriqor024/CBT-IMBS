# CBT IMBS — PANDUAN TEKNIS & ROADMAP PENGEMBANGAN SAAS
> **Status Dokumen**: Aktif & Mutakhir (Per 15 Oktober 2026, 15:10 WIB)  
> **Target Pengguna Dokumen**: Agen AI Penerus (*Claude Sonnet, GitHub Copilot, Codex, Gemini*) & Pengembang Sistem.

---

## 1. Arsitektur Inti (Core Architecture)

CBT IMBS bertransformasi dari sistem ujian sekolah tunggal menjadi platform **Multi-Tenant SaaS** dengan karakteristik arsitektur berikut:

1. **Model Isolasi**: **Database-per-Tenant** (Isolasi fisik total).
   - Setiap sekolah memiliki basis data terpisah (`cbt_t_<tenant_uuid>`) dan role PostgreSQL khusus (`cbt_a_<tenant_uuid>`).
   - Basis data induk/kontrol: `cbt_control_plane` (role: `cbt_control_app`).
2. **Koneksi Dinamis**:
   - Dikelola oleh `server/tenantDatabaseRouter.js` dengan dynamic connection pooling.
   - Konteks per request dialirkan via `AsyncLocalStorage` di `server/tenantDatabaseContext.js`.
3. **Keamanan & Rahasia (Secrets)**:
   - Kredensial database sekolah disimpan terenkripsi menggunakan AES-GCM 256-bit di tabel `control_plane.tenant_database_secrets`.
   - Master key enkripsi: `secrets/tenant_master.key` (32 bytes).

---

## 2. Status Progres Roadmap Pengerjaan

```
[✓] FASE 1: Otomasi Control-Plane & Docker Orchestration (SELESAI)
[✓] FASE 2: Quota & Entitlement Gatekeeper API (SELESAI)
[✓] FASE 3: UX Subdomain & Tenant Resolution (SELESAI)
[✓] FASE 4: Subscription & Quota Management UI (Platform Owner Console) (SELESAI)
[ ] FASE 5: Pipeline Backup & Restore Per Tenant (BERIKUTNYA)
```

---

## 3. Detail Hasil Pekerjaan FASE 1 (Selesai)

1. **Skrip Init PostgreSQL Otomatis**:
   - File: `docker/postgres-init/01-init-control-plane.sh`
   - Terpasang pada container `cbt-imbs-db` di `/docker-entrypoint-initdb.d/`. Otomatis membuat database `cbt_control_plane` dan role `cbt_control_app` pada bootstrap awal.
2. **Port Binding Database untuk Host**:
   - PostgreSQL container dipetakan ke `127.0.0.1:5433` pada host Windows agar tidak bentrok dengan Postgres lokal port 5432.
3. **Verifikasi & Otomasi Secret**:
   - Skrip: `scripts/ensure-tenant-secrets.mjs` (memastikan key 32 bytes valid).
   - Skrip: `scripts/verify-control-plane.mjs` (memverifikasi koneksi database control-plane, skema, tabel, dan data statistik).
   - Perintah shortcut: `npm run verify:control-plane` dan `npm run secrets:ensure`.
   - **Hasil Uji**: Status Control Plane terverifikasi 100% siap.

---

## 4. Detail Hasil Pekerjaan FASE 2 (Selesai)

1. **Helper Kuota** — `server/tenantQuota.js`:
   - `assertStudentQuota({ currentCount, additionalCount, maxStudents })` → lempar error `403` + code `TENANT_STUDENT_QUOTA_EXCEEDED`
   - `assertTeacherQuota({ currentCount, additionalCount, maxTeachers })` → lempar error `403` + code `TENANT_TEACHER_QUOTA_EXCEEDED`
   - Unit test: `server/tenantQuota.test.js`

2. **Penegakan Kuota di `server/index.js`**:
   - `POST /api/students`: cek `tenant.maxStudents` sebelum INSERT
   - `POST /api/students/import`: cek kuota batch sebelum INSERT
   - `POST /api/teachers`: cek `tenant.maxTeachers` sebelum INSERT

3. **Info Kuota di `GET /api/dashboard`**:
   - Mengembalikan field `quota: { maxStudents, maxTeachers, status, trialEndsAt, serviceEndsAt }` ketika tenant mode aktif.

4. **Graceful Expired/Suspended** — `server/tenantDatabaseRouter.js`:
   - `ensureTenantEntitled()` melempar error informatif dalam Bahasa Indonesia (`TENANT_SERVICE_UNCONFIGURED`, `TENANT_SERVICE_EXPIRED`, `TENANT_INACTIVE`).

5. **Tampilan Kuota di UI** — `src/App.jsx`:
   - Dashboard: Banner "Paket SaaS Aktif" + status kuota siswa/guru.
   - Halaman Siswa: Indikator batas kuota paket.
   - Halaman Guru: Indikator batas kuota paket guru.

---

## 5. Detail Hasil Pekerjaan FASE 3 (Selesai)

1. **Modul Tenant Discovery** — `src/tenantDiscovery.js`:
   - `detectSchoolCodeFromHost(hostname)`: Otomatis mendeteksi subdomain sekolah (misal `sekolah-a.cbtimbs.com` atau `demo.localhost`), sambil mengabaikan raw IP, `localhost`, dan domain publik generic (`www`, `cbt`, `api`, `app`).
   - `getInitialSchoolCode(storage, host)`: Mengambil kode sekolah dengan hierarki prioritas: Subdomain > `localStorage.getItem('cbt_last_school_code')` > string kosong.
   - `saveLastSchoolCode(code, storage)`: Menyimpan kode sekolah terverifikasi ke `localStorage` untuk sesi berikutnya.
   - Unit test: `src/tenantDiscovery.test.js` (4 kasus uji).

2. **Integrasi Client API & Login Form**:
   - `src/api.js`: Otomatis menyematkan header `X-School-Code` pada setiap request API jika kode sekolah terdeteksi dari subdomain atau tersimpan di `localStorage`.
   - `src/App.jsx` (fungsi `Login`): Form login otomatis mengisi input `schoolCode` dari subdomain atau `localStorage`. Bila kode sekolah sudah terisi, cursor focus otomatis diarahkan langsung ke input email/username.
   - `src/App.jsx` (fungsi `login`): Saat login berhasil, `saveLastSchoolCode` dipanggil untuk memperbarui memori peramban.

3. **Dukungan Server Context Header**:
   - `server/tenantDatabaseContext.js`: Middleware login membaca `req.body?.schoolCode || req.headers?.['x-school-code']`.
   - Unit test: `server/tenantDatabaseContext.test.js` diperbarui dengan verifikasi header fallback.
   - **Hasil Uji**: **80/80 unit tests lulus (0 fail)**.

---

## 6. Rute Pengerjaan Berikutnya: FASE 4 (Subscription & Quota Management UI)

Agen AI berikutnya harus berfokus pada **FASE 4**.

### Sasaran & Tugas Fase 4:

1. **Endpoint Pembaruan Tenant (Backend)**:
   - File: `server/index.js` & `server/platformManagement.js`.
   - Tambahkan route `PATCH /api/platform/tenants/:id` (dengan middleware `platformOwnerOnly`).
   - Menerima payload:
     - `maxStudents` (integer positif)
     - `maxTeachers` (integer positif)
     - `extendTrialDays` (integer hari perpanjangan) atau `serviceEndsAt` (ISO date)
     - `status` ('active', 'trial', 'suspended', 'expired')
   - Jalankan parameterized query ke `control_plane.tenants` menggunakan `controlPool`.
   - Catat log perubahan ke `control_plane.platform_audit_logs`.

2. **Komponen Modal Edit Kuota (Frontend)**:
   - File: `src/App.jsx` pada komponen `PlatformOwnerConsole`.
   - Tambahkan tombol "Ubah Paket & Kuota" pada setiap baris di tabel `Daftar tenant / sekolah terdaftar`.
   - Buka modal yang berisi form edit:
     - Batas Siswa (`maxStudents`)
     - Batas Guru (`maxTeachers`)
     - Tambah Masa Aktif (+ Hari)
     - Status Tenant (dropdown: Active, Trial, Suspended)
   - Setelah berhasil simpan, panggil `loadData()` untuk merefresh statistik dashboard control plane.

---

## 7. Rute Pengerjaan Lanjutan: FASE 5 (Backup & Restore Per Tenant)

- **Tujuan**: Menghasilkan backup database mandiri per sekolah.
- **Skrip target**: `scripts/backup-tenant.mjs <schoolCode>`.
- **Fungsi**: Query `control_plane.tenants` untuk mendapatkan `database_name`, jalankan `pg_dump` ke file `.sql.gz`.
- Simpan ke direktori `backups/<schoolCode>/<timestamp>.sql.gz`.

---

## 8. Aturan Penting & Security Invariants (MANDATORY)

Bagi Agen AI yang mengedit kode:

1. **Dilarang merusak sistem anti-curang**:
   - Jangan mengubah logika event listener di `src/StudentPortal.jsx` (`tab_hidden`, `window_blur`, `fullscreen_exit`, `blocked_shortcut`, `clipboard`, `context_menu`).
   - Jangan gunakan dialog native `window.confirm()` / `window.alert()` di layar ujian karena akan memicu sinyal `window_blur` palsu.

2. **Dilarang mengubah skema tenant tanpa migrasi**:
   - Setiap perubahan tabel sekolah wajib dicatat di `server/migrations/tenant/`.

3. **Isolasi Query**:
   - Selalu gunakan `pool` dari `tenantDatabaseContext` untuk data operasional sekolah (`public.*`).
   - Gunakan `controlPool` HANYA untuk data control plane (`control_plane.*`).

4. **Status Test Suite**:
   - Jalankan `npm.cmd test` (Windows) sebelum commit.
   - **Target**: 80/80 tests pass, 0 fail. Jangan merge kode yang memecah test.

5. **Build Frontend**:
   - Setelah mengubah file di `src/`, jalankan `npm.cmd run build` dan perbarui static files container Nginx (`docker cp dist/. cbt-imbs:/usr/share/nginx/html/`).
