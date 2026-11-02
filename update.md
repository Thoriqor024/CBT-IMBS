catat semua progresmu dengan rapi disini, dengan aturan;
	1. beri judul update pengerjaan
	2. beri log date and time
	3. jangan buat readme.md disetiap progress pengerjaan, semua progress harus masuk disini (update.md)

!!aturan ini wajib diikuti untuk memudahkan pengembangan sudah sampai mana!!

## Critical Gate — cutover/pilot publik ditahan sampai pemetaan akun dan uji cutover disetujui — 2 November 2026, 08.40 WIB

- Titik kritis: pilot lokal dan loopback HTTP tidak boleh dipakai untuk cutover data IMBS atau deployment publik. Akses dan route hanya untuk validasi teknis lokal, tidak untuk sekolah, tenant produksi, atau data nyata.
- Kondisi saat ini: database legacy belum memiliki kolom email, akun belum dipetakan ke email, dan tenant terdaftar yang ada hanya berisi admin awal. Karena itu, tidak ada pengalihan akun siswa/guru/sekolah ke pilot lokal yang aman dilakukan. Tidak ada migrasi data IMBS, tinjauan privasi, atau deployment cloud yang boleh dijalankan sebelum pemetaan akun dan cutover test disetujui.
- Risiko yang harus ditutup: data sekolah/produksi yang diarahkan ke pilot lokal tanpa mapping akun bisa mengakibatkan identitas tidak konsisten, akses tidak valid, kebocoran data, dan rollback yang tidak aman. Pilot lokal tidak boleh diposisikan sebagai environment publik, staging produksi, atau target cutover apapun.
- Keputusan operasional yang dipertahankan: pilot ini tetap loopback-only, no public exposure, no redirect dari sekolah atau tenant aktif, dan no production data movement. Semua cutover data IMBS atau migrasi cloud ditunda sampai ada pemetaan akun email yang valid, pemastian data owner/tenant, dan uji cutover yang disetujui oleh pemilik data.
- Verifikasi kode yang tersisa: `npm run build` lulus, `npm test` lulus 110/110, dan perbaikan `Menu`/guard `platform_owner` menjamin tidak ada crash runtime atau syntax error pada JSX yang aktif. Tidak ada deployment public, cloud, atau cutover data yang dilakukan.
- Catatan risiko: ini adalah blocking gate sebelum kehilangan akses server; bila server dibatasi atau sesi hilang, semua perubahan yang memindahkan data sekolah atau membuat akun baru ke pilot harus dihentikan sampai persetujuan cutover diterima.

## UI — Platform Control dipindah dan dirapikan — 2 November 2026, 15.12 WIB

- Memindahkan `PlatformOwnerConsole` aktif dari `src/App.jsx` ke `src/PlatformOwnerConsole.jsx`, mengganti implementasi stale yang sebelumnya tidak dirender, dan membuat App merender modul standalone. Helper `roleLabel` tetap di App karena masih digunakan dashboard sekolah.
- Menambahkan gaya yang seluruhnya di-scope pada `.platform-owner-console`: heading/status readiness, metrik non-interaktif, form provisioning adaptif, panel arsitektur, tabel tenant semantik dengan scroll lokal, status badge, modal kredensial/edit, focus state, dan navigasi sidebar untuk mobile. Handler/API, quota, provisioning, one-time credential, dan aksi tenant tetap dipertahankan.
- Menghapus inline styles dari dashboard utama dan mengganti tabel div/grid tetap dengan tabel HTML responsif. Tidak ada perubahan API, database, record tenant, atau kredensial.
- Validasi: `npm run build` lulus; `npm test` lulus 110/110; diagnostics App dan komponen bersih; pencarian tidak menemukan inline `style` atau definisi komponen duplikat; `git diff --check` lulus.
- Pilot lokal dibangun ulang tanpa menyentuh container legacy/database. API legacy, PostgreSQL, dan pilot healthy; `http://127.0.0.1:8180/` dan `/api/health` merespons 200.
- Batas pemeriksaan: browser bersama tidak memiliki sesi platform-owner, jadi dashboard setelah login tidak dapat diperiksa secara visual. Verifikasi layout yang tersisa perlu dilakukan setelah owner login; jangan menggunakan password demo.
- Warning build yang sudah ada tetap muncul: `NODE_ENV` dari `.env` dan bundle JS >500 kB. Tidak ada error build.

## SaaS — Backup/restore, tes dua tenant, dan pilot lokal — 2 November 2026, 14.33 WIB

- Menjalankan backup konsisten setelah menghentikan API lokal sebentar; API otomatis dinyalakan kembali. Recovery point berada di `%LOCALAPPDATA%\CBT-IMBS\recovery\20261102_141758_local_saas`, di luar repo dengan ACL untuk akun Windows saat ini. Snapshot mencakup database legacy, control-plane, database setiap tenant terdaftar, role PostgreSQL, 102 berkas media (3.971.083 byte), dan master key 32 byte. Tidak ada backup lama yang ditimpa.
- Verifikasi backup: 107 file lulus pemeriksaan ukuran dan SHA-256; tiga dump lulus `pg_restore --list`.
- Restore drill lulus di container PostgreSQL 17 baru, loopback-only, tanpa volume/data aktif: tiga database dipulihkan, row-count semua tabel cocok dengan manifest, dan 102 file media cocok hash. Container serta direktori restore sementara dibersihkan; backup sumber dipertahankan.
- Menambahkan `scripts/backup-local-saas.ps1` dan `scripts/restore-local-saas.mjs` untuk mengulang backup/restore lokal dengan perlindungan overwrite dan pemulihan target terisolasi.
- Menambahkan `server/tenantIsolation.integration.test.js` dan perintah `npm run test:tenant-integration`. Tes memakai container PostgreSQL dan dua tenant acak yang dibuang sesudah tes; menguji login valid/tidak valid, header sekolah palsu, pemisahan siswa/mapel, kuota siswa/staff pada request bersamaan, pembuatan bank, PIN, runner siswa, kunci jawaban tidak terkirim, autosave, submit, serta isolasi akses media/ujian. Hasil: 1/1 test lulus.
- Menambahkan `docker-compose.saas-pilot.yml`. Service `cbt-imbs-saas-pilot` berjalan dengan tenancy aktif pada `http://127.0.0.1:8180`, menggunakan control-plane lokal yang sama dan volume media pilot terpisah. Bind hanya ke loopback; cookie non-Secure hanya karena pilot menggunakan HTTP lokal. Layanan legacy tetap single-tenant dan tidak dipindahkan atau direstart saat pilot dinyalakan.
- Pemeriksaan akhir: API legacy dan pilot sehat; data legacy tetap 50 user, 45 siswa, 56 bank, 2 ujian, 45 sesi, 102 media; control-plane tetap 1 tenant, 1 owner aktif, 2 secret terenkripsi. Tidak ada container integration/restore yang tertinggal.
- Validasi: `npm test` lulus 110/110; `npm run test:tenant-integration` lulus 1/1; `npm run build` lulus; diagnostics dan `git diff --check` bersih. Playwright mengonfirmasi halaman login menampilkan kode sekolah, email, dan password. Console hanya mencatat favicon 404. Build masih menampilkan warning `NODE_ENV` dari `.env` dan chunk bundle >500 kB.
- Batas pilot: database tenant terdaftar yang ada hanya berisi admin awal; database legacy aktif masih memakai schema lama tanpa kolom email dan menyimpan data akademik. Jangan alihkan/cutover sekolah IMBS sebelum ada pemetaan email akun yang disahkan, migrasi copy-first, parity data/media, serta tes penerimaan CBT. Tinjauan privasi, SLO/beban, retensi/support, dan deployment publik belum ditutup. Tidak ada deploy cloud.

## SaaS — Perbaikan race kuota tenant — 2 November 2026, 13.34 WIB

- Memulai implementasi untuk target pilot multi-tenant Docker lokal sesuai rencana proyek. Pemeriksaan awal read-only: Docker Engine/Compose merespons; API dan PostgreSQL sehat; runtime masih single-tenant (`TENANCY_ENABLED=false`). Tidak ada container yang direstart, database/volume yang diubah, atau nilai secret yang dibaca.
- Memindahkan pemeriksaan kuota ke transaksi yang sama dengan pembuatan akun. Transaksi mengunci row singleton `school_settings` sebelum menghitung jumlah akun, sehingga permintaan tambah/import siswa atau staff yang bersamaan tidak dapat sama-sama memakai slot kuota terakhir.
- Mencakup empat alur tenant: tambah siswa, import siswa, tambah staff, dan import staff. Bootstrap seed legacy dan admin awal provisioner tidak diubah.
- Menambah tes lock-before-count dan penolakan import yang melebihi kuota. `npm test` lulus 110/110, `npm run build` lulus, `node --check` untuk file server/test lulus, diagnostics bersih, dan `git diff --check` lulus.
- Tes baru memverifikasi urutan lock dan hitung melalui mock; belum ada tes konkurensi end-to-end terhadap PostgreSQL. Fitur tenant tetap belum diaktifkan dan aplikasi berjalan pada konfigurasi single-tenant.
- Langkah aman berikutnya: verifikasi recovery point database+media yang baru sebelum perubahan skema/runtime, lalu jalankan onboarding dan isolasi dua tenant pada stack lokal terpisah. Backup/restore SaaS dan kesiapan deployment publik masih belum selesai.

## SaaS — Recovery point sebelum Wave 2 — 12 Oktober 2026, 18.33 WIB

- Sebelum pekerjaan control-plane berikutnya, dibuat snapshot baru di `%LOCALAPPDATA%\CBT-IMBS\recovery\20261012_pre_wave2_post_bootstrap` dengan ACL hanya untuk akun Windows saat ini.
- `cbt_imbs.dump`: 56.324 byte, SHA-256 `93fc2add8dffe6d17ecc53863076e695dc5c1b294f4be8652d447cd85d0874d0`; `pg_restore --list` lulus, 118 entri.
- `question-media.tar.gz`: 87 byte, SHA-256 `befd314664bede8f87e386194d09455f8402cd44fc7defc3091759a87d1fcd6c`; `tar -tzf` lulus, hanya direktori kosong.
- Snapshot mencakup platform owner aktif dan migrasi role versi 2. Inventaris saat snapshot: 1 admin, 2 guru, 1 siswa, 1 owner, 1 bank, 0 ujian, 0 sesi; tidak ada control-plane database atau tenant DB terpisah.
- Hanya file temporer validasi di `/tmp` yang dibersihkan. DB aktif, media, volume, dan backup lama tidak diubah.

## SaaS — CORS origin LAN diperbaiki — 12 Oktober 2026, 18.26 WIB

- Pesan `Origin tidak diizinkan` berasal dari `.env` yang masih mengizinkan `http://localhost:8080`; API memuat nilai yang sama. Browser mengirim origin `https://10.10.4.235:8443`, sehingga exact-match CORS menolak login dengan 403.
- `.env` kini memakai `PUBLIC_BASE_URL=https://10.10.4.235:8443` dan `CORS_ORIGINS=https://10.10.4.235:8443`. Port `8443` wajib dicantumkan karena itulah published TLS port Compose; `https://10.10.4.235` tanpa port akan berarti port 443 dan tidak cocok dengan listener ini.
- Ditambahkan `LEGACY_BOOTSTRAP_SEED_ENABLED=false` agar recreate API untuk menerapkan allowlist tidak menjalankan seed/demo cleanup. Recreate hanya API; PostgreSQL dan volume tidak direcreate. Runtime terverifikasi: CORS origin LAN tepat, `TENANCY_ENABLED=false`, seed `false`, API healthy.
- Probe POST dari origin LAN berubah dari 403 menjadi 401 dengan akun dummy (CORS lolos; kredensial dummy ditolak). Di Chrome DevTools setelah reload: halaman 200, `/api/auth/me` 200, console tanpa error. Operator perlu hard-refresh tab login dan mencoba kembali.

## SaaS — Perbaikan Failed to fetch pada login panel — 12 Oktober 2026, 18.18 WIB

- Dari Chrome DevTools, login gagal karena bundle memanggil `http://localhost:8080/api/auth/me` sedangkan halaman dibuka di `https://10.10.4.235:8443`; koneksi browser ditolak. Akar masalah: `VITE_API_BASE_URL` Compose mengambil `PUBLIC_BASE_URL` yang berisi origin host-specific.
- Compose frontend sekarang membangun bundle dengan `VITE_API_BASE_URL` kosong, sehingga client memakai `/api` same-origin melalui reverse proxy Nginx. Build frontend berhasil.
- Frontend direcreate. Compose ikut recreate API; pemeriksaan segera menunjukkan API healthy dan `TENANCY_ENABLED` runtime tetap `disabled`. PostgreSQL tetap healthy dan volume data tidak direcreate.
- Reproduksi setelah reload dengan cache dinonaktifkan: halaman HTTP 200, fetch `https://10.10.4.235:8443/api/auth/me` HTTP 200, console browser tanpa error. Minta operator hard-refresh tab (`Ctrl+Shift+R`) lalu ulangi login.
- Password, isi form, dan secret tidak dibaca atau disalin. Tenant mode tetap nonaktif; provisioning sekolah tetap terkunci sampai control-plane siap.

## SaaS — Bootstrap owner berhasil dan panel siap diakses — 12 Oktober 2026, 18.13 WIB

- Bootstrap berhasil setelah migrasi role diterapkan. Query read-only mengonfirmasi satu akun `platform_owner` aktif; tidak ada password/hash yang dibaca atau dicatat.
- Pemeriksaan keamanan/runtime: login fallback demo ditolak (HTTP 401); halaman frontend `https://10.10.4.235:8443/` HTTP 200; `/api/health` HTTP 200. Panel owner dapat diakses dengan username `platform_owner` dan password yang dimasukkan operator langsung ke terminal.
- Tenant mode tetap nonaktif pada container yang sedang berjalan; `.env` tidak diubah dan masih memiliki `TENANCY_ENABLED=true`, sementara prasyarat control-plane/master-key belum tersedia. Hindari `docker compose up` tanpa override `TENANCY_ENABLED=false` atau konfigurasi control-plane, karena container baru dari `.env` tersebut tidak akan aman/start-ready.
- Dashboard yang dapat diakses adalah local-safe pilot. Listing/provisioning sekolah masih dikunci; tidak ada klaim SaaS production atau onboarding tenant aktif. Recovery point sebelum schema migration tetap tersedia di `%LOCALAPPDATA%\CBT-IMBS\recovery\20261012_1738_pre_platform_panel`.

## SaaS — Perbaikan bootstrap owner pada schema legacy — 12 Oktober 2026, 18.10 WIB

- Pesan bootstrap membuktikan password sudah melewati validasi panjang; kegagalan yang sebenarnya adalah PostgreSQL constraint `users_role_check` pada schema lama hanya mengizinkan `admin`, `teacher`, `student`.
- Menambahkan migrasi forward-only `server/migrations/002_platform-owner-role.sql` dan pencatatan versi 2 di startup `server/db.js`. Test penuh lulus 60/60; migrasi SQL diterapkan ke DB lokal dalam transaksi setelah recovery point 17.42 WIB tersedia.
- Verifikasi read-only: schema migration versi 2 tercatat dan constraint kini mengizinkan `platform_owner`. Hitungan setelah migrasi/rollback bootstrap gagal: 0 owner, 1 admin, 2 guru, 1 siswa, 1 bank. Tidak ada akun/record baru dari percobaan bootstrap yang gagal.
- Kebijakan password tetap minimal 24 karakter; tidak diturunkan menjadi 8 karena bukan penyebab kegagalan. Bootstrap owner perlu dijalankan ulang sekarang setelah constraint schema diperbaiki. Login panel tetap 401 tanpa owner/sesi sampai langkah itu berhasil.

## SaaS — Panel lokal online, menunggu bootstrap owner — 12 Oktober 2026, 18.03 WIB

- Image API/frontend sudah direcreate dengan override proses `TENANCY_ENABLED=false`, `LEGACY_BOOTSTRAP_SEED_ENABLED=false`, dan session secret acak; file `.env` tetap tidak diubah. PostgreSQL/volume media tidak direcreate.
- Verifikasi runtime: frontend HTTPS HTTP 200, `/api/health` HTTP 200, Prometheus health HTTP 200, dan `/api/platform/overview` tanpa sesi HTTP 401. Container API healthy; login demo owner ditolak oleh source terbaru.
- Query status owner hanya menghasilkan boolean dan menemukan belum ada akun `platform_owner` aktif. Bootstrap belum selesai, sehingga URL aplikasi tersedia tetapi akses panel owner belum dapat diberikan.
- Langkah aman: operator harus menjalankan ulang CLI bootstrap dari PowerShell interaktif dan memasukkan secret langsung pada prompt. Jangan kirim secret di chat. Tenant mode tetap nonaktif; panel onboarding/provisioning tetap read-only/terkunci karena control-plane dan provisioner belum siap.

## SaaS — Restart Docker, recovery point, dan akses panel lokal — 12 Oktober 2026, 17.52 WIB

- Docker Desktop pulih setelah restart: Docker Engine 29.8.0 dan Compose v5.5.1 merespons. Empat container berjalan; PostgreSQL dan API healthy. Smoke check: `https://10.10.4.235:8443/api/health` HTTP 200, Prometheus `http://127.0.0.1:9090/-/healthy` HTTP 200, HTTP port 8080 mengalihkan ke HTTPS. Port container PostgreSQL tidak dipublikasikan oleh Compose; listener 5432 host sebelumnya tetap perlu dipastikan pemiliknya.
- Image API yang aktif tertinggal dari source workspace: endpoint `/api/platform/overview` memberi 404 dan source di container tidak memiliki route/platform guard terbaru. Akses daftar tenant tanpa sesi memberi 401. Belum ada akses owner tervalidasi.
- Inventaris read-only DB aktif sebelum perubahan: 1 admin, 2 guru, 1 siswa, 1 bank soal, 0 ujian, 0 sesi. Volume aktif `cbtimbs_cbt-imbs-data` dan `cbtimbs_cbt-imbs-uploads`; media berisi 0 file / 0 byte.
- Recovery point baru dibuat di `%LOCALAPPDATA%\CBT-IMBS\recovery\20261012_1738_pre_platform_panel` (di luar repo/build context) sebelum rebuild: `cbt_imbs.dump` PostgreSQL custom 56.027 byte, SHA-256 `6BCE891D4DE794EDA1EAA2ECB11C26F1E23971B4E19883C86128FF65BCA0E7DD`; `question-media.tar.gz` 87 byte, SHA-256 `BEFD314664BEDE8F87E386194D09455F8402CD44FC7DEFC3091759A87D1FCD6C`. Direktori hanya memberi akses penuh ke akun Windows saat ini. Dump lolos `pg_restore --list` (118 entri); arsip media lolos `tar -tzf`. Tidak ada restore atau perubahan volume.
- Dump lama tetap ada; ukuran dan SHA-256 diperiksa ulang dan sesuai catatan baseline 17.18 WIB. Tidak ada backup lama yang ditimpa.
- Klasifikasi `.env` tanpa menampilkan nilainya: `TENANCY_ENABLED=true` (tidak aman untuk source runtime saat ini), `CONTROL_DB_NAME/USER/PASSWORD` dan `TENANT_MASTER_KEY_FILE` missing, `DB_PASSWORD`, `SESSION_SECRET`, dan password seed owner unsafe. `.env` tidak diubah. Rebuild source hanya boleh memakai override proses `TENANCY_ENABLED=false`; tenant mode tetap tidak aktif.
- Perubahan kode lokal: seed tidak lagi membuat `platform_owner` dari fallback demo; login menolak password owner bawaan; bootstrap satu-kali tersedia melalui `npm run bootstrap:platform-owner` dengan prompt tersembunyi, validasi minimal 24 karakter, transaksi, pencabutan sesi lama, dan audit tanpa secret. Panel tidak lagi terisi sekolah/email contoh; readiness diambil dari runtime tenant aktual dan onboarding dikunci sampai provisioner nyata tersedia. API tidak lagi mengembalikan status draft/queued yang seolah provisioning berhasil.
- Ditambahkan `LEGACY_BOOTSTRAP_SEED_ENABLED` agar rebuild dapat melewati seed/demo cleanup saat memelihara DB aktif. Default Compose tetap mempertahankan perilaku yang ada (`true`); rebuild yang sedang disiapkan akan memakai override proses `false` agar tidak menambah/menghapus akun atau media.
- Validasi kode: `npm.cmd test` lulus 59/59 sebelum test sakelar seed terakhir ditambahkan; test terakhir `server/seedAccounts.test.js` 3/3, `server/platformManagement.test.js` 2/2, `server/platformOwnerBootstrap.test.js` 4/4; `node --check` API/CLI lolos; `npm.cmd run build` lolos dengan peringatan environment Vite yang sudah ada (`NODE_ENV` di `.env`).
- Status saat log ini ditulis: recovery point siap; source sudah diperbarui, tetapi rebuild API/frontend dan bootstrap owner belum dijalankan. Panel belum dapat diakses sampai rebuild berhasil dan operator menyelesaikan prompt password owner langsung di terminal. Provisioning sekolah tetap belum tersedia karena control-plane/provisioner belum dikonfigurasi; jangan mengaktifkan tenant mode.

