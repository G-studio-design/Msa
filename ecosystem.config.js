
module.exports = {
  apps: [
    {
      name: 'msarch-app',
      script: 'npm',
      args: 'start',
      // Opsi tambahan:
      instances: 'max', // Menjalankan di semua core CPU
      exec_mode: 'cluster', // Mengaktifkan mode cluster untuk load balancing
      autorestart: true, // Otomatis restart jika crash
      watch: false, // Jangan pantau perubahan file (lebih baik untuk produksi)
      max_memory_restart: '1G', // Restart jika memori melebihi 1GB
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
    },
  ],
};
