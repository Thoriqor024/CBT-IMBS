# To-do Persiapan SaaS CBT IMBS

Plan ID: `2026-10-12-saas-readiness`  
Status: **Gate 0 dan Gate 1 terverifikasi pada baseline; implementasi tenant-isolation dan platform guard sudah diuji lokal dan belum diaktifkan pada deployment utama**  
Scope awal: aplikasi utama CBT IMBS dan database lokal yang sekarang menjadi baseline pengembangan.  
Di luar scope: perubahan atau deployment AWS, stack load-test, dan penghapusan/migrasi data tanpa persetujuan.

## Arah Arsitektur Disetujui

- Preferensi saat ini: aplikasi/API dan infrastruktur komputasi dipakai bersama, dengan satu database PostgreSQL terpisah per sekolah pada server/cluster bersama.
- Arah ini telah dikonfirmasi pada Gate 0; belum ada perubahan implementasi.
- Server harus memetakan tenant terverifikasi ke database dari registry/konfigurasi tepercaya. Nama database tidak boleh diterima langsung dari request pengguna.
- Pemisahan database mengurangi kebutuhan `tenant_id` di setiap tabel data sekolah, tetapi tidak menghilangkan kebutuhan autentikasi tenant, kontrol akses, database routing, provisioning, migrasi, backup, dan pengujian lintas tenant.
- Satu cluster dengan database terpisah per sekolah adalah keputusan awal. Instance/cluster khusus per sekolah bukan bagian dari MVP dan hanya dipertimbangkan melalui keputusan scope baru.

## Tujuan dan Kriteria Siap

SaaS dinyatakan siap untuk pilot terbatas jika:

- Satu sekolah tidak dapat membaca, mengubah, menghapus, atau mengambil media milik sekolah lain melalui API maupun CBT runner.
- Data IMBS yang sekarang tetap utuh setelah migrasi dan terikat pada tenant IMBS.
- Admin platform dapat membuat tenant; admin sekolah hanya mengelola tenantnya sendiri.
- Uji lintas-tenant, pemulihan backup, beban yang disepakati, dan prosedur insiden lulus.
- Harga/paket, batas layanan, ketentuan privasi, serta bantuan pelanggan sudah didefinisikan.

## Gate 0 - Keputusan Produk dan Batas Scope

Status Gate 0: **Disetujui sebagai baseline produk/arsitektur pada 2026-10-12.** Persetujuan ini membuka Gate 1 (analisis dan desain), bukan persetujuan migrasi schema atau peluncuran pelanggan.

### Keputusan yang disetujui

- [x] Aplikasi/API dan infrastruktur server bersama; satu PostgreSQL cluster lokal/bersama dengan satu database terpisah per sekolah.
- [x] Akun hanya menjadi anggota satu sekolah; identitas akun berada di database tenant.
- [x] Tenant ditemukan melalui kode sekolah. Login memakai email unik per sekolah dan password; pemulihan akun harus disediakan.
- [x] Kapasitas produk awal: maksimal 10 sekolah, maksimal 400 siswa terdaftar dan 25 guru per sekolah; target total awal 2.000 siswa terdaftar dalam 12 bulan.
- [x] Angka kapasitas CBT yang diminta: 400 siswa serentak per sekolah; 4.000 serentak agregat adalah envelope pengujian terburuk, bukan klaim kapasitas yang sudah terbukti.
- [x] Harga awal Rp3.000.000 per semester; trial 2 bulan; billing pilot manual.
- [x] Setelah masa layanan berakhir, akses tenant diblokir. Data tetap tersimpan dan tidak dapat diakses sampai pemilik/admin platform memutuskan membuka kembali atau menghapusnya; tidak ada penghapusan otomatis yang disetujui.
- [x] Target availability 99% dan p95 API <= 2 detik. Target login/start saat lonjakan ditetapkan setelah benchmark.
- [x] Lokasi data yang dipilih: Indonesia. Tinjauan hukum/privasi siswa wajib selesai sebelum sekolah eksternal diberi akses.
- [x] Isolasi tenant dan database routing wajib selesai sebelum sekolah eksternal diberi akses.
- [x] Tingkat dukungan yang dicatat: 18 jam; definisi zona waktu, jam cakupan, waktu respons, dan maintenance window perlu dirapikan sebelum pilot.

### Keputusan yang sengaja ditunda

