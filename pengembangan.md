A. Rencana Kerja Jangka Pendek (Prioritas Segera — 1 s/d 2 Minggu)

Fokus jangka pendek adalah memaksimalkan proteksi pada lapisan peramban web (browser) dan memperkuat keandalan data tanpa memerlukan instalasi software rumit di laptop siswa:

1. Deteksi Layar Ganda / Multi-Monitor (Anti-Dual Screen)
Celah yang Dicegah: Siswa menancapkan kabel HDMI/VGA ke monitor eksternal atau proyektor mini di bawah meja untuk membuka contekan di layar kedua.
Implementasi: Runner mencoba Screen Details API (`window.getScreenDetails()`) dan `screen.isExtended` bila tersedia/diizinkan. Jika sinyal menunjukkan layar tambahan, UI menjeda interaksi sampai layar tambahan dilepas. API ini tidak tersedia di semua browser dan tidak membuktikan layar cermin, capture card, desktop virtual, atau perangkat kedua; Admin tetap memeriksa perangkat. Ini bukan penguncian OS atau keputusan pelanggaran otomatis.
2. Penyimpanan Lokal Terenkripsi (IndexedDB Offline-First)
Masalah yang Dicegah: Saat ini jawaban siswa ditahan di memori React state jika internet putus. Jika siswa tidak sengaja menutup laptop atau baterai drop saat jaringan mati total, jawaban yang belum tersinkronisasi bisa hilang.
Implementasi saat ini: Jawaban dimasukkan ke antrean lokal, ditulis terenkripsi ke IndexedDB setelah debounce singkat, lalu disinkronkan ke server. Ini mengurangi risiko kehilangan draf tetapi bukan jaminan durability: browser dapat ditutup paksa sebelum write, storage dapat dibersihkan, perangkat dapat rusak, dan proses pemulihan perlu koneksi serta sesi server yang masih berlaku.
3. PIN Masuk Sesi Ujian Dinamis (Dynamic Session PIN)
Celah yang Dicegah: Siswa yang memiliki username dan token login dari rumah/luar sekolah sebelum jam ujian dimulai.
Implementasi saat ini: Admin menerbitkan PIN numerik 6 digit untuk ujian aktif dan memilih masa berlaku dalam menit bulat positif (default UI 15 menit). Backend menyimpan hash, Admin penerbit, waktu penerbitan, dan expiry; rotasi mengganti hash lama dan diaudit. First-start diperiksa terhadap waktu database, sedangkan sesi yang sudah berjalan dapat dilanjutkan tanpa PIN. PIN dapat diteruskan dan bukan bukti lokasi atau pengunci OS. PIN yang sudah ada sebelum kolom expiry ditambahkan tidak dapat memulai sesi baru sampai Admin menerbitkan ulang.
4. Rate Limiting & Proteksi API Backend
Celah yang Dicegah: Siswa jurusan IT yang mengutak-atik Console Browser untuk membanjiri API (DDoS local) atau mengirim skrip otomatis pengisian jawaban.
Implementasi: Menambahkan middleware express-rate-limit pada endpoint responses, violations, dan heartbeat di server/index.js.
5. Pengaktifan Enkripsi TLS/HTTPS Lokal
Manfaat: Sertifikat SSL/TLS internal pada Nginx memastikan seluruh cookie sesi terenkripsi (Secure; HttpOnly; SameSite=Lax) dan membuka izin penuh peramban modern untuk fitur keamanan mutakhir (seperti API Fullscreen dan Screen Details).
B. Rencana Kerja Jangka Panjang (Skala Institusi & Pengerasan Tingkat OS)

Fokus jangka panjang adalah menutup celah di luar kendali browser web murni (karena secara teknis, kode JavaScript di halaman web tidak diizinkan oleh sistem operasi untuk mematikan Task Manager atau memblokir tombol OS):

