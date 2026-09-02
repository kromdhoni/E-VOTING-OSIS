# E-Voting OSIS SMK YPM 14 Sumobito — Design Spec

**Tanggal:** 2026-09-02  
**Status:** Approved (4/4 bagian disetujui)  
**Konteks:** 300–500 siswa, 2–3 paslon, 1 hari event di lab/kelas dengan 5–10 device bergantian, 1 admin (guru/panitia), koneksi 3G/4G terbatas, perangkat HP/lab bergantian.  
**Tujuan Bisnis:** Proses pemilihan ketua & wakil OSIS yang valid, transparan, anti-curang, ringan, dan mudah dipakai pengguna non-teknis. Repo dan hosting tetap di GitHub milik sekolah.

---

## 1. Ringkasan Eksekutif & Keputusan Utama

**Pendekatan terpilih: A — GitHub Pages (frontend) + Supabase (backend gratis).**

- Repo tetap di GitHub pengguna (`E-VOTING OSIS`). Frontend di-deploy otomatis ke GitHub Pages via GitHub Actions.
- Backend/database menggunakan Supabase (Postgres gratis, 500MB, RLS, Auth) atau Firebase sebagai alternatif. Tidak ada backend murni di GitHub karena GitHub Pages hanya statis — pola "GitHub repo + backend gratis eksternal" adalah standar industri dan tetap memenuhi permintaan "bisa di-online-kan di GitHub saya".
- Alternatif B (Vercel fullstack) ditolak: lebih berat, cold start, overkill untuk 500 voter 1 hari. Alternatif C (pure static/localStorage) ditolak: gagal cegah voting ganda via refresh/devtools.

**Kejawaban pertanyaan GitHub:** YA, bisa online di GitHub kamu. Caranya: code di GitHub → frontend live di `https://username.github.io/E-VOTING-OSIS/` → backend Supabase terhubung via env key. Semua gratis.

---

## 2. Arsitektur Teknis Ringan (Optimasi 3G/Mobile)

### 2.1 Stack

| Layer | Teknologi | Alasan Ringan |
|-------|-----------|---------------|
| Frontend | Vite + Vanilla JS (atau Preact 3KB) + Tailwind CDN/minified | Bundle <100KB, no React berat, load <2s di 3G |
| Styling | Tailwind utility, sedikit custom CSS | Hemat request, tanpa framework CSS berat |
| Backend | Supabase (Postgres + PostgREST + Auth + RLS) | Free tier cukup, tanpa kelola server, hemat bandwidth |
| Deploy Frontend | GitHub Pages + GitHub Actions (gh-pages) | Gratis, auto-sync dari GitHub |
| Deploy Backend | Supabase Cloud (EU/SG region terdekat) | CDN + pooling, gratis |
| PWA (opsional ringan) | Service Worker cache-first untuk halaman login/kandidat | Tetap bisa buka halaman saat WiFi putus sesaat |

### 2.2 Skema Database (Minimal, Audit-able)

```sql
-- Voters: master data siswa
CREATE TABLE voters (
  nis TEXT PRIMARY KEY,           -- NIS dari sekolah
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,            -- mis. XII-TKJ-1
  token_hash TEXT NOT NULL,       -- bcrypt dari token 6 digit
  has_voted BOOLEAN DEFAULT FALSE,
  voted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates: paslon
CREATE TABLE candidates (
  id SERIAL PRIMARY KEY,
  nomor_urut INT UNIQUE NOT NULL, -- 1,2,3
  nama_ketua TEXT NOT NULL,
  nama_wakil TEXT NOT NULL,
  foto_url TEXT,                  -- WebP <50KB di Supabase Storage
  visi TEXT,
  misi TEXT
);

-- Votes: satu baris per voter, constraint cegah ganda
CREATE TABLE votes (
  id SERIAL PRIMARY KEY,
  voter_nis TEXT UNIQUE REFERENCES voters(nis) ON DELETE CASCADE,
  candidate_id INT REFERENCES candidates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  device_fingerprint TEXT          -- userAgent hash, untuk audit
  -- UNIQUE(voter_nis) adalah pertahanan utama anti refresh fraud
);

-- Audit log (append-only)
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  action TEXT,                    -- login_success, vote_success, login_fail
  voter_nis TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Election config
CREATE TABLE election_config (
  id INT PRIMARY KEY DEFAULT 1,
  is_open BOOLEAN DEFAULT FALSE,  -- admin buka/tutup voting
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  CHECK (id=1)                    -- single row
);
```