- [ ] Kuota storage media per sekolah belum ditetapkan.
- [ ] SLO khusus login/start ujian belum ditetapkan; angka dibuat setelah uji beban.
- [ ] Retensi backup, durasi ekspor pasca-berakhir, dan prosedur penghapusan permanen perlu disepakati bersama tinjauan hukum sebelum pelanggan eksternal.
- [ ] Definisi operasional dukungan 18 jam dan maintenance window perlu ditetapkan sebelum pilot.

## Gate 1 - Baseline dan Desain Teknis

Status Gate 1: **Draft desain dibuat untuk review; belum ada implementasi atau perubahan schema.** Detail dan bukti awal: [arsitektur Gate 1](gate1-architecture.md).

- [x] Inventaris tabel, FK, constraint/index, route, session store, media, seed, dan operasi hapus dicatat.
- [x] Route dikelompokkan menurut layanan control-plane, data tenant, dan alur CBT kritis.
- [x] Login siswa, daftar ujian, start, heartbeat, autosave, submit, media, monitoring, koreksi, dan hasil ditandai kritis.
- [x] Tenant registry/control-plane dan kondisi kegagalannya dirancang.
- [x] Login kode sekolah dan validasi tenant sebelum memilih database dirancang.
- [x] Database resolver server-side dirancang; koneksi hanya berasal dari registry tepercaya.
- [x] Pool tenant dirancang bounded dengan anggaran koneksi global; nilai numerik ditahan sampai benchmark.
- [x] Identitas tenant, status langganan/manual billing, sesi platform, dan role tenant ditempatkan pada control-plane vs tenant DB.
- [x] Keunikan email/username dan data mapel dijelaskan pada lingkup database tenant.
- [x] `school_settings` dipertahankan sebagai singleton di tiap database tenant.
- [x] Batas akses dan IDOR lintas database dianalisis; tiap request tenant hanya memakai resolver dari sesi tervalidasi.
- [x] Versi schema, provisioning, migrasi parsial/retry/rollback per database tenant dirancang.
- [x] Media privat, isolasi key, backup, dan pembersihan file dirancang.
- [x] Jalur migrasi database utama ke tenant `IMBS` dan validasi baseline dicatat; sumber tidak dihapus.
- [x] Seed dipisahkan antara development/test dan provisioning tenant pelanggan.
- [x] ADR Gate 1 dibuat sebagai draft untuk review sebelum Gate 2.

## Gate 2 - Model Tenant dan Migrasi IMBS

Status Gate 2: **Fondasi resolver selesai diuji; registry migration belum dijalankan dan integrasi aplikasi belum dimulai. Database utama tetap utuh.**

- [x] Buat fondasi tenant database router yang menolak kode/record invalid, tenant suspended/expired, database identifier tidak aman, serta membatasi/reuse pool secara bounded.
- [x] Tambahkan draft DDL control-plane registry dalam migrasi terpisah; migrasi tersebut belum dijalankan pada cluster aktif.
- [x] Tambahkan repository registry dengan lookup tenant terparameterisasi untuk kode sekolah dan tenant ID.
- [x] Tambahkan regression tests untuk resolver/repository dan masukkan ke suite `npm test`.
- [ ] Implementasikan tenant registry/control-plane dan provisioning satu database tenant baru secara otomatis.
- [ ] Hubungkan autentikasi kode sekolah dan seluruh route ke router setelah registry dapat diprovision dan credential store disetujui.

- [ ] Tetapkan admin platform terpisah dari admin sekolah; jangan memberi role `admin` akses lintas database secara otomatis.
- [ ] Jadikan database utama saat ini database tenant `IMBS`; pertahankan tabel operasional CBT di dalam database tenant tersebut kecuali desain menyetujui pemisahan lain.
- [ ] Migrasikan pengaturan, kelas, tingkatan, mapel, guru, siswa, akses guru, bank, soal, ujian, sesi, jawaban, pelanggaran, audit, dan metadata media ke database tenant IMBS.
- [ ] Migrasikan identity/session agar membership tenant diverifikasi dan tenant/database yang aktif terikat aman pada sesi.
- [ ] Tambahkan pengelolaan versi schema per database tenant dan status migrasi yang dapat dipantau.
- [ ] Pastikan pembaruan schema tidak menghapus atau mengganti data yang sudah berjalan.
- [ ] Jalankan migrasi di salinan backup/staging lokal terlebih dahulu dan cocokkan jumlah serta relasi data sebelum/sesudah.
- [ ] Dokumentasikan langkah rollback dan jalankan simulasi restore sebelum menyentuh database utama.