1. Penerapan Kebijakan Mode Kios Resmi Sekolah (OS-Level Kiosk)
Windows: Evaluasi Assigned Access/kiosk pada edisi dan versi Windows yang didukung sekolah, dengan browser, URL, akun, dan aplikasi yang diizinkan. Jangan menyatakan Win key, Ctrl+Alt+Delete, Task Manager, Alt+Tab, aplikasi latar, USB, atau screenshot pasti diblokir sebelum setiap pintasan dan jalur pemulihan diuji pada konfigurasi yang dipakai.
ChromeOS: Enroll Chromebook ke Google Admin dan konfigurasi kiosk/locked mode yang sesuai untuk perangkat serta jenis ujian. Pembatasan screenshot, USB, aplikasi, ekstensi, dan navigasi bergantung pada kebijakan/perangkat; bukan kemampuan yang otomatis aktif hanya karena aplikasi dibuka sebagai kiosk.
Status: Belum diprovisi atau divalidasi untuk perangkat IMBS. Kiosk harus disiapkan dan dipelihara administrator perangkat; aplikasi web tidak dapat mengaktifkannya dari halaman ujian.
2. Transmisi Pengawasan Real-Time via Server-Sent Events (SSE) / WebSocket
Manfaat: Menggantikan sistem polling pengawas (yang saat ini me-refresh tiap 5 detik).
Dampak: Ketika ada siswa yang melakukan pelanggaran atau koneksinya putus, informasi langsung muncul di layar pengawas dalam hitungan milidetik secara real-time, sekaligus menghemat kapasitas CPU server secara drastis saat mengawasi 150+ siswa secara serentak.
3. Pengacakan Bank Soal Berbobot Seimbang (Difficulty Indexing)
Manfaat: Saat admin/guru membuat ujian dari bank soal, sistem membagi soal secara proporsional berdasarkan tingkat kesulitan (contoh: 30% Mudah, 50% Sedang, 20% Sulit).
Dampak: Setiap siswa mendapatkan nomor soal dan urutan opsi yang berbeda, namun tingkat kesulitan ujian tiap siswa tetap setara secara akademis dan adil.
4. Analisis Anomali Integritas (Speed Anomaly Detection)
Manfaat: Sistem memantau jeda waktu pengerjaan per butir soal di server.
Deteksi: Jika seorang siswa menjawab soal essay panjang berbahasa Arab atau soal analitis hanya dalam waktu 2–3 detik, sistem otomatis memberikan flag anomali waktu di panel pengawas untuk diinvestigasi apakah siswa menggunakan alat bantu tempel otomatis.
5. Sistem Pencadangan Otomatis (Automated Snapshot & Backup)
Manfaat: Skrip otomatis untuk menjalankan pg_dump basis data sebelum dan sesudah sesi ujian berlangsung, serta mekanisme failover agar data riwayat akademik dan nilai tidak pernah hilang meskipun server lokal mengalami gangguan fisik.

## Status Implementasi dan Backlog Terverifikasi — 5 Oktober 2026

### Sudah tersedia pada checkout ini

- HTTPS lokal Nginx, cookie session `Secure`/`HttpOnly`/`SameSite=Lax`, PIN masuk numerik yang disimpan sebagai hash, rate limit beberapa endpoint, heartbeat, penyimpanan draf terenkripsi di IndexedDB, dan pemeriksaan multi-layar best-effort.
- Sinyal browser kini masuk sebagai event `pending`; sinyal tersebut tidak menambah hitungan pelanggaran dan tidak mengunci sesi secara otomatis. Admin dapat mengonfirmasi atau menolak setiap sinyal dengan alasan yang diaudit, serta memulihkan sesi sebelum tenggat.
- Pengacakan opsi PG per sesi disiapkan server saat paket soal pertama kali diminta, disimpan agar konsisten saat sesi dilanjutkan, dan kunci pemetaan digunakan oleh rekap nilai. Sesi lama memakai fallback ke kunci bank.
- Endpoint login membatasi 10 percobaan gagal per alamat IP dalam 15 menit dan mengganti ID sesi setelah autentikasi berhasil.

### Belum selesai dan tidak boleh diklaim sebagai proteksi aktif

