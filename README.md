# Firebase Studio

Ini adalah starter NextJS di Firebase Studio.

Untuk memulai, lihat `src/app/page.tsx`.

## Prasyarat

Sebelum Anda dapat menjalankan aplikasi ini secara lokal, Anda perlu menginstal beberapa alat penting di komputer Anda.

1.  **Node.js**: Ini adalah lingkungan runtime yang memungkinkan Anda menjalankan kode JavaScript di luar browser. Proyek ini membutuhkannya untuk proses build dan menjalankan aplikasi.
    *   **Rekomendasi**: Unduh dan instal versi **LTS (Long-Term Support)** dari situs web resmi [Node.js](https://nodejs.org/). Versi LTS adalah yang paling stabil dan direkomendasikan untuk sebagian besar pengguna.

2.  **npm (Node Package Manager)**: npm adalah manajer paket untuk Node.js. Ini digunakan untuk menginstal pustaka dan alat yang menjadi dependensi proyek ini.
    *   **Instalasi**: npm secara otomatis terinstal saat Anda menginstal Node.js, jadi Anda tidak perlu menginstalnya secara terpisah.

3.  **Editor Kode**: Meskipun Anda dapat menggunakan editor teks apa pun, editor kode modern akan menyediakan fitur seperti penyorotan sintaks dan pelengkapan kode, yang membuat pengembangan jauh lebih mudah.
    *   **Rekomendasi**: Kami sangat menyarankan penggunaan [Visual Studio Code](https://code.visualstudio.com/), editor gratis dan kuat yang populer untuk pengembangan web.

## Menjalankan Secara Lokal

Untuk menjalankan aplikasi ini di mesin lokal Anda, ikuti langkah-langkah berikut:

### 1. Atur Variabel Lingkungan

Proyek ini memerlukan beberapa kunci API dan kredensial untuk dapat berjalan.

1.  Buat salinan file `.env.example` di direktori root proyek dan beri nama `.env.local`.
2.  Buka file `.env.local` baru Anda.
3.  Ganti nilai placeholder (misalnya, `YOUR_GOOGLE_CLIENT_ID`) dengan kredensial Anda yang sebenarnya dari Google Cloud dan Firebase.

### 2. Instal Dependensi

Buka terminal di direktori root proyek dan jalankan perintah berikut untuk menginstal paket yang diperlukan:

```bash
npm install
```

### 3. Jalankan Server Pengembangan

Setelah dependensi terinstal, jalankan server pengembangan Next.js:

```bash
npm run dev
```

Aplikasi sekarang akan berjalan. Anda dapat mengaksesnya di browser web Anda, biasanya di `http://localhost:9002`.
