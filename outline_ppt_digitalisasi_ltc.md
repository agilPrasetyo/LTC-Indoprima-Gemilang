# 📊 Outline PPT: Digitalisasi Sistem Report LTC

**PT Indoprima Gemilang — Learning & Training Center (LTC)**

---

## Slide 1 — Cover / Judul

- **Judul**: Digitalisasi Sistem Report LTC
- **Sub-judul**: Transformasi Pelaporan Manual ke Dashboard Digital Terintegrasi
- **Instansi**: PT Indoprima Gemilang — LTC Division
- **Tanggal Presentasi**: *(sesuaikan)*
- **Presenter**: *(sesuaikan)*
- *Tambahkan logo Indoprima Gemilang*

---

## Slide 2 — Daftar Isi / Agenda

1. Latar Belakang
2. Permasalahan Sistem Lama
3. Tujuan Digitalisasi
4. Solusi: Dashboard LTC Digital
5. Fitur-Fitur Dashboard
6. Arsitektur & Teknologi
7. Perbandingan Sebelum vs Sesudah
8. Manfaat & Dampak
9. Demo / Screenshot Dashboard
10. Kesimpulan & Rencana Pengembangan

---

## Slide 3 — Latar Belakang

- LTC (Learning & Training Center) merupakan program pelatihan kerja bagi peserta magang di PT Indoprima Gemilang
- Program LTC melibatkan pengelolaan data yang kompleks dan berjumlah besar:
  - **Data siswa aktif** (multi-kelas: Kelas 1–5, berdasarkan bulan magang)
  - **Absensi harian** seluruh peserta
  - **Performa kerja harian** (capaian produksi, shift, mesin, dll.)
  - **Data keuangan** (uang transport, uang saku, biaya per kelas)
  - **Data turnover** (lulus, resign, indisipliner)
  - **Keselamatan kerja / K3** (insiden, hari bebas kecelakaan)
  - **Data populasi & persentase LTC**
- Selama ini, seluruh pelaporan dilakukan secara **manual menggunakan Microsoft Excel dan PowerPoint**
- Kebutuhan laporan yang cepat, akurat, dan real-time semakin meningkat seiring bertambahnya jumlah siswa dan kompleksitas data

---

## Slide 4 — Permasalahan Sistem Lama (Excel & PPT)

### ⚠️ Proses yang Rumit & Tidak Efisien
- Harus membuka banyak file Excel terpisah untuk setiap kategori data
- Membuat laporan PPT memerlukan copy-paste data manual dari berbagai sumber
- Proses rekapitulasi memakan waktu berjam-jam hingga berhari-hari

### ⚠️ Kapasitas Memori & Penyimpanan Tinggi
- File Excel yang membengkak (data kumulatif bulanan + historis)
- Banyak file PPT berukuran besar karena berisi screenshot, tabel, dan grafik statis
- Memenuhi storage lokal komputer maupun shared drive

### ⚠️ Rentan Human Error
- Kesalahan input data saat copy-paste antar file
- Rumus Excel yang sering berubah/rusak
- Tidak ada validasi data otomatis

### ⚠️ Tidak Real-Time
- Data baru tersedia setelah direkap secara manual
- Informasi yang disajikan selalu terlambat (tidak up-to-date)
- Sulit memantau kondisi terkini secara langsung

### ⚠️ Akses Terbatas & Tidak Terpusat
- File tersebar di banyak folder dan komputer berbeda
- Tidak bisa diakses secara bersamaan oleh banyak pihak
- Sulit diakses dari luar kantor (tidak mobile-friendly)

### ⚠️ Kesulitan Analisis & Visualisasi
- Grafik Excel statis, perlu dibuat ulang setiap periode
- Tidak ada dashboard interaktif untuk melihat tren dan pola data
- Presentasi ke manajemen memerlukan effort tambahan untuk menyusun visualisasi

---

## Slide 5 — Tujuan Digitalisasi

1. **Efisiensi Proses** — Menghilangkan proses manual yang berulang dan memakan waktu
2. **Data Real-Time** — Menyajikan data terkini yang terupdate secara otomatis dari database
3. **Sentralisasi Data** — Satu platform terpusat untuk seluruh data report LTC
4. **Akses Multi-Role** — Menyediakan akses sesuai otoritas (Admin, Visitor/Eksekutif, Siswa)
5. **Visualisasi Interaktif** — Dashboard dengan grafik, KPI card, dan tabel yang informatif
6. **Mengurangi Risiko Kesalahan** — Validasi data otomatis dan input terstruktur
7. **Aksesibilitas** — Bisa diakses dari mana saja (web-based, responsive mobile & desktop)
8. **Paperless & Hemat Storage** — Mengurangi ketergantungan pada file fisik/lokal

