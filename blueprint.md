blueprint system cbt online imbs

goals 		      : system ujian online yang memiliki keamanan anti kecurangan

fitur anti kecurangan : • Runner web meminta layar penuh, memblokir beberapa tindakan halaman, dan mencatat sinyal perpindahan fokus sebagai bahan tinjauan; kontrol ini bersifat best-effort dan bukan penguncian perangkat.
			• Kiosk OS, pembatasan aplikasi/pintasan sistem, serta kebijakan screenshot hanya dapat diterapkan oleh pengelola pada perangkat Windows/ChromeOS yang didukung dan dikelola sekolah.
			• Browser tidak dapat menjamin pemblokiran screenshot/rekaman OS, Task Manager, Alt+Tab, kamera, perangkat kedua, VPN, atau aplikasi latar. Jangan menyatakan ujian bebas kecurangan hanya berdasarkan halaman web.
			• Setiap sinyal browser disimpan untuk ditinjau. Penguncian berdasarkan sinyal hanya dilakukan setelah Admin mengonfirmasi dengan alasan yang tercatat; false positive dapat ditandai dan sesi dapat dipulihkan selama tenggat masih berlaku.

Target pengguna       : 150 user/siswa dalam satu sesi 

Role		      : admin, guru, siswa

fitur tiap role	      : 
1. admin
	melakukan input siswa dan auto generated unik token untuk tiap siswa (username masuk ujian dan token tiap siswa harus berbeda)
	melakukan pemilahan dan pengaturan sistem randomize soal ujian untuk tiap siswa tapi tetap sesuai dengan bank soal dari pelajaran yang diujikan
	dapat memantau user/siswa yang sedang ujian (abu-abu), selesai ujian (hijau), dan melakukan pelanggaran (merah)
	memantau hasil ujian user/siswa

2. guru 
	melakukan input pelajaran
	melakukan input bank soal
	melakukan input soal dan kunci jawaban
`
3. user/siswa
	hanya bisa akses ujian

PRD platform	      :
	bahasa pemrograman   : silahkan kamu analisis mana yang paling sesuai dan relevant dalam menangani pembuatan dan pengembangan platform ini
	framework	     : tentukan sesuai bahasa pemrograman
	target OS 	     : windows 7/8/10/11 dan chromebook
	browser		     : chrome dan edge
	backend dan frontend : analisis keseluruhan sistem, kamu yang menentukan untuk menggabungkan atau memisahkan
	target server	     : localhost menggunakan docker server 
	proses pengembangan  : catat semua hasil pekerjaan di update.md serta gunakan file blueprint.md dan update.md sebagai reminder bagaimana system dikembangkan dan sudah sejauh mana progresnya berjalan.

milestone :
1. phase 1
	a. analisis keseluruhan rancangan dan bandingkan dengan beberapa platform CBT ujian online yang sudah pernah dibuat seperti SEB dan https://e-ujian.com/
	b. buat platform dan dashboard untuk admin dan guru terlebih dahulu dengan fitur menyesuaikan role masing-masing
	c. skema dan aturan pembuatan bank soal;
		# input pelajaran -> input kelas -> input soal dan kunci jawaban manual
		# jadikan tiap hasil input soal dan kunci jawaban sebagai card bank soal spesifik sesuai input mata pelajarannya, jangan campur banyak pelajaran menjadi bank soal global
		# soal dan kunci jawaban dapat diisikan secara massal dan tidak satu-satu
	d. skema dan aturan randomize soal ujian;
		# admin memilih bank soal spesifik sesuai pelajaran yang akan diujikan
		# admin bebas atur berapa soal pilihan ganda yang akan diambil dan berapa soal essay yang akan diujikan, sistem mengambil seluruh soal dibank soal spesifik lalu menggenerate dan membagi semua soal dibank soal spesifik ke tiap user/siswa sesuai dengan porsi soal pilihan ganda dan essay yang ditentukan diawal
	e. input user dapat dilakukan dengan manual dan import by excel
	f. hasil input user akan otomatis menghasilkan unik username dan unik token untuk user/siswa bisa akses ujian

2. phase 2
	a. pembuatan platofrm CBT ujian online imbs pada protoype pertama ini menggunakan format bahasa arab mulai dari format tata letak, type font, dan font size semua menggunakan format bahasa arab
	b. pembuatan fitur keamanan anti-kecurangan ujian sesuai yang sudah ditentukan diatas
	c. perkuat fitur keamanan anti-kecurangan dengan cara;
		# jika ada user/siswa melakukan pelanggaran muncul notif di admin berupa warna kuning pada icon/card user tersebut
		# user/siswa hanya diberi toleransi deteksi kecurangan sebanyak 2x Ketika melebihi toleransi system otomatis terkunci-terblokir dan nilai siswa otomatis 0
		# Ketika ada user/siswa melakukan terdeteksi mencoba melakukan kecuran lebih dari 2x icon/card siswa yang semua warna kuning otomatis berubah menjadi merah
	d. didalam halaman ujian terdapat fitur pendukung ujian antara lain;
		# icon internet untuk mengetahui apakah koneksi internet stabil atau tidak dan bisa diklik untuk refresh koneksi
		# icon keyboard untuk memunculkan keyboard virtual tapi jangan sampai menutup layer, karena ini hanya akan digunakan untuk bantuan apabila keyboard user/siswa rusak
		# timer hitung mundur untuk memastikan siswa mengerjakan sesuai sesinya, dan tidak akan akan berkurang 2 menit tiap terdeteksi melakukan kecurangan
		# icon atau card nomor soal untuk siswa tahu soal mana yang belum selesai dan sudah selesai dikerjakan
		# icon "next dan back" untuk mengecek dan memastikan soal sebelum dikirim

3.
