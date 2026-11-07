# SIMAK DISKUM v5.0 — Milestone S05 External Functional QA Checklist & Tester Guide (R1)

**Sistem:** SIMAK DISKUM v5.0 (Sistem Informasi Manajemen Agenda Kedinasan)  
**Klien:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Lingkungan Evaluasi:** Cloud Staging (`simakdiskum-staging`)  
**Target Penguji (QA Lead):** Asep (`aseppbukga@gmail.com`)  
**Tujuan Dokumen:** Panduan pengujian fungsional manual mandiri, daftar periksa 33 skenario penerimaan (*acceptance checklist*), dan formulir rekam hasil uji pra-rilis.

---

## 📌 Ringkasan Status Pra-Pengujian (Preflight Status)

| Komponen | Status Verifikasi | Keterangan Teknis |
|:---|:---:|:---|
| **Portal Publik Staging** | **AKTIF (HTTP 200)** | [https://simakdiskum-staging.web.app](https://simakdiskum-staging.web.app) |
| **Portal Admin Staging** | **AKTIF (HTTP 200)** | [https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app) |
| **Akun QA Tester (Asep)** | **TERVERIFIKASI & AKTIF** | Email: `aseppbukga@gmail.com`<br/>Peran Aplikasi: `role: admin`<br/>Status Akun: `disabled: false`, `emailVerified: true`<br/>Kredensial: Dikelola privat oleh penguji (tanpa penyetelan ulang/pengungkapan rahasia) |
| **Lingkungan Produksi** | **TERISOLASI 100%** | Proyek `simakdiskum` terlindungi penuh (0 deployment, 0 mutasi data) |

---

## 📖 Panduan Penguji (Tester Guide untuk Non-Developer)

Selamat datang di pengujian fungsional **SIMAK DISKUM v5.0**. Panduan ini disusun agar proses pengujian berjalan sistematis, aman, dan mudah dipahami oleh penguji non-developer.

### 1. Aturan Emas Pengujian & Pelestarian Data Baseline

> [!IMPORTANT]
> **ATURAN WAJIB PELESTARIAN DATA & PENAMAAN:**
> 1. **Gunakan Awalan `[QA-TEST]`:** Setiap membuat data kegiatan baru atau data master baru, penguji **WAJIB menambahkan awalan `[QA-TEST]` pada judul kegiatan atau nama entitas** (contoh: `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam`).
> 2. **Lestarikan 38 Data Asli Oktober 2026:** **DILARANG MENGUBAH, MENGEDIT, MEMBATALKAN, ATAU MENGHAPUS 38 DATA ASLI BULAN OKTOBER 2026**. Data tersebut merupakan data tolok ukur (*baseline demonstration data*) yang digunakan untuk verifikasi cetak laporan dan audit paritas.
> 3. **Uji Edit & Hapus Hanya pada Data `[QA-TEST]`:** Seluruh pengujian perubahan status, pengeditan, duplikasi, pembatalan, dan penghapusan hanya boleh dilakukan terhadap data yang diawali label `[QA-TEST]` yang dibuat sendiri oleh penguji.
> 4. **Pembersihan Data (*Cleanup*):** Setelah rangkaian pengujian selesai, lakukan penghapusan data bertanda `[QA-TEST]` sesuai instruksi pembersihan di setiap skenario agar lingkungan staging kembali bersih dan teratur.

### 2. Cara Masuk ke Portal Admin Staging
1. Buka peramban (*browser*) Google Chrome atau Microsoft Edge.
2. Akses alamat: **[https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app)**.
3. Masukkan email tester Anda: `aseppbukga@gmail.com` dan kata sandi yang telah Anda atur.
4. Klik tombol **"Masuk ke Portal Admin"**.
5. Jika berhasil, Anda akan diarahkan ke Dashboard Manajemen Agenda Kedinasan.

### 3. Pilihan Status Hasil Pengujian
Setiap skenario uji harus dicatat hasilnya menggunakan salah satu status berikut:
- **`PASS`**: Fitur berjalan persis sesuai hasil yang diharapkan.
- **`FAIL`**: Terjadi kesalahan, salah hitung, data hilang, tampilan rusak, atau fitur tidak berfungsi.
- **`BLOCKED`**: Pengujian tidak dapat dilanjutkan karena terhambat oleh fitur lain yang gagal sebelumnya.
- **`NOT TESTED`**: Skenario belum diuji.

---

## 📋 Daftar Periksa Pengujian Manual (33 Skenario Uji)

### Kategori 1: Autentikasi, Keamanan Sesi & Pemulihan Akses (AUTH)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-AUTH-01** | **P1** | **Login Akun Admin Resmi**<br/>*Prasyarat:* Memiliki kredensial akun QA yang aktif.<br/>1. Buka halaman login admin.<br/>2. Masukkan email `aseppbukga@gmail.com` dan kata sandi.<br/>3. Klik tombol Masuk. | Berhasil masuk ke halaman Dashboard Admin. Tampilan admin aktif dan nama pengguna/email tampil di navigasi. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AUTH-02** | **P2** | **Penolakan Kredensial Tidak Valid**<br/>*Prasyarat:* Berada di halaman login.<br/>1. Masukkan email `aseppbukga@gmail.com` dengan kata sandi salah.<br/>2. Klik tombol Masuk. | Sistem menolak login dan menampilkan pesan peringatan ramah: *"Email atau kata sandi tidak valid"*. Tidak ada crash atau layar putih. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AUTH-03** | **P2** | **Fitur Pemulihan Kata Sandi ("Lupa Password?")**<br/>*Prasyarat:* Berada di halaman login.<br/>*Batasan Kuota:* **Lakukan MAKSIMAL 1 (SATU) KALI PERCOBAAN TERKONTROL** bila diperlukan, agar tidak memicu pembatasan laju (*rate limit*) pengiriman email Firebase Spark.<br/>1. Klik tautan "Lupa Password?".<br/>2. Masukkan email `aseppbukga@gmail.com`.<br/>3. Klik "Kirim Tautan Pemulihan" satu kali saja. | Sistem menampilkan notifikasi hijau bahwa email pemulihan telah dikirim. Tautan resmi dari Google masuk ke kotak masuk email tester. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AUTH-04** | **P1** | **Logout & Proteksi Pemutusan Sesi**<br/>*Prasyarat:* Sedang login di Portal Admin.<br/>1. Buka menu profil di kanan atas, klik "Keluar" (Logout).<br/>2. Setelah logout, tekan tombol Back peramban atau ketik langsung URL `#activities`. | Sesi langsung terputus. Sistem menolak akses halaman internal dan otomatis mengarahkan peramban kembali ke layar Login. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 2: Dashboard & Navigasi Antarmuka (DASH)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-DASH-01** | **P2** | **Navigasi Menu Utama Admin**<br/>*Prasyarat:* Login sebagai admin.<br/>1. Klik menu Sidebar berturut-turut: Dashboard, Agenda, Master Data, Laporan, Pengaturan.<br/>2. Amati pergantian halaman dan URL hash. | Setiap modul halaman berpindah secara instan tanpa memuat ulang seluruh halaman (*Single Page App*). Konten menu tampil lengkap. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-DASH-02** | **P2** | **Kartu Ringkasan Statistik Kegiatan**<br/>*Prasyarat:* Berada di Dashboard Admin.<br/>1. Periksa kartu indikator: Total Agenda, Selesai, Terjadwal, dan Dibatalkan.<br/>2. Bandingkan jumlahnya dengan data di halaman Agenda. | Angka rekapitulasi statistik cocok dengan jumlah kegiatan yang tercatat pada sistem. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-DASH-03** | **P3** | **Tampilan Pengumuman Kedinasan**<br/>*Prasyarat:* Buka Dashboard Publik dan Dashboard Admin.<br/>1. Periksa kotak Pengumuman Resmi. | Teks pengumuman kedinasan terbaca jernih, memuat tanggal rilis resmi, dan tertata rapi secara tipografi. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 3: Alur Kerja 4 Tahap Administrasi Agenda (AGENDA)

> [!NOTE]
> **TERMINOLOGI ALUR KERJA SESUAI IMPLEMENTASI SISTEM:**
> Sistem SIMAK DISKUM v5.0 membedakan antara **Status Operasional** (`SCHEDULED` / Terjadwal, `COMPLETED` / Selesai, `CANCELLED` / Dibatalkan) dan **4 Tahap Administrasi**:
> 1. `INITIAL_ENTRY` (**1. Input Awal** — Rujukan awal masuk)
> 2. `OFFLINE_PROCESS` (**2. Proses Offline** — Disposisi & koordinasi internal)
> 3. `DETAILS_COMPLETED` (**3. Detail Dilengkapi** — Peserta & catatan siap)
> 4. `ADMIN_COMPLETE` (**4. Administrasi Lengkap** — Arsip, No. Agenda & berkas tervalidasi)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-AGN-01** | **P1** | **Tahap 1: Pendaftaran Agenda (Input Awal / INITIAL_ENTRY)**<br/>*Prasyarat:* Di menu Agenda, klik "+ Tambah Jadwal Kegiatan Baru".<br/>*Langkah:*<br/>1. Judul: `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026`.<br/>2. Pilih Kategori kegiatan.<br/>3. Status: `Terjadwal (SCHEDULED)`.<br/>4. Tahap Administrasi: `1. Input Awal (INITIAL_ENTRY)`.<br/>5. Tanggal: (Misal 20/11/2026), Jam: `09.00 - 11.30 WIB`.<br/>6. Pilih Ruangan & Penyelenggara.<br/>7. Kosongkan penugasan personil dan catatan berkas.<br/>8. Klik "Simpan & Publikasikan".<br/>*Pembersihan:* Simpan agenda asli `[QA-TEST]` ini untuk dilanjutkan ke TC-AGN-02. | Agenda tersimpan dengan tahap administratif **Input Awal**. Di daftar agenda, kegiatan tampil dengan lencana tahap "Input Awal" dan status "SCHEDULED". | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AGN-02** | **P1** | **Tahap 2: Pembaruan Proses Offline & Disposisi (OFFLINE_PROCESS)**<br/>*Prasyarat:* Agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026` dari TC-AGN-01.<br/>*Langkah:*<br/>1. Buka form Edit pada agenda tersebut.<br/>2. Ubah Tahap Administrasi ke `2. Proses Offline (OFFLINE_PROCESS)`.<br/>3. Masukkan Catatan Privat: *"Surat undangan dinaikkan ke meja Kepala Dinas untuk disposisi pejabat"*. (Gunakan panel Catatan Internal).<br/>4. Klik "Simpan & Publikasikan".<br/>*Pembersihan:* Simpan agenda asli `[QA-TEST]` ini untuk dilanjutkan ke TC-AGN-03. | Tahap kegiatan terbarui menjadi **Proses Offline**. Indikator tahapan memperlihatkan langkah 2 aktif. Catatan privat tersimpan secara internal. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AGN-03** | **P1** | **Tahap 3: Pelengkap Detail & Penugasan Personil (DETAILS_COMPLETED)**<br/>*Prasyarat:* Agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026` dari TC-AGN-02.<br/>*Langkah:*<br/>1. Buka form Edit.<br/>2. Ubah Tahap Administrasi ke `3. Detail Dilengkapi (DETAILS_COMPLETED)`.<br/>3. Pilih minimal 1 Pegawai dinas di panel peserta (Dihadiri Oleh).<br/>4. Isi Catatan Publik: *"Pakaian: Batik Lengan Panjang"*. Catatan ini akan tampil ke publik.<br/>5. Klik "Simpan & Publikasikan".<br/>*Pembersihan:* Simpan agenda asli `[QA-TEST]` ini untuk dilanjutkan ke TC-AGN-04. | Tahap administrasi berstatus **Detail Dilengkapi**. Nama personil terdaftar rapi pada kolom Dihadiri Oleh. Catatan pakaian tampil di kartu pratinjau. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AGN-04** | **P1** | **Tahap 4: Administrasi Lengkap & Arsip Surat Tugas (ADMIN_COMPLETE)**<br/>*Prasyarat:* Agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026` dari TC-AGN-03.<br/>*Langkah:*<br/>1. Buka form Edit.<br/>2. Ubah Tahap Administrasi ke `4. Administrasi Lengkap (ADMIN_COMPLETE)`.<br/>3. Di panel 5 (Referensi Surat Masuk / Dokumen), isi No. Agenda: `AG/2026/XI/001`, Tanggal Surat, Perihal Surat, dan Tautan Google Drive Dokumen.<br/>4. Status Kegiatan: ubah ke `Selesai (COMPLETED)`.<br/>5. Klik "Simpan & Publikasikan".<br/>*Pembersihan:* Simpan agenda asli `[QA-TEST]` ini sebagai sumber duplikasi di TC-AGN-05. PENTING: Agenda asli ini dipertahankan hingga pembersihan akhir setelah TC-SYNC-03. | Tahap administrasi berstatus **Administrasi Lengkap**, status operasional menjadi **COMPLETED**. Dokumen referensi surat tugas terikat pada berkas kegiatan. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AGN-05** | **P2** | **Duplikasi Jadwal Kegiatan (Fitur Duplikat)**<br/>*Prasyarat:* Agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026` dari TC-AGN-04.<br/>*Langkah:*<br/>1. Di daftar agenda, klik tombol "Duplikat" pada baris agenda `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026`.<br/>2. Form edit terbuka dengan data tersalin.<br/>3. Ubah judul menjadi: `[QA-TEST] Duplikat Kegiatan Koordinasi`.<br/>4. Ubah tanggal ke hari lain.<br/>5. Klik Simpan.<br/>*Pembersihan:* Simpan agenda hasil duplikasi `[QA-TEST] Duplikat Kegiatan Koordinasi` untuk diuji pembatalannya di TC-AGN-06 dan diverifikasi di TC-SYNC-03. Agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026` juga tetap dipertahankan. | Form duplikasi terisi otomatis menyalin data master sebelumnya (kategori, lokasi, penyelenggara, peserta). Data baru tersimpan mandiri tanpa menimpa data awal. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-AGN-06** | **P1** | **Pembatalan Agenda Uji Coba (*CANCELLED Status*)**<br/>*Prasyarat:* Menggunakan agenda hasil duplikat `[QA-TEST] Duplikat Kegiatan Koordinasi` dari TC-AGN-05.<br/>*Langkah:*<br/>1. Buka form Edit pada agenda hasil duplikat `[QA-TEST] Duplikat Kegiatan Koordinasi`.<br/>2. Ubah Status Kegiatan menjadi `Dibatalkan (CANCELLED)`.<br/>3. Isi Alasan Internal: *"Disposisi dibatalkan karena bentrok arahan pimpinan"*. Isi Pemberitahuan Publik: *"Kegiatan dibatalkan dan dijadwalkan ulang"*. Klik Simpan.<br/>*Pembersihan:* **JANGAN HAPUS KEDUA AGENDA [QA-TEST] SEKARANG**. Baik agenda asli (`[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026`) maupun agenda duplikat yang dibatalkan (`[QA-TEST] Duplikat Kegiatan Koordinasi`) **wajib dipertahankan** hingga verifikasi portal publik di TC-SYNC-03 selesai dijalankan. | Status kegiatan berubah menjadi **CANCELLED**, baris tabel menampilkan lencana "Dibatalkan", berlatar merah muda lembut, dan judul tercoret. Alasan pembatalan tersimpan dengan benar. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 4: Deteksi Konflik Penjadwalan Otomatis (CONF)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-CONF-01** | **P1** | **Deteksi Bentrok Ruangan Rapat (Tumpang Tindih Waktu)**<br/>*Prasyarat:* Mengetahui ruangan dan tanggal uji.<br/>*Langkah:*<br/>1. Buat agenda `[QA-TEST] Rapat Sesi 1` pada tanggal 25/11/2026 jam `09.00 - 11.00 WIB` di `Ruang Rapat Kadis (Lantai 2)`. Simpan.<br/>2. Coba buat agenda baru `[QA-TEST] Rapat Sesi 2` di ruangan yang sama pada tanggal 25/11/2026 jam `10.00 - 12.00 WIB` (bentrok 1 jam).<br/>3. Klik Simpan.<br/>*Pembersihan:* Hapus kedua agenda `[QA-TEST]` setelah pengujian selesai. | Muncul jendela dialog peringatan bentrok (*Conflict Warning Modal*) yang secara spesifik menyebutkan nama ruangan telah dipesan oleh agenda lain pada interval waktu tersebut. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-CONF-02** | **P1** | **Deteksi Bentrok Penugasan Personil yang Sama**<br/>*Prasyarat:* Data personil pegawai terdaftar.<br/>*Langkah:*<br/>1. Buat agenda `[QA-TEST] Penugasan Sesi A` tanggal 26/11/2026 jam `13.00 - 15.00 WIB` dengan menugaskan Pegawai X.<br/>2. Coba buat agenda baru `[QA-TEST] Penugasan Sesi B` pada tanggal dan jam yang sama di lokasi berbeda dengan memilih Pegawai X yang sama.<br/>3. Klik Simpan.<br/>*Pembersihan:* Hapus kedua agenda `[QA-TEST]` setelah pengujian selesai. | Sistem mendeteksi bentrok personil dan memberikan peringatan bahwa Pegawai X telah memiliki penugasan lain pada waktu tersebut. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-CONF-03** | **P2** | **Jadwal Berurutan Diperbolehkan (*Half-Open Interval*)**<br/>*Prasyarat:* Ruangan rapat yang sama (misal `Ruang Rapat Kadis (Lantai 2)`).<br/>*Langkah:*<br/>1. Buat agenda `[QA-TEST] Agenda Berurutan Sesi 1` pada tanggal 27/11/2026 jam `08.00 - 10.00 WIB` di ruangan yang dipilih. Klik Simpan.<br/>2. Buat agenda kedua `[QA-TEST] Agenda Berurutan Sesi 2` pada tanggal 27/11/2026 jam `10.00 - 12.00 WIB` di ruangan yang sama persis. Klik Simpan.<br/>*Pembersihan:* Hapus kedua agenda `[QA-TEST] Agenda Berurutan Sesi 1` dan `[QA-TEST] Agenda Berurutan Sesi 2` setelah pengujian selesai. | Agenda kedua (`[QA-TEST] Agenda Berurutan Sesi 2`) berhasil disimpan tanpa peringatan bentrok. Sistem mendukung transisi jadwal berurutan tepat pada jam selesai acara sebelumnya (*half-open interval*). | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 5: Manajemen Data Master (MASTER)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-MST-01** | **P2** | **Manajemen Data Pegawai**<br/>*Prasyarat:* Masuk ke menu Master Data -> Tab Pegawai.<br/>*Langkah:*<br/>1. Cari pegawai berdasarkan nama atau NIP.<br/>2. Klik "+ Tambah Pegawai". Masukkan Nama: `[QA-TEST] Pegawai Simulasi`, NIP, Golongan, Jabatan, dan Bidang.<br/>3. Simpan.<br/>*Pembersihan:* Hapus pegawai `[QA-TEST]` setelah diuji. | Pegawai baru berhasil terdaftar dan langsung muncul pada pencarian serta opsi penugasan formulir agenda kegiatan. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-MST-02** | **P2** | **Manajemen Ruangan / Lokasi Rapat**<br/>*Prasyarat:* Menu Master Data -> Tab Lokasi.<br/>*Langkah:*<br/>1. Klik "+ Tambah Lokasi".<br/>2. Masukkan Nama Ruangan: `[QA-TEST] Ruang Rapat Khusus Uji`.<br/>3. Isi kapasitas dan alamat gedung. Klik Simpan.<br/>*Pembersihan:* Hapus lokasi `[QA-TEST]` setelah diuji. | Lokasi baru tersimpan dan dapat dipilih pada daftar pilihan lokasi formulir agenda. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-MST-03** | **P3** | **Manajemen Bidang Bagian & Penyelenggara**<br/>*Prasyarat:* Menu Master Data -> Tab Bidang & Tab Penyelenggara.<br/>*Langkah:*<br/>1. Periksa daftar bidang kerja dinas.<br/>2. Periksa daftar mitra penyelenggara eksternal dan gunakan fitur pencarian data. | Seluruh data bidang dinas dan mitra penyelenggara tersaji rapi, pencarian berfungsi dengan respon cepat. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-MST-04** | **P2** | **Perlindungan Integritas Data (*Referential Safeguard*) via Data Sintetis**<br/>*Prasyarat:* Pengujian referential safeguard wajib menggunakan data uji sintetis murni dan **DILARANG MENCOBA MENGHAPUS/MENONAKTIFKAN PEGAWAI ATAU LOKASI ASLI BASELINE OKTOBER 2026**.<br/>*Langkah 1 (Buat Data Master & Agenda Pengikat Sintetis):*<br/>1. Di Master Data -> Lokasi, klik "+ Tambah Lokasi". Buat lokasi sintetis baru: `[QA-TEST] Ruang Simulasi Proteksi`. Klik Simpan.<br/>2. Di menu Agenda, klik "+ Tambah Jadwal Kegiatan Baru". Buat agenda baru: `[QA-TEST] Agenda Uji Proteksi Lokasi` pada tanggal 28/11/2026 dan pilih ruangan `[QA-TEST] Ruang Simulasi Proteksi`. Klik Simpan.<br/>*Langkah 2 (Uji Pencegahan Penghapusan):*<br/>3. Buka menu Master Data -> Lokasi, cari `[QA-TEST] Ruang Simulasi Proteksi`, lalu klik tombol Hapus/Nonaktifkan.<br/>*Langkah 3 (Verifikasi Safeguard):*<br/>4. Amati respon pencegahan sistem.<br/>*Urutan Pembersihan Ketergantungan (Dependency Cleanup Order):*<br/>1. Buka menu Agenda: Hapus terlebih dahulu agenda pengikat `[QA-TEST] Agenda Uji Proteksi Lokasi`, lalu konfirmasi.<br/>2. Buka Master Data -> Lokasi: Baru setelah itu hapus lokasi sintetis `[QA-TEST] Ruang Simulasi Proteksi`.<br/>*(Dengan urutan ini, seluruh 38 kegiatan dan master data baseline Oktober 2026 tetap 100% terlindungi).* | Langkah 2 & 3: Sistem mendeteksi bahwa lokasi sedang dirujuk oleh agenda aktif, menolak penghapusan/penonaktifan, dan menampilkan dialog/notifikasi proteksi referensial (*Referential Safeguard*). Data tidak terhapus.<br/>Pembersihan: Setelah agenda pengikat dihapus, data master sintetis dapat dihapus bersih. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 6: Paritas Data & Privasi Portal Publik vs Admin (SYNC)

> [!CAUTION]
> **PENTING: DISTINGSI ANTARA PENUTUPAN LAPISAN TAMPILAN (UI) VS KEAMANAN JARINGAN & BASIS DATA:**
> Memastikan catatan privat atau dokumen sensitif tidak terlihat pada antarmuka visual portal publik (*UI presentation layer*) adalah pengujian kosmetik tampilan sisi peramban.
> - **Evaluasi Penguji Manual (TC-SYNC-02):** Memverifikasi bahwa antarmuka publik secara visual tidak menampilkan catatan privat atau tautan rapat rahasia kepada pengunjung umum.
> - **Batas Pengujian UI & Proyeksi Sisi Klien:** Ketiadaan elemen pada layar atau lolosnya unit test fungsi DTO sisi klien (`publicProjector.test.ts`) **TIDAK SAMA DENGAN dan TIDAK MEMBUKTIKAN keamanan data basis data**. Apabila peramban publik mengunduh seluruh dokumen mentah dari Firestore melalui jaringan, pengguna umum dapat membuka Chrome DevTools (Tab Network / Console) untuk membaca atribut privat tersebut.
> - **Kewajiban Pengembang:** Pembuktian keamanan hakiki mewajibkan tim pengembang melakukan audit transmisi muatan jaringan (*wire payload*) dan verifikasi aturan otorisasi dokumen Cloud Firestore secara terpisah dari tampilan UI.

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-SYNC-01** | **P1** | **Konsistensi Data Lintas Portal Publik vs Admin**<br/>*Prasyarat:* Buka Portal Admin dan Portal Publik berdampingan.<br/>*Langkah:*<br/>1. Pilih 3 kegiatan acak pada tanggal 30 Oktober 2026.<br/>2. Periksa Judul Kegiatan, Tanggal, Pukul (WIB), Lokasi Ruangan, dan Penyelenggara di kedua portal. | Seluruh data publik yang ditampilkan di Portal Publik cocok 100% dengan data yang tercantum pada Portal Admin. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-SYNC-02** | **P1** | **Sanitasi Data Sensitif (Pencegahan Bocor Catatan Privat pada Tampilan Publik)**<br/>*Prasyarat:* Buat agenda baru `[QA-TEST] Kegiatan Uji Privasi`.<br/>*Langkah:*<br/>1. Pada Admin, isi Catatan Publik: *"Pakaian Dinas Harian"*. Isi Catatan Privat: *"CATATAN RAHASIA INTERNAL DISKUM: Password Zoom 123456"*. Isi Tautan Rapat Internal.<br/>2. Simpan.<br/>3. Buka detail kegiatan tersebut di Portal Publik.<br/>*Pembersihan:* Hapus agenda `[QA-TEST]` setelah selesai. | Di Portal Publik: Judul dan Catatan Publik tampil normal, tetapi Catatan Privat dan Kredensial Rapat **SAMA SEKALI TIDAK TAMPIL** pada antarmuka publik. *(Catatan: Pengujian ini memvalidasi lapisan tampilan UI; pembuktian ketiadaan field pada payload jaringan Firestore diverifikasi secara terpisah oleh pengembang).* | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-SYNC-03** | **P2** | **Visibilitas Agenda Dibatalkan di Portal Publik & Pembersihan Akhir Rantai Agenda**<br/>*Prasyarat:* Agenda hasil duplikat `[QA-TEST] Duplikat Kegiatan Koordinasi` yang dibatalkan pada TC-AGN-06 dan agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026` dari TC-AGN-04.<br/>*Langkah Verifikasi:*<br/>1. Buka Portal Publik pada tanggal agenda yang dibatalkan.<br/>2. Periksa tampilan kartu dan modal detail kegiatan.<br/>*Prosedur Pembersihan Akhir Rantai Agenda (Final Cleanup):*<br/>Setelah verifikasi selesai, masuk kembali ke Portal Admin -> menu Agenda untuk membersihkan kedua data uji:<br/>1. Klik tombol "Hapus" pada baris agenda `[QA-TEST] Duplikat Kegiatan Koordinasi`, lalu konfirmasi dialog.<br/>2. Klik tombol "Hapus" pada baris agenda asli `[QA-TEST] Sosialisasi Akselerasi Koperasi Batam 2026`, lalu konfirmasi dialog.<br/>3. Pastikan ke-38 agenda baseline Oktober 2026 tetap utuh 100% dan kedua agenda uji telah terhapus bersih. | Verifikasi: Agenda yang dibatalkan tampil di Portal Publik dengan lencana jelas "Dibatalkan" dan teks dicoret, disertai pemberitahuan pembatalan resmi.<br/>Pembersihan: Kedua agenda uji sintetis ([QA-TEST] asli dan duplikat) berhasil dihapus bersih tanpa memengaruhi atau merusak 38 agenda baseline. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 7: Responsivitas Mobile & Multi-Viewport (MOBI)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-MOB-01** | **P1** | **Reflow Kartu Agenda Mobile Admin (<768px)**<br/>*Prasyarat:* Buka Portal Admin di ponsel fisik atau Chrome Device Toolbar (375px/390px).<br/>*Langkah:*<br/>1. Buka menu Agenda di smartphone.<br/>2. Amati susunan tampilan kegiatan. | Tabel lebar desktop otomatis berganti menjadi kartu-kartu kegiatan vertikal (*mobile cards*) yang rapi, memuat judul, tanggal Indonesia, waktu, status, dan tahap administrasi. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-MOB-02** | **P1** | **Aksesibilitas Tombol Aksi Sentuh (Touch Target ≥44px)**<br/>*Prasyarat:* Tampilan mobile kartu agenda Admin.<br/>*Langkah:*<br/>1. Uji penekanan tombol "Edit", "Duplikat", dan "Hapus" menggunakan jari tangan pada ponsel. | Tombol berukuran minimal 44 × 44 px, memiliki jarak jeda sentuhan yang nyaman, dan tidak memicu ketidaksengajaan klik tombol di sampingnya. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-MOB-03** | **P1** | **Uji Bebas Geser Samping (*Zero Horizontal Overflow*)**<br/>*Prasyarat:* Perangkat gawai 320px, 375px, 390px, dan 425px.<br/>*Langkah:*<br/>1. Akses Portal Publik dan Admin.<br/>2. Usap layar ke kanan dan ke kiri pada seluruh halaman (Dashboard, Agenda, Kalender, Laporan). | Lebar halaman terkunci pas 100% pada batas layar ponsel. **Tidak ada scroll horizontal atau elemen yang terpotong ke samping**. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-MOB-04** | **P2** | **Tampilan Kalender & Cari Agenda Mobile Publik**<br/>*Prasyarat:* Portal Publik pada layar smartphone.<br/>*Langkah:*<br/>1. Buka Kalender dan fitur Cari Agenda.<br/>2. Masukkan tanggal pencarian dengan format `dd/mm/yyyy`. | Filter tanggal otomatis memformat tanda garis miring (`/`), kartu agenda tersusun rapi satu kolom ke bawah dengan tombol aksi yang mudah diakses. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 8: Format Ekspor Jadwal Resmi 8 Kolom (EXPR)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-EXP-01** | **P1** | **Unduh Berkas Excel Resmi (`.xlsx`) via ExcelJS**<br/>*Prasyarat:* Menu Laporan di Portal Admin.<br/>*Langkah:*<br/>1. Pilih rentang tanggal bulan Oktober 2026.<br/>2. Klik tombol "Unduh Excel".<br/>3. Buka berkas `.xlsx` hasil unduhan di Microsoft Excel. | Berkas Excel terbuka sempurna. Berisi 8 kolom standar (No, Hari/Tanggal, Pukul, Kegiatan, Tempat, Penyelenggara, Dihadiri Oleh, Keterangan), header berwarna biru tua resmi, dan tanda air staging. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-EXP-02** | **P2** | **Unduh Berkas Gambar Jadwal (`.png` / `.jpg`)**<br/>*Prasyarat:* Menu Laporan di Portal Admin.<br/>*Langkah:*<br/>1. Klik tombol "Unduh PNG" atau "Unduh JPG".<br/>2. Buka gambar hasil unduhan. | Berkas gambar berkualitas tajam, teks tabel tidak buram, memuat 8 kolom resmi dan siap dibagikan ke kanal informasi kedinasan. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-EXP-03** | **P1** | **Cetak PDF A4 Landscape Standar S04 (3 Halaman Baseline)**<br/>*Prasyarat:* Menu Laporan Admin.<br/>*Kriteria Cetak:* **Ekspektasi tepat 3 halaman berlaku khusus untuk 38 kegiatan baseline Oktober 2026** pada ukuran A4 Landscape dan margin default.<br/>*Langkah:*<br/>1. Set tanggal: `01/10/2026` s.d. `31/10/2026` (38 kegiatan baseline).<br/>2. Klik tombol "Cetak" -> pilih "Save as PDF" / Simpan PDF.<br/>3. Pastikan ukuran `A4` dan orientasi `Landscape`.<br/>4. Periksa hasil PDF. | Dokumen PDF terdiri dari **TEPAT 3 HALAMAN**. Header tabel berulang di halaman 1, 2, dan 3. Nomor halaman tunggal ("Halaman X dari 3"). Nama ruangan/penyelenggara resmi tanpa ID teknis database (`loc_syn`). | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

### Kategori 9: Validasi Input, Error Handling & Batas Akses (VALD)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti & Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-VAL-01** | **P2** | **Pencegahan Rentang Tanggal Terbalik**<br/>*Prasyarat:* Filter tanggal di Laporan atau Pencarian Agenda.<br/>*Langkah:*<br/>1. Masukkan Tanggal Mulai: `30/10/2026` dan Tanggal Akhir: `01/10/2026` (terbalik).<br/>2. Klik tombol terapkan filter. | Sistem menolak pencarian dan menampilkan peringatan validasi bahwa tanggal akhir tidak boleh lebih awal dari tanggal mulai. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-VAL-02** | **P2** | **Validasi Format Tanggal Indonesia & Tahun Kabisat**<br/>*Prasyarat:* Formulir input tanggal kegiatan.<br/>*Langkah:*<br/>1. Masukkan tanggal tidak valid (misal `30/02/2026` atau tanggal tidak lengkap).<br/>2. Amati respon formulir. | Sistem memvalidasi tanggal kalender sebenarnya, menolak tanggal yang tidak ada dalam kalender, dan memandu format `dd/mm/yyyy`. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |
| **TC-VAL-03** | **P1** | **Uji Penolakan Akses Tanpa Sesi Login (Manual Tester)**<br/>*Prasyarat:* Peramban mode penyamaran (*Incognito Window* / Jendela Pribadi) tanpa login.<br/>*Langkah:*<br/>1. Buka jendela Incognito baru.<br/>2. Ketik langsung URL modul admin: `https://simakdiskum-staging-admin.web.app/#activities`.<br/>3. Coba akses juga URL `#master-data` dan `#reports`. | Sistem segera mendeteksi ketiadaan sesi otentikasi admin, memblokir perenderan data internal, dan mengalihkan layar ke halaman login. | `[ ] PASS`<br/>`[ ] FAIL`<br/>`[ ] BLOCKED`<br/>`[ ] NOT TESTED` | Tangkapan Layar / Catatan: |

---

## 🛡️ Prosedur Verifikasi Keamanan Sisi Pengembang (Developer Technical Verification)

> [!NOTE]
> Prosedur teknis di bawah ini dijalankan secara mandiri oleh **Tim Pengembang (Developer)** menggunakan automated test suite, verifikasi aturan keamanan (*security rules*), dan inspeksi protokol jaringan (*network packet inspection*). Prosedur ini **BUKAN** merupakan tugas pengujian manual tester Asep.

1. **Distingsi Arsitektur: Keamanan Akses Jaringan/Firestore vs Penutupan Lapisan Tampilan (UI):**
   - **Batasan Uji Proyeksi Klien:** Unit test transformasi DTO sisi klien (`publicProjector.test.ts`) hanya memverifikasi logika bahwa kode JavaScript internal menyaring atribut tertentu sebelum diserahkan ke komponen visual DOM. Pengujian unit DTO sisi klien **TIDAK BOLEH DIKLAIM** sebagai bukti keamanan data basis data atau isolasi jaringan, karena transformasi tersebut terjadi *setelah* peramban menerima muatan data dari server.
   - **Kriteria Pembuktian Otoritatif:** Keamanan data privat publik harus dijamin pada **tingkat otorisasi dokumen Cloud Firestore dan muatan transmisi jaringan aktual (*wire-level payload*)** yang dapat diakses oleh peramban pengguna tanpa autentikasi.

2. **Penolakan Mutasi & Akses Dokumen Administratif Tanpa Autentikasi (Firestore Security Rules):**
   - Dijalankan via test suite otomatis (`tests/unit/rulesSourceVerification.test.ts` dan automated Firestore Rules testing dengan `@firebase/rules-unit-testing`).
   - Memverifikasi secara matematis bahwa setiap permintaan mutasi tulis (*create, update, delete*) ke koleksi `activities` atau koleksi `master_*` tanpa token JWT admin yang valid akan ditolak secara mutlak oleh *Cloud Firestore Security Rules* dengan kode status `PERMISSION_DENIED`.
   - Memastikan dokumen dan subkoleksi privat yang diperuntukkan bagi admin tidak dapat dibaca oleh koneksi tanpa sesi autentikasi.

3. **Audit Transmisi Muatan Jaringan (Wire Payload) & Data Firestore Tanpa Sesi Login:**
   - Tim pengembang membuka Portal Publik di jendela peramban anonim (*unauthenticated browser*), membuka Chrome Developer Tools -> Tab *Network* (filter `WS` / Firestore *Listen* / REST queries), dan menginspeksi muatan dokumen mentah yang dikirim oleh server Firestore.
   - Mengaudit secara faktual apakah data dokumen yang tiba di peramban publik mengandung atribut privat (`privateNotes`, `internalMeetingUrl`, `referenceDocuments`, dll.) atau apakah data tersebut dibatasi pada tingkat koleksi/arsitektur backend.
   - Setiap kemunculan atribut privat pada payload jaringan mentah wajib diklasifikasikan sebagai temuan celah keamanan transmisi, dan tidak boleh dianggap aman hanya karena antarmuka visual UI menyembunyikan tampilannya dari pengguna.

---

## 📝 Formulir Rekam Hasil Pengujian (Reusable Result Template)

Penguji dapat menyalin template tabel di bawah ini untuk melaporkan temuan harian atau rekapitulasi akhir evaluasi:

```markdown
# Laporan Hasil Evaluasi Fungsional QA — SIMAK DISKUM v5.0 (Milestone S05)

- **Tanggal Pengujian:** [ Tanggal Pelaksanaan ]
- **Nama Penguji:** Asep (QA Lead)
- **Perangkat Desktop / Browser:** [ Contoh: Windows 11 / Google Chrome 130 ]
- **Perangkat Ponsel (Mobile):** [ Contoh: iPhone 13 (Safari iOS 17) / Samsung Galaxy (Chrome) ]
- **Total Skenario Diuji:** 33 Skenario

### Rekapitulasi Status Uji
- **PASS (Lolos):** [ Jumlah ] / 33
- **FAIL (Gagal / Temuan Defek):** [ Jumlah ] / 33
- **BLOCKED (Terhambat):** [ Jumlah ] / 33
- **NOT TESTED (Belum Diuji):** [ Jumlah ] / 33

---

### Rincian Temuan Defek (Bila Ada)
| No | ID Uji | Komponen / Halaman | Deskripsi Masalah yang Ditemukan | Tingkat Keparahan (Tinggi / Sedang / Rendah) | Tangkapan Layar / Bukti |
|:---:|:---:|:---|:---|:---:|:---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

### Kesimpulan & Rekomendasi Penguji:
[ Tuliskan kesimpulan umum mengenai kemudahan penggunaan, kestabilan antarmuka, dan kesiapan sistem sebelum rilis produksi ]
```

---

<div align="center">
  <sub>SIMAK DISKUM v5.0 — Dokumen Panduan & Daftar Periksa Evaluasi Fungsional QA Eksternal (Milestone S05 - 33 Skenario Uji).</sub>
</div>