- Kiosk tingkat OS belum diprovisi atau diuji. Pengelola sekolah perlu menerapkan Assigned Access pada perangkat Windows yang didukung atau kebijakan Kiosk pada Chromebook terkelola.
- Windows 7/8, BYOD, dan browser yang tidak dikelola tidak mendapat jaminan penguncian. Sesi berisiko tinggi perlu memakai perangkat terkelola dan pengawasan langsung.
- Uji browser nyata Chrome/Edge/ChromeOS, pengujian end-to-end alur review/pemulihan/PIN, pengujian restart/konkurensi PostgreSQL, dan load test 150 peserta masih diperlukan.
- Rate limit saat ini memakai memory store satu proses; gunakan store terdistribusi bila API dijalankan lebih dari satu instance atau perlu bertahan melewati restart.
- Backup otomatis, failover, SSE/WebSocket, penyeimbangan tingkat kesulitan, dan analisis waktu jawab masih berupa backlog; jangan menjadikan anomali waktu sebagai dasar hukuman otomatis.
- Sertifikat lokal self-signed belum merupakan konfigurasi sertifikat produksi dan harus diganti/dipercayai melalui CA sekolah sebelum distribusi.

## Alternatif Penguatan Menurut Model Perangkat

Tidak ada konfigurasi JavaScript yang dapat menjadikan browser biasa sebagai pengunci OS. Tetapkan tingkat perlindungan per jenis ujian, umumkan keterbatasannya kepada peserta, dan jangan menggunakan satu profil perangkat untuk semua skenario.

### Profil A — Ujian berisiko tinggi pada perangkat sekolah terkelola (direkomendasikan)

- Siapkan perangkat Windows yang masih didukung sekolah dengan akun ujian terbatas dan kebijakan kiosk/single-app yang dikelola administrator. Uji Edge atau Chrome yang diizinkan, URL ujian, navigasi keluar, ekstensi, developer tools, shortcut OS, serta prosedur keluar darurat sebelum dipakai.
- Untuk Chromebook, gunakan perangkat enrolled/managed dan kebijakan kiosk atau mode ujian yang disediakan Google Admin. Validasi kebijakan screenshot, navigasi, aplikasi/ekstensi, pembaruan, pemulihan perangkat, dan akses administrator pada Chromebook yang benar-benar dipakai.
- Simpan daftar perangkat dan profil kebijakan yang disetujui; lakukan pemeriksaan konfigurasi sebelum setiap periode ujian. Berikan jalur pemulihan resmi bagi pengawas, bukan kredensial administrator kepada siswa.
- Safe Exam Browser (SEB) dapat dievaluasi sebagai opsi klien terkunci tambahan untuk perangkat/OS yang didukung. Ini bukan fitur aplikasi yang sudah aktif: perlu uji konfigurasi, integrasi peluncuran/validasi klien, dukungan perangkat, dan prosedur gagal sebelum dipilih.
- Jangan masukkan Windows 7/8 atau OS/browser yang sudah tidak didukung ke profil ujian high-stakes. Jika perangkat tersebut tetap dipakai untuk latihan, tampilkan sebagai profil dengan risiko tinggi dan jangan menyebutnya kiosk atau terkunci.

### Profil B — BYOD di ruang ujian dengan pengawas langsung

- Lakukan verifikasi identitas/kehadiran, tempatkan layar agar mudah diawasi, beri jarak yang cukup, dan simpan ponsel/perangkat tambahan sesuai kebijakan sekolah. Pengawas harus dapat melihat status sesi dan menghubungi siswa yang kehilangan koneksi.
- Bagikan PIN yang memiliki jendela berlaku singkat tepat sebelum mulai sebagai penghalang akses awal; gunakan default 15 menit hanya sebagai nilai awal yang dapat dipilih Admin dan tetapkan durasi operasional sesuai jadwal sekolah. Sistem menolak durasi selain integer positif dan membatasi nilai teknis ke rentang integer PostgreSQL. PIN bukan bukti lokasi karena dapat diteruskan, dan bukan pengunci browser/OS. Rotasi, Admin penerbit, penerbitan, dan expiry tercatat dalam audit.
- Acak soal serta opsi per peserta dan gunakan beberapa versi paket yang seimbang. Ini mengurangi manfaat menyalin jawaban antar siswa, tetapi tidak mencegah pencarian informasi atau bantuan dari perangkat kedua.
- Perlakukan fullscreen, perpindahan fokus, multi-display API, clipboard, dan shortcut sebagai sinyal yang dapat gagal, hilang saat offline, atau dipalsukan. Sinyal hanya masuk tinjauan; kehilangan jaringan atau satu sinyal browser tidak boleh menjadi hukuman otomatis.
- Bila muncul kejadian, pengawas memeriksa konteks, mencatat keputusan dengan alasan, lalu mengizinkan lanjut/pemulihan atau meneruskan sesuai tata tertib. Sediakan proses keberatan dan pencatatan false positive.

