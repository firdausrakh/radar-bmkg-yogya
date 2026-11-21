# Memasang Cloudflare Worker Proxy Radar BMKG

Berdasarkan tes GitHub Pages, permintaan `fetch()` ke host BMKG ditolak oleh browser karena sumber tidak menyediakan `Access-Control-Allow-Origin`. Tes dua mode gambar juga gagal. Ini belum memastikan apakah sumber memblokir hotlink atau server tidak dapat diakses.

1. Buka https://dash.cloudflare.com/ → **Workers & Pages** → **Create** → **Worker** (nama menu dapat berbeda).
2. Buat Worker dengan nama misalnya `radar-bmkg-yogya-proxy`.
3. Buka **Edit code**, dan salin seluruh isi [cloudflare-worker/worker.js](cloudflare-worker/worker.js) untuk menggantikan kode default. Klik **Deploy**.
4. Salin domain Worker, contoh `https://radar-bmkg-yogya-proxy.NAMA_SUBDOMAIN.workers.dev`.
5. Uji: `https://radar-bmkg-yogya-proxy.NAMA_SUBDOMAIN.workers.dev/api/radar?frame=20261121-0120`. Jika Worker bisa mengambil PNG, gambar akan tampil. Jika HTTP 502, periksa respons JSON, terutama `upstreamStatus`.
6. Buka https://firdausrakh.github.io/radar-bmkg-yogya/?utc=20261121-0120
7. Ubah **Metode memuat gambar** menjadi **Proxy eksternal (opsional)**.
8. Isikan `https://radar-bmkg-yogya-proxy.NAMA_SUBDOMAIN.workers.dev/api/radar?frame=` (harus diakhiri tanda =).
9. Pilih **Muat frame** lalu **Uji URL frame**.

Worker mengizinkan CORS hanya dari `https://firdausrakh.github.io`, memvalidasi tanggal jam UTC, dan hanya mengambil PNG YOG CMAX dari BMKG. Perhatikan bahwa proxy tidak otomatis menembus pembatasan server sumber. Hormati ketentuan dan izin penggunaan data radar BMKG.

Jika Worker gagal mengambil PNG, jalan alternatif adalah mendapatkan frame melalui kanal resmi BMKG dan mengunggah PNG sebagai file lokal atau ke folder `frames/` di repository sesuai izin.