**RLS Policies:**
- Siswa (anon key + NIS+token check via RPC): hanya bisa `SELECT candidates`, `SELECT voters WHERE nis = own_nis` (untuk cek has_voted), dan `INSERT votes` jika `has_voted=false` dan `is_open=true`.
- Admin (service_role): full akses, tapi login admin via Supabase Auth email+password terpisah di `/admin`.
- Siswa TIDAK bisa `SELECT votes` (mencegah lihat siapa pilih siapa).

### 2.3 Optimasi Bandwidth & Performa

- **Gambar:** Semua foto kandidat dikonversi ke WebP, max 50KB, lazy-load, disimpan di Supabase Storage + CDN.
- **Tanpa WebSocket:** Panitia pantau via polling 5 detik (atau manual refresh) — hemat koneksi, cukup untuk 500 voter.
- **Minifikasi:** HTML/CSS/JS di-minify, gzip/brotli via GitHub Pages CDN.
- **PWA ringan:** Cache halaman login & kandidat; jika WiFi putus saat submit, vote di-queue di `localStorage` lalu auto-sync saat online (dengan tetap cek `has_voted` di server — queue tidak bisa bypass).
- **Target:** First load <150KB, LCP <2s di 3G, TTI <1.5s.

---

## 3. Fitur-Fitur Inti WAJIB (Tanpa Ini Tidak Sah)

| # | Fitur | Alasan Penting untuk OSIS |
|---|-------|---------------------------|
| **F1** | **Import NIS massal (CSV/Excel)** | Admin tidak input 500 manual. Upload file dari Tata Usaha → auto-generate token 6 digit per siswa → export PDF daftar token untuk dibagikan. Kritis untuk event 1 hari. |
| **F2** | **Login NIS + Token 6 digit** | NIS saja mudah ditebak teman. Token kertas (dibagikan panitia) mencegah impersonation. Validasi di server, token di-hash bcrypt. Solusi seimbang: cepat untuk device bergantian tapi aman. |
| **F3** | **Halaman Kandidat Ringan** | Foto, nomor urut besar, nama ketua/wakil, visi-misi ringkas. Desain minimal, tombol "Pilih" jelas — untuk pengguna non-teknis & layar HP kecil. |
| **F4** | **Vote Sekali + Konfirmasi + Constraint DB** | Flow: pilih → modal "Apakah yakin pilih Paslon 02?" → submit. Server atomically: `INSERT votes` + `UPDATE voters SET has_voted=true` dalam transaction + `UNIQUE(voter_nis)`. **Ini yang mencegah refresh = vote lagi.** Flag di DB, bukan di browser. |
| **F5** | **Dashboard Admin (1 admin simple)** | Login terpisah `/admin`. Kelola kandidat (CRUD), kelola voters (lihat sudah/belum), buka/tutup voting (toggle `is_open`), reset token jika perlu. Tidak ada multi-role rumit — sesuai permintaan. |
| **F6** | **Hasil Terkunci + Export** | Hasil tidak tampil ke siswa sampai admin tutup voting & klik "Buka Hasil". Tampilkan bar chart + angka + % + partisipasi. Tombol cetak PDF/Excel untuk laporan ke kepala sekolah. Terkunci = cegah kerusuhan & strategi curang. |

**Kriteria wajib lolos:** F4 harus 100% mencegah double vote (uji: login → vote → refresh → coba vote lagi → ditolak).