### Profil C — BYOD jarak jauh

- Nyatakan bahwa aplikasi web hanya memberi integritas jawaban server dan sinyal browser; aplikasi tidak dapat memastikan siswa sendirian atau tidak memakai perangkat lain.
- Untuk ujian bernilai tinggi, pilihan yang lebih dapat dipertanggungjawabkan adalah memindahkan sesi ke tempat ujian terawasi, menjadwalkan verifikasi lisan/sampel jawaban, atau memakai layanan proctoring yang telah ditinjau sekolah.
- Pengawasan video, foto identitas, rekaman layar, dan biometrik hanya dipertimbangkan setelah penilaian privasi, dasar kebijakan/hukum, persetujuan yang sesuai, retensi minimal, kontrol akses, dan alternatif bagi siswa yang tidak dapat menggunakannya. Jangan menambah AI pengenalan wajah/gaze sebagai vonis otomatis.
- Jika pengawasan tambahan tidak tersedia atau tidak disetujui, turunkan tingkat risiko penilaian (misalnya tugas terbuka/ujian latihan) alih-alih mengklaim kontrol teknis yang tidak ada.

### Kontrol aplikasi lintas profil

- Operasionalisasi expiry PIN dengan durasi pendek yang disetujui sekolah, rotasi sebelum sesi, dan pembatasan percobaan; pertimbangkan kode sesi per ruang/per sesi, bukan PIN yang berlaku lama. Rate limit PIN harus mencegah penerbitan berulang tanpa mengunci seluruh kelas karena satu jaringan bersama. Validasi browser/API, PostgreSQL hidup, dan konkurensi masih harus dilakukan pada tahap uji berikutnya.
- Pertimbangkan lease satu runner aktif per peserta di server agar satu kredensial tidak membuka beberapa sesi serentak. Lease perlu heartbeat, masa tenggang gangguan jaringan, dan pemulihan oleh Admin yang diaudit supaya tidak menghalangi reconnect yang sah.
- Pertahankan pemisahan antara event mentah, keputusan Admin, dan status sesi. Log harus menyimpan waktu server, pelaku keputusan, alasan, dan perubahan status; batasi role yang dapat melihatnya dan tetapkan masa retensi.
- Lengkapi pertahanan API: rate limit tahan restart/berbagi instance sebelum horizontal scaling, validasi Origin/CSRF untuk mutasi berbasis cookie, kebijakan session secret non-default, header keamanan, validasi status/tenggat di database, dan audit tindakan Admin. Saat ini beberapa hal tersebut masih backlog.
- Gunakan anomali waktu jawab hanya sebagai petunjuk pemeriksaan yang dapat dijelaskan; jangan menghukum otomatis karena jawaban cepat, pola ketikan, atau gangguan jaringan.

## Rencana Uji, Kriteria Rilis, dan Operasional

### Tahap 1 — Tetapkan profil dan inventaris

- Sekolah memilih profil A/B/C untuk setiap jenis ujian dan menetapkan OS/browser minimum yang masih didukung. Catat jumlah perangkat, versi OS/browser, status enrollment/management, metode kiosk, serta penanggung jawab kebijakan.
- Ujian high-stakes hanya berstatus siap bila perangkat pada profil A telah diprovisi dan lolos uji keluar-kiosk/pemulihan. BYOD tidak dinaikkan menjadi profil terkunci karena berhasil membuka fullscreen atau lolos pemeriksaan multi-monitor.

### Tahap 2 — Uji perangkat nyata

