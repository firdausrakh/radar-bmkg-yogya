# Radar CMAX BMKG — smooth tiles & arsip R2

## Tampilan yang lebih smooth

WebGIS GitHub Pages sekarang memiliki sumber **Radar terkini — raster tiles (smooth)**.
Layer menggunakan MapLibre raster source native, tile 256 × 256 dengan BBOX EPSG:3857, interpolasi `linear`, dan fade 250 ms. Ini membuat gerakan pan/zoom mengikuti canvas MapLibre, bukan satu gambar HTML yang dihapus lalu diunduh ulang setiap pergeseran.

Pilihan **ArcGIS — export satu gambar (lama)** masih tersedia untuk membandingkan kualitas visual. Halusnya pan/zoom tidak sama dengan menambah resolusi radar. Radar memiliki resolusi data sumber sendiri.

**Perhatian:** layanan ArcGIS belum terbukti mendukung arsip historis. Parameter `time` dalam URL export tidak boleh dianggap sebagai jaminan memilih observasi masa lalu. Mode raster tiles secara sengaja tidak menggunakan parameter tersebut. Tampilan live juga tidak mengklaim timestamp observasi.

## Menyimpan frame terbaru secara otomatis

Kode Worker: [cloudflare-worker/snapshot-r2.js](cloudflare-worker/snapshot-r2.js)

Cloudflare R2 menyimpan **snapshot raster pada area dan resolusi tetap**, diambil secara periodik. Waktu yang tercatat adalah `capturedAt` (waktu unduh, UTC), **bukan** waktu observasi asli. Jika citra identik dengan snapshot terakhir, tidak disimpan lagi (SHA-256).

### Langkah Cloudflare

1. Buat bucket R2 misalnya `radar-cmax-archive` di dashboard Cloudflare.
2. Buat Worker baru, misalnya `radar-cmax-collector`. Jangan ganti Worker proxy lama sampai yakin.
3. Masukkan isi `cloudflare-worker/snapshot-r2.js` melalui **Edit code**, lalu deploy.
4. Pada Worker → **Settings → Bindings**, tambahkan **R2 Bucket** dengan variabel `RADAR_BUCKET` yang menunjuk ke bucket `radar-cmax-archive`.
5. Pada Worker → **Settings → Triggers** (atau Triggers / Cron), tambah jadwal `*/10 * * * *` untuk setiap 10 menit UTC. Cron diproses oleh Cloudflare; dapat terjadi keterlambatan.
6. Opsional: set **Secret** `SNAPSHOT_TOKEN` dengan nilai acak panjang untuk menjalankan koleksi manual melalui `GET /api/collect`. Jangan pernah meletakkan token ini dalam GitHub Pages atau skrip client.
7. Setelah cron pertama berhasil, buka `https://NAMA-WORKER.workers.dev/api/frames`. Respons menampilkan `latest` dan `frames`. Setiap gambar tersimpan dapat dibuka pada `/api/frame/KEY` dengan KEY dari `frames[].key`.

### Struktur R2

```text
cmax/index.json
cmax/frames/2026-11-21/2026-11-21T03-40-00-000Z.png
cmax/frames/2026-11-21/2026-11-21T03-50-00-000Z.png
...
```

Tiap PNG disimpan beserta geometri cakupan tetap [barat, selatan, timur, utara] yang sesuai URL export, dan waktu `capturedAt`. Arsip menyimpan paling banyak 1.008 snapshot berbeda; tidak dibatasi berdasarkan umur hari jika data tidak berubah. Frekuensi pemeriksaan tidak menjamin frekuensi perubahan radar.

### Cek status

Jika `/api/frames` kosong, lihat **Workers → Logs / Observability** untuk pesan `Capture failed`. Respons upstream 403, respons bukan PNG, atau akses layanan BMKG yang tidak mengizinkan koleksi harus ditangani melalui izin dan akses resmi, bukan dengan melewati Cloudflare Challenge.

Ini adalah contoh rancangan teknis; **belum dideploy dan belum terbukti berhasil mengambil gambar dari Cloudflare**. Pengambilan otomatis dan penyimpanan ulang data BMKG hanya dilakukan jika sudah sesuai ketentuan penggunaan dan izin integrasi.

## Cara animasi dengan file tersimpan

1. Frontend membaca `GET /api/frames`.
2. Pilih beberapa entri `frames` yang sudah tersimpan, urutkan menurut `capturedAt`.
3. Tampilkan setiap PNG menggunakan MapLibre image source dengan `coordinates` dari metadata.
4. Untuk animasi yang benar-benar mulus, siapkan sumber gambar berikutnya lebih dahulu dan crossfade antara dua image layers.
5. Jangan interpolasikan waktu radar yang belum diketahui. Gunakan label **waktu snapshot (WIB)**.

Jika ingin memakai arsip untuk cakupan nasional, ubah bounds dan ukuran raster sesuai izin sumber; jangan mencampur snapshot dengan cakupan berbeda dalam satu urutan tanpa metadata georeferensi masing-masing.