---

## Slide 6 — Solusi: Dashboard LTC Digital

- Dikembangkan sistem **Dashboard LTC berbasis web** menggunakan teknologi modern
- Platform dapat diakses melalui browser di PC, tablet, maupun smartphone
- Terintegrasi langsung dengan **database cloud (Supabase)** untuk penyimpanan data terpusat
- Dideploy menggunakan **Vercel** sehingga tersedia 24/7 secara online
- Sistem **multi-role authentication** (login berdasarkan peran pengguna)
- Menyajikan seluruh laporan LTC dalam **satu dashboard terintegrasi**

---

## Slide 7 — Fitur-Fitur Dashboard (1/2)

### 📊 Halaman Dashboard Utama
- KPI Card: **Siswa Aktif**, **Persentase LTC**, **Biaya LTC Bulan Ini**
- Ringkasan data terkini yang langsung terlihat saat login
- Grafik & indikator visual interaktif

### 👨‍🎓 Performa Siswa (Performance)
- Rekap capaian performa harian seluruh siswa aktif
- Filter berdasarkan nama, NoReg, kelas, perusahaan, dan shift
- Export data ke format CSV

### 📅 Absensi Siswa
- Kalender absensi bulanan per siswa
- Filter berdasarkan bulan, tahun, nama, dan kelas
- Rekap kehadiran yang lengkap dan akurat

### 📉 Turnover
- KPI: Total Lulus Magang, Resign Mandiri, Indisipliner
- Grafik batang proporsi alasan keluar per bulan
- Visualisasi tren turnover secara bulanan

---

## Slide 8 — Fitur-Fitur Dashboard (2/2)

### 💰 Cost / Keuangan
- Standar biaya & tarif harian per kelas (Kelas 1–5)
- Rincian Uang Transport, Uang Saku, dan kalkulasi tarif harian
- Kalkulator keuangan otomatis

### 🛡️ Safety / K3 (Keselamatan Kerja)
- KPI: Total Insiden Safety, Hari Bebas Kecelakaan
- Monitoring data keselamatan kerja peserta LTC
- Mode monitoring (read-only) untuk transparansi

### ⚙️ Panel Admin (Khusus Admin)
- **Manajemen Akun** — Registrasi dan kelola akun pengguna (Admin, Visitor, Siswa)
- **Manajemen Siswa** — Kelola data siswa aktif
- **Log Manpower Harian** — Pencatatan aktivitas harian
- **Kelola Turnover** — Input dan manajemen data keluar siswa
- **Kelola Populasi** — Update data populasi & persentase LTC
- **Manajemen K3** — Kelola data insiden keselamatan kerja

### 📱 Portal Siswa
- Formulir input kinerja harian (step-by-step wizard)
- Identitas siswa, detail operasional (shift, bagian, mesin), dan hasil kerja
- Portal personal untuk setiap siswa

---

## Slide 9 — Arsitektur & Teknologi

| Komponen | Teknologi |
|---|---|
| **Framework Frontend** | Astro (SSR/SSG) |
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL Cloud) |
| **Authentication** | Supabase Auth (Multi-Role) |
| **Hosting/Deployment** | Vercel (CI/CD Otomatis) |
| **API** | REST API + Supabase RPC |

### Keunggulan Arsitektur:
- **Cloud-based** — Data tersimpan aman di cloud, tidak di komputer lokal
- **Auto-deployment** — Setiap perubahan langsung terdeploy otomatis
- **Responsive Design** — Optimal di desktop, tablet, maupun smartphone
- **Secure** — Sistem login dengan role-based access control

---

## Slide 10 — Perbandingan: Sebelum vs Sesudah

| Aspek | ❌ Sebelum (Manual) | ✅ Sesudah (Dashboard) |
|---|---|---|
| **Format Laporan** | File Excel & PPT terpisah | Dashboard web terintegrasi |
| **Waktu Pembuatan Report** | Berjam-jam / berhari-hari | Otomatis & real-time |
| **Akses Data** | Hanya di komputer tertentu | Dari mana saja via browser |
| **Kapasitas Storage** | File besar, memakan banyak memori | Cloud-based, ringan |
| **Akurasi Data** | Rawan human error (copy-paste) | Input tervalidasi otomatis |
| **Visualisasi** | Grafik statis, perlu dibuat ulang | Grafik interaktif & dinamis |
| **Multi-User** | Sulit digunakan bersamaan | Multi-role, akses bersamaan |
| **Update Data** | Harus manual rekap | Real-time dari database |
| **Keamanan** | File bisa diedit siapa saja | Login + Role-Based Access |
| **Responsif** | Hanya PC/Laptop | Desktop, Tablet, Smartphone |