## Gate 3 - Isolasi dan Otorisasi API

- [ ] Tambahkan middleware tenant context yang memvalidasi tenant aktif dan membership sebelum database resolver memilih koneksi.
- [ ] Arahkan setiap route admin, guru, siswa, dashboard, settings, CBT, hasil, dan audit ke database tenant yang sudah tervalidasi.
- [ ] Pastikan tidak ada route yang memakai pool/global DB default setelah request tenant ditetapkan.
- [ ] Pastikan IDOR tidak memungkinkan akses silang jika klien mengirim ID bank, soal, media, ujian, sesi, siswa, jawaban, hasil, atau event milik database tenant lain.
- [ ] Pastikan query control-plane hanya memuat data minimum yang diperlukan dan tidak menggabungkan isi akademik antar-database.
- [ ] Terapkan tenant checks pada session student runner untuk daftar ujian, start, heartbeat, save response, submit, dan media.
- [ ] Pastikan role guru hanya mengakses grant dalam tenantnya sendiri; role sekolah tidak sama dengan role platform.
- [ ] Pastikan perubahan profile/password tidak dapat mengubah membership atau akses tenant.
- [ ] Pastikan operasi delete mencatat actor/tenant/dampak dan hanya menghapus data pada tenant yang benar.
- [ ] Jika ada tabel bersama lintas tenant, evaluasi PostgreSQL Row-Level Security untuk tabel tersebut; RLS bukan pengganti validasi database routing.
- [ ] Audit rate limit, cache key, audit log, dan observability label agar tidak mencampur tenant atau membocorkan data pribadi.

## Gate 4 - Onboarding, Akun, dan Paket

- [ ] Buat alur provisioning tenant dan akun admin sekolah pertama.
- [ ] Buat undangan guru dan pengelolaan membership oleh admin sekolah.
- [ ] Tambahkan verifikasi email, reset password, pemulihan akun, dan kebijakan password sesuai keputusan produk.
- [ ] Tambahkan alur login yang memilih/menentukan tenant secara aman.
- [ ] Definisikan status tenant/langganan: trial, aktif, menunggak, suspended, dibatalkan, dan dihapus.
- [ ] Terapkan entitlement/paket di server untuk batas siswa, guru, ujian, media, dan periode layanan.
- [ ] Pastikan tenant yang suspended tidak bisa memulai ujian baru, namun kebijakan akses/ekspor data lama jelas.
- [ ] Buat **Panel Platform khusus pemilik/`platform_owner`**, terpisah dari panel admin sekolah; admin sekolah tidak boleh membuka atau mengelola tenant lain.
- [ ] Panel menyediakan pendaftaran sekolah manual untuk pilot: nama/kode sekolah, email admin pertama, paket, batas, trial/mulai-berakhir layanan, dan provisioning database.
- [ ] Panel menampilkan daftar sekolah dengan dua status yang tidak dicampur: **status layanan** (`trial`, `active`, `suspended`, `closed`) dan **kesehatan teknis** (koneksi DB, versi schema/migrasi, pemeriksaan terakhir).
- [ ] Panel menampilkan penggunaan terhadap kuota (siswa terdaftar, guru, dan media setelah batas media diputuskan) serta masa layanan.
- [ ] Aksi platform: provision tenant, kirim/ulang undangan admin, perpanjang/aktifkan, suspend/reactivate, ekspor, dan tutup/hapus tenant; aksi sensitif memerlukan konfirmasi dan dicatat di platform audit.
- [ ] Panel mendukung pencarian/filter, detail tenant dan riwayat audit tanpa menampilkan data siswa/jawaban secara default.
- [ ] Pendaftaran publik tidak termasuk MVP pilot; permintaan publik di masa depan harus berstatus pending sampai pemilik menyetujui provisioning.
- [ ] Tentukan billing manual untuk pilot atau integrasi payment provider untuk rilis komersial; simpan webhook/idempotency secara aman jika otomatis.

## Gate 5 - Operasional, Keamanan, dan Privasi