- Buat matriks terpisah untuk Windows terkelola + browser yang disetujui, Chromebook terkelola + mode ujian, dan BYOD yang diterima. Untuk setiap kombinasi, catat versi OS/browser/perangkat, izin, kebijakan, hasil, bukti, dan isu yang diketahui.
- Coba masuk/keluar fullscreen, pindah tab/jendela, shortcut browser dan OS, reload/menutup browser, developer tools, ekstensi, clipboard, screenshot yang diizinkan kebijakan, monitor eksternal, sleep/wake, dan pergantian jaringan. Uji kebijakan OS pada perangkat kiosk; jangan menyimpulkan keberhasilan dari event JavaScript saja.
- Uji alur normal serta kegagalan: PIN salah/kedaluwarsa/dirotasi, siswa membuka sesi ganda, offline lalu reconnect, browser crash, tab ditutup, draf lokal dipulihkan, deadline tiba ketika offline, sinyal berulang, Admin menolak/konfirmasi sinyal, reset dengan alasan, dan sesi yang sudah berakhir.
- Kriteria: jawaban yang sudah tersimpan tidak hilang/berubah, jawaban dan kunci tidak bocor ke API siswa, sesi tidak bisa dilanjutkan melewati tenggat, laporan palsu tidak dapat mengunci tanpa keputusan Admin, dan seluruh tindakan pemulihan dapat diaudit. False positive harus dapat ditangani tanpa menghapus bukti.

### Tahap 3 — Uji keamanan API dan konkurensi

- Uji otorisasi silang peserta (BOLA/IDOR), perubahan jawaban milik peserta lain, manipulasi event/status/nilai dari console, replay request, request paralel save/submit/timeout/review/reset, login gagal, tebakan PIN, dan payload berukuran tidak wajar.
- Uji rate limit aktual: 10 login gagal/IP/15 menit (login sukses tidak dihitung), 120 simpan jawaban/akun/menit, 12 sinyal/akun/5 menit, 30 heartbeat/akun/menit, 8 percobaan start/akun/15 menit, dan 6 penerbitan PIN Admin/akun/15 menit. Untuk setiap limit, buktikan respons `429`, header limit, pemulihan setelah jendela waktu, perilaku akun/IP berbeda, serta dampak restart API. Jika deployment memakai lebih dari satu instance, verifikasi store bersama sebelum mengandalkan hasil limit.
- Jalankan migrasi pada salinan database yang memiliki data lama; pastikan fallback kunci bank untuk sesi lama berfungsi dan opsi/kunci per sesi baru tidak berubah setelah resume.

### Tahap 4 — Beban target 150 peserta

- Default per proses API adalah `DB_POOL_MAX=10`, `DB_CONNECTION_TIMEOUT_MS=1000`, dan `DB_QUERY_TIMEOUT_MS=5000`. Ketiganya dapat dioverride melalui environment: `DB_POOL_MAX` integer 1–200, `DB_CONNECTION_TIMEOUT_MS` integer 100–60000 ms, dan `DB_QUERY_TIMEOUT_MS` integer 100–120000 ms; nilai kosong/tidak valid kembali ke default. Pool 10 adalah hipotesis konservatif untuk host Intel i3-7100 dua-core/empat-thread yang menjalankan API dan PostgreSQL bersama, bukan hasil perhitungan kapasitas ideal. Kebutuhan berubah menurut pola query, kerja CPU, jumlah proses, dan klien lain; angka ini harus diuji dan bukan optimum universal.
- Anggarkan koneksi agregat dengan `jumlah proses/replica API x DB_POOL_MAX + koneksi semua klien lain` dan jaga hasilnya dalam `max_connections` PostgreSQL (100 pada konfigurasi ini), dengan ruang bagi operasi administratif dan koneksi sistem. Satu pool berlaku untuk setiap proses API.
- Timeout akuisisi koneksi dan timeout query terkonfigurasi diperlakukan sebagai overload sementara: HTTP `503`, header `Retry-After: 1`, kode stabil `DB_OVERLOAD`, serta pesan non-sensitif pada field `error` dan `message`. Kegagalan SQL/database lain tetap melalui respons generik dan tidak diklasifikasikan sebagai overload.
- API menulis satu baris JSON pool setiap **5000 ms**; interval ini tetap dan bukan environment override. Bentuk dan field-nya:

	```json
	{"type":"db_pool_sample","timestamp":"2026-10-06T12:00:00.000Z","totalCount":10,"idleCount":2,"waitingCount":null,"waitingCountAvailable":false}
	```

	`timestamp` adalah waktu ISO; `totalCount` dan `idleCount` adalah hitungan pool publik; `waitingCount` adalah hitungan tunggu publik bila tersedia, selain itu `null` dan `waitingCountAvailable:false`. `null` berarti tidak tersedia, bukan nol. Implementasi juga mengekspos gauge Prometheus `db_pool_total_count` dan `db_pool_idle_count`; waiting count dicatat pada sampel JSON, bukan diasumsikan tersedia sebagai gauge.
