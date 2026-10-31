# HanShift — Cold Blue Edition

Versi ini mempertahankan mekanisme aplikasi dari paket HanShift Tutorial Pemula, dengan pembaruan visual:
- Logo H geometris dalam PNG transparan (512 × 512) untuk splash screen, header, dan favicon.
- Palet utama Ice Blue / Cold Storage.
- Transisi keluar splash screen yang lebih halus dan progress bar yang terisi seiring waktu.
- Tutorial pemula otomatis untuk pengguna baru dan dapat dibuka kembali melalui tombol Bantuan.

## Menjalankan di Windows

1. Ekstrak ZIP.
2. Buka folder `shiftsnap` di VS Code (folder yang berisi `package.json`).
3. Buka Terminal → New Terminal.
4. Jalankan:

```powershell
npm install
npm run dev
```

5. Buka alamat lokal yang ditampilkan Vite, biasanya `http://localhost:5173/`.

Untuk membuat build produksi:

```powershell
npm run build
```

Catatan: jadwal dan pengaturan yang sudah tersimpan di browser menggunakan key penyimpanan lama `HannShift-v1`, sehingga tidak diganti oleh revisi visual ini. Jika sebelumnya browser sudah menyimpan pilihan warna, pilihan tersimpan itu tetap dipertahankan; gunakan preset `Ice Blue` atau Reset desain untuk menerapkan palet baru.