---

## 4. Fitur Tambahan Bernilai (Ringan, Dongkrak Kepercayaan)

| Fitur | Bobot | Nilai | Trade-off |
|-------|-------|-------|-----------|
| **T1 Countdown & Status Voting** | ~2KB | Siswa & panitia tahu voting buka/tutup kapan | Hampir tanpa biaya |
| **T2 Statistik Partisipasi per Kelas (anonim)** | ~3KB | Panitia tahu kelas mana belum 100% tanpa bocorkan pilihan | Polling ringan, tidak expose `votes` |
| **T3 QR Code per Token (opsional cetak)** | ~4KB (lib QR) | Panitia bisa scan QR di meja verifikasi, lebih cepat dari ketik NIS | Butuh cetak kertas, tapi opsional |
| **T4 Halaman "Terima Kasih" + Kode Bukti Anonim** | ~1KB | Siswa dapat kode unik (hash) sebagai bukti "sudah memilih" — bukan bukti "memilih siapa" — jaga privasi | Tidak bisa dipakai jual suara |
| **T5 Audit Log Sederhana** | DB only | Setiap login/vote tercatat untuk cross-check jika ada sengketa | Tidak terlihat siswa, hanya admin |

**Prinsip:** Semua tambahan <10KB total, tidak menambah beban 3G. Tidak ada fitur berat seperti chat, komentar, atau live WebSocket.

Yang **sengaja TIDAK dimasukkan** (YAGNI): sistem komentar, like, share sosmed, multi-bahasa, notifikasi push — menambah kompleksitas tanpa nilai untuk voting 1 hari.

---

## 5. Alur Pengguna (User Flows) — Untuk Non-Teknis

### 5.1 Flow Siswa (Device Bergantian di Lab)

```
[Datang per kelas, antri] 
  → Duduk di device → Buka https://username.github.io/E-VOTING-OSIS/
  → Halaman Login: input NIS + Token 6 digit (token dari kertas panitia) 
  → Klik Masuk
  → [Server cek: token valid? has_voted? is_open?]
     ├─ Jika has_voted=true → Tampil "Anda sudah memilih, terima kasih" + tombol Logout → SELESAI (tidak bisa vote lagi)
     └─ Jika valid → Masuk Halaman Kandidat
  → Lihat 2-3 paslon (foto besar, visi singkat)
  → Klik "Pilih" pada salah satu → Modal konfirmasi "Yakin pilih Paslon 02 - Budi & Ani?"
     ├─ Batal → kembali
     └─ Ya, Pilih → Submit
  → Server transaction (cek lagi UNIQUE, insert, update has_voted)
  → Tampil "Terima Kasih Sudah Memilih" + kode bukti + tombol Logout
  → Panitia klik Logout → device siap untuk siswa berikutnya (auto-logout 2 menit jika lupa)
  → Jika siswa coba refresh/back setelah vote → tetap "sudah memilih" (cek DB)
```

**Khusus device bergantian:** Auto-logout 2 menit + tombol Logout besar + hapus session di `sessionStorage` agar siswa berikutnya tidak lihat data sebelumnya.

### 5.2 Flow Admin (Guru/Panitia Inti)

```
Login /admin (email + password kuat) 
  → Dashboard
  → Tab "Kandidat": Tambah/edit paslon (upload foto WebP)
  → Tab "Voters": Import CSV (nis,nama,kelas) → Generate Token → Export PDF token → Lihat tabel sudah/belum memilih
  → Tab "Kontrol": Toggle Buka Voting / Tutup Voting, lihat countdown
  → Saat voting berlangsung: pantau partisipasi realtime (polling 5 detik, hanya angka total & per kelas)
  → Selesai → Klik "Tutup Voting" → Klik "Buka Hasil" → Lihat grafik → Cetak PDF/Excel
  → Tab "Audit": lihat log jika ada komplain
```

