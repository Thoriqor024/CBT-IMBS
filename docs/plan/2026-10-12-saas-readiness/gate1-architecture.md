# ADR Gate 1: Aplikasi Bersama, Database per Sekolah

Status: **Gate 1 disetujui untuk fondasi Gate 2; rincian operasional lanjutan tetap terbuka**  
Tanggal: 2026-10-12  
Scope: desain SaaS untuk aplikasi CBT utama lokal. AWS dan stack load-test tidak termasuk.

## Keputusan Gate 0 yang Menjadi Input

- Satu aplikasi/API dan infrastruktur komputasi bersama.
- Satu PostgreSQL cluster awal dengan satu database terpisah untuk setiap sekolah.
- Satu pengguna hanya anggota satu sekolah; identitas lokal sekolah disimpan di database tenant.
- Login menemukan tenant memakai kode sekolah lalu email unik di sekolah tersebut dan password.
- Maksimum 10 sekolah; batas awal 400 siswa terdaftar dan 25 guru per sekolah; target 2.000 siswa terdaftar selama 12 bulan.
- Kapasitas yang diminta adalah 400 siswa serentak per sekolah (hingga 4.000 agregat secara teoritis), belum merupakan kapasitas yang telah dibuktikan.
- Harga Rp3.000.000 per semester, trial 2 bulan, dan pembayaran/manual activation oleh pemilik.
- Masa layanan berakhir membuat tenant tidak dapat diakses; data ditahan sampai admin membuka kembali atau menghapusnya. Tidak ada penghapusan otomatis yang disetujui.
- Target awal availability 99% dan p95 API <= 2 detik. SLO login/start saat puncak menunggu benchmark.
- Data ditempatkan di Indonesia; tinjauan privasi/hukum siswa harus selesai sebelum pelanggan eksternal.

## Baseline yang Diperiksa

Database utama lokal diperiksa read-only pada PostgreSQL 17.11. Pada saat pengambilan baseline terdapat 15 tabel:

| Area | Tabel |
|---|---|
| Identitas/akses sekolah | `users`, `teacher_access`, `school_settings`, `subjects` |
| Materi | `question_banks`, `questions`, `question_media` |
| Ujian | `exams`, `exam_sessions`, `exam_questions`, `responses`, `violation_events` |
| Operasi | `audit_logs`, `schema_migrations`, `user_sessions` |

Constraint penting saat ini: `users.username` unik global dalam database; `subjects.name` unik; bank unik menurut `(subject_id, grade, topic)`; sesi unik menurut `(exam_id, student_id)`; `school_settings` dibatasi satu row (`id=1`). Semua ini secara alami menjadi scoped per sekolah jika masing-masing sekolah memakai database berbeda. Login memakai username saat ini; email belum menjadi kolom identitas utama dan memerlukan migrasi saat implementasi.

Baseline jumlah data saat diperiksa: 1 admin, 2 guru, 1 siswa, 1 bank, 0 ujian, dan 0 sesi. Ini snapshot database utama saja, bukan database load-test. Tidak ada data yang diubah.

## Route dan Batas Data

