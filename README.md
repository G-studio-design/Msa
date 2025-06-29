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

1.  Buat file baru bernama `.env.local` di direktori root proyek jika belum ada.
2.  Salin isi dari file `.env` (atau templat di bawah) ke file `.env.local` baru Anda.
3.  Ganti nilai placeholder (misalnya, `YOUR_API_KEY_HERE`) dengan kredensial Anda yang sebenarnya dari Google Cloud dan Firebase.

```
# Google OAuth Credentials (for Google Calendar & Sign-In)
# Find these in your Google Cloud Console under APIs & Services > Credentials
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=http://localhost:9002/api/auth/google/callback

# Google Generative AI (for Genkit AI features)
# Find this in Google AI Studio or your Google Cloud Console
GOOGLE_GENAI_API_KEY=YOUR_GEMINI_API_KEY

# Firebase Public Keys (for Firebase services, if used)
# Find these in your Firebase Project Settings under "General"
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID

```

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