### 5.3 Flow Panitia di Lapangan (Tanpa Dashboard Khusus — Sesuai Permintaan 1 Admin)

Karena hanya 1 admin, panitia lapangan bertugas manual: bagikan kertas token, arahkan antrian kelas, tekan Logout, dan cek daftar hadir fisik vs partisipasi di dashboard admin (ditampilkan di proyektor).

---

## 6. Keamanan & Integritas Data

### 6.1 Mencegah Fraud Voting Ganda (Isu "Refresh Bisa Pilih Lagi")

**Lapisan pertahanan (defense in depth):**
1.  **DB Constraint (utama):** `UNIQUE(voter_nis)` di tabel `votes` + `has_voted` boolean. Satu NIS hanya bisa satu baris vote — bahkan jika bypass frontend, DB menolak.
2.  **Server Transaction:** `BEGIN; INSERT votes ...; UPDATE voters SET has_voted=true; COMMIT;` — atomik, tidak ada race condition jika 2 submit bersamaan.
3.  **Server-side Check:** RPC `cast_vote(nis, token, candidate_id)` verifikasi token_hash + has_voted=false + is_open=true sebelum insert.
4.  **Frontend Guard (sekunder):** `sessionStorage` + redirect ke "sudah memilih" jika detect flag, tapi ini hanya UX — keamanan tetap di server.
5.  **Device Fingerprint:** Simpan hash userAgent+timestamp untuk audit, bukan untuk blokir.

**Hasil:** Refresh, back button, buka tab baru, atau edit localStorage TIDAK bisa vote lagi. Diuji via: submit → refresh → submit lagi → DB error `duplicate key`.

### 6.2 Akses Tidak Sah & Privasi

- **Token Hash:** Token 6 digit tidak disimpan plain, hanya bcrypt hash.
- **RLS:** Siswa tidak bisa baca tabel `votes` atau `voters` orang lain. Hanya RPC `cast_vote` yang bisa.
- **Admin Auth:** Terpisah, pakai Supabase Auth dengan password kuat + rate limit 5 percobaan / 15 menit.
- **Privasi Voter:** Tabel `votes` tidak terekspos ke frontend siswa. Hasil hanya tampil agregat (count per candidate). Tidak ada "siapa pilih siapa" di UI.
- **Rate Limit:** Login siswa dibatasi 5 percobaan / menit per IP untuk cegah brute force token.
- **HTTPS Wajib:** GitHub Pages + Supabase sudah TLS. Tidak ada data sensitif di URL.

### 6.3 Integritas Hasil

- **Audit Log:** Semua `vote_success` tercatat dengan hash NIS (bukan NIS plain di log publik) + timestamp.
- **Export Verifiable:** PDF hasil mencantumkan total suara, total voters, partisipasi %, timestamp tutup voting, dan hash verifikasi.
- **No Edit Setelah Tutup:** Setelah `is_open=false`, endpoint `cast_vote` menolak. Admin tidak bisa ubah votes (hanya bisa lihat). Jika perlu koreksi, harus via SQL manual dengan jejak audit.

---

## 7. Kriteria Penerimaan (Acceptance Criteria) & Trade-off

### 7.1 Kriteria Penerimaan

| ID | Kriteria | Cara Verifikasi |
|----|----------|-----------------|
| AC1 | 500 siswa bisa vote dalam 3 jam di 10 device (avg 2 menit/orang termasuk login) | Uji beban manual: 10 device bergantian, timer |
| AC2 | Refresh/back tidak bisa vote lagi (100%) | Test: vote → F5 → coba vote lagi → harus "sudah memilih" |
| AC3 | Load halaman <2 detik di 3G (throttled 1.6Mbps) | Lighthouse / Chrome throttling |
| AC4 | Hasil final cocok dengan `COUNT(votes)` + `audit_log` | Bandingkan angka di dashboard vs query DB |
| AC5 | Admin bisa import 500 NIS via CSV <30 detik | Uji import file 500 baris |
| AC6 | Tidak ada siswa bisa lihat pilihan siswa lain | Coba akses `SELECT votes` via anon key → harus 403 |