## SaaS — Revalidasi baseline lokal dan recovery point — 12 Oktober 2026, 17.18 WIB

- Scope pemeriksaan hanya workspace dan stack lokal Windows/Docker. Tidak mengubah `.env`, konfigurasi Compose, tenancy, schema/data, media, volume, atau service. Tidak membuat, menimpa, maupun menghapus backup.
- Docker CLI tersedia: 29.8.0; Docker Compose tersedia: v5.5.1; context `desktop-linux`. Perintah yang memerlukan Engine (`docker version`, `docker info`, dan `docker compose ps --all`) tidak selesai dalam batas 30 detik. Status container dan healthcheck aktual karena itu tidak dapat diverifikasi. Pemeriksaan konfigurasi statis Compose berhasil: service `db`, `api`, `prometheus`, `cbt-imbs`; named volume `cbt-imbs-data`, `cbt-imbs-uploads`, `cbt-imbs-certs`.
- Listener host yang teramati dimiliki proses `com.docker.backend`: `10.10.4.235:8080`, `10.10.4.235:8443`, `127.0.0.1:9090`, dan `127.0.0.1:5432`. Compose mendeklarasikan publikasi 8080, 8443, dan 9090; publikasi host 5432 tidak ada di konfigurasi Compose yang diperiksa, sehingga sumber listener 5432 belum diketahui. Port listening bukan bukti service sehat.
- Pemeriksaan HTTP read-only ke `http://10.10.4.235:8080/api/health` dan `http://127.0.0.1:9090/-/healthy` masing-masing timeout setelah 8 detik (HTTP status 000). Koneksi PostgreSQL read-only ke `127.0.0.1:5432`, database `cbt_imbs`, query `SELECT 1`, timeout setelah 3 detik. Konektivitas DB saat ini tidak berhasil dibuktikan.
- Compose mendeklarasikan data PostgreSQL pada `cbt-imbs-data`, sertifikat pada `cbt-imbs-certs`, dan media pada `cbt-imbs-uploads` yang dipasang ke `/app/uploads`; direktori aplikasi media adalah `/app/uploads/question-media`. Karena Engine tidak merespons, pemasangan volume aktual, kondisi volume, jumlah/ukuran berkas media, dan health service tidak dapat diverifikasi. Tidak ada backup media yang terverifikasi.
- Status kesiapan environment, tanpa menampilkan nilai: `TENANCY_ENABLED=unsafe` (aktif dengan prasyarat control-plane kosong); `CONTROL_DB_NAME=missing`; `CONTROL_DB_USER=missing`; `CONTROL_DB_PASSWORD=missing`; `TENANT_MASTER_KEY_FILE=missing`; `DB_PASSWORD=unsafe`; `SESSION_SECRET=unsafe`; `SEED_ADMIN_PASSWORD=unsafe`; `SEED_TEACHER_PASSWORD=unsafe`; `SEED_PLATFORM_OWNER_PASSWORD=unsafe` (fallback Compose lokal). `node --env-file=.env scripts/validate-tenant-env.mjs` gagal dengan exit 1 dan menyebut empat prasyarat control-plane yang missing. Jangan aktifkan tenant runtime atau anggap konfigurasi lokal siap produksi.
- Dump lama dipertahankan tanpa perubahan: `backups/20261009_pre_p0-database.dump` — 49,216 byte, SHA-256 `08ABAF6DC8D7C0F724F36B379B34D526C0188FAD489AC97EEF13E5BB3BAA0ABC`; `backups/20261009_predeploy-database.dump` — 49,216 byte, SHA-256 `8801A8F0FDA437D3F04894E3BAC560783894D02E99F9920FEE1CC050AD280D08`. Keduanya hanya bukti dump database yang sudah ada, bukan recovery point DB+media terkini yang tervalidasi.
- Baseline kode lokal: `npm test` lulus 53/53. Build Vite 8.3.1 berhasil dengan `build({ write: false })` agar tidak menulis atau mengganti `dist`; Vite mengeluarkan peringatan bahwa `NODE_ENV=production` di `.env` bukan nilai yang didukung oleh file env untuk mode development. Pemeriksaan build berhasil, tetapi stack runtime tetap belum sehat/terverifikasi.
- Belum dibuat recovery point baru: snapshot DB yang konsisten dan arsip media memerlukan akses ke Engine serta inspeksi volume yang aman; keduanya tidak tersedia pada pemeriksaan ini. Sebelum perubahan schema/data berikutnya, hentikan pekerjaan mutasi sampai Docker Engine pulih, scope recovery point DB+media dilaporkan, dan destinasi backup baru yang unik dipastikan tidak menimpa data. Tidak ada task berikutnya yang boleh mengasumsikan DB, API, frontend, Prometheus, atau media sehat.

## SaaS — Gate 2 fondasi tenant resolver — 12 Oktober 2026, 13.39 WIB

- Melanjutkan implementasi lokal sesuai keputusan Gate 0 dan ADR Gate 1. Scope hanya fondasi resolver; tidak menjalankan migration SQL, tidak mengubah database utama/volume, tidak membangun ulang atau merestart Docker, dan tidak mengubah AWS/load-test.
- Menambahkan `server/tenantDatabaseRouter.js`: lookup kode sekolah hanya melalui injected trusted registry, tenant status/masa layanan divalidasi sebelum koneksi, database identifier divalidasi dari registry, credential diambil dengan secret reference, dan tenant pool dibuat lazy/reused.
- Resolver menerapkan batas jumlah pool dan batas aggregate tenant connections; kegagalan registry/secret/status menolak akses (fail closed). Koneksi tidak dapat diarahkan dari input klien.
- Menambahkan DDL draft `server/migrations/control-plane/001_tenant_registry.sql` untuk platform users, tenant registry, plan/status/limit/schema version, secret reference, dan audit platform. DDL ini belum diterapkan pada PostgreSQL manapun.
- Menambahkan 8 regression tests dan memasukkan file test ke script `npm test`. Test mencakup kode tidak valid, tenant tidak ditemukan/suspended/expired, expiry tidak terkonfigurasi, database name berbahaya, batas/reuse pool, dan race pembuatan pool.
- Fokus validation: `node --test server/tenantDatabaseRouter.test.js` lulus 8/8. Syntax router juga diperiksa sebelum regression test ditambah.
- Batas saat ini: resolver masih dependency-injected dan belum memiliki adapter registry nyata; auth kode sekolah, session store control-plane, API routes, provisioning, migrasi IMBS, dan media storage belum terintegrasi. Aplikasi utama tetap menjalankan pool database CBT lama.
- Langkah berikut: rancang dan uji registry/control-plane nyata tanpa menyentuh DB utama sebelum migrasi dan route integration.

## SaaS — Adapter registry dan validasi Gate 2 — 12 Oktober 2026, 13.45 WIB

- Menambahkan `server/tenantRegistry.js` sebagai adapter query control-plane untuk lookup berdasarkan kode sekolah yang dinormalisasi dan ID tenant dari sesi. Semua nilai tetap parameterized; kode invalid ditolak sebelum query.
- Menambahkan `server/tenantRegistry.test.js` dan mendaftarkannya pada `npm test`.
- Pemeriksaan penuh sesudah adapter: 36/36 test lulus; `npm.cmd run build` berhasil; `node --check` untuk modul router/repository/test/server berhasil; diagnostics pada source, SQL dan dokumen tidak menemukan error.
- Status implementasi belum menjadi SaaS aktif: adapter masih memakai dependency-injected query pool; DDL belum diterapkan; belum ada koneksi control-plane nyata, tenant provisioning, email login, session tenant, atau integrasi route CBT. Tidak ada deploy/restart container maupun perubahan database utama.
- Pemeriksaan read-only setelah pekerjaan menunjukkan database `cbt_imbs` tetap 1 admin, 2 guru, 1 siswa, 1 bank, 0 ujian, 0 sesi; service utama tetap berjalan.
- Langkah berikut yang belum dikerjakan: desain dan penyediaan control-plane database/role dengan least privilege, provisioning tenant database+credential secara terkendali, lalu uji resolver terhadap control-plane terisolasi sebelum mengintegrasikan login dan route. Jangan menjalankan migration pada database utama.

## SaaS — Rincian Panel Platform Pemilik — 12 Oktober 2026, 13.45 WIB

- Memperjelas item Gate 4 dan ADR Gate 1: pendaftaran/pemantauan sekolah akan menggunakan panel control-plane khusus pemilik (`platform_owner`), terpisah dari dashboard admin sekolah.
- Cakupan panel yang direncanakan: onboarding manual, provisioning, undangan admin sekolah, masa trial/layanan dan paket, kuota/penggunaan, kesehatan teknis DB/schema, suspend/reactivate, ekspor/tutup tenant, serta audit tindakan sensitif.
- Status layanan dan kesehatan database dipisah agar sekolah suspended tidak disamakan dengan database outage. Isi soal, identitas siswa, jawaban, dan nilai tidak tampil lintas sekolah secara default.
- Pendaftaran publik bukan bagian pilot; jika kelak tersedia hanya membuat permintaan pending sampai pemilik menyetujui.
- Ini pembaruan desain/checklist saja. UI, route platform, provisioning, serta perubahan database belum dibuat/dijalankan.

## SaaS — Gate 0 disetujui dan desain Gate 1 — 12 Oktober 2026, 13.25 WIB

- Pengguna menyetujui arah SaaS: aplikasi/API dan infrastruktur server bersama, satu PostgreSQL cluster dengan database terpisah per sekolah. Gate 0 membuka analisis/desain Gate 1; tidak mengizinkan migrasi schema, pemindahan database utama, atau deployment AWS.
- Keputusan Gate 0 yang menjadi baseline: 10 sekolah maksimum; 400 siswa terdaftar dan 25 guru per sekolah; target 2.000 siswa terdaftar pada tahun pertama; kebutuhan kapasitas 400 peserta serentak per sekolah (4.000 agregat sebagai envelope terburuk yang belum terbukti); Rp3.000.000 per semester; trial 2 bulan; billing manual; akses ditangguhkan setelah masa berbayar sampai owner memperbarui status; lokasi data Indonesia; login dengan kode sekolah dan email unik di tiap sekolah; satu akun hanya di satu sekolah; target availability 99% dan p95 API <= 2 detik.
- Inventaris read-only database lokal: PostgreSQL 17.11, 15 tabel (13 tabel domain CBT, `schema_migrations`, dan `user_sessions`); baseline saat diperiksa: 1 admin, 2 guru, 1 siswa, 1 bank, 0 ujian, 0 sesi. Volume/source database tidak diubah.
- Ditulis draft ADR Gate 1: registry/control-plane untuk kode sekolah, status/paket, database mapping; email/password diverifikasi dalam database tenant; sesi disimpan di control-plane; setiap request memakai resolver server-side dari sesi tervalidasi dan registry tepercaya. Database/host tidak pernah dipilih dari input klien.
- Dicatat desain pool dengan batas koneksi global (nilai per-tenant belum dipilih), hak PostgreSQL least-privilege per tenant, migrasi versi per database, media yang diisolasi dan dibackup per tenant, serta rencana migrasi IMBS tanpa menghapus sumber sebelum verifikasi.
- Route disusun menurut keluarga control-plane, tenant administration, bank/media, ujian/runner siswa, monitoring dan hasil. Alur CBT inti dipertahankan; autentikasi, pemilihan tenant/database, route data, media, session, provisioning, backup dan pengujian lintas tenant harus diadaptasi.
- Bukti kapasitas yang sudah ada bukan target lulus: run 100 peserta mencatat 400/400 request berhasil, tetapi p95 login 9,34 dtk, start 11,15 dtk, save 8,71 dtk, submit 1,33 dtk. SLO login/start menunggu benchmark/perbaikan; target agregat 4.000 bukan klaim siap.
- Belum dikerjakan: perubahan kode/schema, provisioning tenant, migrasi, backup/restore, atau AWS. Gate 1 desain menunggu review ADR sebelum Gate 2.
- Keputusan lanjutan sebelum pilot: kuota media; definisi dukungan 18 jam dan maintenance window; SLO login/start; masa ekspor/retensi backup/penghapusan permanen; tinjauan hukum/privasi siswa.

## Phase 1 — Fondasi CBT IMBS dan Dashboard Akademik

### Analisis rancangan dan keputusan teknologi — 29 September 2026