- Prometheus pada jaringan Compose yang sama dapat scrape `api:3000/metrics`. Port API tidak dipublikasikan ke host dan Nginx mengembalikan 404 untuk `/metrics`; scraping publik tidak didukung. Contoh konfigurasi scraper:

	```yaml
	scrape_configs:
		- job_name: cbt-imbs-api
			metrics_path: /metrics
			static_configs:
				- targets: ["api:3000"]
	```

	Compose saat ini tidak menyertakan Prometheus; pemeriksaan container project `cbtimbs` juga tidak menemukan scraper. Contoh di atas ditujukan untuk Prometheus yang kelak dijalankan/dioperasikan pada jaringan Compose yang sama. Bukti live scrape ditunda sampai scraper tersedia; jangan memublikasikan port API atau memakai endpoint frontend publik sebagai pengganti.

- [ ] Cohort 10 peserta: jalankan login, start dengan PIN, heartbeat, autosave, reconnect/resume, submit, dan polling monitor Admin; simpan manifest, durasi, serta hasil tiap operasi.
- [ ] Cohort 50 peserta: ulangi traffic lifecycle dan polling yang sama; simpan hasil terpisah agar perubahan dari cohort 10 dapat dibandingkan.
- [ ] Cohort 150 peserta: ulangi traffic yang sama dan pastikan seluruh jawaban konsisten setelah save/reconnect/submit; simpan hasil dan bandingkan dengan baseline lokal terdahulu.
- Untuk setiap operasi dan polling monitor, catat latensi p50/p95/p99, total status HTTP, error, dan `429`. Catat sampel pool `waitingCount`/`totalCount`/`idleCount` beserta ketersediaannya (`null` bukan nol), CPU dan memori API serta PostgreSQL, lock wait, dan waktu pemulihan setelah gangguan jaringan. Verifikasi jumlah jawaban tersimpan dan konsistensi jawaban antara save, reconnect, dan database.
- Bandingkan tiap cohort dengan baseline lokal 6 Oktober 2026 yang tercatat di `update.md` dan artefak kapasitas: 1.260 request lifecycle berhasil, 24 monitor poll berhasil, tanpa error/429/inkonsistensi; start p95 26,68 detik dan monitor p95 14,24 detik pada 150 peserta. Pool lama mencapai 50/50 pada cohort 50 dan 150; `waitingCount` tidak tersedia pada pengukuran itu. Baseline tersebut hanya hasil lokal dengan sampel resource terbatas dan spesifikasi host belum tercatat saat run; bukan ambang go/no-go atau bukti kapasitas untuk host lain.
- Sebelum run, pemilik operasional/sekolah harus menetapkan ambang penerimaan untuk latency, error/429, konsistensi, resource, dan tekanan pool. Jangan mengarang threshold atau menyimpulkan kapasitas, kesiapan produksi, kompatibilitas perangkat/kiosk, atau optimalitas universal dari hasil host lokal.
- Ulangi tes soak selama durasi ujian yang realistis dan tes pemulihan ketika API/browser terputus. Pastikan tidak ada respons hilang, penilaian berbeda akibat shuffle, atau kehabisan koneksi saat beban puncak.

### Go/no-go dan prosedur hari ujian

- **Go untuk high-stakes:** profil perangkat dan kebijakan kiosk terverifikasi, perangkat/sertifikat dipercaya, checklist ruang selesai, API/database sehat, backup dan pemulihan diuji, smoke test guru-siswa lulus, dan load test memenuhi ambang yang disepakati.
- **No-go:** hanya ada browser biasa tetapi ujian disebut terkunci; ada kebijakan kiosk yang belum diuji; kredensial/secret default; migrasi atau backup belum tervalidasi; ada kegagalan jawaban/reconnect; atau hasil 150 peserta belum memenuhi ambang yang disepakati.
- Siapkan pengawas dan kontak teknis, daftar peserta/perangkat, PIN dan masa aktifnya, prosedur jaringan putus, jalur pemulihan sesi, pencatatan insiden, keputusan penjadwalan ulang, serta backup sebelum/sesudah sesi. Lakukan post-mortem insiden dan simpan hanya data yang diperlukan.