| Kelompok route | Contoh route | Database/layanan tujuan | Risiko/ketentuan tenant |
|---|---|---|---|
| Health/metrics | `/api/health`, `/metrics` | Infrastruktur/control-plane | Jangan membocorkan kode sekolah, email, atau isi tenant lewat metric labels. |
| Login dan sesi | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` | Kode sekolah dicari di control-plane; password diverifikasi di tenant DB; sesi berada di control-plane | Kode tenant harus aktif dan berasal dari registry. Cookie/session tidak boleh dapat mengganti tenant melalui request berikutnya. |
| Profil sendiri | `/api/account/profile` | Tenant DB dari sesi tervalidasi | User hanya mengubah record dirinya pada tenant terkait. |
| Pengaturan/mapel | `/api/settings`, `/api/subjects` | Tenant DB | `school_settings` singleton berlaku lokal pada setiap database tenant. |
| Siswa/guru/grant | `/api/students*`, `/api/teachers*` | Tenant DB | Terapkan role, kuota 400 siswa/25 guru, membership, dan pencabutan sesi pada tenant. |
| Bank/soal/media | `/api/banks*`, `/api/questions*`, `/api/question-media*` | Metadata di tenant DB; berkas privat di storage bersama dengan namespace tenant | Lookup media harus dimulai dari tenant DB; URL/ID tidak boleh membuka media sekolah lain. Backup dan orphan cleanup harus tenant-aware. |
| Administer ujian | `/api/exams*`, `/api/exams/:id/pin` | Tenant DB | Validasi bank, kelas, siswa, status langganan, dan role dalam database tenant. |
| Runner siswa | `/api/student/exams`, `/api/student/exams/:id/start`, `/api/student/sessions/*` | Tenant DB dari sesi siswa | Jalur paling kritis: session/student/exam ownership diperiksa di tenant DB untuk setiap operasi. |
| Monitoring/pelanggaran | `/api/monitor`, `/api/exams/:id/monitor/*` | Tenant DB | Grant guru dan keputusan admin hanya berlaku dalam sekolah tersebut. |
| Nilai/hasil/dashboard | `/api/results*`, `/api/dashboard` | Tenant DB | Tidak ada agregasi lintas database pada request tenant biasa. Laporan platform harus menjadi fungsi control-plane terpisah dan dibatasi. |

Ada juga middleware guard untuk `/api/students`, `/api/exams`, dan `/api/banks`; semua route tersebut harus masuk peta resolver, tidak hanya endpoint yang mengubah data.

## Rancangan Control-Plane dan Alur Login

Control-plane merupakan database layanan bersama yang menyimpan data minimum:

- Registry tenant: tenant ID, kode sekolah unik, nama, status (`trial`, `active`, `suspended`, `closed`), secret reference/identitas database, dan versi schema.
- Status paket/pembayaran manual: tanggal mulai/akhir trial dan layanan, batas penggunaan, status pembayaran, serta actor/timestamp saat pemilik memperbarui status.
- Referensi secret database, bukan password database dalam plaintext.
- Session store global (`user_sessions`) agar sesi dapat dibaca sebelum route tenant diketahui dan agar sesi dapat dicabut terpusat.
- Audit tindakan platform dan provisioning; jangan menaruh isi jawaban/soal siswa di control-plane.

Urutan autentikasi:

1. Klien mengirim kode sekolah, email, dan password ke login.
2. Server mencari kode sekolah pada registry control-plane. Kode tidak dipakai sebagai nama database dan tidak boleh mengandung konfigurasi koneksi.
3. Server memeriksa status tenant/paket, lalu mengambil database credential melalui secret reference tepercaya.
4. Server mencari email aktif di database tenant dan memverifikasi password.
5. Sesi server menyimpan tenant ID dan user ID/role; klien hanya menerima cookie HttpOnly. Kode atau database pilihan dari body/header berikutnya diabaikan.
6. Setiap request terautentikasi memvalidasi sesi/status tenant dan mendapatkan tenant pool melalui resolver server-side.
7. Saat tenant suspended, kebijakan awal menolak akses data; perubahan status oleh pemilik dapat mengaktifkan kembali atau mengawali proses penghapusan manual.

Perlu diputuskan saat implementasi apakah session store berbasis PostgreSQL control-plane tetap menjadi `connect-pg-simple` atau diganti layanan session store terkelola. Session store tunggal memudahkan pencabutan, namun control-plane/session outage berdampak ke semua sekolah.

## Panel Platform Pemilik

Pendaftaran dan pemantauan sekolah dilakukan dari panel control-plane khusus pemilik (`platform_owner`), bukan dari dashboard admin sekolah. Pilot memakai onboarding manual; tidak ada auto-provisioning dari formulir publik.

- Tabel tenant menampilkan kode/nama sekolah, status layanan, tanggal trial/akhir layanan, paket dan penggunaan terhadap kuota, provisioning state, versi schema, status koneksi database, dan waktu pemeriksaan terakhir.
- Status komersial/akses (`trial`, `active`, `suspended`, `closed`) dan status teknis database (`healthy`, `degraded`, `unreachable`, `migration_pending/failed`) ditampilkan sebagai dimensi terpisah. Gangguan DB tidak otomatis menandai invoice unpaid; unpaid tidak berarti database rusak.
- Detail tenant memungkinkan pemilik mendaftarkan sekolah, provision database, mengirim ulang undangan admin sekolah, memperbarui masa layanan setelah pembayaran manual, menangguhkan/mengaktifkan kembali, serta memulai ekspor/tutup/hapus sesuai kebijakan retensi.
- Aksi sensitif wajib konfirmasi, permission-check `platform_owner`, dan audit actor/tenant/waktu/alasan. Hapus tidak langsung menjalankan `DROP DATABASE`; prosesnya harus melalui ekspor, retensi, persetujuan, backup/checkpoint dan final confirmation.
- Dashboard agregat hanya memperlihatkan metadata operasional serta hitungan kuota. Isi soal, identitas siswa, jawaban, dan nilai tidak ditampilkan lintas sekolah secara default; akses support ke data detail perlu alasan, scope, dan audit terpisah.
- Admin sekolah tetap mengelola hanya sekolahnya (akun, kelas, soal, ujian, hasil). Tidak ada tautan/action platform pada dashboard sekolah.
- Permintaan pendaftaran publik, jika kelak dibuat, hanya membuat aplikasi/status `pending`; tenant database dan akun aktif baru diprovision setelah pemilik menyetujui.

## Resolver, Credential, dan Pool

- Gunakan tenant ID dari sesi yang telah diverifikasi, lalu lookup ulang registry/versi cache yang memiliki invalidation jelas. Jangan menerima database name, host, user, atau tenant ID sebagai otoritas dari klien.
- Gunakan least-privilege PostgreSQL role per database tenant. Satu credential aplikasi yang dapat connect/akses semua database mengurangi manfaat isolasi saat credential atau proses API bocor.
- Database target dipilih saat membuat koneksi pool; jangan memakai `SET search_path` atau mengganti state koneksi bersama per request, karena koneksi pooled dapat dipakai tenant lain.
- Pool per tenant dibuat lazy dan dibatasi dengan anggaran global; ada idle eviction/penutupan, semaphore/backpressure, timeout, dan metrik pool. Jangan menerapkan 10 pool dengan `max=70` masing-masing.
- Angka pool final belum ditetapkan: cluster sekarang mengatur `max_connections=110`, aplikasi utama memakai `DB_POOL_MAX=70`, sementara target puncak total adalah sampai 4.000 request/user serentak. Benchmark dan batas koneksi nyata harus menentukan konfigurasi; PgBouncer boleh dievaluasi.
- Registry/database outage harus gagal tertutup (fail closed), tidak fallback ke database tenant lain atau database development.

## Data CBT, Media, Schema, dan Migrasi

- Data aplikasi sekolah tetap berada bersama di tenant DB: identitas lokal, pengaturan, kelas/grant, mapel, bank/soal, metadata media, ujian, sesi, jawaban/nilai, event pelanggaran, audit sekolah, dan versi schema. `school_settings` tetap satu row dalam setiap tenant DB.
- Subject, username/email, serta unique constraints lain scoped otomatis oleh database tenant. Email harus ditambahkan dan dibuat unique per tenant; input login wajib menyertakan kode sekolah karena email boleh sama antar sekolah.
- Media saat ini menggunakan satu direktori/volume API (`QUESTION_MEDIA_DIR`) dan metadata `question_media` di database. Rancangan awal menggunakan key/path tenant-scoped, otorisasi melalui tenant DB, quota per tenant yang kelak ditetapkan, backup file + metadata, serta orphan scan per tenant. Sweep saat ini yang hanya melihat satu pool tidak boleh dipakai tanpa adaptasi.
- Setiap database tenant mendapat versi schema yang sama. Provisioning membuat DB/role dan menjalankan migrasi idempotent; rollout dicatat tenant demi tenant, dapat retry, melaporkan tenant gagal, dan tidak menganggap seluruh cluster berhasil bila satu database gagal.
- Migrasi IMBS: backup sumber, restore/copy ke database tenant baru, cocokkan jumlah dan relasi seluruh tabel serta file media, uji login dan alur ujian pada salinan, cutover terencana, dan rollback ke sumber. Jangan menghapus atau mengubah sumber sebelum owner menyetujui dan verifikasi selesai.
- Seed demo tidak dijalankan pada tenant pelanggan; provisioning tenant membuat hanya konfigurasi dasar dan admin pertama melalui kredensial sekali pakai/reset aman.

## Kapasitas, Keamanan, dan Risiko

- Run uji beban 100 siswa yang tersedia berakhir 400/400 request sukses, tetapi p95 login 9,34 detik, start 11,15 detik, save 8,71 detik, submit 1,33 detik. Ini tidak membuktikan target 400 per sekolah atau 4.000 agregat; login/start/save belum memenuhi sasaran umum p95 <= 2 detik pada run tersebut.
- Availability 99% per bulan memberi budget downtime sekitar 7 jam 12 menit dalam bulan 30 hari sebelum definisi maintenance dikeluarkan. Jangan menjanjikan SLA pelanggan sebelum pengukuran operasional, alert, backup/restore, dan maintenance policy tersedia.
- Database terpisah memberi boundary kuat terhadap kesalahan query lintas sekolah, tetapi bukan isolasi host: satu PostgreSQL cluster, satu API process, storage dan control-plane masih merupakan shared failure/security domain.
- Threat utama: registry salah memetakan kode ke database, session tenant tertukar, pool reuse salah, credential API terlalu luas, file media diakses lintas tenant, migrasi hanya sebagian tenant, serta admin platform/support melampaui akses yang diizinkan.
- Hukum/privasi data siswa, lokasi Indonesia, retensi backup, durasi ekspor, dan penghapusan manual harus ditinjau sebelum sekolah eksternal. Retensi tanpa batas sampai keputusan manual berpotensi konflik dengan kewajiban privasi; jangan jadikan kebijakan legal final tanpa review.

## Gate 2 Foundation Progress

- Implemented in source: `server/tenantDatabaseRouter.js` resolves only a normalized school code through an injected trusted registry; it never accepts a database name from the request.
- `server/tenantRegistry.js` provides parameterized control-plane lookups by normalized school code and tenant ID; it is not yet wired to a live control-plane pool.
- Resolver rejects unknown, suspended, closed, malformed, expired, and incompletely configured tenants before creating a pool.
- Tenant DB credentials are requested through an injected secret-reference resolver. Credential values are not stored by the router or logged.
- Pools are lazy, reused per tenant, capped by both a tenant count and a global tenant connection budget, and created once for concurrent resolution.
- `server/migrations/control-plane/001_tenant_registry.sql` defines the proposed platform users, tenant registry, status/plan dates, secret reference, limits, schema version, and platform audit tables.
- `server/tenantDatabaseRouter.test.js` and `server/tenantRegistry.test.js` cover code validation, parameterized lookup, inactive/expired tenant rejection, identifier injection, pool reuse/limits, and concurrent resolution. They are included in the standard test command.

This remains foundation code only. The control-plane DDL has **not** been applied, no tenant provisioning UI/command exists, login and CBT routes still use the existing single database pool, and the tenant database pool is not wired into requests. No live database, source data, or Docker service was changed.

## Remaining Before Full Gate 2

- Approve provisioning credentials and implement an adapter that reads registry rows from a control-plane database; keep secret material in an approved secret store.
- Design a safe control-plane bootstrap path and least-privilege PostgreSQL roles. Do not run the migration against the live cluster until backup, review, and a separate control-plane DB target are ready.
- Move session storage to the control plane and add tenant ID to the authenticated session only after the code-school login flow is integrated.
- Convert the default `pool` usage across all CBT routes to request-scoped tenant pools, including startup seed/media cleanup and transaction client acquisition.
- Add email identity and recovery fields/flow to tenant databases with a tested migration; the current tenant schema only has globally-unique username.
- Provision a development tenant copy and test migration/restore before any IMBS cutover; current primary data must remain unchanged until explicitly approved.
- Resolve remaining pilot details: media quota, exact support/maintenance hours, retention/export/legal policy, and benchmark-based login/start capacity.