- [ ] Pindahkan seluruh secret produksi dari fallback Compose ke secret management dan rotasi yang terdokumentasi.
- [ ] Tetapkan TLS/domain, cookie/session policy, CORS, rate limit, proteksi brute-force, dan prosedur rotasi kunci.
- [ ] Siapkan backup database konsisten, backup media, point-in-time recovery bila tersedia, enkripsi, serta retensi.
- [ ] Uji backup/restore satu database tenant secara independen, termasuk media, serta restore control-plane; jangan menganggap backup valid sebelum restore diuji.
- [ ] Tentukan ekspor data tenant, permintaan penghapusan, masa retensi, legal hold bila relevan, dan bukti penyelesaian.
- [ ] Tambahkan monitoring availability, error rate, DB pool, latency, disk/media, kapasitas, dan alert tanpa membocorkan PII.
- [ ] Siapkan runbook insiden, komunikasi pelanggan, respons kebocoran data, rollback, dan rotasi credential.
- [ ] Buat pipeline release/migrasi dengan staging, health gate, backup gate, rollback, dan kompatibilitas versi frontend/backend.
- [ ] Pastikan proses support tidak memungkinkan staf melihat isi ujian/nilai tanpa otorisasi dan audit yang sesuai.
- [ ] Tinjau kebijakan privasi, syarat layanan, pemrosesan data siswa/minor, persetujuan, retensi, dan kewajiban hukum sebelum menerima pelanggan.

## Gate 6 - Pengujian dan Kesiapan CBT

- [ ] Buat minimal dua tenant dengan database terpisah dan data, admin, guru, siswa, kelas, mapel, bank, media, ujian, dan jawaban yang sengaja mirip.
- [ ] Uji database resolver: tenant A tidak dapat memilih koneksi/database B dengan memanipulasi URL, cookie, header, body, username, atau ID record.
- [ ] Buat test negatif untuk setiap keluarga route: tenant A tidak dapat membaca, mengubah, menghapus, atau menebak ID tenant B.
- [ ] Uji pergantian tenant, sesi kedaluwarsa, perubahan membership, pencabutan sesi, password reset, dan akun suspended.
- [ ] Uji regresi alur CBT satu tenant: randomisasi, timer, penyimpanan jawaban, submit, penilaian, monitoring, dan media.
- [ ] Uji konkurensi serta retry/idempotency untuk login serentak, start ujian, autosave, submit, dan heartbeat.
- [ ] Jalankan load test pada baseline 100 dan target yang disetujui, lalu tambah skenario beberapa tenant aktif bersamaan.
- [ ] Tetapkan dan ukur SLO p95/p99 untuk login, memulai ujian, menyimpan jawaban, submit, dan dashboard.
- [ ] Jalankan security review dan dependency/secrets scan sebelum pilot eksternal.
- [ ] Uji migrasi dan rollback berulang pada salinan database, bukan pertama kali pada database utama.
- [ ] Uji browser/perangkat yang benar-benar didukung dan dokumentasikan keterbatasan anti-kecurangan browser.

## Gate 7 - Pilot dan Rilis

- [ ] Pilih satu sekolah pilot selain IMBS dan sepakati ruang lingkup serta dukungan.
- [ ] Provision tenant pilot dan uji onboarding tanpa akses manual ke database.
- [ ] Jalankan acceptance test oleh admin, guru, dan siswa pilot.
- [ ] Verifikasi isolasi lintas tenant, backup/restore, billing/paket, support, dan monitoring sebelum menambah tenant.
- [ ] Tinjau metrik, insiden, latensi, beban support, serta biaya infrastruktur setelah pilot.
- [ ] Tutup blocker kritis/tinggi, dokumentasikan limitasi, lalu minta persetujuan eksplisit sebelum membuka penjualan lebih luas.
- [ ] Catat setiap hasil dan keputusan pada `update.md`; perbarui checklist dengan bukti, bukan hanya menandai selesai.

## Keputusan Lanjutan Sebelum Pilot

- [ ] Kuota storage media per sekolah.
- [ ] Target login/start serentak yang dapat dipenuhi, dibuktikan dengan load test.
- [ ] Definisi dukungan 18 jam, zona waktu, maintenance window, dan waktu respons.
- [ ] Retensi backup, ekspor pasca-suspend, dan penghapusan permanen setelah review privasi/hukum.
- [ ] Tinjauan legal/privacy data siswa selesai sebelum pelanggan eksternal.
- [ ] AWS/R&D tetap di luar scope sampai pengguna menyetujui perluasan scope.