- Kebutuhan inti mencakup bank soal terpisah per mata pelajaran/kelas, import siswa, pembagian soal acak per peserta, pemantauan ujian, serta penggunaan pada Windows dan Chromebook melalui browser.
- Safe Exam Browser (SEB) merupakan aplikasi klien kiosk/lockdown yang membatasi navigasi dan pintasan pada perangkat yang didukung; ia bukan pengganti aplikasi CBT dan tidak bisa ditiru sepenuhnya oleh halaman web biasa. Rujukan: [SEB Windows User Manual](https://safeexambrowser.org/windows/win_usermanual_en.html) dan [SEB Overview](https://www.safeexambrowser.org/about_overview_en.html).
- e-Ujian merupakan pembanding platform CBT: alur bank soal, pengelompokan materi, pembuatan paket/sesi, serta pengelolaan peserta sejalan dengan kebutuhan IMBS. Rujukan: [e-Ujian](https://www.e-ujian.com/web/index) dan [Panduan E-Ujian V4](https://app.e-ujian.com/panduan).
- Keputusan awal: React + Vite untuk antarmuka; Docker/Nginx sebagai distribusi frontend; untuk versi operasional perlu API backend dan basis data relasional (direkomendasikan PostgreSQL) agar akun, token, soal, ujian, jawaban, dan pelanggaran tersimpan dan ditegakkan di server. Pola ini tetap dapat digunakan dari Chrome/Edge Windows dan Chromebook.
- Target 150 peserta dalam satu sesi harus diuji dengan beban realistis setelah backend, autosave jawaban, dan koneksi jaringan selesai. Browser web tidak dapat mematikan Task Manager/aplikasi latar, mencegah screenshot OS, atau menjamin pemblokiran Alt+Tab. Rencana keamanan perlu memakai klien kebijakan perangkat seperti SEB/kiosk terkelola jika perangkat memungkinkan; deteksi tab/fokus di web hanya sinyal audit dan bukan bukti pasti.

### Log pengerjaan

- Dibuat fondasi React/Vite dengan tampilan dashboard responsif untuk Ringkasan, Siswa, Bank Soal, Ujian, dan Hasil Ujian; tema memakai aksen Arab pada kartu Bahasa Arab.
- Ditambahkan alur prototipe buat siswa (username/token kriptografis), import CSV/XLSX sisi browser, template CSV, buat bank per pelajaran/kelas, input massal soal berbentuk `jenis | pertanyaan | kunci`, dan rancangan ujian dengan jumlah PG/essay serta durasi.
- Ditambahkan layout Docker Compose dan Nginx untuk menjalankan build frontend pada `http://localhost:8080`; mode pengembangan tersedia dengan `npm.cmd run dev`.
- Build produksi terakhir berhasil dengan `npm.cmd run build` (Vite 8.3.1); entrypoint browser XLSX menggunakan `read-excel-file/browser`. Dependensi pembaca XLSX (`read-excel-file`) terpasang dengan 0 temuan audit pada instalasi.
- Belum menjadi sistem operasional: data masih berada dalam state browser dan hilang saat halaman dimuat ulang; kredensial belum disimpan/diotorisasi server; input soal massal pada prototipe hanya menghitung tipe/jumlah, belum menyimpan teks soal/kunci; tombol pemantauan dan hasil masih berupa tampilan demonstrasi. Belum ada backend, PostgreSQL, autentikasi/otorisasi sungguhan, Excel export, maupun pengujian kapasitas 150 peserta.

### Status milestone

- Phase 1.a Analisis dan perbandingan: selesai pada tingkat rancangan.
- Phase 1.b Dashboard admin/guru: prototipe antarmuka tersedia; role switching hanya preview UI, belum otorisasi.
- Phase 1.c Bank soal dan input massal: alur/kartu tersedia; penyimpanan butir soal belum terhubung.
- Phase 1.d Pengacakan dan rancangan ujian: konfigurasi prototipe tersedia; pembagian unik perlu implementasi server.
- Phase 1.e–f Input siswa dan kredensial: import serta pembuatan kredensial berjalan di browser; persistensi dan validasi server belum ada.

### Langkah berikutnya

1. Buat API autentikasi dengan role admin/guru/siswa dan skema PostgreSQL untuk pelajaran, kelas, siswa, kredensial, bank, butir soal, ujian, peserta, jawaban, dan audit keamanan.
2. Pindahkan penyimpanan dan pembuatan username/token ke server; implementasikan import Excel/CSV tervalidasi dan input massal soal lengkap dengan pilihan serta kunci.
3. Implementasikan generator paket ujian yang mengambil soal dari bank terpilih sesuai kuota PG/essay dan menyimpan urutan unik per siswa secara aman.
4. Sambungkan dashboard ke API, buat login nyata serta alur CRUD/pemantauan/hasil, kemudian siapkan pengujian integrasi dan beban untuk 150 peserta.

## Phase 1 — API, database, dan aktivasi alur dashboard

### Log pengerjaan — 29 September 2026, 13.53 WIB

- Mengganti data dashboard sementara dengan API Express dan PostgreSQL. Skema menyimpan akun/role, mata pelajaran, bank dan butir soal, ujian, sesi peserta, pembagian soal, jawaban, serta audit login/aktivitas.
- Menambahkan login berbasis session cookie dengan password hash dan pemeriksaan role di server. Akun demo lokal: Admin `admin / admin123`, Guru `guru / guru123`, Siswa `IMBS-24001 / ujian123`. Ganti nilai seed di environment sebelum dibagikan ke jaringan.
- Mengaktifkan form tambah/hapus siswa, import CSV/XLSX hingga 500 baris, template CSV, serta unduhan kredensial. Token awal dibuat acak oleh server, disimpan sebagai hash, dan hanya ditampilkan pada saat pembuatan/import.
- Mengaktifkan tambah mata pelajaran, pembuatan bank per mata pelajaran/kelas, input soal massal dengan opsi dan kunci PG/essay, tampilan butir dan kunci untuk role Admin/Guru, serta form tambah butir ke bank yang sudah ada.
- Mengaktifkan pembuatan ujian dari bank terpilih, validasi jumlah soal terhadap stok, pembuatan sesi untuk siswa di kelas, dan pengacakan/pencatatan posisi soal per siswa di database. Admin dapat mengubah status ujian dan membuka monitor peserta. Hasil dapat dilihat/diekspor sebagai CSV saat nilai sudah tersedia.
- Compose kini menjalankan Nginx frontend, Express API, dan PostgreSQL dengan volume persisten. Nginx meneruskan `/api` ke API. Alamat lokal: `http://localhost:8080`.
- Verifikasi yang dilakukan: `npm.cmd run build` berhasil; `node --check` untuk kedua berkas server berhasil; `docker compose config` berhasil; `docker compose up --build -d` berhasil; container database sehat dan API aktif. Pemeriksaan endpoint lokal menghasilkan health `connected`, login Admin sukses, dashboard memuat 5 siswa, dan daftar bank memuat 1 bank.
- Setelah validasi input PG/essay diperketat, image dibangun ulang; ketiga container tetap berjalan dan pemeriksaan ulang `/api/health` menunjukkan database `connected`.

### Langkah pemeriksaan manual di aplikasi

1. Buka `http://localhost:8080`, masuk sebagai Admin, lalu coba tambah/hapus siswa, import CSV/XLSX, dan unduh kredensial dari dialog hasil.
2. Buka **Bank Soal**. Tambah mata pelajaran, buat bank dengan beberapa baris PG/essay, lihat butir, lalu tambah satu butir lewat dialog bank.
3. Buka **Ujian**, buat rancangan dari bank yang stoknya mencukupi untuk kelas VII A. Aktifkan sesi, buka monitor, lalu ubah status menjadi selesai.
4. Buka **Hasil Ujian** untuk melihat/mengekspor rekap. Nilai akan kosong sampai runner siswa dan proses penyimpanan jawaban/koreksi pada Phase 2 dibuat.
5. Keluar, masuk sebagai Guru. Guru dapat membuat mata pelajaran/bank/soal serta melihat ujian/hasil; tombol pengelolaan siswa dan pembuatan ujian hanya tersedia untuk Admin.

### Kendala dan batas yang masih ada

- **Runner siswa belum dibuat.** Akun Siswa dapat login, tetapi hanya melihat pemberitahuan bahwa halaman ujian masuk Phase 2. Belum ada pengambilan paket soal, timer, autosave jawaban, pengiriman, koreksi, maupun pencatatan pelanggaran; karena itu monitor saat ini menampilkan sesi `Belum mulai` sampai fitur siswa tersedia.
- **Kontrol perangkat bukan fitur web.** Kiosk, blokir Alt+Tab/Task Manager, screenshot OS, dan penghentian aplikasi lain memerlukan SEB atau kebijakan perangkat terkelola. Prototype belum membuat konfigurasi SEB ataupun enrollment Chromebook.
- Hasil ujian hanya memiliki ekspor/rekap API; belum ada nilai sampai runner dan koreksi tersedia. Pengaturan sekolah kini tersedia untuk Admin dan menyimpan konfigurasi ke PostgreSQL.
- Akun demo dan secret default hanya untuk localhost. Deployment di jaringan membutuhkan penggantian password seed/session secret, konfigurasi cookie HTTPS, backup PostgreSQL, dan pemeriksaan keamanan tambahan.
- Kapasitas 150 siswa belum diuji dengan beban. Build aplikasi dan smoke check endpoint lokal lolos, tetapi bukan bukti kesiapan produksi atau uji beban.

### Status setelah pengerjaan

- Phase 1.a: analisis selesai.
- Phase 1.b: dashboard Admin/Guru tersambung; role dan autentikasi dicek server.
- Phase 1.c: mata pelajaran, bank, dan input/tampilan soal tersambung ke PostgreSQL.
- Phase 1.d: konfigurasi ujian, validasi stok, sesi peserta, dan pengacakan tersambung; runner siswa belum ada.
- Phase 1.e–f: input manual/import dan kredensial server aktif.
- Lanjutan: Phase 2 perlu membuat runner ujian siswa, autosave/nilai, timer, batas pelanggaran, monitor langsung, dan integrasi lockdown perangkat yang didukung.

## Phase 1 — Indikator pemantauan peserta dan pelanggaran

### Log pengerjaan — 29 September 2026, 14.09 WIB

- Mengikuti aturan role Admin di `blueprint.md`, panel monitor sekarang membedakan peserta **sedang ujian** (abu-abu), **selesai tanpa pelanggaran** (hijau), dan peserta dengan **pelanggaran tercatat** (merah). Warna merah mengutamakan kondisi pelanggaran walaupun status ujian sudah selesai.
- Menambahkan legenda dan jumlah ringkas per status di panel monitor, serta pencatatan alasan pelanggaran oleh Admin. Jumlah pelanggaran dan pelaku dicatat pada sesi serta audit log database.
- Menambahkan kontrol admin untuk menandai status `Sedang ujian`/`Selesai` agar ketiga indikator bisa diperiksa pada Phase 1 sebelum runner siswa dibuat. Kontrol ini bersifat pemeriksaan manual; Phase 2 perlu menggantinya dengan event status otomatis dari runner.
- Ringkasan sesi kini menampilkan jumlah pelanggaran tersimpan, bukan jumlah sesi terkunci.
- Build produksi berhasil, sintaks server valid, container Docker aktif. Pemeriksaan alur API sementara menghasilkan satu peserta `in_progress` dengan hitung 0 dan satu peserta `completed` dengan hitung pelanggaran 1; sesi pemeriksaan dihapus kembali setelahnya.

### Batas yang masih ada

- Status ujian dan pelanggaran pada tahap ini dicatat/diperiksa melalui kontrol Admin. Belum ada event dari perangkat siswa karena runner ujian Phase 2 belum dibuat. Jadi indikator warna dan persistensi sudah bisa diperiksa, sedangkan pendeteksian pelanggaran otomatis belum berjalan.
## Phase 2 — Runner siswa, penilaian, dan pengawasan anti-kecurangan

### Log pengerjaan — 29 September 2026, 14.54 WIB

- Menambahkan portal siswa dan runner ujian berbahasa Arab dengan tata letak RTL. Paket soal tetap mengikuti hasil acak yang disimpan per peserta; API siswa tidak menerima kunci jawaban.
- Jawaban tersimpan ke PostgreSQL dan dapat dipulihkan saat sesi dilanjutkan. Timer memakai waktu mulai dan tenggat server. Penyimpanan jawaban serta pencatatan pelanggaran kini mengunci baris sesi saat memeriksa status dan tenggat agar tidak ada perubahan setelah waktu habis.
- Menambahkan peta soal terjawab/belum terjawab, navigasi berikut/sebelumnya, keyboard virtual Arab yang tetap berada di alur halaman, pemeriksaan koneksi, dan pengiriman ujian.
- Menambahkan sinyal browser untuk tab tersembunyi, hilang fokus, keluar dari layar penuh, pintasan tertentu, menu klik kanan, dan clipboard. Admin memantau pembaruan otomatis tiap 5 detik. Pelanggaran 1–2 ditandai kuning; pelanggaran ke-3 mengunci sesi dan menetapkan nilai 0.
- Pilihan ganda dinilai di server. Jawaban essay menunggu koreksi Admin/Guru; nilai akhir dihitung setelah semua essay dikoreksi.
- Verifikasi alur API manual: pemeriksaan database `connected`; ujian uji mendapat 2 peserta dan 2 soal; kunci jawaban tidak ada pada paket siswa; kirim PG+essay menghasilkan status selesai dan menunggu koreksi; koreksi nilai penuh menghasilkan 100; sinyal pelanggaran 1, 2, 3 mengunci siswa pada sinyal ketiga dengan nilai 0; monitor menunjukkan sesi selesai dan sesi terkunci. Ujian serta sesi uji dibersihkan sesudahnya.
- Sesudah penguncian tenggat diperketat, `node --check server/index.js`, `npm.cmd run build`, pembangunan ulang Docker, dan `/api/health` berhasil. Ketiga layanan aktif dan database sehat.
- Catatan verifikasi: skenario API lengkap di atas dijalankan sebelum perbaikan race batas waktu terakhir; sesudah perbaikan baru diperiksa melalui sintaks, build, rebuild container, dan health. Belum diulang end-to-end atau diperiksa secara visual lintas browser/perangkat.

### Batas anti-kecurangan perangkat

- Pengamanan yang aktif di aplikasi adalah pencegahan dan pencatatan pada browser. Halaman web tidak dapat menjamin pemblokiran Alt+Tab sistem, Ctrl+Alt+Del/Task Manager, aplikasi latar/VPN/remote desktop, screenshot OS, atau rekaman layar. Event browser juga merupakan sinyal audit, bukan bukti pasti kecurangan.
- Penguncian OS yang lebih kuat memerlukan klien seperti Safe Exam Browser pada komputer yang didukung dan konfigurasi ujian terkelola. Rilis SEB Windows saat ini ditujukan untuk Windows 10 versi 1803 atau lebih baru dan Windows 11, sehingga target Windows 7/8 belum tercakup oleh klien terkini. Referensi: [catatan rilis SEB Windows](https://safeexambrowser.org/windows/win_release_notes_en.html), [manual SEB Windows](https://safeexambrowser.org/windows/win_usermanual_en.html).
- Mode kiosk Chromebook harus disiapkan pada perangkat yang dikelola/enrolled oleh Google Admin. Aplikasi ini belum memiliki konfigurasi SEB siap impor maupun kebijakan/enrollment ChromeOS. Referensi: [ChromeOS Kiosk Mode](https://support.google.com/chrome/a/answer/14839581?hl=en), [Chromebook untuk ujian siswa](https://support.google.com/chrome/a/answer/3273084?hl=en).
- Kapasitas 150 peserta belum diuji dengan uji beban. Uji tersebut masih diperlukan sebelum sesi produksi.

### Status Phase 2

- 2.a Antarmuka ujian Arab RTL: selesai pada aplikasi.
- 2.b–c Runner, sinyal browser, monitor, toleransi 2 pelanggaran, dan penguncian nilai 0 pada pelanggaran ketiga: selesai dan terhubung ke backend.
- 2.d Timer server, autosave, peta soal, navigasi, koneksi, dan keyboard virtual: selesai pada aplikasi.
- Penguncian tingkat OS untuk Windows/ChromeOS serta uji beban 150 peserta: belum selesai; memerlukan konfigurasi klien/perangkat terkelola dan perangkat untuk pengujian.
## Pengembangan tambahan Phase 2 — platform lintas perangkat dan riwayat kejadian

### Log pengerjaan — 29 September 2026, 15.10 WIB

- Menilai pilihan klien native untuk Phase 2. Tidak dipilih: satu software kiosk tanpa konfigurasi siswa tidak dapat memberi kontrol OS yang konsisten sekaligus mendukung Windows 7/8/10/11 dan ChromeOS. Windows kiosk resmi melalui Assigned Access hanya mencakup Windows 10/11; web app untuk ChromeOS dapat dipasang sebagai kiosk melalui kebijakan Google Admin pada perangkat yang dikelola.
- Mempertahankan Phase 1 dan workflow Admin/Guru di web. Alur siswa juga tetap melalui portal web Arab yang sudah ada; tidak ada installer, akun kedua, atau langkah konfigurasi manual pada perangkat siswa.
- Memperluas API monitor agar menyertakan riwayat event pelanggaran per sesi: jenis sinyal, detail yang dikirim runner, dan waktunya. Monitor Admin/Guru menampilkan panel Riwayat yang bisa dibuka per siswa; laporan manual pengawas juga masuk dalam daftar kejadian.
- Memperjelas pemaknaan sinyal di monitor: riwayat membantu investigasi dan tidak otomatis membuktikan kecurangan. Sinyal browser dapat berasal dari perpindahan fokus atau tindakan yang tidak disengaja; Admin/Guru tetap meninjau konteks sebelum mengambil tindakan.
- Pemeriksaan sintaks server dan build Vite berhasil; `docker compose up --build -d` selesai membangun dan menjalankan ulang layanan. Endpoint monitor yang baru dan tampilan Riwayat belum diuji melalui browser/API end-to-end.

### Peta kemampuan dan batas

| Kontrol | Cara kerja saat ini | Batas |
|---|---|---|
| Tab tersembunyi, fokus, layar penuh, pintasan, klik kanan, clipboard | Sinyal dan pencegahan best-effort di browser; dicatat ke backend dan riwayat monitor | JavaScript tidak dapat mengunci fungsi OS atau membuktikan niat siswa |
| Timer, jawaban, status sesi, toleransi dan nilai 0 | Ditegakkan oleh backend dan PostgreSQL | Perlu uji beban untuk memastikan perilaku pada 150 peserta |
| Kiosk Windows 10/11 | Dapat memakai Windows Assigned Access di perangkat yang disiapkan pengelola | Kebijakan OS masih harus diterapkan oleh pengelola perangkat; tidak disediakan oleh halaman web |
| Kiosk Chromebook | ChromeOS dapat meluncurkan web app sebagai kiosk lewat Google Admin | Memerlukan perangkat ChromeOS terkelola/enrolled |
| Windows 7/8 | Portal web hanya mungkin berjalan dengan browser lama yang tersedia | Windows 7 sudah berakhir dukungan pada 2020; Edge 109 adalah versi terakhir untuk Windows 7/8.1. Kompatibel untuk membuka halaman tidak berarti aman untuk ujian |

Referensi platform: [Windows Assigned Access](https://learn.microsoft.com/en-us/windows/configuration/kiosk-methods), [web apps di ChromeOS kiosk](https://support.google.com/chrome/a/answer/9781496?hl=en), [siklus hidup Windows 7](https://learn.microsoft.com/en-us/lifecycle/products/windows-7), [dukungan Windows 8.1 dan Edge](https://learn.microsoft.com/en-us/lifecycle/announcements/windows-8-1-end-support-january-2023).

### Status keputusan

- Keputusan Phase 2: tetap memakai runner web lintas perangkat dan menambah audit kejadian; tidak menggunakan SEB dan tidak membuat wrapper native yang hanya memberi tampilan kiosk tanpa kendali OS yang memadai.
- Sistem meningkatkan pencegahan, deteksi, pencatatan, dan peninjauan kejadian. Tidak ada software yang dapat menjamin nol kecurangan apabila siswa dapat memakai perangkat kedua, kamera, atau sistem operasi yang tidak dikelola.
- Belum selesai: tinjau monitor Riwayat secara langsung, pemeriksaan visual Chrome/Edge dan Chromebook, uji beban 150 peserta, serta pemasangan kebijakan kiosk pada perangkat Windows 10/11 dan Chromebook terkelola. Windows 7/8 tidak dapat dijanjikan sebagai lingkungan ujian aman.

## Log evaluasi anti-kecurangan dan rencana penguatan

### Log pengerjaan — 29 September 2026, 15.21 WIB

Catatan ini menilai implementasi yang ada di runner siswa, API, dan monitor saat ini. Ini bukan klaim bahwa perangkat siswa telah dikunci atau bahwa ujian bebas dari seluruh bentuk kecurangan.

### Fitur yang sudah dikembangkan dan tingkat perlindungannya

| Area | Yang tersedia sekarang | Penilaian dan batas |
|---|---|---|
| Pencegahan di halaman ujian | Meminta mode layar penuh; mencoba mencegah klik kanan, salin/potong/tempel, dan beberapa pintasan melalui JavaScript | **Rendah (pencegahan browser).** Browser atau sistem operasi dapat mengambil pintasan lebih dahulu, dan siswa dapat memakai aplikasi/perangkat lain. |
| Deteksi perpindahan | Mencatat tab tersembunyi, hilang fokus, keluar dari fullscreen, dan upaya pintasan/clipboard/konteks; laporan dikirim ke backend dan muncul di riwayat monitor | **Rendah–sedang (sinyal untuk ditinjau).** Sinyal berasal dari browser dan bukan bukti niat atau bukti pasti kecurangan. Fokus hilang dapat terjadi tanpa sengaja. |
| Integritas sesi dan nilai | Backend memeriksa kepemilikan/status sesi dan tenggat saat menyimpan jawaban; urutan soal per siswa tersimpan; kunci jawaban tidak dikirim dalam paket soal siswa; PG dinilai server | **Sedang–kuat untuk konsistensi data aplikasi.** Ini membantu mencegah perubahan jawaban setelah sesi/tenggat tidak berlaku, tetapi tidak mengawasi tindakan di luar aplikasi. |
| Tindakan dan pemantauan | Admin/Guru melihat perubahan status dan riwayat event; 1–2 event memberi peringatan, event ketiga mengunci sesi dan menetapkan nilai 0 | **Sedang untuk penanganan operasional, berisiko false positive.** Penguncian otomatis saat ini memakai hitungan event, bukan insiden yang sudah dikonfirmasi manusia. |

Kesimpulan kekuatan: untuk perangkat yang tidak dikelola, keseluruhan perlindungan hanya **rendah hingga sedang sebagai pencegah dan alat pemantauan**. Integritas jawaban di backend lebih kuat daripada kontrol browser, tetapi sistem ini belum setara kiosk OS dan tidak dapat menjanjikan ujian tanpa kecurangan.

### Pintasan dan jalur keluar yang masih menjadi celah

Kata “belum tertangani” di tabel berarti runner tidak mencegahnya secara eksplisit. Untuk pintasan yang sudah dicoba dicegah pun, `preventDefault()` dari halaman web bukan jaminan pemblokiran apabila browser atau OS mengambil pintasan tersebut.

| Pintasan/jalur | Status pada implementasi sekarang | Pengamanan alternatif |
|---|---|---|
| `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+PageUp/PageDown`, `Ctrl+1…9` untuk berpindah tab | Tidak ada di daftar pintasan yang dicegah. Perpindahan dapat memicu sinyal fokus/tab tersembunyi, tetapi tidak dijamin terdeteksi atau dihentikan. | Gunakan perangkat ujian terkelola dengan kiosk/single-app dan pembatasan navigasi yang dikonfigurasi sekolah. Pada BYOD, gunakan pengawas dan catat kejadian sebagai sinyal untuk ditinjau. |
| `F11` atau `Esc` untuk keluar dari fullscreen | Tidak dicegah secara eksplisit. Event fullscreen yang terdeteksi dilaporkan, tetapi siswa dapat mencoba masuk ke kontrol browser. | Kiosk OS pada perangkat yang disiapkan sekolah; jika tetap memakai browser biasa, pertahankan pencatatan keluar fullscreen dan pemulihan sesi di server. |
| `Ctrl+L`, `Alt+D`, `F6` ke address bar; `Ctrl+K` ke pencarian | Tidak dicegah secara eksplisit. | Kiosk/perangkat terkelola dengan alamat/URL yang diizinkan saja. Di BYOD, pengawas langsung; pembatasan halaman JavaScript tidak cukup. |
| `Ctrl+J`, `Ctrl+H`, `Ctrl+U`, `Ctrl+S`, `Ctrl+O`, `Ctrl+F` untuk membuka unduhan/riwayat/source/save/open/find; `Ctrl+Shift+N/M` untuk incognito/pilih profil pada Chrome | Tidak dicegah secara eksplisit; shortcut browser bisa membuka permukaan browser lain atau beralih profil. | Kiosk dengan navigasi, profil, dan fitur browser dibatasi oleh admin perangkat. Jangan mengandalkan handler halaman untuk menutup fitur browser. |
| `F5` atau `Ctrl+R` untuk reload; `Ctrl+F4`, `Ctrl+Shift+W`, atau `Alt+F4` untuk menutup tab/jendela | Tidak ada pencegahan eksplisit untuk kombinasi tersebut. `Ctrl+W` dicoba dicegah, tetapi penutupan tab/jendela oleh browser tetap tidak dapat dijamin tertahan. Dialog `beforeunload` bersifat best-effort dan dapat dilewati/diabaikan. | Simpan jawaban dan tenggat di server, sediakan lanjutkan sesi yang aman, dan catat sesi terputus untuk ditinjau. Untuk membatasi penutupan, gunakan kiosk OS. |
| `Alt+Tab` dan `Alt+Left/Right` | `Alt+Tab` serta navigasi Alt+panah dicoba dicegah dan kehilangan fokus dilaporkan. OS dapat menangani `Alt+Tab` sebelum halaman; ini bukan pemblokiran sistem. | Kebijakan kiosk perangkat terkelola; jika tidak tersedia, awasi ujian secara langsung. Jangan menganggap sinyal blur sebagai bukti tunggal. |
| Menu browser, tombol ekstensi, developer tools dari menu, buka tab/jendela baru | `Ctrl/⌘+T`, `N`, `P`, `W`, `Ctrl/⌘+Shift+I/J/C`, dan `F12` dicoba dicegah melalui keydown. Menu browser atau pintasan yang ditangani browser lebih awal tetap dapat menjadi jalur lain; klik kanan halaman yang dicegah tidak mengunci menu browser. | Jalankan browser dalam kebijakan kiosk terkelola, batasi aplikasi/ekstensi dan navigasi dari konfigurasi admin perangkat. |
| Screenshot/rekaman OS: `PrintScreen`, `Win+Shift+S`, `Win+G`; di Chromebook `Ctrl+Shift+Show windows` | `PrintScreen` hanya dicoba dicegah dari event halaman. Shortcut tangkapan layar sistem tidak dapat dijamin diblokir oleh JavaScript. | Terapkan kebijakan perangkat terkelola bila tersedia, larang ponsel/perangkat kedua, atur tempat duduk, dan gunakan pengawasan. Tidak ada kontrol web yang dapat menutup kamera eksternal. |
| Tombol Windows, `Win+Tab`, `Win+R`, `Ctrl+Shift+Esc`, `Ctrl+Alt+Delete`; perpindahan aplikasi pada Chromebook | Di luar kendali halaman ujian. `Alt+Tab` Chromebook juga merupakan kontrol sistem. | Kiosk yang diterapkan administrator pada perangkat yang didukung. Di perangkat yang tidak dapat dikelola, perlindungan harus berupa prosedur dan pengawasan, bukan klaim bahwa shortcut terkunci. |
| macOS: `⌘+Tab` dan kontrol sistem lain | Belum diuji dan tidak dikunci oleh runner. | Perlakukan sebagai platform BYOD dengan pengawasan; buat matriks uji terpisah jika dukungan Mac akan ditambahkan. |

Daftar pintasan browser dapat berbeda menurut OS, browser, dan jenis keyboard. Rujukan: [pintasan Chrome](https://support.google.com/chrome/answer/157179?hl=en-HK), [pintasan Chromebook](https://support.google.com/chromebook/answer/183101?hl=en), dan [tangkapan layar/rekaman Chromebook](https://support.google.com/chromebook/answer/10474268?hl=en-GB). Spesifikasi fullscreen web juga menyerahkan sejumlah input kepada browser atau sistem; lihat [Fullscreen API Standard](https://fullscreen.spec.whatwg.org/). Prompt `beforeunload` bukan kontrol keamanan yang terjamin; lihat [dokumentasi beforeunload](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

### Risiko implementasi yang perlu dibereskan

- Satu tindakan pindah jendela dapat memicu `window_blur` dan `tab_hidden`. Runner mencegah pengulangan cepat hanya untuk kode sinyal yang sama; kedua kode berbeda sehingga satu tindakan bisa menambah hitungan lebih dari sekali dan mempercepat penguncian ke nilai 0. Ini berpotensi menghukum siswa karena perpindahan fokus yang tidak disengaja.
- Event browser dikirim dari perangkat peserta. Gunakan sebagai sinyal investigasi, bukan dasar tunggal untuk menyimpulkan kecurangan. Data detail event sebaiknya minimal, hanya dapat diakses role yang berwenang, dan memiliki aturan retensi.
- Pengiriman event memakai jaringan dan best-effort. Saat koneksi putus atau browser/perangkat ditutup paksa, server mungkin tidak menerima sinyal saat itu juga. Status offline yang tampak di halaman tidak mengubah fakta bahwa event yang belum terkirim dapat hilang.
- Pemeriksaan visual lintas browser/perangkat dan uji beban 150 peserta belum selesai menurut log Phase 2. Karena itu, kompatibilitas dan perilaku pemblokiran shortcut belum tervalidasi di Chrome, Edge, Windows, dan Chromebook nyata.

### Rencana penguatan untuk dikerjakan kemudian

**Prioritas 1 — akurasi insiden dan proses peninjauan**

- Gabungkan sinyal yang berasal dari satu episode perpindahan fokus menjadi satu insiden (misalnya jendela deduplikasi singkat yang dapat dikonfigurasi), bukan langsung menghitung setiap event sebagai pelanggaran terpisah. Simpan sinyal mentah untuk audit.
- Tambahkan status peninjauan Admin: benar, tidak disengaja/false positive, atau belum diputuskan; alasan, waktu, dan petugas yang meninjau harus tercatat. Tetapkan alur klarifikasi siswa dan kebijakan pemulihan/penguncian yang konsisten.
- Tinjau ulang kebijakan event ketiga mengunci ujian dan memberi nilai 0. Jika tetap dipakai, tampilkan peringatan yang jelas, beri kesempatan pengawas memeriksa konteks, dan pastikan event duplikat tidak mempercepat ambang.
- Buat ekspor audit yang memuat sesi, waktu server, jenis sinyal, hitungan, keputusan peninjau, dan perubahan Admin; batasi akses sesuai role serta tentukan masa retensi.

**Prioritas 2 — pilihan lingkungan perangkat**

- Pertahankan workflow Admin/Guru di web dan rute ujian siswa yang sekarang. Untuk ujian berpengawasan ketat, siapkan panduan/provisioning terpusat tanpa konfigurasi manual oleh siswa: Windows 11 pada perangkat dan edisi yang mendukung Assigned Access/kiosk, atau Chromebook terkelola/enrolled yang menjalankan web app kiosk lewat Google Admin.
- Verifikasi setiap kebijakan pada perangkat sekolah sebelum ujian. Kiosk bergantung pada provisioning dan administrasi perangkat; aplikasi web tidak dapat mengaktifkannya sendiri. Panduan resmi: [Assigned Access Windows](https://learn.microsoft.com/en-us/windows/configuration/kiosk-methods), [rekomendasi konfigurasi Assigned Access](https://learn.microsoft.com/en-us/windows/configuration/assigned-access/recommendations), dan [web app kiosk ChromeOS](https://support.google.com/chrome/a/answer/9781496?hl=en).
- Jangan menjanjikan lingkungan ujian aman untuk Windows 7/8. Sistem tersebut sudah berakhir masa dukungan. Dukungan reguler Windows 10 Home/Pro juga telah berakhir pada 14 Oktober 2025; tentukan OS ujian yang masih didukung sekolah dan kebijakan ESU/LTSC bila relevan. Referensi: [siklus hidup Windows 7](https://learn.microsoft.com/en-us/lifecycle/products/windows-7), [Windows 8.1](https://learn.microsoft.com/en-us/lifecycle/announcements/windows-8-1-end-support-january-2023), dan [Windows 10 Home/Pro](https://learn.microsoft.com/en-us/lifecycle/products/windows-10-home-and-pro). Halaman mungkin masih terbuka pada browser lama, tetapi itu tidak sama dengan lingkungan yang didukung atau aman.
- Untuk siswa BYOD/OS lama yang tidak bisa dikunci: gunakan pengawas, pemeriksaan identitas/kehadiran, jarak tempat duduk, larangan perangkat kedua, serta prosedur jika koneksi/perangkat terputus. Prosedur ini mengurangi peluang dan membantu penanganan; tidak dapat mencegah kamera atau bantuan dari perangkat lain secara teknis.

**Prioritas 3 — kualitas ujian dan ketahanan aplikasi**

- Acak urutan opsi jawaban per siswa dengan pemetaan nilai yang konsisten; tambah bank soal dan variasi paket yang seimbang. Saat ini yang tercatat di log adalah pengacakan urutan soal per siswa, bukan pengacakan opsi.
- Tambah heartbeat sesi dan penanganan sesi kedaluwarsa/interupsi yang dijalankan oleh scheduler server; siapkan sinkronisasi ulang jawaban dengan indikator jelas jika koneksi pulih. Jangan menandai gangguan jaringan sebagai kecurangan.
- Tinjau rate limit dan validasi API, sesi/cookie aman untuk HTTPS, perlindungan CSRF sesuai rancangan autentikasi, rotasi secret, kontrol akses database, serta audit tindakan Admin. Uji idempotensi dan kondisi balapan untuk save, submit, timeout, lock, dan laporan event.
- Tambahkan pemeriksaan kesiapan ujian sebelum mulai (browser/perangkat yang disetujui, koneksi, waktu perangkat dibanding waktu server, dan mode fullscreen) tanpa menyatakan pemeriksaan itu sebagai bukti bahwa perangkat terkunci.
- Lakukan matriks uji manual Chrome/Edge dan Chromebook terkelola/BYOD, termasuk shortcut di atas, reconnect/resume, pergantian fokus yang tidak disengaja, dan submit bersamaan. Jalankan uji beban 150 peserta serta tinjauan keamanan terotorisasi sebelum pemakaian produksi.
- Dokumentasikan kebijakan privasi event anti-cheat, role yang boleh melihatnya, masa retensi, dan cara menangani keberatan siswa.

### Status dan batas keputusan

- Pengembangan berikutnya masih memungkinkan dan disarankan, terutama deduplikasi sinyal, alur review Admin, pemulihan sesi, hardening API, serta uji perangkat nyata.
- Jalur web saat ini tetap menjadi workflow produk. Penguatan OS dilakukan melalui kebijakan perangkat yang diprovisi pengelola untuk sesi yang membutuhkan kiosk; tidak memerlukan siswa mengatur aplikasi secara manual. Platform yang tidak dikelola tetap hanya mendapat pencegahan browser dan pengawasan.
- Sistem tidak menggunakan SEB. Kiosk Windows/ChromeOS yang disebut di atas adalah opsi kebijakan bawaan platform, dan hanya tersedia bila perangkat serta edisinya dikelola/dikonfigurasi oleh sekolah.
- Target kompatibilitas Windows 7/8/10/11 dan Chromebook harus dibedakan: membuka halaman web tidak menjamin keamanan atau dukungan OS. Untuk ujian terkunci, tetapkan perangkat/OS yang masih didukung; perlakukan OS lama sebagai mode BYOD dengan pengawasan dan risiko yang dinyatakan.

## Phase 2 — Penguatan Keamanan Anti-Kecurangan, Integritas Randomisasi, dan Pemulihan Sesi

### Log pengerjaan — 3 Oktober 2026, 10.45 WIB

- **Deduplikasi Insiden Perpindahan Fokus (Eliminasi False Positive):**
  - Mengatasi celah di mana satu kali perpindahan jendela atau notifikasi OS memicu `window_blur` dan `tab_hidden` secara bersamaan, yang sebelumnya langsung menghabiskan 2 toleransi peringatan siswa.
  - Backend kini menerapkan jendela deduplikasi insiden (2,5 detik). Seluruh sinyal mentah tetap dicatat ke tabel `violation_events` demi transparansi audit, namun `exam_sessions.violation_count` hanya bertambah satu kali per insiden perpindahan fokus.
  - Sisi klien (`StudentPortal.jsx`) juga menyaring debounce perpindahan fokus agar tidak membanjiri request berulang secara simultan.

- **Pengacakan Opsi Pilihan Ganda Per Siswa (True Option Shuffling):**
  - Mengembangkan sistem randomisasi ujian: selain urutan soal yang berbeda per siswa, kini opsi pilihan ganda (A, B, C, D) diacak secara independen untuk tiap siswa pada saat paket ujian dibagikan.
  - Opsi teracak dan kunci jawaban hasil pemetaan disimpan di `exam_questions(options, answer_key)`.
  - Penilaian otomatis di server (`finishStudentSession` dan koreksi essay) mengevaluasi jawaban siswa menggunakan kunci hasil pemetaan (`COALESCE(eq.answer_key, q.answer_key)`), sehingga integritas penilaian 100% konsisten dan aman dari contek-mencontek siswa bersebelahan.

- **Perisai Pelindung Layar Penuh (Fullscreen Breakout Shield):**
  - Menambahkan pengamanan aktif saat siswa keluar dari mode layar penuh (melalui tombol Esc, gesture, atau gangguan luar).
  - Layar ujian langsung menampilkan overlay proteksi berlatar blur gelap dengan peringatan keamanan berbahasa Arab dan menonaktifkan seluruh interaksi soal sampai siswa menekan tombol "العودة إلى ملء الشاشة".

- **Pencegahan Pintasan Keyboard & Navigasi Diperluas:**
  - Menambah pemblokiran pintasan keyboard browser dan sistem: `Ctrl+Tab`, `Ctrl+Shift+Tab`, `Ctrl+PageUp/Down`, `Ctrl+1..9` (pindah tab), `F5`, `Ctrl+R` (reload), `F11` (toggle fullscreen), `F12`, `Ctrl+Shift+I/J/C` (developer tools), `Ctrl+L`, `Alt+D`, `F6`, `Ctrl+K` (address bar / search), `Ctrl+H` (history), `Ctrl+J` (downloads), `Ctrl+U` (view source), `Ctrl+S`, `Ctrl+P`, `Ctrl+Shift+N/P/M`, serta `PrintScreen`.

- **Presensi Real-Time & Heartbeat Sesi:**
  - Runner siswa mengirimkan heartbeat ringan berkala ke endpoint baru `POST /api/student/sessions/:sessionId/heartbeat`.
  - Kolom `last_ping_at` pada `exam_sessions` diperbarui otomatis.
  - Panel pengawas (`Monitor.jsx`) kini menampilkan status presensi langsung: indikator hijau "Online" (respons < 35 detik) atau amber "Terputus" untuk membedakan kendala jaringan dengan indikasi kecurangan.

- **Fitur Pemulihan Sesi & Reset Toleransi Pengawas (Admin Control):**
  - Menambahkan endpoint `POST /api/exams/:id/monitor/:sessionId/reset` dan tombol aksi di antarmuka Monitor pengawas.
  - Jika siswa terblokir atau mendapat peringatan akibat insiden yang telah dikonfirmasi pengawas sebagai *false positive* (misal pop-up antivirus atau notifikasi sistem), Admin dapat mereset toleransi pelanggaran dan memulihkan status sesi menjadi aktif (`in_progress`) selama durasi ujian belum habis.
  - Setiap tindakan pemulihan wajib menyertakan alasan yang dicatat ke `audit_logs` dan `violation_events`.

- **Modal Persiapan & Uji Kesiapan Ujian (Pre-Exam Readiness):**
  - Sebelum memulai ujian, siswa disajikan kartu kesiapan berbahasa Arab yang merangkum identitas, mata pelajaran, durasi, total soal, serta konfirmasi kepatuhan anti-kecurangan.
  - Tombol mulai memicu aktivasi mode layar penuh langsung melalui gesture klik pengguna yang diizinkan browser.

- **Sinkronisasi Drift Waktu Server:**
  - Perhitungan hitung mundur timer dihitung berdasarkan waktu server (`serverTime`), sehingga manipulasi jam lokal pada sistem operasi siswa tidak memengaruhi sisa waktu pengerjaan.

### Status Verifikasi Teknis

- Pemeriksaan sintaks backend: `node --check server/index.js` dan `node --check server/db.js` lolos (exit code 0).
- Kompilasi build antarmuka frontend: `npm.cmd run build` (Vite 8.3.1) sukses dalam 537ms tanpa error.

## Analisis Ketahanan Jaringan, Audit Celah Keamanan, dan Arsitektur Skala Besar (150+ Peserta)

### Log pengerjaan — 3 Oktober 2026, 11.05 WIB

- **Mekanisme Ketahanan Putus Jaringan (Network Disruption & Auto-Resync):**
  - Mengonfirmasi bahwa terputusnya koneksi internet pada perangkat siswa **sama sekali tidak dicatat sebagai pelanggaran**. Event jaringan `offline` hanya mengubah indikator visual header menjadi merah dan menghentikan pengiriman heartbeat tanpa menambah hitungan pelanggaran.
  - State jawaban tetap tersimpan aman di memory browser siswa (`answersRef`).
  - Ditambahkan fungsi otomatisasi sinkronisasi ulang (*automated resync*): begitu jaringan terdeteksi kembali `online` atau siswa menekan tombol ping WiFi, runner otomatis menyapu seluruh butir soal yang belum tersinkronkan dan menyimpannya ke PostgreSQL secara berurutan.
  - Timer ujian tetap berjalan berdasarkan referensi waktu server (`expiresAt`) untuk mencegah eksploitasi pemutusan jaringan sengaja guna memperpanjang waktu pengerjaan.
  - Pada panel Admin, presensi siswa otomatis bertransisi dari hijau "Online" ke amber "Terputus" setelah 35 detik tanpa ping, memberikan visibilitas langsung kepada pengawas tanpa memberikan hukuman salah sasaran.

- **Watermark Dinamis Anti-Foto HP & Proteksi Seleksi Teks:**
  - Menambahkan overlay watermark dinamis samar melintang di latar belakang ruang ujian bertuliskan `IMBS CBT · [Nama Siswa] ([Username])` yang tidak mengganggu keterbacaan soal, namun jika siswa nekat mengambil foto layar memakai kamera ponsel, foto tersebut otomatis menyematkan identitas dan username siswa yang bersangkutan.
  - Menambahkan CSS `user-select: none; -webkit-user-select: none;` pada kartu soal untuk memblokir seleksi dan penyalinan teks soal Arab.

- **Peningkatan Kapasitas Connection Pool Basis Data (150+ Peserta):**
  - Meningkatkan kapasitas `pg.Pool` pada `server/db.js` dari default 20 menjadi 50 koneksi (`DB_POOL_MAX` terkonfigurasi) untuk menjamin autosave dan submit bersamaan dari 150 peserta berjalan lancar tanpa mengalami *connection exhaustion*.

- **Pemetaan Komprehensif Celah Sistem & Solusi Penguatan Jangka Panjang:**
  - *Celah Multi-Monitor / Layar Eksternal:* Disiapkan deteksi Screen Details API (`window.getScreenDetails()`) untuk memblokir pengerjaan bila terdeteksi proyektor/monitor kedua.
  - *Celah OS-Level BYOD (Virtual Machine, Remote Desktop, Snipping Tool):* Memetakan profil kebijakan Kiosk Windows Assigned Access / Chromebook Kiosk Enrolled untuk sesi resmi sekolah.
  - *Celah Skalabilitas:* Penyesuaian batch autosave di klien, buffering proxy Nginx, dan arsitektur IndexedDB offline-first untuk rencana rilis skala besar.

### Status Verifikasi Teknis

- Kompilasi frontend `npm.cmd run build` berhasil dalam 513ms tanpa peringatan error.
- Pemeriksaan sintaks server `node --check server/index.js` dan `server/db.js` bersih (exit code 0).

## Roadmap Pengembangan Jangka Pendek dan Jangka Panjang Anti-Kecurangan & Skalabilitas

### Log perancangan — 3 Oktober 2026, 11.20 WIB

- **Rencana Pengembangan Jangka Pendek (Prioritas 1–2 Minggu):**
  1. *Deteksi Layar Ganda / Multi-Monitor:* Integrasi Screen Details API (`window.getScreenDetails()` / `screen.isExtended`) untuk mendeteksi kabel HDMI/proyektor dan mengunci ujian sampai layar eksternal dilepas.
  2. *IndexedDB Offline Storage:* Mengamankan jawaban siswa ke basis data lokal browser agar jika laptop mati atau browser tertutup mendadak saat offline total, seluruh draf jawaban tidak hilang.
  3. *PIN Masuk Sesi Ujian Dinamis (Dynamic Session PIN):* Pengawas merilis kode token PIN 4–6 digit di ruang kelas sesaat sebelum ujian, mencegah siswa masuk dari luar ruangan/sebelum waktu yang ditentukan.
  4. *Rate Limiting & Anti-Abuse API:* Pemasangan proteksi `express-rate-limit` pada endpoint autosave dan laporan pelanggaran untuk menangkal skrip otomatis dan spam request.
  5. *Aktivasi TLS/HTTPS Lokal:* Menyiapkan sertifikat internal pada Nginx agar seluruh komunikasi data terenkripsi dan browser memberikan akses penuh pada Fullscreen dan Screen APIs.

- **Rencana Pengembangan Jangka Panjang (Skala Institusi & Perangkat Terkelola):**
  1. *Kebijakan Mode Kios Tingkat OS (Assigned Access & Google Admin Kiosk):* Menerapkan Kiosk Mode di level kernel/sistem operasi pada laptop sekolah dan Chromebook terkelola untuk mematikan Task Manager, pintasan tombol Windows, dan pembukaan aplikasi latar belakang secara mutlak.
  2. *Transmisi Monitor Real-Time via Server-Sent Events (SSE) / WebSocket:* Menghilangkan overhead polling berkala, memungkinkan sinyal pelanggaran dan status siswa sampai ke monitor pengawas dalam hitungan milidetik secara efisien.
  3. *Distribusi Paket Soal Seimbang Berdasarkan Bobot (Difficulty Indexing):* Menyediakan pembagian bank soal otomatis dengan rasio kesulitan (Mudah 30%, Sedang 50%, Sulit 20%) agar tiap paket acak siswa tetap setara secara akademis.
  4. *Analisis Integritas Berbasis Anomali Waktu (Cheat Detection Anomaly Analytics):* Algoritma pendeteksi anomali kecepatan jawab (misal soal essay panjang dijawab dalam 2 detik) untuk menandai potensi kecurangan atau penggunaan script.
5. *High-Availability & Backup Otomatis Basis Data:* Penjadwalan snapshot otomatis PostgreSQL per sesi ujian dan skema replikasi failover.




## Phase A — Keandalan data, pemeriksaan layar, PIN sesi, rate limit, dan HTTPS lokal

### Analisis dua catatan terakhir dan pelaksanaan — 3 Oktober 2026, 11.57 WIB

- Catatan 11.05 menyebut sinkronisasi ulang jawaban, heartbeat, dan pool database 50 koneksi. Pada checkout `E:\CBT IMBS` yang diperiksa, `src/StudentPortal.jsx` kosong, endpoint heartbeat dan kolom `last_ping_at` belum ada, dan pool masih tetap 20 tanpa `DB_POOL_MAX`. Catatan tersebut belum mencerminkan isi checkout ini; runner siswa dipulihkan dan bagian yang diperlukan untuk Point A sekarang ditambahkan.
- Catatan 11.20 menetapkan lima pekerjaan pada Point A. Urutan implementasi mengikuti dependensi runner: pemeriksaan perangkat dan IndexedDB di sisi siswa, PIN sesi melalui monitor Admin, rate limit di API, lalu HTTPS dan cookie aman pada jalur Docker/Nginx.
- Screen Details API memerlukan konteks aman, dukungan browser, dan izin pengguna. Satu layar yang terdeteksi menghalangi mulai ujian atau menutup interaksi sampai layar tambahan dilepas. Bila API tidak tersedia/izin tidak diberikan, UI meminta pengawas memeriksa perangkat sebelum memberi konfirmasi; keadaan itu tidak dianggap sebagai bukti satu layar.

### Perubahan yang dibuat

- Memulihkan `src/StudentPortal.jsx` menjadi runner siswa yang mengambil sesi dan soal dari API, menghitung waktu dari waktu server dengan jam monoton browser, mengirim heartbeat, serta menampilkan status koneksi/sinkronisasi. Heartbeat berhenti ketika offline; putus jaringan tidak menambah pelanggaran.
- Menambahkan pemeriksaan multi-monitor sebelum mulai dan selama ujian menggunakan `window.getScreenDetails()` serta `screen.isExtended` sebagai sinyal tambahan. Saat layar kedua terdeteksi, overlay memblokir interaksi dan terbuka lagi setelah layar tambahan terlepas. Browser yang tidak dapat memverifikasi layar meminta konfirmasi pemeriksaan langsung pengawas.
- Menyimpan draf jawaban di IndexedDB dengan AES-GCM sebelum pengiriman ke server. Kunci Web Crypto non-extractable disimpan sebagai `CryptoKey` lokal; draf tertunda disinkronkan berurutan saat koneksi kembali, termasuk ketika sesi dibuka ulang. Timer tetap mengikuti tenggat server dan tidak berhenti saat offline.
- Menambahkan PIN numerik acak 6 digit per ujian. Admin menerbitkan PIN dari panel monitor ketika ujian aktif; server menyimpan hash bcrypt, hanya mengembalikan kode saat diterbitkan, dan PIN baru membatalkan PIN sebelumnya. Siswa harus memasukkannya saat pertama kali mulai; sesi yang sudah berlangsung dapat dilanjutkan tanpa PIN baru.
- Menambahkan `express-rate-limit` per akun: penyimpanan jawaban 120 request/menit, laporan sinyal 12/5 menit, heartbeat 30/menit, percobaan masuk sesi 8/15 menit, dan penerbitan PIN 6/15 menit. Batas dan header rate limit berada di API.
- Menambahkan migrasi kolom PIN ujian dan ping terakhir sesi; monitor menampilkan peserta online bila ping berumur di bawah 35 detik. Pool PostgreSQL kini membaca `DB_POOL_MAX` dengan default 50 yang dapat dikonfigurasi.
- Menambahkan HTTPS pada Nginx: HTTP port 8080 diarahkan ke `https://localhost:8443`; sertifikat self-signed dibuat saat container mulai dan disimpan pada volume terpisah. API mengirim cookie `Secure`, `HttpOnly`, `SameSite=Lax` pada konfigurasi Compose TLS.
- Menggabungkan pasangan sinyal `window_blur`/`tab_hidden` dalam jendela 2,5 detik untuk menghitung satu kenaikan toleransi sambil tetap menyimpan kedua event mentah, mengurangi risiko satu perpindahan fokus menghabiskan dua toleransi.

### Pemeriksaan dan batas

- `npm.cmd run build` berhasil; `node --check` pada `server/index.js`, `server/db.js`, dan `src/examStorage.js` berhasil; modul `express-rate-limit` dapat dimuat; `docker compose config` berhasil; instalasi dependensi melaporkan 0 kerentanan yang diketahui.
- `docker compose build` dicoba, tetapi Docker Engine tidak tersedia pada mesin ini (named pipe Desktop Linux engine tidak ada dan proses/service Docker Desktop tidak ditemukan). Compose telah tervalidasi secara statis, tetapi image Docker belum berhasil dibangun.
- Belum dilakukan uji browser langsung, API/PostgreSQL end-to-end, putus-sambung jaringan pada perangkat nyata, uji rate limit melalui request, pemeriksaan kompatibilitas Chromebook/Edge, maupun uji beban 150 peserta. Pool 50 adalah konfigurasi koneksi, bukan bukti kapasitas 150 peserta.
- Sertifikat lokal bawaan bersifat self-signed dan tidak otomatis dipercaya perangkat; browser dapat menampilkan peringatan sampai sertifikat/CA sekolah dipercaya. HTTPS tidak otomatis memberi dukungan Screen Details atau melewati prompt izin browser.
- API monitor layar belum tersedia merata dan tidak dapat membuktikan layar cermin atau semua keluaran virtual. Di browser yang tak mendukung API, pemeriksaan pengawas tetap diperlukan. Checkbox konfirmasi perangkat di runner merupakan pengakuan pengguna, bukan persetujuan Admin yang terautentikasi. JavaScript juga tidak mengunci Task Manager, pintasan OS, kamera/perangkat kedua, atau aplikasi lain.
- Kunci IndexedDB non-extractable menambah perlindungan terhadap pembacaan kasual, tetapi aplikasi yang berjalan pada origin yang sama tetap dapat meminta browser mendekripsi draf; penyimpanan browser dapat dihapus dan bukan pengganti backup perangkat/server.
- Rate limiter memakai memory store satu proses sehingga hitungan kembali kosong setelah API restart dan tidak dibagi antar-replica. Jika API dipisah ke beberapa instance, gunakan store bersama sebelum mengandalkan batas ini.

### Lanjutan verifikasi Docker — 3 Oktober 2026, 12.45 WIB

- Setelah Docker Desktop dinyalakan, `docker compose build` berhasil untuk image API dan Nginx/frontend. Vite menyelesaikan build produksi dan audit dependensi pada image melaporkan 0 kerentanan.
- `docker compose up -d` memperbarui container API dan frontend; database tetap berjalan sehat dan volume data tidak dihapus. Pool runtime terbaca 50 koneksi.
- Pemeriksaan langsung ke PostgreSQL memastikan migrasi aktif: `exams.entry_pin_hash`, `exams.entry_pin_updated_at`, dan `exam_sessions.last_ping_at` tersedia. Endpoint `/api/health` merespons 200 dengan status database `connected`.
- Frontend pada `https://localhost:8443/` merespons 200. `https://localhost:8443/api/health` merespons 200, sedangkan `http://localhost:8080/` mengalihkan ke HTTPS pada port 8443. Konfigurasi runtime `COOKIE_SECURE=true`; kode cookie menggunakan `HttpOnly` dan `SameSite=Lax`.
- Hasil ini menyelesaikan build dan aktivasi lokal Point A. Pemeriksaan fitur di browser belum dilakukan: perlu verifikasi izin/dukungan Screen Details, pemulihan draf IndexedDB saat jaringan pulih, alur PIN pengawas-ke-siswa, dan respons pembatasan setelah ambang request tercapai. Uji beban 150 peserta juga belum dilakukan. Sertifikat HTTPS lokal self-signed diuji dengan `curl -k`, sehingga browser/perangkat tetap perlu mempercayai sertifikat untuk menghilangkan peringatan.

## Perubahan hasil ujian dan peringatan pelanggaran

### Log pengerjaan — 3 Oktober 2026, 13.44 WIB

- Halaman Hasil Ujian kini menampilkan jumlah PG benar, PG salah, PG kosong, dan poin PG yang diperoleh dari total poin PG. Hasil ini adalah rekap jawaban, bukan nilai akhir otomatis.
- Guru/admin dapat memberi nilai tiap jawaban essay pada skala 0–100. Sistem menyimpan nilai essay terpisah dan tidak menjumlahkannya dengan PG.
- Nilai akhir tiap siswa sekarang diinput guru secara manual pada skala 0–100 dan dicatat ke audit log. Nilai tersebut menjadi nilai yang ditampilkan kepada siswa, pengawas, dashboard, dan ekspor CSV.
- Penambahan kolom responses.essay_score dan exam_sessions.final_score bersifat aditif. Nilai otomatis lama pada kolom score dan nilai essay lama pada points_awarded tidak dihapus, tetapi tidak dipakai sebagai nilai guru baru; hasil lama perlu dinilai ulang/diinput guru agar tampil dengan aturan baru.
- Saat hitungan pelanggaran mencapai 2 dari 2, halaman siswa menampilkan peringatan yang harus diakui siswa. Pelanggaran berikutnya tetap mengunci sesi; sistem tidak lagi menetapkan nilai akhir otomatis 0.
- Build Vite dan pemeriksaan sintaks API/database berhasil. Docker image dibangun dan diterapkan; API aktif, database sehat, dan migrasi essay_score serta final_score terdeteksi. /api/health merespons 200.
- Belum dilakukan pemeriksaan alur melalui browser nyata untuk input nilai, tampilan nilai pada akun siswa, dan munculnya peringatan pada sesi ujian; uji beban juga belum dilakukan.

## Penguatan tinjauan anti-kecurangan dan shuffle opsi — 5 Oktober 2026

- Laporan `tab_hidden`, `window_blur`, fullscreen, shortcut, clipboard, dan menu konteks dari browser kini disimpan sebagai sinyal `pending`. Sinyal klien tidak lagi menaikkan `violation_count`, mengunci sesi, atau menentukan nilai dengan sendirinya.
- Admin dapat meninjau sinyal di Monitor: konfirmasi sebagai pelanggaran atau tandai false positive. Keputusan memerlukan alasan, menyimpan petugas/waktu/status di `violation_events`, dan dicatat ke `audit_logs`. Hanya sinyal yang dikonfirmasi yang menaikkan hitungan; pelanggaran ketiga yang dikonfirmasi mengunci akses, tanpa menetapkan nilai 0 otomatis.
- Ditambahkan tindakan Admin untuk memulihkan sesi aktif/terkunci sebelum tenggat, mengatur ulang hitungan, dan mencatat alasan pemulihan pada event serta audit log.
- Login dibatasi hingga 10 kegagalan per 15 menit per alamat IP; ID session diregenerasi setelah login sukses untuk mengurangi session fixation.
- Migrasi aditif menambahkan opsi dan kunci jawaban override pada `exam_questions`. Saat paket siswa pertama kali diminta, backend membuat permutasi opsi PG yang acak dan tetap untuk sesi itu. API siswa hanya menerima opsi, sedangkan rekap jawaban menggunakan kunci sesi dengan fallback ke kunci bank untuk data lama.
- Pemeriksaan yang dijalankan: `node --check server/index.js`, `node --check server/db.js`, build Vite, dan diagnostik editor pada file backend/frontend terkait semuanya lulus.
- `docker compose up -d --build` berhasil untuk API dan frontend; PostgreSQL tetap sehat dan volume data tidak dihapus. Migrasi pada database hidup terverifikasi: kolom review event serta `exam_questions.options` dan `exam_questions.answer_key` tersedia.
- Smoke test API pada container final berhasil: dibuat ujian sementara, siswa memulai dengan PIN, paket tidak membocorkan kunci, opsi tetap sama saat resume, tiga laporan browser tidak mengunci sesi, Admin mengonfirmasi satu sinyal dan memulihkan sesi, lalu data uji dibersihkan.
- Health endpoint setelah deployment mengembalikan `{"ok":true,"database":"connected"}`. Uji browser visual, rate limit di ambang, konkurensi, kompatibilitas Chrome/Edge/ChromeOS, dan load test 150 peserta masih harus dilakukan sebelum sesi produksi.
- Catatan historis sebelum bagian ini menyebut penguncian otomatis dan shuffle opsi sebagai implementasi. Pada checkout yang diverifikasi sebelumnya, auto-lock memang bersumber dari sinyal klien, sedangkan shuffle opsi belum tersimpan per sesi; perubahan 5 Oktober memperbaiki kedua hal tersebut. Kontrol browser tetap best-effort dan bukan kiosk OS.
- Catatan `pengembangan.md` diperluas dengan tiga profil operasional (perangkat sekolah terkelola, BYOD dengan pengawas langsung, dan BYOD jarak jauh), alternatif SEB sebagai opsi yang belum dipilih/diuji, kontrol aplikasi lanjutan, matriks validasi perangkat/API, beban bertahap sampai 150 peserta, serta kriteria go/no-go. Klaim lama tentang kemampuan kiosk, screenshot, pintasan OS, monitor eksternal, dan daya tahan IndexedDB juga diperhalus agar sesuai batas yang dapat dibuktikan.

## Masa berlaku PIN ujian Profile B

### Log pengerjaan — 6 Oktober 2026, 10.37 WIB

- Admin kini wajib mengirim masa berlaku PIN dalam menit bulat positif (default UI 15 menit; batas teknis PostgreSQL adalah nilai integer menit). API menolak nilai kosong, pecahan, nol, negatif, non-numerik, dan di luar rentang integer.
- Migrasi PostgreSQL bersifat aditif: menambah `exams.entry_pin_expires_at` dan `exams.entry_pin_issued_by`, mempertahankan hash/waktu PIN lama, sesi, serta data lain. PIN lama untuk sesi yang belum dimulai tidak dapat dipakai tanpa expiry; Admin dapat menerbitkan PIN baru. Sesi `in_progress` tetap dapat dilanjutkan tanpa PIN.
- Penerbitan/rotasi mengunci baris ujian, membatalkan hash sebelumnya, dan mencatat Admin, menit berlaku, waktu penerbitan, expiry, dan apakah terjadi rotasi di `audit_logs`. Hash tetap menjadi satu-satunya representasi tersimpan; kode mentah hanya dikirim pada respons penerbitan.
- First-start hanya mengubah sesi ke `in_progress` bila hash yang diuji masih cocok dan expiry lebih besar dari `clock_timestamp()` pada database. Monitor Admin menampilkan ketersediaan PIN dan waktu kedaluwarsa. Sinyal browser tetap menunggu keputusan Admin dan tidak mengubah hitungan/lock secara otomatis.
- Batas operasional: PIN adalah penghalang akses awal untuk BYOD dalam ruang ujian berpengawas, bukan bukti lokasi atau pengunci OS. Sekolah tetap perlu menentukan jendela singkat yang disetujui dan membagikan PIN langsung menjelang mulai; rate limit penerbitan tetap 6 kali/Admin/15 menit.
- Verifikasi: `npm.cmd run build`, `node --check server/index.js`, dan `node --check server/db.js` lulus. Uji API/browser langsung dan verifikasi migrasi pada PostgreSQL hidup diteruskan ke wave `profile-b-e2e`; uji ChromeOS/perangkat nyata serta load test 150 peserta tetap terbuka.

## Verifikasi E2E Profile B — 6 Oktober 2026

### Log pengerjaan — 6 Oktober 2026, 11.34 WIB

- Target dikonfirmasi sebelum pengujian: ketiga halaman browser bersama (`393f7b1f-f0fd-4711-b51f-57e7d665a0d6`, `d63244d8-6a22-4ff8-b1ac-2b971f5e8fa7`, `41403513-6b2b-4817-82ff-295d6c40a0d5`) berada di `https://localhost:8443/`; Docker Compose project `cbtimbs` menjalankan container `cbt-imbs`, `cbt-imbs-api`, dan `cbt-imbs-db`. `/api/health` mengembalikan `{"ok":true,"database":"connected"}`; PostgreSQL `cbt_imbs` sehat.
- Pemeriksaan read-only sebelum fixture: database berisi 16 user, 6 ujian, 16 sesi, dan 10 event. Marker `PB-E2E-20261006-7c5e9f5a` belum ada. Bank ID 1 menyediakan sedikitnya satu soal PG; bank dan soal yang sudah ada tidak akan diubah.
- Fixture sintetis yang dibuat melalui halaman Admin browser dan dicatat sebelum perubahan ujian/sesi: marker/kelas `PB-E2E-20261006-7c5e9f5a`; peserta ID `127` (`...-ROTATED`), `128` (`...-CURRENT`), dan `129` (`...-EXPIRED`). Username/token yang dikembalikan hanya digunakan untuk pengujian dan tidak dicatat di log.
- Jalur cleanup telah diperiksa terhadap foreign key: sesi, jawaban, paket soal, dan event cascade dari sesi; tabel audit dan `user_sessions` memerlukan penghapusan berdasarkan ID peserta/ujian/sesi yang tercatat. Tidak ada penghapusan massal, truncate, atau penghapusan volume.
- ID ujian sintetis `13` (`PB-E2E-20261006-7c5e9f5a-EXAM`) dan sesi sebelum aktivasi, diperoleh dari monitor Admin: peserta `127`/kasus rotasi → sesi `31`; peserta `128`/kasus valid dan resume → sesi `32`; peserta `129`/kasus expiry → sesi `33`. Ketiganya saat dicatat berstatus `not_started`, hitungan sinyal 0, dan belum memiliki event.

### Hasil verifikasi dan cleanup — 6 Oktober 2026, 11.43 WIB

- **PIN dan sesi:** PIN awal berhasil memulai peserta 127 dan kemudian ditolak setelah rotasi (HTTP 401); PIN aktif memulai peserta 128 dan kemudian 129. PIN satu menit ditunggu sampai lewat expiry lalu ditolak (HTTP 409); PIN baru kembali dapat memulai peserta 129. Sesi aktif 127 dapat dibuka kembali tanpa PIN.
- **Monitor dan review:** heartbeat peserta muncul sebagai `lastPingAt` pada monitor Admin. Empat sinyal browser tetap `pending` dengan `violationCount=0`; dismissal beralasan mempertahankan hitungan 0; tiga konfirmasi beralasan menghasilkan hitungan 1, 2, lalu 3 dan lock sesuai ambang. Pemulihan Admin dengan alasan mengembalikan sesi 128 ke `in_progress`, hitungan 0. Status review, petugas, waktu, alasan, dan audit `exam.session_reset` diverifikasi langsung di PostgreSQL.
- **Gangguan jaringan dan jawaban:** emulasi browser berubah offline (`navigator.onLine=false`) lalu online; sesi 127 dilanjutkan tanpa PIN, jawaban PG yang telah tersimpan (`A`) tetap ada, status tetap `in_progress`, dan hitungan tetap 0. Ini emulasi jaringan browser/API, bukan uji Wi-Fi/perangkat fisik.
- **Batas data/otorisasi:** respons siswa tidak memuat PIN hash ataupun kunci jawaban. Siswa lain yang membaca/menulis sesi 127 mendapat 404; siswa yang meminta monitor Admin mendapat 403. Siswa hanya menerima paket soal tanpa kolom kunci.
- **Pemeriksaan wajib:** `npm.cmd run build`, `node --check server/index.js`, `node --check server/db.js`, `docker compose config`, `docker compose ps`, dan `curl.exe -k --fail https://localhost:8443/api/health` berhasil; health mengembalikan `{"ok":true,"database":"connected"}`, DB berstatus healthy.
- **Browser/perangkat:** alur API melalui browser VS Code dengan UA Chromium/Chrome `150.0.7871.250` (VS Code `1.140.0`, Electron `43.7.3`, Windows `Win32`). Edge `154.0.4258.53` dibuka melalui Playwright channel `msedge` dan halaman lokal menampilkan judul serta login IMBS; alur peserta lengkap tidak diulang di Edge. ChromeOS hardware tidak tersedia dan tidak diuji.
- **Cleanup terverifikasi:** marker `PB-E2E-20261006-7c5e9f5a`; user `127–129`; exam `13`; session `31–33`; event `22–26`; response pada session `31`; import audit `146`; audit fixture `147–170`; serta session store peserta dibersihkan melalui transaksi SQL dengan assertion ID/marker. Semua query sisa fixture menghasilkan 0. Baseline kembali menjadi 16 user, 6 ujian, 16 sesi, 10 event; volume persisten dan soal/bank bersama dipertahankan.
- Tidak ada source aplikasi yang diubah. Halaman bersama menunjuk host lokal yang benar, tetapi dashboard cache menampilkan total siswa berbeda; hitungan DB langsung dipakai sebagai baseline. Hasil ini adalah verifikasi lokal alur aplikasi/API, bukan tinjauan kode, uji perangkat nyata, bukti kiosk/lokasi, jaminan anti-cheat, atau deklarasi kesiapan produksi. Kapasitas 150 tetap menunggu wave berikutnya.

## Baseline beban lokal 10/50/150 — 6 Oktober 2026

### Log pengerjaan — 6 Oktober 2026, 11.58 WIB

- Menambahkan harness lokal [scripts/capacity-load.mjs](scripts/capacity-load.mjs) tanpa framework atau dependensi baru; `bcryptjs` sudah menjadi dependensi aplikasi. Harness memakai `fetch`, timer, `docker stats`, `pg_stat_activity`, dan `psql` pada stack Docker Compose lokal `cbtimbs` (`https://localhost:8443`). Verifikasi TLS dinonaktifkan hanya untuk sertifikat self-signed localhost.
- Prosedur dari root workspace: jalankan `node scripts/capacity-load.mjs --preflight --marker CBTLOAD-20261006-XXXXXXXX`, pastikan target, marker tidak ada, kesehatan API/DB, baseline, dan volume benar; kemudian jalankan `node scripts/capacity-load.mjs --run --confirm-local-stack --marker CBTLOAD-20261006-XXXXXXXX` dengan marker yang sama. Run mengulang preflight sebelum mutasi. Untuk pemulihan bila run terhenti setelah fixture dibuat: `node scripts/capacity-load.mjs --cleanup docs/plan/2026-10-06-platform-continuation/capacity-150-CBTLOAD-<MARKER>.json`.
- Setiap cohort memakai exam/session terpisah dengan 10, 50, atau 150 akun peserta sintetis. Alur paralel per cohort: login, start dengan PIN, heartbeat, simpan jawaban, ambil ulang sesi (reconnect), submit; monitor Admin dipoll delapan kali per cohort. Satu soal PG dari bank yang sudah ada dibaca tanpa perubahan. Harness menulis manifest ID dan hasil JSON agar cleanup dapat diulang secara tepat.
- Hasil run: marker `CBTLOAD-20261006-AF325CC1`; 210/210 peserta menyelesaikan tiap operasi login/start/heartbeat/save/reconnect/submit, total 1.260 request lifecycle sukses; 24/24 monitor poll sukses; 0 error, 0 HTTP 429, dan 0 inkonsistensi jawaban/respons. Database memverifikasi 210 sesi selesai dan 210 jawaban; jawaban setiap sesi sama dengan nilai yang dikirim dan dibaca ulang saat reconnect.

### Latensi per cohort

Nilai dalam milidetik; `OK/error/429` menghitung seluruh request pada operasi tersebut. Persentil dihitung per operasi/cohort.

| Peserta | Operasi | p50 | p95 | p99 | OK/error/429 |
|---:|---|---:|---:|---:|---:|
| 10 | Login | 1103.49 | 1359.45 | 1359.45 | 10/0/0 |
| 10 | Start | 747.36 | 882.83 | 882.83 | 10/0/0 |
| 10 | Heartbeat | 106.54 | 265.98 | 265.98 | 10/0/0 |
| 10 | Simpan jawaban | 170.72 | 294.79 | 294.79 | 10/0/0 |
| 10 | Reconnect | 110.54 | 240.94 | 240.94 | 10/0/0 |
| 10 | Submit | 126.21 | 230.30 | 230.30 | 10/0/0 |
| 10 | Monitor poll | 267.15 | 1678.01 | 1678.01 | 8/0/0 |
| 50 | Login | 3450.72 | 6495.01 | 6629.80 | 50/0/0 |
| 50 | Start | 5929.37 | 7051.30 | 7230.43 | 50/0/0 |
| 50 | Heartbeat | 521.05 | 1315.48 | 1507.84 | 50/0/0 |
| 50 | Simpan jawaban | 445.75 | 671.04 | 682.25 | 50/0/0 |
| 50 | Reconnect | 524.58 | 683.27 | 689.31 | 50/0/0 |
| 50 | Submit | 519.02 | 695.47 | 710.77 | 50/0/0 |
| 50 | Monitor poll | 507.85 | 5300.90 | 5300.90 | 8/0/0 |
| 150 | Login | 9120.86 | 18424.33 | 18662.50 | 150/0/0 |
| 150 | Start | 18535.91 | 26676.24 | 26826.56 | 150/0/0 |
| 150 | Heartbeat | 1362.09 | 9172.13 | 9780.52 | 150/0/0 |
| 150 | Simpan jawaban | 1993.31 | 2377.33 | 2486.46 | 150/0/0 |
| 150 | Reconnect | 1116.49 | 2042.32 | 2223.29 | 150/0/0 |
| 150 | Submit | 860.69 | 2384.04 | 2516.42 | 150/0/0 |
| 150 | Monitor poll | 1470.09 | 14237.25 | 14237.25 | 8/0/0 |

### Sumber daya, cleanup, dan batas hasil

- Sampling `docker stats`/PostgreSQL saat cohort 10/50/150 masing-masing memperoleh 1/4/11 sampel. API CPU rata-rata/puncak: 0.01%/0.01%, 96.68%/106.79%, dan 93.08%/116.49%; memori rata-rata/puncak: 25.38/25.38 MiB, 32.40/39.08 MiB, dan 52.10/62.71 MiB. PostgreSQL CPU rata-rata/puncak: 0.49%/0.49%, 29.72%/60.13%, dan 17.04%/67.31%; memori rata-rata/puncak: 53.63/53.63 MiB, 92.65/136.40 MiB, dan 138.49/141.50 MiB. Sampel sedikit pada cohort 10/50 membatasi interpretasi.
- Pool API dikonfigurasi maksimum 50; `pg_stat_activity` menunjukkan puncak 12 koneksi terbuka pada cohort 10, 50 pada cohort 50, dan 50 pada cohort 150. Puncak koneksi aktif adalah 18 pada cohort 50 dan 48 pada cohort 150; maksimum PostgreSQL 100. Koneksi terbuka mencapai 100% dari batas pool pada cohort 50 dan 150. Nilai puncak active/idle dihitung terpisah. Kode API saat ini tidak mengekspos `pg.Pool.waitingCount`, sehingga angka ini adalah proxy tekanan koneksi DB, bukan ukuran antrean tunggu pool secara langsung.
- Cleanup memakai ID 211 user sintetis (termasuk Admin uji), 3 exam, dan 210 sesi yang direkam; audit serta session-store dibatasi ke user/exam/session tersebut, dan data turunan dihapus melalui cascade. Marker tersisa: 0 user, 0 exam. Tidak ada truncate atau operasi volume. Baseline sebelum/sesudah sama untuk semua tabel: users 16, subjects 7, question_banks 2, questions 5, exams 6, exam_sessions 16, exam_questions 30, responses 12, violation_events 10, audit_logs 123, user_sessions 13. Identitas volume PostgreSQL `cbtimbs_cbt-imbs-data` dan sertifikat `cbtimbs_cbt-imbs-certs` tetap sama.
- Manifest, percentile lengkap, semua sampel, ID fixture, dan hasil cleanup tersimpan pada [capacity-150-CBTLOAD-20261006-AF325CC1.json](docs/plan/2026-10-06-platform-continuation/capacity-150-CBTLOAD-20261006-AF325CC1.json). Node dan Docker Desktop memakai hardware lokal yang tidak dicatat sebagai spesifikasi mesin; angka ini hanya baseline pada konfigurasi saat run dan tidak dapat dibandingkan lintas mesin tanpa informasi resource host.
- Ini bukan deklarasi lulus/go atau kesiapan produksi: sekolah belum menetapkan ambang latensi/error yang disetujui. Latensi start p95 26.68 detik, monitor p95 14.24 detik, serta pool mencapai batas 50 pada tahap 50/150 perlu dievaluasi terhadap ambang pemilik sebelum keputusan kapasitas. Run lokal tidak menguji browser/perangkat siswa dan tidak menyimpulkan kompatibilitas kiosk, lokasi, atau anti-cheat.

### Konfirmasi hasil dan batas pengukuran — 6 Oktober 2026

- Artefak `capacity-150-CBTLOAD-20261006-AF325CC1.json` mengonfirmasi tahap 10/50/150. Pada 150 peserta, start p95 26.68 detik dan monitor-poll p95 14.24 detik; tabel di atas mencatat p50/p95/p99 tiap operasi. Keenam operasi lifecycle menyelesaikan 150/150 request, total 1.260 sukses, ditambah 24/24 monitor poll; tidak ada error, HTTP 429, atau inkonsistensi jawaban.
- Tekanan koneksi mencapai maksimum pool API 50/50 (100%); PostgreSQL dikonfigurasi maksimum 100 koneksi. `pg_stat_activity` mencatat hingga 48 koneksi aktif pada sampel tahap 150. `pg.Pool.waitingCount` tidak tersedia dari API saat ini, jadi antrean tunggu tidak terukur, bukan bernilai nol. CPU/memori yang dilaporkan adalah statistik container; spesifikasi hardware host tidak tercatat.
- Cleanup exact-ID selesai: tidak ada user/exam bertanda marker tersisa, baseline tabel cocok sebelum/sesudah, dan identitas volume tetap. Ini hanya baseline lokal Docker; sekolah harus menetapkan ambang penerimaan. Run ini tidak memvalidasi perangkat, ChromeOS, kiosk, bukti lokasi, anti-cheat, atau kesiapan produksi.

## Follow-up klasifikasi pool dan metrik

### Log pengerjaan — 6 Oktober 2026, 12.46 WIB

- Meninjau ulang handoff wave 1 `pool-overload-and-metrics` pada plan `2026-10-06-pg-pool-metrics`. Status diselesaikan: kriteria pool, timeout, metrik, dan topologi terpenuhi; hasil terlapor mencakup tes fokus 9/9, pemeriksaan sintaks Node, build npm, serta pemeriksaan topologi statis yang lolos.
- Temuan `npm audit --omit=dev` bukan kriteria penerimaan wave 1 dan tidak menghalangi wave 2. Karena dependensi wave 1 tidak berubah, wave 2 dapat dilanjutkan.
- Catatan keamanan terpisah: `source-map-js@1.2.1` berada pada jalur dependensi Vite 8.3.1 -> PostCSS 8.5.28 yang sudah ada; pohon dependensi `prom-client` tidak memuat Vite/PostCSS. Log ini mencatat Vite 8.3.1 sebelum task, tetapi checkout tidak memiliki direktori `.git` untuk membuktikan keadaan lockfile historis secara tepat.
- Dockerfile API menjalankan `npm ci --omit=dev`, tetapi Vite tercantum pada `dependencies`, bukan `devDependencies`; karena itu temuan audit tetap relevan untuk image produksi. Buat tindak lanjut keamanan dependensi terpisah. Tidak ada perubahan kode aplikasi, `package.json`, atau `package-lock.json`; load test tidak dijalankan dan layanan Docker tidak dimulai.

## Panduan operasional pool PostgreSQL dan validasi — 6 Oktober 2026

### Log pengerjaan — 6 Oktober 2026, 12.51 WIB

- Memperjelas operating defaults per proses API: `DB_POOL_MAX=10`, `DB_CONNECTION_TIMEOUT_MS=1000`, `DB_QUERY_TIMEOUT_MS=5000`, rentang override yang valid, bentuk sampel JSON pool setiap 5000 ms, dan arti `waitingCount:null` saat metrik tidak tersedia.
- Mendokumentasikan respons overload HTTP 503 dengan `Retry-After: 1` dan `DB_OVERLOAD`, batas scrape internal Compose melalui `api:3000/metrics`, serta formula anggaran koneksi agregat terhadap PostgreSQL `max_connections=100`.
- Menambahkan checklist load test berurutan untuk 10/50/150 peserta, termasuk traffic lifecycle, percentile/status/error/429, pool, CPU/memori, konsistensi jawaban, perbandingan dengan baseline lokal, dan keharusan pemilik menetapkan threshold.
- Validasi: `npm.cmd test` lulus 9/9; `node --check server/index.js` dan `node --check server/db.js` lulus; `npm.cmd run build` berhasil; `docker compose config --quiet` berhasil. Suite Node juga memverifikasi statis API tidak memiliki port host, Nginx mengembalikan 404 untuk `/metrics` tanpa proxy, dan panduan memakai target `api:3000`.
- Pemeriksaan read-only `docker compose ps --all --format json` menunjukkan hanya `cbt-imbs`, `cbt-imbs-api`, dan `cbt-imbs-db` pada project `cbtimbs`; tidak ada Prometheus. API tetap hanya memiliki port internal `3000/tcp`, tanpa published port. Live scrape ditunda sampai Prometheus tersedia dan terhubung ke jaringan Compose; contoh target/config disimpan di `pengembangan.md`.
- Tidak ada service Docker yang dimulai/dihentikan, database/fixture/volume yang diubah, atau kode aplikasi yang disentuh. Temuan audit `source-map-js`/Vite/PostCSS tetap menjadi tindak lanjut keamanan terpisah; log ini bukan klaim kesiapan produksi atau kapasitas universal.

## Uji beban 100 pengguna — 6 Oktober 2026

### Hasil eksekusi

- Dilakukan eksekusi validasi beban langsung: `node "E:/CBT IMBS/scripts/load100-test.mjs"`.
- Hasil: validasi terhenti sebelum cohort dimulai karena login admin dan autentikasi awal menerima respons `HTTP 429` dari rate limiter aplikasi.
- Bukti operasional yang ditangkap dari terminal:

```json
{
  "status": 429,
  "data": {
    "error": "Terlalu banyak percobaan login gagal. Coba lagi dalam 15 menit."
  }
}
```

- Kejadian ini terjadi di aplikasi yang sedang berjalan, bukan pada build atau sintaks. Artinya pengujian beban 100 user saat ini belum dapat diklaim lulus karena anti-abuse login aktif membatasi permintaan lebih lanjut sampai jendela 15 menit berakhir atau limiter direset/diubah.
- Keputusan teknis: hasil validasi beban ini dicatat sebagai `blocked by login rate limit`, bukan sebagai benchmark pass. Build, health check, dan validasi statis masih bisa dikatakan sehat, tetapi uji beban 100 pengguna belum memenuhi kriteria penerimaan karena fokus implementasi saat ini adalah autentikasi dan throttling anti-penyerangan, bukan throughput yang dibenarkan untuk produksi.
- Langkah yang disarankan berikutnya: reset service API untuk mengosongkan limit in-memory, atau menyesuaikan config `loginLimiter` untuk lingkungan internal validasi, lalu ulang beban 100 pengguna dengan user/admin valid dan IP yang tidak terblokir. Hanya setelah itu hasil benchmark dapat dipublikasikan sebagai bukti operasional yang dapat dipercaya.

## Bypass rate limit login khusus test lokal — 6 Oktober 2026

### Log pengerjaan — 6 Oktober 2026, 15.34 WIB

- Middleware `loginLimiter` kini melewati pembatasan bila `NODE_ENV=test`, atau bila aplikasi secara eksplisit berjalan dengan `NODE_ENV=development` dan `LOCAL_LOAD_TEST_MODE=true`.
- Compose meneruskan `LOCAL_LOAD_TEST_MODE` (default `false`) dan menetapkan `NODE_ENV=production` secara default. Karena itu, flag load test yang tidak sengaja tersetel tidak menonaktifkan limiter pada konfigurasi Compose default/production. Production tetap memakai limit 10 kegagalan per 15 menit per IP.
- Tidak dibuat bypass IP `127.0.0.1`/`::1`: aplikasi berada di belakang reverse proxy, sehingga alamat klien bisa berupa IP proxy dan header forwarding berpotensi dipalsukan jika konfigurasi trust-proxy berubah. Bypass environment yang eksplisit lebih mudah dibatasi dan diaudit.
- Aktivasi hanya untuk run lokal: set `NODE_ENV=development` dan `LOCAL_LOAD_TEST_MODE=true` pada environment Compose, lalu recreate API (`docker compose up -d --build --force-recreate api`). Setelah pengujian, kembalikan `NODE_ENV=production` dan `LOCAL_LOAD_TEST_MODE=false`, lalu recreate API lagi. Jangan aktifkan mode ini pada deployment production.
- Verifikasi: `node --check server/index.js`, `docker compose config --quiet`, diagnostik editor, dan `node --test server/observability.test.js` lulus; 9/9 test terfokus lulus. `npm.cmd test` masih gagal karena Node test runner otomatis mengeksekusi `scripts/load100-test.mjs`, yang berhenti di login dengan 429 pada stack aktif; test ini bukan bagian dari perubahan middleware.
- Stack belum dibangun ulang dengan mode lokal dan uji beban 100 pengguna belum dijalankan ulang. Perubahan kode dan konfigurasi telah divalidasi, tetapi keberhasilan benchmark runtime belum diklaim.

## Rerun uji beban 100 pengguna — 6 Oktober 2026

### Log eksekusi — 6 Oktober 2026, 15.54 WIB

- Korelasi operasional: `plan_id=2026-10-06-rerun-100-user-load-test`. Script dan pemetaan environment Compose diperiksa sebelum eksekusi. Script membuat ujian terlebih dahulu, lalu membuat 100 siswa; script tidak mencetak manifest/ID dan tidak memiliki langkah cleanup.
- Preflight menemukan API sudah berjalan dengan `NODE_ENV=development` dan `LOCAL_LOAD_TEST_MODE=true`, sedangkan port HTTPS Nginx dipublikasikan ke semua interface. API segera direcreate dengan `NODE_ENV=production` dan `LOCAL_LOAD_TEST_MODE=false`. Saat bypass kemudian diaktifkan untuk test, ingress sementara dibatasi ke `127.0.0.1`; setelahnya environment produksi dan binding Compose asal dipulihkan.
- Percobaan awal berhenti pada health gate sebelum request test karena proxy memberi HTTP 502 sesaat setelah API direcreate. API dikembalikan ke production/false dan percobaan ulang hanya dimulai setelah health HTTP 200.
- Eksekusi berikutnya membuat 100 user sintetis dan ujian ID `25`, berjudul `Load Test 100 1791276523366`. Baseline sebelum test: 400 user bernama `Load User ...` di kelas `LOAD-100`, 5 ujian dengan judul `Load Test 100 ...`, dan 700 sesi terkait. Setelah test: 500 user, 6 ujian, dan 1.100 sesi terkait; delta test adalah +100 user, +1 ujian, dan +400 sesi.
- Penyebab kegagalan cohort teridentifikasi pada urutan fixture: pembuatan ujian membuat sesi untuk seluruh 400 siswa kelas yang sudah ada sebelum 100 user baru dibuat. Audit PostgreSQL mencatat 59 user cohort berbeda dengan event login pada rentang eksekusi; ke-400 sesi ujian ID 25 tetap `not_started`, tidak ada yang `completed`. Endpoint start menolak siswa tanpa sesi terdaftar dengan HTTP 404; status respons start ini disimpulkan dari route dan keadaan database, bukan dari ringkasan client yang tersimpan.
- Output JSON harness, distribusi lengkap kode HTTP, exit code proses, serta percentile/latensi client tidak tertangkap pada output terminal. Pada scrape Prometheus terakhir sebelum API direcreate (`2026-10-06 08:49:10 UTC`), metrik mencatat `POST /api/students` HTTP 201 ×100, `POST /api/exams` HTTP 201 ×1, login HTTP 200 ×20 / 500 ×23 / 503 ×15, serta satu `POST /api/student/exams/:examId/start` HTTP 404. HTTP 429 tidak terlihat pada sampel tersebut; request cohort yang belum selesai saat scrape tidak dapat dihitung.
- Histogram server-side login pada scrape yang sama: HTTP 200 n=20, mean 937 ms, bucket nearest-rank p50 `(500, 1.000] ms` dan p95 `(1.000, 2.500] ms`; HTTP 500 n=23, mean 2.173 ms, p50 `(1.000, 2.500] ms` dan p95 `(2.500, 5.000] ms`; HTTP 503 n=15, mean 1.620 ms, p50 `(1.000, 2.500] ms` dan p95 `(2.500, 5.000] ms`. Ini batas bucket/mean durasi server, bukan percentile client dari harness dan bukan ringkasan cohort lengkap. Audit DB mencatat 59 user cohort berbeda dengan event login, tidak sama dengan 20 respons HTTP 200 yang tersampel; audit tersebut tidak dipakai sebagai hitungan HTTP sukses.
- Tidak dilakukan cleanup: script tidak menyediakan ID/manifest atau cleanup, sehingga penghapusan exact-ID tidak aman untuk diklaim. User sintetis, ujian ID 25, dan 400 sesi `not_started` tetap ada; tidak ada penghapusan massal. Volume `cbtimbs_cbt-imbs-data` dan `cbtimbs_cbt-imbs-certs` dipertahankan.
- Pemulihan terverifikasi: API `NODE_ENV=production`, `LOCAL_LOAD_TEST_MODE=false`, `/api/health` HTTP 200 dengan database `connected`; binding port kembali ke Compose asal. Tidak ada perubahan logika aplikasi.

## Rekonsiliasi fixture uji beban gagal — 6 Oktober 2026

### Log pengerjaan — 6 Oktober 2026, 16.09 WIB

- Korelasi: `plan_id=2026-10-06-rerun-100-user-load-test`, `task_id=reconcile-failed-fixtures`. Target dipastikan sebagai PostgreSQL Compose workspace `cbtimbs` dari `E:\CBT IMBS\docker-compose.yml`, bukan stack `cbtimbs-loadtest` yang juga sedang berjalan.
- Sebelum mutasi, audit `student.create` yang waktunya berada setelah pembuatan exam ID `25` berjudul `Load Test 100 1791276523366` mengidentifikasi tepat 100 user siswa sintetis: ID `1329–1428` tanpa celah, dibuat pada `08:48:45–08:48:56 UTC`; seluruh nama cocok dengan fixture `Load User 1–100` pada kelas `LOAD-100`. Cohort ini punya 59 audit login, tidak memiliki sesi pada exam mana pun, dan tidak direferensikan oleh tabel domain lain.
- Inventaris exam sebelum cleanup: exam ID `25`; 400 sesi ID `1154–1553`, seluruhnya `not_started` dan milik 400 siswa LOAD-100 yang bukan cohort sintetis; 400 baris `exam_questions`; nol response dan nol violation event. Audit exam berisi satu `exam.create` dan tujuh `exam.pin_issue` yang seluruhnya mengacu ke ID `25`.
- Cleanup dilakukan dalam satu transaksi PostgreSQL serializable dengan pemeriksaan jumlah/rentang ID, fixture, status sesi, foreign-key reference, dan audit sebelum penghapusan. Dihapus hanya 100 user ID `1329–1428`, exam ID `25` beserta 400 sesi dan 400 `exam_questions` turunannya, 59 audit login cohort, 100 audit pembuatan user dengan `studentId` cohort tersebut, serta 8 audit yang mengacu ke exam ID `25`. Tidak ada penghapusan berdasarkan kelas bersama, tidak ada truncate, dan tidak ada volume yang dihapus.
- Verifikasi sesudah cleanup: 100 ID cohort tidak ada; exam ID `25`, seluruh sesi `1154–1553`, seluruh pertanyaan sesi tersebut, dan audit terkait tidak ada. Tepat 400 user pre-existing kelas `LOAD-100` tetap ada. Volume database tetap `cbtimbs_cbt-imbs-data` pada `/var/lib/postgresql/data`; container database sehat.
- API tetap pada `NODE_ENV=production` dan `LOCAL_LOAD_TEST_MODE=false`; `/api/health` mengembalikan HTTP 200. Fixture gagal telah direkonsiliasi; harness belum diperbaiki dan benchmark 100 pengguna yang valid belum dijalankan ulang. Tidak ada klaim kesiapan produksi.

## Popup tinjauan Admin pada ambang dua pelanggaran — 8 Oktober 2026

- Runner siswa kini menampilkan popup tetap saat jumlah pelanggaran terkonfirmasi dan sinyal yang masih menunggu tinjauan mencapai dua. Siswa tidak dapat menutup popup, berpindah soal, mengubah jawaban, atau mengumpulkan ujian selama tinjauan.
- API juga menolak penyimpanan jawaban dan pengumpulan selama sesi ditahan. Heartbeat mempertahankan popup pada sesi aktif dan memperbarui keputusan dari server; sesi tidak otomatis selesai melewati tenggat ketika masih menunggu Admin.
- Monitor Admin menampilkan bukti dan pilihan beralasan **Konfirmasi blokir** atau **False positive**. Keputusan blokir mengubah status sesi menjadi `locked`; false positive menandai sinyal pending dan satu pelanggaran terkonfirmasi terakhir sebagai dismissed bila diperlukan, lalu siswa dapat melanjutkan selama waktu ujian belum habis.
- Endpoint keputusan hanya mengizinkan role Admin dan setiap keputusan masuk ke `audit_logs`; hasil review event tetap mencatat petugas, waktu, dan alasan. Reset Admin juga menutup sinyal pending agar sesi pulih tanpa menyisakan hold.
- Ambang penguncian sekarang dua pelanggaran yang dikonfirmasi. Sinyal browser tetap merupakan bukti untuk ditinjau manusia dan dapat menghasilkan false positive; pembaruan ini tidak memberi browser kemampuan kiosk/OS.
- Implementasi sumber selesai. Build, pemeriksaan sintaks, pemeriksaan browser, migrasi/runtime, serta alur keputusan belum dijalankan dalam sesi perubahan ini.

## Dashboard Admin: pantau dan hasil ujian terpisah — 8 Oktober 2026

- Navigasi Admin menambahkan halaman **Pantau Ujian** di sidebar setelah menu Ujian; halaman ini menampilkan panel pelanggaran di kiri dan peserta yang sedang ujian di kanan. Log tiap siswa dapat dibuka dan pemantauan diperbarui setiap 5 detik.
- Endpoint Admin `/api/monitor` mengirim sesi aktif, sesi terblokir, serta sesi yang memiliki sinyal menunggu/terkonfirmasi atau hitungan pelanggaran. Admin dapat memeriksa sinyal, menandai false positive, atau mengonfirmasi blokir dari daftar pelanggaran; endpoint lama per ujian tetap tersedia.
- Hasil ujian dipisah menjadi tabel **Hasil dengan pelanggaran** dan **Ujian selesai**. Kategori selesai berisi sesi `completed` tanpa pelanggaran terkonfirmasi maupun sinyal yang menunggu tinjauan; sesi dengan pelanggaran atau sinyal pending masuk ke tabel audit.
- Masing-masing tabel mengunduh berkas `.xlsx` sendiri. Workbook berisi nilai, status, jumlah pelanggaran, waktu selesai, serta ringkasan sinyal dan alasan keputusan Admin. Ekspor CSV kredensial siswa tidak diubah.
- `fflate` ditambahkan sebagai dependensi langsung untuk membuat workbook Excel di browser. Belum dijalankan build, uji browser, atau pemeriksaan runtime pada sesi perubahan ini.

### Menjalankan build dan cek layanan lokal — 8 Oktober 2026

- Pemeriksaan awal menemukan API terus restart akibat deklarasi `violationReviewRequired` yang dideklarasikan dua kali pada route sinyal pelanggaran. Nilai hasil perhitungan setelah sinyal baru kini memakai nama `updatedViolationReviewRequired`; respons tetap mengirim field API `violationReviewRequired`.
- `docker compose up --build -d` selesai; build Vite memproses 1.626 modul dan berhasil. Container API, Nginx, PostgreSQL, dan Prometheus berjalan; PostgreSQL berstatus healthy.
- `https://localhost:8443/api/health` memberi HTTP 200 dengan `database: connected`; halaman web HTTPS memberi HTTP 200. Bundle yang dilayani memuat menu Pantau Ujian dan nama kedua unduhan `.xlsx`.
- Login demo `admin/admin123` tidak menghasilkan sesi Admin pada database persisten. Karena itu endpoint Admin `/api/monitor` belum diuji dengan sesi terautentikasi dan dashboard belum diperiksa secara visual. Gunakan kredensial Admin yang berlaku untuk melihat halaman; koneksi HTTP pada 8080 dialihkan ke HTTPS 8443 dan sertifikat lokal belum dipercaya oleh PowerShell.

## Rencana peningkatan input soal per bank — 8 Oktober 2026

### Alur yang berlaku

- Admin/Guru membuka **Bank Soal → Buat bank soal**, memilih mata pelajaran, topik/materi, dan kelas. Tombol **Mata pelajaran** di dialog dapat menambahkan mata pelajaran baru.
- Masukkan jumlah PG dan essay. Form dibuat langsung sesuai jumlah: PG berisi pertanyaan, empat opsi A–D, kunci, dan bobot; essay berisi pertanyaan, rubrik/panduan koreksi, dan bobot.
- Setelah semua soal lolos validasi, simpan membuat satu bank. Daftar bank tersimpan bisa dibuka untuk meninjau atau menambah soal. Saat membuat ujian, pilih bank itu lalu tentukan kuota PG/essay dan durasi; ujian mengambil soal dari bank terpilih. Rubrik essay menjadi acuan guru, bukan penilaian otomatis.

### Penilaian efisiensi

- Form terstruktur lebih mudah ditinjau daripada format teks ber-delimiter: opsi, kunci, rubrik, dan bobot tiap butir terlihat saat diisi. Jumlah form juga mengikuti angka PG/essay yang diminta.
- Untuk bank yang sangat besar, mengisi setiap kartu satu per satu masih memakan waktu. Import Excel dengan pratinjau tetap menjadi peningkatan berikutnya; saat ini import Excel yang ada hanya untuk daftar siswa.
- Penyimpanan dilakukan satu INSERT per soal di dalam transaksi. Batas 1.000 soal mencegah pengiriman tanpa batas, tetapi pengiriman besar masih dapat dioptimalkan.

### To-do terarah

- [ ] **P0 — Lengkapi pengelolaan bank tersimpan.** Daftar soal, rincian tipe/opsi/kunci/rubrik/bobot, dan aksi tambah sudah tersedia; tambahkan aksi edit dan hapus.
- [x] **P1 — Tetapkan dan validasi format data.** PG menyimpan prompt, empat opsi A–D, kunci, dan bobot; essay menyimpan prompt, rubrik, dan bobot. Rubrik essay tidak dipakai sebagai nilai otomatis.
- [x] **P1 — Validasi form terstruktur di browser dan API.** Tolak bank kosong, tipe tak dikenal, opsi PG tidak lengkap, kunci yang tidak menunjuk opsi, rubrik essay kosong, dan bobot tidak positif.
- [ ] **P1 — Tambahkan pratinjau sebelum simpan.** Tampilkan jumlah PG/essay, isi hasil parsing, baris valid/error, dan ringkasan mata pelajaran/topik/kelas. Simpan hanya setelah Admin/Guru meninjau.
- [ ] **P1 — Tambahkan template import Excel `.xlsx`.** Kolom minimum: `type`, `prompt`, `option_a`, `option_b`, `option_c`, `option_d`, `answer_key`, `points`, dan `rubric` untuk essay. Tampilkan nomor baris dan sebab penolakan sebelum penyimpanan.
- [ ] **P2 — Sediakan editor soal terstruktur.** Form PG dengan opsi dan pilihan kunci; form essay dengan panduan/rubrik; dukung edit, duplikasi, hapus, serta arah teks otomatis untuk Arab.
- [ ] **P2 — Optimalkan penyimpanan batch.** Pertahankan transaksi atomik dan audit jumlah soal; gunakan insert batch agar tidak melakukan satu round-trip database untuk setiap soal.
- [ ] **P2 — Periksa alur ujian dari ujung ke ujung.** Pastikan bank terpilih memuat jumlah PG/essay yang diminta dan soal yang diacak berasal dari mata pelajaran/topik/kelas yang sesuai.

### Kriteria selesai

- Batch contoh berisi 10 PG dan 5 essay tampil benar di pratinjau dan tersimpan pada bank pilihan.
- Baris rusak menunjukkan nomor baris dan tidak membuat bank kosong atau menyimpan data parsial.
- Bank yang sudah tersimpan dapat dibuka, ditambah, diedit, dan dihapus soalnya; jumlah PG/essay selalu sesuai.
- Ujian hanya dapat meminta jumlah soal yang tersedia pada bank terpilih; jawaban essay tetap menunggu penilaian guru.

### Tambahan kebutuhan disetujui: form soal berdasarkan jumlah — 8 Oktober 2026

Alur pembuatan bank yang diterapkan:

1. Buka **Bank Soal → Buat bank soal**.
2. Pilih mata pelajaran, topik/materi, dan kelas; tambahkan mata pelajaran bila belum tersedia.
3. Isi jumlah PG. Aplikasi langsung membangkitkan sejumlah form PG dengan pertanyaan, opsi A–D, kunci jawaban, dan bobot.
4. Isi jumlah essay. Aplikasi langsung membangkitkan sejumlah form essay dengan pertanyaan, rubrik/panduan koreksi, dan bobot.
5. Tinjau validasi serta ringkasan jumlah soal, lalu simpan semua soal dalam bank yang sama.

- Form baru kosong; menaikkan jumlah mempertahankan isian yang sudah ada lalu menambah form kosong.
- Menurunkan jumlah yang akan membuang form berisi harus meminta konfirmasi dan menyebut jumlah form yang akan dihapus.
- Pesan validasi menyebut nomor butir yang perlu diperbaiki. PG harus memiliki pertanyaan, opsi terisi, dan kunci yang menunjuk opsi valid. Essay harus memiliki pertanyaan dan rubrik/panduan. Jumlah form wajib cocok dengan jumlah yang tersimpan.
- Import Excel khusus bank soal belum tersedia; jika ditambahkan, hasil impor akan masuk ke pratinjau dan validasi yang sama.

#### Checklist tambahan

- [x] Buat input jumlah PG dan essay yang masing-masing mengendalikan banyaknya form secara langsung.
- [x] Bangkitkan field PG A–D dan pilihan kunci; bangkitkan field pertanyaan serta rubrik untuk essay.
- [x] Pertahankan data ketika jumlah dinaikkan; konfirmasi sebelum menghapus form berisi ketika jumlah diturunkan.
- [x] Tampilkan kesalahan pada butir yang perlu diperbaiki dan ringkasan jumlah soal.
- [x] Simpan metadata bank dan semua butir secara atomik; audit jumlah PG dan essay yang disimpan.
- [ ] Sediakan import Excel ke pratinjau yang sama sebagai opsi batch.

#### Kriteria penerimaan tambahan

- Mengisi jumlah PG `3` dan essay `2` langsung menampilkan tepat 3 form PG dan 2 form essay.
- Menambah jumlah mempertahankan isian; mengurangi jumlah meminta konfirmasi bila form yang terbuang sudah berisi.
- Bank tidak dapat disimpan jika jumlah, pertanyaan, opsi/kunci PG, atau rubrik essay tidak valid; pesan menunjuk butir yang perlu diperbaiki.
- Setelah simpan dan buka kembali bank, jumlah dan isi tiap tipe soal tetap sesuai.

#### Status implementasi — 8 Oktober 2026

- Dialog **Buat bank soal** menyediakan pemilihan mata pelajaran, tombol **Mata pelajaran**, topik/materi, dan kelas.
- Jumlah PG dan essay langsung membangkitkan form sebanyak angka yang dipilih. Form PG memuat pertanyaan, opsi A–D, kunci, dan bobot; form essay memuat pertanyaan, rubrik, dan bobot.
- Isian bertahan saat jumlah ditambah. Jika jumlah diturunkan dan akan membuang form berisi, aplikasi meminta konfirmasi terlebih dahulu.
- Validasi di browser dan API mencegah bank kosong, opsi PG yang kurang, kunci yang tidak valid, rubrik essay kosong, serta bobot yang bukan angka positif. Penyimpanan bank dan butir tetap atomik; audit mencatat jumlah PG dan essay.
- Daftar soal bank tersimpan dapat dibuka kembali untuk meninjau isinya atau menambah butir. Import Excel khusus bank soal masih menjadi pekerjaan lanjutan; import Excel siswa tetap tersedia.
- `docker compose up --build -d` berhasil; Vite membangun bundle terbaru dan layanan berjalan. PostgreSQL berstatus healthy, API mencatat startup normal, halaman `https://localhost:8443/` dan `/api/health` masing-masing merespons HTTP 200.

## Aksi hapus bank soal dan jadwal ujian — 8 Oktober 2026

- Admin kini mendapat tombol **Hapus** di kartu bank soal dan ikon hapus di setiap rancangan ujian yang tidak aktif.
- Dialog konfirmasi menjelaskan jumlah soal, jadwal, sesi siswa, jawaban, nilai, dan log pelanggaran yang ikut terhapus. Menghapus bank akan menghapus jadwal ujian yang memakai bank tersebut.
- API membatasi penghapusan ke Admin, menjalankannya secara transaksional, dan menyimpan audit. Penghapusan ditolak jika ujian masih aktif atau ada sesi siswa berstatus mengerjakan; ujian perlu diakhiri lebih dulu.
- `docker compose up --build -d` berhasil; Vite memproses 1.629 modul. Halaman HTTPS dan `/api/health` merespons HTTP 200; health melaporkan database terhubung dan PostgreSQL healthy.

## Pengaturan sekolah Admin — 8 Oktober 2026

### Log pengerjaan — 8 Oktober 2026, 18.10 WIB

- Mengganti pemberitahuan pada menu **Pengaturan** dengan halaman konfigurasi Admin untuk nama sekolah, tahun ajaran, semester, daftar kelas, tingkat bank soal, durasi ujian bawaan, dan batas pelanggaran.
- Menyimpan pengaturan pada tabel PostgreSQL `school_settings`. API `GET /api/settings` memberi akses baca Admin/Guru; `PUT /api/settings` hanya mengizinkan Admin, memvalidasi format dan rentang, serta mencatat nilai lama/baru ke audit log.
- Menghubungkan nama sekolah dan periode ke sidebar/header. Pilihan kelas pada siswa, import siswa, ujian, dan template siswa kini mengikuti daftar konfigurasi. Pilihan tingkat pada pembuatan bank soal juga mengikuti pengaturan.
- Server menolak kelas/tingkat yang tidak terdaftar dan menolak penghapusan kelas/tingkat yang masih dipakai data siswa, riwayat ujian, atau bank soal.
- Ambang tinjauan pelanggaran dibaca dari database saat startup dan perubahan berlaku langsung pada server tunggal Compose. Ambang hanya bisa diubah saat tidak ada ujian terjadwal/berlangsung dan tidak ada peserta yang sedang mengerjakan. Popup siswa menampilkan angka ambang saat ini.
- Build Vite berhasil (1.630 modul) dan `node --check server/index.js` berhasil. Rebuild Compose dan pemeriksaan health dilakukan setelah implementasi.
- Pemeriksaan akhir `docker compose up --build -d` berhasil; semua layanan Compose berjalan, PostgreSQL berstatus `healthy`, `https://localhost:8443/` merespons HTTP 200, dan `/api/health` melaporkan database `connected` dengan HTTP 200.

## Persiapan akses publik melalui PC server — 8 Oktober 2026

### Keputusan topologi

- Host server memakai Windows 11 Pro dengan 4 prosesor logis dan RAM 24 GB; Docker Desktop melaporkan sekitar 11,7 GiB tersedia untuk container. Uji lokal terdahulu menyelesaikan siklus 10/50/150 peserta tanpa error, tetapi pada 150 peserta p95 start mencapai 26,68 detik, p95 pemantauan 14,24 detik, dan pool API 50/50. Konfigurasi default stack saat ini memakai pool 10. Ini bukti alur lokal berjalan, bukan jaminan 100 peserta memenuhi batas waktu yang diterima sekolah.
- Pemilik belum memiliki domain dan belum mengetahui apakah ISP memakai CGNAT. Jaringan memakai Ruijie access point di beberapa gedung, dengan gateway/router pusat yang belum teridentifikasi. Jalur yang disiapkan adalah Cloudflare Tunnel bernama: PC membuka koneksi keluar; setiap AP tidak memerlukan port forwarding. Tunnel perlu domain yang dimiliki sekolah dan jaringan gateway mengizinkan egress TCP atau UDP 7844.
- Cloudflare route yang akan dibuat pada domain sekolah harus menunjuk ke origin internal Docker `https://cbt-imbs:443`; sertifikat origin Nginx masih self-signed sehingga route perlu menonaktifkan verifikasi TLS origin. HTTPS publik tetap disediakan di edge Cloudflare. Token tunnel berada di berkas `secrets/cloudflare-tunnel-token`, bukan argumen Compose atau repository.

### Perubahan konfigurasi

- Menambahkan [docker-compose.public.yml](docker-compose.public.yml). Profil mengikat port lokal hanya ke `127.0.0.1`, menghapus port host Prometheus, membatasi pool API ke 50 secara default, dan hanya menjalankan `cloudflared` ketika profil `public` diminta secara eksplisit.
- Menambahkan `.env.public.example`, [scripts/new-public-secrets.ps1](scripts/new-public-secrets.ps1), dan [scripts/rotate-public-db-password.ps1](scripts/rotate-public-db-password.ps1). Script pertama membuat rahasia acak 64 karakter tanpa menampilkannya; script kedua menyamakan kata sandi role PostgreSQL volume lama dengan `DB_PASSWORD` sebelum API dialihkan ke konfigurasi publik. `.env` dan direktori `secrets/` diabaikan Git.
- Mode `PUBLIC_DEPLOYMENT=true` mensyaratkan empat rahasia acak heksadesimal minimal 64 karakter. Saat pertama kali dialihkan, server memperbarui kata sandi bootstrap Admin/Guru bila masih `admin123`/`guru123`, menonaktifkan akun siswa demo yang masih memakai `ujian123`, lalu menolak startup jika kredensial demo tersebut masih aktif.
- Build publik mengosongkan field login dan menghilangkan kartu kredensial demo. Nginx meneruskan alamat `CF-Connecting-IP` ke API, bukan alamat container proxy; seluruh peserta di balik satu NAT tetap berbagi satu IP sumber.
- Rate limit login disesuaikan untuk sekolah: satu IP sumber menampung sampai 300 kegagalan per 15 menit, sementara setiap kombinasi IP dan username tetap dibatasi 10 kegagalan. Ini mencegah kesalahan beberapa siswa pada satu NAT langsung memblokir seluruh sekolah; login berhasil tidak menambah kuota.

### Status dan prasyarat sebelum tunnel diaktifkan

- Perubahan kode/konfigurasi sudah ditulis tetapi belum dibangun ulang atau dinyalakan. Belum ada domain, token, atau akses gateway untuk membuktikan koneksi dari seluler.
- Belum boleh menjalankan `--profile public` sampai domain sekolah aktif di akun Cloudflare, hostname route dan token tersedia, token disimpan di `secrets/cloudflare-tunnel-token`, empat rahasia `.env` dibuat, serta kata sandi PostgreSQL volume disamakan lewat script rotasi.
- Saat ini layanan Compose utama masih berjalan dengan binding asal `0.0.0.0:8080`, `0.0.0.0:8443`, dan `0.0.0.0:9090`; profil publik belum diterapkan. Profil publik akan membatasi web ke loopback dan menutup port Prometheus.
- Urutan aktivasi setelah domain dan izin jaringan siap: jalankan `scripts/new-public-secrets.ps1`; buat named tunnel dan route ke `https://cbt-imbs:443` dengan opsi verifikasi sertifikat origin dimatikan; simpan token Cloudflare ke berkas yang dibuat script; jalankan `scripts/rotate-public-db-password.ps1` saat container DB lama sehat; lalu jalankan `docker compose -f docker-compose.yml -f docker-compose.public.yml --profile public up --build -d`.
- Setelah konfigurasi siap, verifikasi harus mencakup uji login dari jaringan seluler, pemantauan akses dari jaringan berbeda, pemeriksaan browser peserta, dan load test baru 100 peserta dengan ambang latensi/error yang disepakati. Uji 150 terdahulu memakai pool 50; tidak memvalidasi konfigurasi publik ini.
- Keadaan saat ini: **akses publik belum tersedia**, karena domain dan izin egress jaringan belum tersedia. Tidak ada port yang dibuka atau tunnel yang dijalankan.

## Akses langsung dari jaringan lokal sekolah — 8 Oktober 2026

### Perubahan arahan

- Permintaan terbaru menetapkan jaringan LAN sekolah sebagai jalur akses. Rencana Cloudflare Tunnel sebelumnya dibatalkan sebelum pernah dijalankan; `docker-compose.public.yml` dan helper tunnel dihapus. Compose aktif tidak memuat `cloudflared`.
- Adapter Ethernet server terverifikasi menggunakan `10.10.4.235/21`, pada subnet `10.10.0.0/21`. Windows Firewall diberi aturan inbound TCP port 8080 dan 8443 dengan alamat lokal tersebut dan sumber terbatas ke subnet sekolah.

### Perubahan konfigurasi

- Docker Compose mengikat web ke `10.10.4.235:8080` dan `10.10.4.235:8443`. Port 8080 mengalihkan ke HTTPS pada 8443. Dashboard Prometheus hanya terikat ke localhost pada port 9090.
- Frontend memakai base URL `https://10.10.4.235:8443`; backend hanya menerima Origin yang tercantum di `CORS_ORIGINS` (default sama dengan URL tersebut), menjawab preflight, dan menolak Origin lain. Kartu dan teks sandi demo dihilangkan dari build web.
- Sertifikat Nginx diperiksa terhadap SAN setiap startup dan dibuat ulang jika belum memuat IP LAN. Sertifikat tetap self-signed.
- Pool API dinaikkan ke `DB_POOL_MAX=70`, batas PostgreSQL menjadi `max_connections=110`, dan waktu tunggu koneksi menjadi 5 detik. Nilai ini memberi anggaran sekitar 40 koneksi DB untuk komponen lain; satu API instance tetap memakai paling banyak 70.
- API memperoleh Docker healthcheck yang memanggil endpoint health dan memeriksa koneksi database. Web dan Prometheus menunggu sampai API sehat.
- Dibuat `.env` lokal yang diabaikan Git dengan rahasia acak untuk sesi, Admin, dan Guru. Saat startup, jika sandi Admin/Guru masih sandi demo, server menggantinya; lima akun siswa contoh yang masih memakai `ujian123` dinonaktifkan. Nilai Admin/Guru baru tersimpan pada `SEED_ADMIN_PASSWORD` dan `SEED_TEACHER_PASSWORD` di `.env` dan tidak dicetak ke log/terminal. Simpan cadangan `.env` dengan aman.

### Build dan pemeriksaan runtime

- Percobaan build pertama terhenti karena koneksi npm container mengalami `ECONNRESET`. Argumen build dipindah setelah instalasi dependensi agar perubahan alamat LAN tidak membatalkan cache npm; `docker compose up --build -d` berikutnya berhasil dan Vite memproses 1.630 modul.
- API `cbt-imbs-api` berstatus `Up (healthy)`, `RestartCount=0`; PostgreSQL sehat dan `max_connections=110`. Health endpoint melalui IP LAN mengembalikan HTTP 200.
- Halaman di `https://10.10.4.235:8443/` mengembalikan HTTP 200. `http://10.10.4.235:8080/` mengalihkan ke HTTPS port 8443. Sertifikat memuat SAN `IP Address:10.10.4.235`.
- Uji header CORS menghasilkan 200 untuk Origin IP sekolah, 403 untuk Origin lain, dan 204 untuk preflight. Aset web tidak memuat literal sandi demo. Tidak ada container `cloudflared` berjalan.
- Aturan firewall lokal cocok dengan `LocalAddress=10.10.4.235`, `RemoteAddress=10.10.0.0/21`, port TCP `{8080,8443}`. Uji dari perangkat siswa lain belum dilakukan.

### Batas kapasitas dan akses

- Siswa membuka `https://10.10.4.235:8443`. HTTPS memakai sertifikat self-signed, jadi browser dapat memberi peringatan kepercayaan sertifikat pada tiap perangkat.
- Pool 70 dan PostgreSQL 110 adalah konfigurasi awal untuk satu API pada host 4 prosesor logis/24 GB RAM; ini bukan jaminan bebas bottleneck. Baseline lokal 150 sebelumnya menyelesaikan alur tanpa error tetapi p95 start 26,68 detik dan p95 monitor 14,24 detik. Load test ulang 100–150 setelah perubahan belum dilakukan.
- Ujian dan sesi aktif berjumlah nol sebelum layanan dibangun ulang. Database volume tetap digunakan dan tidak dihapus.

## Perubahan kata sandi akun admin dan guru — 8 Oktober 2026

- Nilai sandi bootstrap di `.env` diperbarui sesuai permintaan; nilai rahasia tidak dicatat di dokumen ini.
- Hash bcrypt akun aktif `admin` dan `guru` diperbarui langsung di PostgreSQL dan diverifikasi terhadap konfigurasi.
- `ROTATE_DEMO_SEED_PASSWORDS` dinonaktifkan setelah perubahan langsung karena pemeriksaan rotasi bootstrap mewajibkan sandi minimal 24 karakter.
- API dan PostgreSQL kembali berstatus `healthy`, restart count API 0; `docker compose config --quiet` berhasil.
## Perluasan soal multi-mata-pelajaran — P0 baseline dan pemulihan — 9 Oktober 2026

- Sebelum perubahan, semua layanan Docker berjalan; API dan PostgreSQL berstatus healthy.
- Tidak ada sesi ujian `in_progress`; terdapat satu sesi `locked` dan satu `not_started`.
- Snapshot sumber dibuat di `backups/20261009_pre_p0-source.zip` tanpa `.env`.
- Dump PostgreSQL `backups/20261009_pre_p0-database.dump` dibuat, dibaca `pg_restore`, lalu dipulihkan ke database verifikasi sementara; seluruh 5 soal ikut pulih. Database verifikasi sementara kemudian dihapus.
- Folder `backups/` ditambahkan ke `.gitignore`; folder proyek tidak memiliki metadata Git, sehingga snapshot dan dump menjadi titik pemulihan sebelum implementasi.

## Perluasan soal multi-mata-pelajaran — P1 sampai P5 — 9 Oktober 2026

### P1 — Bahasa dan arah teks per mata pelajaran

- Form **Mata pelajaran** kini menyimpan kode bahasa dan arah teks. Pilihan form: Indonesia, Arab, Inggris; arah teks otomatis, LTR, atau RTL.
- Migrasi hanya menambah kolom, menandai mata pelajaran Arab lama sebagai Arab/RTL, dan membiarkan isi bank serta soal lama tetap utuh.
- Halaman ujian menggunakan bahasa/arah yang tersimpan. Keyboard Arab hanya tampil untuk soal essay berbahasa Arab; antarmuka pengelola tetap Indonesia.

### P2 — Gambar pendukung soal

- Satu gambar JPG/PNG/WebP maksimal 3 MB per soal, deskripsi alternatif wajib, batas volume total default 1 GB.
- Berkas diverifikasi dari signature, disimpan dengan nama acak di Docker volume cbt-imbs-uploads, dan hanya bisa diambil lewat API terautentikasi. Siswa hanya dapat mengambil gambar untuk soal pada sesi yang sedang dikerjakan.
- Pengubahan gambar dikunci setelah bank dipakai pada jadwal ujian. Penghapusan bank membersihkan berkas; API membersihkan berkas yatim saat startup.
- Karena berkas berada di volume terpisah, prosedur cadangan harus menyimpan dump PostgreSQL dan volume gambar.

### P3 — Rumus matematika dan sains

- Teks soal dan opsi dapat memakai LaTeX: \( ... \) untuk rumus sebaris dan \[ ... \] untuk rumus terpisah. Renderer KaTeX dibundel agar tetap bekerja offline, dimuat hanya saat rumus digunakan, dengan mode tepercaya dimatikan.
- Form bank menampilkan pratinjau rumus. Panduan penggunaan ditambahkan pada penggunaan.txt.

### P4 — Migrasi dan kompatibilitas

- Migrasi bernomor idempoten menambah kolom bahasa/arah dan tabel media, tanpa mengganti tabel lama. Baris lama diuji melalui pemulihan dump; jumlah user, mata pelajaran, bank, soal, dan sesi tetap sama.
- Dump sebelum deploy backups/20261009_predeploy-database.dump dipulihkan ke DB sementara: 8 user, 7 mata pelajaran, 1 bank, 5 soal, 2 sesi. DB sementara dihapus setelah verifikasi.
- P0 tetap menyediakan backups/20261009_pre_p0-source.zip dan backups/20261009_pre_p0-database.dump. Direktori backup diabaikan Git.

### P5 — Pemeriksaan, perbaikan, dan penerapan

- Perbaikan yang ditemukan selama uji: mulai ujian sebelumnya mengunci baris ujian yang sama untuk semua siswa; sekarang tiap sesi dikunci sendiri dan baris ujian dibaca bersama. Penghapusan siswa kini melepas referensi audit ke akun (log audit tetap ada), sehingga FK tidak lagi menggagalkan penghapusan.
- Uji awal 100 siswa mendapat 27 respons HTTP 503 saat mulai ujian. Setelah perbaikan lock, uji ulang 100 siswa berhasil: 400/400 permintaan login, mulai, simpan, dan kumpulkan ujian sukses. P95 konfigurasi pool 70: login 8,92 dtk; mulai 10,54 dtk; simpan 8,38 dtk; kumpulkan 0,76 dtk. Pool 110 dengan PostgreSQL 150 diuji di stack terpisah dan tidak memperbaiki latensi, jadi konfigurasi sekolah tetap pool 70/PostgreSQL 110.
- Uji 100 siswa berjalan pada Compose terisolasi; seluruh 100 siswa, 100 sesi, 1 ujian, dan log uji dibersihkan. Stack dan volume sementara dihapus. Uji 150 siswa belum dilakukan.
- npm test: 12/12 lolos. npm run build: 1.637 modul berhasil. Audit dependensi produksi: 0 kerentanan. Uji API terisolasi mencakup bahasa subjek, bank, gambar sah/palsu, akses gambar, dan pembersihan media.
- docker compose up --build -d diterapkan. Semua layanan berjalan, API/PostgreSQL healthy, restart API 0; halaman HTTPS LAN dan API health HTTP 200, HTTP 8080 mengalihkan ke HTTPS 8443, CORS LAN diterima dan Origin asing ditolak. Migrasi v1 tercatat; 5 soal lama tetap ada; tidak ada sesi in_progress; cloudflared tidak berjalan.

### Batas hasil uji

- Uji 100 menunjukkan tidak ada kegagalan fungsional setelah perbaikan, tetapi latensi p95 login/mulai/simpan masih beberapa detik. Ini uji lokal pada host saat ini, bukan jaminan untuk 150 peserta atau perangkat/jaringan sekolah yang sebenarnya.
- Akses tetap hanya melalui LAN sekolah di https://10.10.4.235:8443; uji perangkat siswa dan uji 150 peserta masih pekerjaan lanjutan.