### 7.2 Trade-off Matriks

| Keputusan | Dipilih | Ditolak | Trade-off |
|-----------|---------|---------|-----------|
| Keamanan vs Kecepatan | DB constraint + transaction (aman) | Pure localStorage (cepat tapi curang) | Sedikit latency (+100ms) demi integritas 100% |
| Ringan vs Fitur Mewah | Vanilla JS + polling 5 detik | React + WebSocket realtime | Hemat 80% bundle, polling cukup untuk 500 user |
| Simple Admin vs Multi-Role | 1 admin saja | Admin+Panitia+Saksi terpisah | Sesuai permintaan, lebih mudah kelola, tapi kurang granular |
| Hasil Terkunci vs Live | Terkunci sampai tutup | Live count | Lebih adil, cegah bandwagon/strategi curang |
| Token Kertas vs NIS saja | NIS+Token | NIS saja | Tambah 1 langkah tapi cegah teman pakai NIS orang lain |

**Prioritas:** Integritas (no double vote) > Performa ringan > Kemudahan non-teknis > Fitur tambahan. Jika harus korbankan, korbankan fitur tambahan dulu, jangan integritas.

---

## 8. Deployment: Cara Online-kan di GitHub Kamu (Langkah Konkret)

**Jawaban tuntas:** GitHub tidak menyediakan database/backend gratis, tapi kamu tetap "online di GitHub" dengan pola ini:

1.  **Buat Repo di GitHub:** `E-VOTING-OSIS` (public). Push code frontend.
2.  **Supabase Gratis:** Daftar supabase.com (gratis) → New Project → copy `URL` + `anon key` → masukkan ke `.env` → buat tabel sesuai skema di atas (bisa via SQL editor).
3.  **GitHub Pages:** Di repo → Settings → Pages → Source: GitHub Actions → tambahkan file `.github/workflows/deploy.yml` (Vite build → deploy ke `gh-pages` branch). Setiap `git push` otomatis live.
4.  **Akses Online:** `https://<username>.github.io/E-VOTING-OSIS/` — share ke siswa/panitia. Backend tetap di Supabase, tapi semua code di GitHub kamu.
5.  **Alternatif jika mau 100% Vercel:** Hubungkan repo GitHub ke vercel.com → import → deploy otomatis (juga gratis, juga tetap di GitHub).

**Biaya:** Rp0 untuk 500 siswa. Supabase free: 500MB DB, 50k request/hari — lebih dari cukup untuk 1 hari event.

---

## 9. Rencana Pengembangan (Untuk Tim Dev & Stakeholder Sekolah)

**Fase 1 (MVP — 1–2 minggu):** F1–F6 + T1,T2,T4. Target: bisa dipakai simulasi 50 siswa.  
**Fase 2 (Hardening — 3 hari):** Uji AC1–AC6, optimasi gambar, PWA queue, cetak PDF.  
**Fase 3 (Event):** Import NIS real, cetak token, gladi 1 kelas, lalu eksekusi 1 hari.

**Yang Perlu dari Sekolah:** File Excel NIS+NAMA+KELAS, foto & visi-misi paslon, akun Supabase (email sekolah), akun GitHub.

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| WiFi lab mati | PWA cache + queue + polling; siapkan tethering HP cadangan |
| Siswa lupa token | Admin bisa re-generate token per NIS di dashboard |
| Device bergantian, siswa lupa logout | Auto-logout 2 menit + tombol Logout besar + sessionStorage |
| Supabase free limit | 500 voter * ~5 request = 2500 request << 50k limit; aman |

---

**Persetujuan:** Desain ini telah melalui 4 bagian validasi dan disetujui pengguna pada 2026-09-02. Selanjutnya masuk ke `writing-plans` untuk memecah menjadi tugas implementasi terisolasi.