---

## Slide 11 — Manfaat & Dampak

### 🏢 Bagi Manajemen / Eksekutif
- Mendapatkan laporan real-time tanpa harus menunggu rekapan manual
- Dapat memantau KPI utama (siswa aktif, biaya, turnover, safety) dalam satu tampilan
- Akses role "Visitor" yang informatif namun aman (read-only)

### 👨‍💼 Bagi Admin / PIC LTC
- Mengurangi beban kerja pembuatan report manual secara drastis
- Input dan kelola data langsung dari dashboard (CRUD)
- Waktu yang terhemat bisa dialokasikan untuk tugas strategis lainnya

### 👨‍🎓 Bagi Siswa Peserta LTC
- Memiliki portal personal untuk input laporan harian
- Proses pelaporan lebih mudah dengan form step-by-step
- Transparansi informasi performa dan kehadiran

### 💡 Bagi Organisasi
- Efisiensi biaya operasional (hemat kertas, storage, waktu)
- Data-driven decision making
- Standarisasi proses pelaporan

---

## Slide 12 — Demo / Screenshot Dashboard

> **Catatan**: Sisipkan screenshot berikut dari dashboard:

1. **Halaman Login** — Tampilan login dengan 3 role (Admin, Visitor, Siswa)
2. **Opening Splash Screen** — Animasi intro dengan logo Indoprima Gemilang
3. **Dashboard Utama** — KPI Cards (Siswa Aktif, Persentase LTC, Biaya LTC)
4. **Halaman Performa** — Tabel performa siswa dengan filter dan export
5. **Halaman Absensi** — Kalender absensi bulanan
6. **Halaman Turnover** — KPI cards & grafik batang
7. **Halaman Keuangan** — Tabel standar biaya per kelas
8. **Halaman Safety** — KPI insiden & hari bebas kecelakaan
9. **Panel Admin** — Manajemen akun, siswa, populasi, K3
10. **Portal Siswa** — Form input kinerja harian (step wizard)
11. **Tampilan Mobile** — Responsive layout di smartphone

---

## Slide 13 — Kesimpulan

- Digitalisasi sistem report LTC berhasil mentransformasi proses pelaporan dari **manual → digital**
- Seluruh data LTC kini tersentralisasi dalam **satu dashboard yang terintegrasi dan real-time**
- Dashboard menyediakan **7 modul utama**: Dashboard, Performa, Absensi, Turnover, Keuangan, Safety/K3, dan Admin Panel
- Sistem mendukung **3 role pengguna**: Admin (akses penuh), Visitor (eksekutif view), dan Siswa (portal personal)
- Hasilnya: proses yang lebih **efisien, akurat, transparan, dan hemat sumber daya**

---

## Slide 14 — Rencana Pengembangan (Opsional)

- 📊 Penambahan fitur **export laporan PDF otomatis**
- 📈 Integrasi **analytics & insight** berbasis AI
- 📱 Pengembangan **mobile app** (PWA / native)
- 🔔 Sistem **notifikasi otomatis** (reminder absensi, alert insiden)
- 📋 Fitur **evaluasi performa** (penilaian otomatis berdasarkan data)
- 🔗 Integrasi dengan sistem **HRD / payroll** perusahaan

---

## Slide 15 — Penutup & Terima Kasih

- **"Dengan digitalisasi, pelaporan LTC menjadi lebih cepat, akurat, dan transparan — mendukung pengambilan keputusan yang lebih baik."**
- Terima Kasih
- *(Sesi Tanya Jawab)*
- Kontak / informasi lebih lanjut

---

> [!TIP]
> ### Tips Implementasi di PPT:
> - Gunakan **warna brand Indoprima** (biru & merah) sebagai tema utama PPT
> - Setiap slide cukup berisi **5–7 poin utama** agar tidak terlalu padat
> - Slide Demo/Screenshot bisa dipecah menjadi beberapa slide (1 screenshot per slide)
> - Gunakan **ikon/emoji** untuk mempermudah pembacaan visual
> - Slide Perbandingan (Sebelum vs Sesudah) sangat efektif sebagai highlight presentasi
> - Tambahkan **animasi transisi** yang sederhana antar slide
