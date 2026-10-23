# ShiftSnap

ShiftSnap adalah website responsif untuk memasukkan jadwal kerja, mengatur desain, melihat preview langsung, dan mengunduh kalender sebagai PNG.

## Jalankan di komputer

Persyaratan: Node.js 18+ (disarankan Node.js 20+).

```bash
npm install
npm run dev
```

Buka URL lokal yang ditampilkan Vite (biasanya `http://localhost:5173`).

Untuk menguji versi produksi:

```bash
npm run build
npm run preview
```

## Deploy online

### Vercel
1. Ekstrak ZIP ini dan unggah folder proyek ke repository GitHub.
2. Impor repository di Vercel.
3. Framework preset: **Vite**.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

### Netlify
1. Unggah repository ke Netlify.
2. Build command: `npm run build`.
3. Publish directory: `dist`.

## Cara pakai
- Pilih tanggal pada kalender, lalu pilih Pagi, Sore, atau Libur.
- Tab **Input teks** menerima format seperti `1P, 2P, 3L, 4S, 5S`; P = Pagi, S = Sore, L = Libur. Bisa dipisahkan koma, titik koma, atau baris baru.
- Pilih tema, atur warna, radius, jarak, ukuran teks, dan elemen yang ditampilkan.
- Pilih **Kalender** atau **Wallpaper HP** di panel preview.
- Tekan **Download PNG**.
- Jadwal disimpan otomatis di `localStorage` browser. Ekspor/impor JSON dapat dipakai untuk backup dan pindah perangkat.

## Catatan
- Data tersimpan di browser perangkat saat ini; data tidak dikirim ke server.
- PNG dibuat di browser memakai `html-to-image`.
- Google Fonts dipakai untuk tipografi; jika offline, font sistem akan digunakan.
