# Radar CMAX BMKG Yogyakarta — MapLibre + Esri Dark / GitHub Pages

Website statis (satu file `index.html`) untuk menampilkan frame PNG CMAX dari BMKG Yogyakarta di atas basemap Esri Dark Gray Canvas. Tidak perlu Node.js, npm, token Mapbox, database, atau backend.

## Menayangkan di GitHub Pages

1. Buat repo GitHub baru, misalnya `radar-bmkg-yogya` (Public untuk akun GitHub Free yang memakai Pages).
2. **Ekstrak ZIP** ini. Masukkan `index.html`, `README.md`, `.nojekyll`, dan folder `frames/` ke **root** repo. Jangan mengunggah ZIP tanpa diekstrak.
3. Di GitHub pilih `Settings` → `Pages` → `Build and deployment` → `Deploy from a branch`.
4. Pilih `main` dan `/(root)`, kemudian klik `Save`.
5. Alamatnya biasanya `https://USERNAME.github.io/radar-bmkg-yogya/`. Jika repo bernama `USERNAME.github.io`, alamatnya `https://USERNAME.github.io/`.
6. Buka halaman, tunggu peta dan status PNG muncul. Gunakan `Muat frame`, `← Sebelum`, `Sesudah →`, `▶ Animasi`, atau `✓ Uji URL frame`.

## Konversi waktu UTC ↔ WIB

- Filename BMKG dalam UTC, format `YOG-YYYYMMDD-HHMM.png`.
- Masukkan waktu dalam WIB (UTC+7); program mengurangi 7 jam untuk membentuk URL BMKG.
- Contoh `2026-11-21 08:20 WIB` → `2026-11-21 01:20 UTC` → `https://stamet-yogya.bmkg.go.id/cache/radar/YOG/CMAX/20261121/YOG-20261121-0120.png`.
- Pindah hari otomatis: `2026-11-21 02:00 WIB` → `2026-11-20 19:00 UTC`, folder `/20261120/`.
- Frame antar waktu tidak selalu tersedia. Kegagalan memuat gambar tidak membuktikan kesalahan CORS atau HTTP 404: dapat disebabkan kebijakan hotlink, file belum tersedia, atau jaringan.

## Kenapa menggunakan overlay HTML, bukan image source MapLibre?

MapLibre digunakan untuk basemap dan posisi geografis. PNG radar ditempatkan sebagai elemen HTML `<img>` yang dihitung posisinya melalui `map.project()` ketika peta digeser atau diperbesar. Metode ini tidak memerlukan CORS untuk menampilkan gambar, berbeda dari pengambilan lintas domain dengan `fetch()` atau memasukkan gambar cross-origin langsung ke tekstur WebGL.

Peta dikunci pada bearing 0° dan pitch 0°, karena overlay HTML sederhana ini tidak melakukan perspektif/rotasi. Gambar masih bisa gagal akibat hotlink/CSP/server. GitHub Pages adalah hosting statis, bukan reverse proxy.

### Alternatif jika URL BMKG gagal ditampilkan

- Klik `Buka PNG asli BMKG`, unduh PNG, lalu klik `Unggah PNG lokal` pada WebGIS; berlaku untuk frame terpilih dan perangkat/browser tersebut.
- Untuk mengarsipkan frame dalam repository, simpan PNG sesuai nama, misalnya `frames/YOG-20261121-0120.png`. Pilih `Repo GitHub (frames/*.png)` di dropdown. Ini dapat digunakan per frame selama file tersebut tersedia di repo.
- Jika perlu proxy server-side, gunakan deployment server/Worker terpisah yang mengizinkan akses dengan tetap mematuhi kebijakan penggunaan data BMKG; tidak bisa dijalankan oleh GitHub Pages sendirian.

## Georeferensi

Sudut gambar dari pengukuran posisi image layer vs tile pada halaman https://stamet-yogya.bmkg.go.id/area-hujan/ saat 21 Nov 2026 (urutan NW NE SE SW):

```json
[
  [108.10544460975052, -5.4847446559064],
  [112.60164654383152, -5.4847446559064],
  [112.60164654383152, -9.979694825675953],
  [108.10544460975052, -9.979694825675953]
]
```

Koordinat ini meniru footprint tampilan BMKG, bukan georeferensi ilmiah asli/metadata PNG. Tidak ada pembuktian jangkauan maksimum radar tepat 240 atau 248 km.

## Sumber & catatan

- Produk asli: https://stamet-yogya.bmkg.go.id/area-hujan/
- Dokumentasi GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Basemap: Esri Dark Gray Canvas (raster). Esri telah mengumumkan penghentian bertahap layanan raster lama; untuk produksi sebaiknya evaluasi vector basemap pengganti.
- CMAX menunjukkan reflektivitas; bukan pengukuran curah hujan mm/jam secara langsung.

## Catatan tentang file raster

ZIP hanya berisi aplikasi, bukan arsip gambar BMKG. Saat pembuatan paket, server PNG BMKG tidak dapat dijangkau dari lingkungan pengemasan. Aplikasi langsung menguji URL gambar asli ketika dibuka melalui browser pengguna.
