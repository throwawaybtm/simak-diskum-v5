# SIMAK DISKUM v5.0 — Milestone S05 External Functional QA Checklist & Tester Guide

**Sistem:** SIMAK DISKUM v5.0 (Sistem Informasi Manajemen Agenda Kedinasan)  
**Klien:** Dinas Koperasi dan Usaha Mikro Kota Batam  
**Lingkungan Evaluasi:** Cloud Staging (`simakdiskum-staging`)  
**Target Penguji (QA Lead):** Asep (`aseppbukga@gmail.com`)  
**Tujuan Dokumen:** Panduan pengujian fungsional manual mandiri, daftar periksa skenario penerimaan (*acceptance checklist*), dan formulir rekam hasil uji pra-rilis.

---

## 📌 Ringkasan Status Pra-Pengujian (Preflight Status)

| Komponen | Status Verifikasi | Keterangan Teknis |
|:---|:---:|:---|
| **Portal Publik Staging** | **AKTIF (HTTP 200)** | [https://simakdiskum-staging.web.app](https://simakdiskum-staging.web.app) |
| **Portal Admin Staging** | **AKTIF (HTTP 200)** | [https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app) |
| **Akun QA Tester (Asep)** | **TERVERIFIKASI & AKTIF** | Email: `aseppbukga@gmail.com`<br/>Peran Aplikasi: `role: admin`<br/>Status Akun: `disabled: false`, `emailVerified: true`<br/>Kredensial: Dikelola privat oleh penguji (tanpa kebocoran kredensial) |
| **Lingkungan Produksi** | **TERISOLASI 100%** | Proyek `simakdiskum` terlindungi penuh (0 deployment, 0 mutasi data) |

---

## 📖 Panduan Penguji (Tester Guide untuk Non-Developer)

Selamat datang di pengujian fungsional **SIMAK DISKUM v5.0**. Panduan ini disusun agar proses pengujian berjalan sistematis, aman, dan mudah dipahami.

### 1. Prinsip Utama Pengujian
1. **Gunakan Data Simulasi / Sintetik Saja:** Jangan memasukkan nomor identitas asli, NIK/NIP asli pejabat, atau nomor dokumen rahasia kedinasan ke dalam sistem staging.
2. **Koneksi Internet Stabil:** Sistem berjalan secara *cloud serverless* terhubung ke Firebase Staging.
3. **Dokumentasikan Bukti (*Evidence*):** Ambil tangkapan layar (*screenshot*) jika menemukan kejanggalan antarmuka, pesan galat (*error*), atau perilaku yang tidak sesuai.
4. **Format Status Pengujian:**
   - **`PASS`**: Fitur berjalan persis sesuai hasil yang diharapkan.
   - **`FAIL`**: Terjadi kesalahan, salah hitung, data hilang, tampilan rusak, atau fitur tidak berfungsi.
   - **`BLOCKED`**: Pengujian tidak dapat dilanjutkan karena terhambat oleh fitur lain yang gagal.
   - **`NOT TESTED`**: Skenario belum diuji.

### 2. Cara Masuk ke Portal Admin Staging
1. Buka peramban (*browser*) Google Chrome atau Microsoft Edge.
2. Akses alamat: **[https://simakdiskum-staging-admin.web.app](https://simakdiskum-staging-admin.web.app)**.
3. Masukkan email tester Anda: `aseppbukga@gmail.com` dan kata sandi yang telah Anda atur.
4. Klik tombol **"Masuk ke Portal Admin"**.
5. Jika berhasil, Anda akan diarahkan ke Dashboard Manajemen Agenda Kedinasan.

---

## 📋 Daftar Periksa Pengujian Manual (30 Skenario Uji)

### Kategori 1: Autentikasi, Keamanan Sesi & Pemulihan Akses (AUTH)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-AUTH-01** | **P1** | **Login Akun Admin Resmi**<br/>1. Buka halaman login admin.<br/>2. Masukkan email `aseppbukga@gmail.com` dan kata sandi yang valid.<br/>3. Klik Masuk. | Berhasil masuk ke halaman Dashboard Admin. Nama pengguna/email muncul di header pojok kanan atas. | `[ PASS / FAIL ]` | |
| **TC-AUTH-02** | **P2** | **Penolakan Kredensial Salah**<br/>1. Di halaman login, masukkan email yang benar namun password sembarang (salah).<br/>2. Klik Masuk. | Sistem menolak login dan menampilkan pesan peringatan ramah: *"Email atau kata sandi tidak valid"*. Tidak ada crash. | `[ PASS / FAIL ]` | |
| **TC-AUTH-03** | **P2** | **Fitur Pemulihan Kata Sandi (Lupa Password)**<br/>1. Di halaman login, klik "Lupa Password?".<br/>2. Masukkan email terdaftar.<br/>3. Klik "Kirim Tautan Pemulihan". | Muncul konfirmasi bahwa tautan pemulihan telah dikirimkan ke kotak masuk email. | `[ PASS / FAIL ]` | |
| **TC-AUTH-04** | **P1** | **Logout & Proteksi Sesi**<br/>1. Klik menu Profil di pojok kanan atas -> pilih "Keluar" (Logout).<br/>2. Setelah keluar, coba tekan tombol "Back" pada browser atau ketik langsung URL `#activities`. | Sesi berakhir seketika. Sistem otomatis mengarahkan kembali ke halaman Login dan menolak akses ke data admin. | `[ PASS / FAIL ]` | |

---

### Kategori 2: Dashboard & Navigasi Antarmuka (DASH)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-DASH-01** | **P2** | **Navigasi Menu Utama Admin**<br/>1. Klik menu Sidebar: Dashboard, Agenda, Master Data, Laporan, Pengaturan.<br/>2. Perhatikan kecepatan respon dan konsistensi URL hash. | Setiap halaman terbuka cepat, konten berganti sesuai menu yang dipilih tanpa halaman kosong (*blank page*). | `[ PASS / FAIL ]` | |
| **TC-DASH-02** | **P2** | **Kartu Ringkasan Statistik Kegiatan**<br/>1. Amati kartu statistik di Dashboard: Total Agenda, Selesai, Penugasan, Entry Awal.<br/>2. Cocokkan angka ringkasan dengan daftar agenda. | Angka statistik sesuai dengan jumlah riil data kegiatan yang terdaftar pada bulan berjalan. | `[ PASS / FAIL ]` | |
| **TC-DASH-03** | **P3** | **Tampilan Pengumuman Kedinasan**<br/>1. Periksa bagian Pengumuman Resmi pada Dashboard Publik dan Admin. | Teks pengumuman kedinasan terbaca jelas, memiliki tanggal publikasi resmi, dan rapi secara visual. | `[ PASS / FAIL ]` | |

---

### Kategori 3: Alur Kerja 4 Tahap Administrasi Agenda (AGENDA)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-AGN-01** | **P1** | **Tahap 1: Pendaftaran Agenda (Entry Awal)**<br/>1. Buka menu Agenda -> Klik "+ Tambah Agenda".<br/>2. Isi Judul: `Sosialisasi Koperasi Berprestasi 2026`.<br/>3. Pilih Tanggal: (Misal: 15/11/2026), Jam: `09.00 - 11.30 WIB`.<br/>4. Pilih Ruangan & Penyelenggara.<br/>5. Kosongkan penugasan pejabat terlebih dahulu.<br/>6. Klik Simpan. | Agenda tersimpan dengan status administratif **Entry Awal**. Muncul di daftar agenda dengan label status yang sesuai. | `[ PASS / FAIL ]` | |
| **TC-AGN-02** | **P1** | **Tahap 2: Penugasan Pejabat / Staf**<br/>1. Buka agenda yang dibuat pada TC-AGN-01 -> Klik Edit.<br/>2. Ubah tahap menjadi **Penugasan**.<br/>3. Pilih 1 Pejabat dan 1 Staf pendamping.<br/>4. Klik Simpan. | Status berubah menjadi **Penugasan**. Nama-nama personil yang ditugaskan tampil rapi di kolom "Dihadiri Oleh". | `[ PASS / FAIL ]` | |
| **TC-AGN-03** | **P1** | **Tahap 3: Penyelesaian Kegiatan & Nomor Surat Tugas**<br/>1. Buka agenda -> Ubah tahap ke **Selesai / Surat Tugas**.<br/>2. Masukkan Nomor Surat Tugas: `090/DISKUM/ST/XI/2026`.<br/>3. Klik Simpan. | Status berubah menjadi **Selesai**. Nomor surat tugas terikat pada data administratif kegiatan. | `[ PASS / FAIL ]` | |
| **TC-AGN-04** | **P1** | **Tahap 4: Pembatalan Agenda Resmi**<br/>1. Buat agenda uji coba baru atau pilih agenda yang ada.<br/>2. Klik batalkan agenda -> Masukkan alasan: *"Kegiatan ditunda sesuai arahan pimpinan"*. | Agenda berubah status menjadi **Dibatalkan**. Baris kegiatan diwarnai latar merah muda lembut dan teks tercoret rapi. | `[ PASS / FAIL ]` | |
| **TC-AGN-05** | **P2** | **Fitur Duplikasi Agenda**<br/>1. Pada baris agenda, klik tombol "Duplikat".<br/>2. Periksa isian form yang muncul. | Form tambah agenda terisi otomatis menyalin data agenda sebelumnya (judul, lokasi, penyelenggara), siap diedit tanggal barunya. | `[ PASS / FAIL ]` | |
| **TC-AGN-06** | **P2** | **Penghapusan Agenda (Soft Delete)**<br/>1. Pada agenda uji coba, klik tombol "Hapus" (ikon tempat sampah).<br/>2. Konfirmasi penghapusan pada dialog yang muncul. | Agenda berhasil dihapus dari daftar aktif tanpa menyebabkan kesalahan sistem atau kerusakan tabel. | `[ PASS / FAIL ]` | |

---

### Kategori 4: Deteksi Konflik Penjadwalan Otomatis (CONF)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-CONF-01** | **P1** | **Deteksi Bentrok Ruangan Rapat**<br/>1. Buat Agenda A di `Ruang Rapat Kadis (Lantai 2)` pada tanggal X pukul `09.00 - 11.00 WIB`.<br/>2. Coba buat Agenda B di ruangan yang sama pada tanggal X pukul `10.00 - 12.00 WIB`.<br/>3. Klik Simpan. | Muncul jendela peringatan (*Conflict Warning Modal*) yang memberitahukan bahwa ruangan telah dipesan oleh Agenda A. | `[ PASS / FAIL ]` | |
| **TC-CONF-02** | **P1** | **Deteksi Bentrok Penugasan Personil**<br/>1. Buat Agenda A pada tanggal X jam `13.00 - 15.00 WIB` dengan menugaskan Pejabat Y.<br/>2. Coba buat Agenda B pada jam yang sama di lokasi berbeda dengan menugaskan Pejabat Y yang sama. | Sistem mendeteksi bentrok jadwal personil dan memberikan peringatan nama personil yang telah memiliki agenda lain. | `[ PASS / FAIL ]` | |
| **TC-CONF-03** | **P2** | **Penerimaan Jadwal Berurutan (Non-Bentrok)**<br/>1. Buat Agenda A jam `08.00 - 10.00 WIB`.<br/>2. Buat Agenda B di lokasi/ruang yang sama jam `10.00 - 12.00 WIB`. | Sistem memperbolehkan penyimpanan tanpa peringatan bentrok (logika *half-open interval* jam 10.00 tepat pergantian). | `[ PASS / FAIL ]` | |

---

### Kategori 5: Manajemen Data Master (MASTER)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-MST-01** | **P2** | **Manajemen Data Pegawai**<br/>1. Buka menu Master Data -> Tab Pegawai.<br/>2. Cari pegawai berdasarkan nama.<br/>3. Tambah data pegawai simulasi baru: Nama, NIP, Golongan, Jabatan, Bidang. | Data tersimpan dan langsung muncul pada pencarian serta opsi pemilihan personil agenda. | `[ PASS / FAIL ]` | |
| **TC-MST-02** | **P2** | **Manajemen Data Ruangan / Lokasi**<br/>1. Buka Tab Lokasi Ruangan.<br/>2. Tambah lokasi baru: `Ruang Konsultasi PLUT`. | Lokasi baru tersimpan dan dapat dipilih pada saat pembuatan agenda kegiatan. | `[ PASS / FAIL ]` | |
| **TC-MST-03** | **P3** | **Manajemen Bidang & Penyelenggara**<br/>1. Periksa tab Bidang Bagian dan tab Penyelenggara Eksternal.<br/>2. Lakukan penyaringan data. | Daftar bidang dan mitra penyelenggara tersaji lengkap dan akurat. | `[ PASS / FAIL ]` | |
| **TC-MST-04** | **P2** | **Perlindungan Integritas Referensial (*Referential Safeguard*)**<br/>1. Coba hapus/nonaktifkan ruangan atau pegawai yang saat ini sedang digunakan oleh agenda aktif. | Sistem menolak penghapusan dan memberikan penjelasan bahwa data masih terikat pada agenda aktif. | `[ PASS / FAIL ]` | |

---

### Kategori 6: Paritas Data & Privasi Portal Publik vs Admin (SYNC)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-SYNC-01** | **P1** | **Konsistensi Data Lintas Portal**<br/>1. Buat/perbarui agenda di Portal Admin.<br/>2. Buka Portal Publik ([https://simakdiskum-staging.web.app](https://simakdiskum-staging.web.app)).<br/>3. Cek judul, tanggal, jam, dan lokasi kegiatan. | Informasi kegiatan di Portal Publik sama persis dengan yang dimasukkan di Portal Admin. | `[ PASS / FAIL ]` | |
| **TC-SYNC-02** | **P1** | **Sanitasi Data Sensitif (Privasi Publik)**<br/>1. Pada Admin, masukkan Catatan Privat (*Private Notes*) berisi catatan internal atau tautan rapat khusus.<br/>2. Simpan.<br/>3. Buka detail agenda di Portal Publik. | Catatan privat dan nomor surat rahasia **SAMA SEKALI TIDAK TAMPIL** di Portal Publik (*Strict Data Sanitization*). | `[ PASS / FAIL ]` | |
| **TC-SYNC-03** | **P2** | **Visibilitas Agenda Dibatalkan di Publik**<br/>1. Batalkan salah satu agenda di Admin.<br/>2. Periksa tampilan agenda tersebut di Portal Publik. | Agenda tampil dengan penanda jelas bahwa kegiatan telah dibatalkan, menghindari kesalahpahaman publik. | `[ PASS / FAIL ]` | |

---

### Kategori 7: Responsivitas Mobile & Multi-Viewport (MOBI)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-MOB-01** | **P1** | **Tampilan Kartu Mobile Admin (<768px)**<br/>1. Buka Portal Admin di smartphone (atau mode Device Emulation Chrome ukuran 375px/390px).<br/>2. Buka menu Agenda. | Tabel desktop otomatis berganti menjadi kartu-kartu kegiatan vertikal yang rapi dan mudah dibaca. | `[ PASS / FAIL ]` | |
| **TC-MOB-02** | **P1** | **Ukuran Sentuhan Tombol Aksi Mobile**<br/>1. Uji tombol "Edit", "Duplikat", dan "Hapus" pada layar sentuh smartphone. | Tombol mudah disentuh jari (memenuhi standar target sentuh minimal 44 × 44 px) tanpa salah pencet tombol di sebelahnya. | `[ PASS / FAIL ]` | |
| **TC-MOB-03** | **P1** | **Uji Bebas Geser Samping (Zero Horizontal Overflow)**<br/>1. Buka Portal Publik dan Admin di layar 320px, 375px, dan 390px.<br/>2. Coba geser layar ke kanan dan ke kiri. | Halaman terkunci pas dengan lebar layar ponsel. **Tidak ada ruang kosong samping atau scroll horizontal yang patah**. | `[ PASS / FAIL ]` | |
| **TC-MOB-04** | **P2** | **Tampilan Kalender & Cari Agenda Mobile Publik**<br/>1. Buka Portal Publik di ponsel.<br/>2. Buka Kalender dan fitur Cari Agenda.<br/>3. Masukkan filter tanggal dengan format `dd/mm/yyyy`. | Filter tanggal otomatis memformat tanda garis miring (`/`), kartu agenda tersusun rapi satu kolom ke bawah. | `[ PASS / FAIL ]` | |

---

### Kategori 8: Format Ekspor Jadwal Resmi 8 Kolom (EXPR)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-EXP-01** | **P1** | **Unduh Berkas Excel Resmi (`.xlsx`)**<br/>1. Buka menu Laporan di Admin.<br/>2. Pilih rentang tanggal Oktober 2026.<br/>3. Klik tombol "Unduh Excel".<br/>4. Buka berkas yang terunduh di Microsoft Excel. | Berkas `.xlsx` asli terbuka normal. Terdiri dari 8 kolom resmi dengan penataan judul, watermark staging, dan lebar kolom pas. | `[ PASS / FAIL ]` | |
| **TC-EXP-02** | **P2** | **Unduh Berkas Gambar Jadwal (`.png` / `.jpg`)**<br/>1. Di menu Laporan, klik "Unduh PNG" atau "Unduh JPG".<br/>2. Buka gambar hasil unduhan. | Gambar rekapitulasi jadwal berkualitas tajam, teks terbaca jelas, dan siap dipublikasikan ke media sosial/grup kedinasan. | `[ PASS / FAIL ]` | |
| **TC-EXP-03** | **P1** | **Cetak Dokumen PDF Landscape A4 (Standar S04)**<br/>1. Di menu Laporan, klik tombol "Cetak".<br/>2. Pada jendela cetak peramban, pilih "Save as PDF" / Simpan sebagai PDF.<br/>3. Pastikan orientasi A4 Landscape.<br/>4. Periksa hasil PDF 38 kegiatan. | PDF terdiri dari **tepat 3 halaman**. Header tabel berulang di halaman 1, 2, dan 3. Nomor halaman tunggal ("Halaman X dari 3"). Nama ruangan/penyelenggara resmi tanpa ID teknis (`loc_syn`). | `[ PASS / FAIL ]` | |

---

### Kategori 9: Validasi Input, Error Handling & Batas Akses (VALD)

| ID Uji | Prioritas | Skenario & Langkah Pengujian | Hasil yang Diharapkan | Status | Bukti / Catatan |
|:---:|:---:|:---|:---|:---:|:---|
| **TC-VAL-01** | **P2** | **Pencegahan Tanggal Terbalik**<br/>1. Di filter laporan, masukkan tanggal mulai: `30/10/2026` dan tanggal akhir: `01/10/2026`.<br/>2. Coba klik terapkan. | Sistem menolak input dan memberi peringatan bahwa tanggal akhir tidak boleh lebih awal dari tanggal mulai. | `[ PASS / FAIL ]` | |
| **TC-VAL-02** | **P2** | **Validasi Format Tanggal Indonesia**<br/>1. Ketik tanggal pada form dengan format tidak lengkap atau tahun fiktif.<br/>2. Periksa respon formulir. | Sistem memandu format `dd/mm/yyyy`, memvalidasi jumlah hari kabisat Februari, dan mencegah entri rusak. | `[ PASS / FAIL ]` | |
| **TC-VAL-03** | **P1** | **Keamanan Tingkat Basis Data (Firestore Rules)**<br/>1. Coba lakukan penulisan data tanpa login ke sesi admin resmi (akses publik). | Seluruh mutasi tulis ditolak oleh Firestore Security Rules. Data kedinasan tidak dapat dimanipulasi dari luar. | `[ PASS / FAIL ]` | |

---

## 📝 Formulir Rekam Hasil Pengujian (Reusable Result Template)

Penguji dapat menyalin template tabel di bawah ini untuk melaporkan temuan harian atau rekapitulasi akhir evaluasi:

```markdown
# Laporan Hasil Evaluasi Fungsional QA — SIMAK DISKUM v5.0 (Milestone S05)

- **Tanggal Pengujian:** [ Tanggal Pelaksanaan ]
- **Nama Penguji:** Asep
- **Perangkat / Browser:** [ Contoh: Windows 11 / Google Chrome 130 ]
- **Perangkat Ponsel (Mobile):** [ Contoh: iPhone 13 (Safari) / Samsung S22 (Chrome) ]
- **Total Skenario Diuji:** 30 Skenario

### Rekapitulasi Status Uji
- **PASS (Lolos):** [ Jumlah ]
- **FAIL (Gagal / Temuan Defek):** [ Jumlah ]
- **BLOCKED (Terhambat):** [ Jumlah ]
- **NOT TESTED (Belum Diuji):** [ Jumlah ]

---

### Rincian Temuan Defek (Bila Ada)
| No | ID Uji | Komponen / Halaman | Deskripsi Masalah yang Ditemukan | Tingkat Keparahan (Tinggi / Sedang / Rendah) | Tangkapan Layar / Bukti |
|:---:|:---:|:---|:---|:---:|:---|
| 1 | | | | | |
| 2 | | | | | |

---

### Kesimpulan & Rekomendasi Penguji:
[ Tuliskan catatan umum mengenai kemudahan penggunaan, kestabilan antarmuka, dan kesiapan sistem ]
```

---

<div align="center">
  <sub>SIMAK DISKUM v5.0 — Dokumen Panduan & Daftar Periksa Evaluasi Fungsional QA Eksternal (Milestone S05).</sub>
</div>
