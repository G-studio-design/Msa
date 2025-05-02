// src/locales/id.ts
const id = {
  // Login Page
  login: {
    title: 'Login Msaarch APP',
    description: 'Masukkan kredensial Anda.', // Simplified description
    usernameLabel: 'Nama Pengguna',
    usernamePlaceholder: 'Masukkan nama pengguna Anda',
    passwordLabel: 'Kata Sandi',
    passwordPlaceholder: 'Masukkan kata sandi Anda',
    loginButton: 'Masuk',
    loggingIn: 'Sedang masuk...',
    success: 'Login Berhasil',
    redirecting: 'Mengalihkan ke dasbor...',
    fail: 'Login Gagal',
    invalidCredentials: 'Nama pengguna atau kata sandi salah.',
    bypassButton: 'Lewati Login sebagai Admin (Dev)',
    bypassTitle: 'Lewati Login',
    bypassing: 'Melewati...',
     validation: {
        usernameRequired: 'Nama pengguna wajib diisi.',
        passwordRequired: 'Kata sandi wajib diisi.',
     }
  },
  // Dashboard Layout
   dashboardLayout: {
    menuTitle: 'Menu',
    menuDescription: 'Navigasi dan opsi pengguna.',
    dashboard: 'Dasbor',
    projects: 'Proyek', // Renamed
    manageUsers: 'Kelola Pengguna',
    adminActions: 'Tindakan Admin',
    settings: 'Pengaturan',
    logout: 'Keluar',
    appTitle: 'Msaarch APP',
    toggleMenu: 'Buka/Tutup Panel Menu',
  },
  // Dashboard Page
  dashboardPage: {
    title: 'Dasbor',
    activeProjects: 'Proyek Aktif', // Renamed
    activeProjectsDesc: 'Proyek yang sedang berjalan atau tertunda', // Renamed
    completedProjects: 'Proyek Selesai', // Renamed
    completedProjectsDesc: 'Proyek yang berhasil diselesaikan', // Renamed
    pendingActions: 'Tindakan Tertunda',
    pendingActionsDesc: 'Proyek menunggu persetujuan atau langkah selanjutnya', // Renamed
    projectOverview: 'Gambaran Proyek', // Renamed
    allProjectsDesc: 'Semua proyek di seluruh divisi.', // Renamed
    divisionProjectsDesc: 'Proyek yang relevan dengan divisi {division}.', // Renamed
    noProjects: 'Tidak ada proyek ditemukan.', // Renamed
    assignedTo: 'Ditugaskan ke',
    nextAction: 'Berikutnya',
    projectCanceled: 'Proyek ini dibatalkan.', // Renamed
    projectCompleted: 'Proyek Selesai', // Renamed
    addNewProject: 'Tambah Proyek Baru', // Renamed
    status: {
      completed: 'Selesai',
      inprogress: 'Sedang Berjalan',
      pendingapproval: 'Menunggu Persetujuan',
      delayed: 'Tertunda',
      canceled: 'Dibatalkan',
      pending: 'Tertunda',
      scheduled: 'Terjadwal',
      pendinginput: 'Menunggu Input',
      pendingoffer: 'Menunggu Penawaran',
      pendingdpinvoice: 'Menunggu Faktur DP',
      pendingadminfiles: 'Menunggu File Admin',
      pendingarchitectfiles: 'Arsitek',
      pendingstructurefiles: 'Struktur',
      pendingfinalcheck: 'Menunggu Pemeriksaan Akhir',
      pendingscheduling: 'Menunggu Penjadwalan',
      owner: 'Pemilik', // Added translation for roles used in 'assignedTo'
      generaladmin: 'Admin Umum',
      adminproyek: 'Admin Proyek',
      arsitek: 'Arsitek',
      struktur: 'Struktur',
      admindeveloper: 'Admin Pengembang',
    },
     progress: '{progress}% Selesai',
     averageProgressTitle: 'Rata-rata Progres', // Added
     averageProgressDesc: 'Tingkat penyelesaian rata-rata di semua proyek Anda.', // Added
     // Removed statusDistributionTitle and statusDistributionDesc
  },
  // Projects Page (Renamed from Tasks Page)
  projectsPage: {
    statusLabel: 'Status',
    nextActionLabel: 'Tindakan Berikutnya',
    assignedLabel: 'Ditugaskan',
    progressLabel: 'Progres',
    none: 'Tidak Ada',
    uploadProgressTitle: 'Unggah Progres ({role})',
    descriptionLabel: 'Deskripsi / Catatan',
    descriptionPlaceholder: 'Berikan detail untuk tahap {division}...',
    attachFilesLabel: 'Lampirkan File',
    selectedFilesLabel: 'File terpilih:',
    submitButton: 'Kirim Progres',
    submittingButton: 'Mengirim...',
    ownerActionTitle: 'Tindakan Pemilik Diperlukan',
    ownerActionDesc: 'Tinjau dokumen yang dikirim dan putuskan apakah akan melanjutkan.',
    cancelProgressButton: 'Batalkan Progres',
    continueProgressButton: 'Lanjutkan Progres',
    cancelDialogTitle: 'Apakah Anda yakin?',
    cancelDialogDesc: 'Membatalkan progres ini tidak dapat dibatalkan. Status akan ditandai sebagai Dibatalkan.',
    cancelDialogCancel: 'Kembali',
    cancelDialogConfirm: 'Konfirmasi Pembatalan',
    scheduleSidangTitle: 'Jadwalkan Sidang ({role})',
    dateLabel: 'Tanggal',
    timeLabel: 'Waktu',
    locationLabel: 'Lokasi',
    locationPlaceholder: 'cth., Ruang Konferensi Utama',
    confirmScheduleButton: 'Konfirmasi Jadwal',
    schedulingButton: 'Menjadwalkan...',
    addCalendarButton: 'Tambahkan Sidang ke Google Kalender',
    addingCalendarButton: 'Menambahkan...',
    sidangOutcomeTitle: 'Nyatakan Hasil Sidang',
    sidangOutcomeDesc: 'Tandai progres sebagai berhasil diselesaikan atau gagal berdasarkan hasil sidang.',
    markSuccessButton: 'Tandai sebagai Berhasil',
    markFailButton: 'Tandai sebagai Gagal',
    completedMessage: 'Progres Berhasil Diselesaikan!',
    canceledMessage: 'Progres Dibatalkan',
    uploadedFilesTitle: 'File Terunggah',
    uploadedFilesDesc: 'Riwayat file yang diunggah selama proses.',
    loadingFiles: 'Memuat daftar file...',
    noFiles: 'Belum ada file yang diunggah.',
    uploadedByOn: 'Diunggah oleh {user} pada {date}',
    workflowHistoryTitle: 'Riwayat Alur Kerja',
    workflowHistoryDesc: 'Garis waktu tindakan yang diambil.',
    loadingHistory: 'Memuat riwayat...',
    historyActionBy: '{action} oleh {division}',
    projectListTitle: 'Daftar Proyek', // Renamed
    projectListDescription: 'Lihat dan kelola proyek yang sedang berjalan.', // Renamed
    filterButton: 'Filter berdasarkan Status',
    filterStatusLabel: 'Filter Status',
    filterClear: 'Tampilkan Semua',
    noProjectsFound: 'Tidak ada proyek yang cocok dengan filter saat ini.', // Renamed
    viewDetails: 'Lihat Detail',
    backToList: 'Kembali ke Daftar',
     toast: {
        permissionDenied: 'Izin Ditolak',
        notYourTurn: 'Bukan giliran Anda untuk memperbarui progres.',
        missingInput: 'Input Kurang',
        provideDescOrFile: 'Harap berikan deskripsi atau unggah file.',
        provideOfferFile: 'Harap unggah file penawaran.',
        offerSubmitted: 'Penawaran Terkirim',
        progressSubmitted: 'Progres Terkirim',
        notifiedNextStep: 'Memberitahu {division} untuk langkah selanjutnya.',
        onlyOwnerDecision: 'Hanya Pemilik yang dapat membuat keputusan ini.',
        progressCanceled: 'Progres Dibatalkan',
        offerApproved: 'Penawaran Disetujui',
        offerApprovedDesc: 'Admin Umum diberitahu untuk Faktur DP.',
        dpApproved: 'Faktur DP Disetujui',
        dpApprovedDesc: 'Admin Proyek diberitahu untuk File Admin.',
        progressCompleted: 'Progres Berhasil Diselesaikan!',
        failNotImplemented: 'Logika gagal belum diimplementasikan.',
        missingScheduleInfo: 'Info Jadwal Kurang',
        provideDateTimeLoc: 'Harap berikan tanggal, waktu, dan lokasi.',
        sidangScheduled: 'Sidang Dijadwalkan',
        sidangScheduledDesc: 'Semua pihak terkait diberitahu. Mencoba menambahkan ke kalender.',
        cannotAddCalendarYet: 'Belum Bisa Ditambahkan',
        mustScheduleFirst: 'Sidang harus dijadwalkan terlebih dahulu.',
        calendarError: 'Kesalahan Kalender',
        couldNotAddEvent: 'Tidak dapat menambahkan acara ke Google Kalender.',
        addedToCalendar: 'Ditambahkan ke Google Kalender',
        eventId: 'ID Acara: {id}',
        errorFindingSchedule: 'Kesalahan',
        couldNotFindSchedule: 'Tidak dapat menemukan informasi penjadwalan.',
      }
  },
   // Add Project Page (Renamed from Add Task Page)
   addProjectPage: {
       title: 'Buat Proyek Baru', // Renamed
       description: 'Masukkan judul proyek dan unggah file awal (Hanya Pemilik/Admin Umum).', // Renamed
       titleLabel: 'Judul Proyek', // Renamed
       titlePlaceholder: 'Masukkan judul proyek lengkap', // Renamed
       filesLabel: 'File Awal (Opsional)',
       filesHint: 'Unggah dokumen awal atau brief terkait proyek.', // Renamed
       createButton: 'Buat Proyek', // Renamed
       creatingButton: 'Membuat...',
       accessDenied: 'Anda tidak memiliki izin untuk menambahkan proyek baru.', // Renamed
       toast: {
           success: 'Proyek Dibuat', // Renamed
           successDesc: 'Proyek "{title}" berhasil ditambahkan. Admin Proyek diberitahu untuk penawaran.', // Renamed
           error: 'Gagal Membuat Proyek', // Renamed
       },
       validation: {
           titleMin: 'Judul proyek minimal 5 karakter.', // Renamed
       }
   },
  // Manage Users Page
  manageUsersPage: {
    title: 'Kelola Pengguna',
    description: 'Tambah, ubah, atau hapus akun pengguna (Hanya Pemilik, Admin Umum, Admin Pengembang).',
    addUserButton: 'Tambah Pengguna',
    addUserDialogTitle: 'Tambah Pengguna Baru',
    addUserDialogDesc: 'Masukkan detail untuk akun pengguna baru.',
    editUserButtonLabel: 'Ubah Pengguna',
    editUserDialogTitle: 'Ubah Pengguna: {username}',
    editUserDialogDesc: 'Perbarui nama pengguna atau peran untuk pengguna ini.',
    editUserSubmitButton: 'Simpan Perubahan',
    editingUserButton: 'Menyimpan...',
    usernameLabel: 'Nama Pengguna',
    usernamePlaceholder: 'cth., john_doe',
    passwordLabel: 'Kata Sandi',
    passwordPlaceholder: 'Masukkan kata sandi yang aman',
    roleLabel: 'Peran / Divisi',
    rolePlaceholder: 'Pilih divisi',
    cancelButton: 'Batal',
    addUserSubmitButton: 'Tambah Pengguna',
    addingUserButton: 'Menambahkan...',
    tableHeaderUsername: 'Nama Pengguna',
    tableHeaderPassword: 'Kata Sandi',
    tableHeaderRole: 'Peran / Divisi',
    tableHeaderActions: 'Tindakan',
    showPasswordButtonLabel: 'Tampilkan Kata Sandi',
    hidePasswordButtonLabel: 'Sembunyikan Kata Sandi',
    passwordHidden: 'Tersembunyi',
    passwordNotSet: 'Belum Diatur',
    noUsers: 'Tidak ada pengguna ditemukan.',
    deleteUserButtonLabel: 'Hapus Pengguna',
    deleteDialogTitle: 'Konfirmasi Penghapusan',
    deleteDialogDesc: 'Apakah Anda yakin ingin menghapus pengguna "{username}"? Tindakan ini tidak dapat dibatalkan.',
    deleteDialogCancel: 'Batal',
    deleteDialogConfirm: 'Hapus Pengguna',
    cannotChangeLastAdminRoleHint: 'Tidak dapat mengubah peran Admin Umum terakhir.',
    cannotChangeLastDevAdminRoleHint: 'Tidak dapat mengubah peran Admin Pengembang terakhir.',
    roles: {
       Owner: 'Pemilik',
       'General Admin': 'Admin Umum',
       'Admin Proyek': 'Admin Proyek',
       Arsitek: 'Arsitek',
       Struktur: 'Struktur',
       'Admin Developer': 'Admin Pengembang',
     },
    toast: {
        userAdded: 'Pengguna Ditambahkan',
        userAddedDesc: 'Pengguna {username} berhasil dibuat.',
        userUpdated: 'Pengguna Diperbarui',
        userUpdatedDesc: 'Pengguna {username} berhasil diperbarui.',
        userDeleted: 'Pengguna Dihapus',
        userDeletedDesc: 'Pengguna {username} dihapus.',
        error: 'Kesalahan',
        usernameExists: 'Nama pengguna sudah ada.',
        cannotDeleteSelf: 'Anda tidak dapat menghapus akun Anda sendiri.',
        cannotDeleteLastAdmin: 'Tidak dapat menghapus Admin Umum terakhir.',
        cannotDeleteLastDevAdmin: 'Tidak dapat menghapus Admin Pengembang terakhir.',
        cannotChangeLastAdminRole: 'Tidak dapat mengubah peran Admin Umum terakhir.',
        cannotChangeLastDevAdminRole: 'Tidak dapat mengubah peran Admin Pengembang terakhir.',
        permissionDenied: 'Izin Ditolak',
        editPermissionDenied: 'Anda tidak memiliki izin untuk mengubah pengguna ini.',
        devCannotEditOwnerGA: 'Admin Pengembang tidak dapat mengubah Pemilik atau Admin Umum.',
        gaCannotEditOwnerDev: 'Admin Umum tidak dapat mengubah Pemilik atau Admin Pengembang.',
        userNotFound: 'Pengguna tidak ditemukan.',
    },
    validation: {
       usernameMin: 'Nama pengguna minimal 3 karakter',
       passwordMin: 'Kata sandi minimal 6 karakter',
       roleRequired: 'Peran diperlukan',
       usernameExists: 'Nama pengguna sudah ada.',
    },
    accessDeniedTitle: 'Akses Ditolak',
    accessDeniedDesc: 'Anda tidak memiliki izin yang diperlukan untuk melihat halaman ini.',
  },
   // Admin Actions Page
   adminActionsPage: {
       title: 'Tindakan Admin - Ubah Judul Proyek', // Renamed
       description: 'Pengguna dengan izin yang sesuai (Pemilik, Admin Umum, Admin Proyek) dapat mengubah judul proyek di sini.', // Renamed
       tableHeaderId: 'ID Proyek', // Renamed
       tableHeaderTitle: 'Judul Saat Ini',
       tableHeaderStatus: 'Status',
       tableHeaderActions: 'Tindakan',
       noProjects: 'Tidak ada proyek ditemukan.', // Renamed
       toast: {
           error: 'Kesalahan',
           titleEmpty: 'Judul tidak boleh kosong.',
           titleUpdated: 'Judul Diperbarui',
           titleUpdatedDesc: 'Judul proyek {id} berhasil diubah.', // Renamed
       },
       accessDeniedTitle: 'Akses Ditolak',
       accessDeniedDesc: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
   },
  // Settings Page
  settingsPage: {
    title: 'Pengaturan',
    description: 'Kelola akun dan pengaturan aplikasi Anda.',
    profileCardTitle: 'Informasi Profil',
    usernameLabel: 'Nama Pengguna',
    usernamePlaceholder: 'Masukkan nama pengguna',
    displayNameLabel: 'Nama Tampilan',
    emailLabel: 'Alamat Email',
    emailPlaceholder: 'Masukkan email Anda',
    whatsappLabel: 'Nomor WhatsApp',
    whatsappPlaceholder: 'Masukkan nomor WhatsApp (opsional)',
    changePictureButton: 'Ubah Foto',
    uploadingPictureButton: 'Mengunggah...',
    pictureHint: 'Unggah foto profil baru (PNG, JPG). Maks 2MB.',
    updateProfileButton: 'Perbarui Profil',
    updatingProfileButton: 'Memperbarui...',
    passwordCardTitle: 'Perbarui Kata Sandi',
    currentPasswordLabel: 'Kata Sandi Saat Ini',
    currentPasswordPlaceholder: 'Masukkan kata sandi saat ini',
    newPasswordLabel: 'Kata Sandi Baru',
    newPasswordPlaceholder: 'Masukkan kata sandi baru',
    confirmPasswordLabel: 'Konfirmasi Kata Sandi Baru',
    confirmPasswordPlaceholder: 'Konfirmasi kata sandi baru',
    updatePasswordButton: 'Perbarui Kata Sandi',
    updatingPasswordButton: 'Memperbarui...',
    notificationsCardTitle: 'Preferensi Notifikasi',
    emailNotificationsLabel: 'Notifikasi Email',
    emailNotificationsHint: 'Terima pembaruan email untuk penugasan proyek dan perubahan status.', // Renamed
    inAppNotificationsLabel: 'Notifikasi Dalam Aplikasi',
    inAppNotificationsHint: 'Tampilkan notifikasi di dalam aplikasi.',
    languageCardTitle: 'Pengaturan Bahasa',
    languageCardDescription: 'Pilih bahasa tampilan pilihan Anda.',
    languageSelectLabel: 'Bahasa Tampilan',
    languageSelectPlaceholder: 'Pilih bahasa',
    languageSelectHint: 'Pilih bahasa untuk antarmuka aplikasi.',
    languageEnglish: 'Inggris',
    languageIndonesian: 'Bahasa Indonesia',
    toast: {
        error: 'Kesalahan',
        success: 'Berhasil',
        fieldsRequired: 'Semua kolom kata sandi harus diisi.',
        requiredFields: 'Nama Pengguna dan Email wajib diisi.',
        invalidEmail: 'Harap masukkan alamat email yang valid.',
        passwordsDontMatch: 'Kata sandi baru tidak cocok.',
        passwordTooShort: 'Kata sandi baru minimal 6 karakter.',
        passwordUpdated: 'Kata sandi berhasil diperbarui.',
        passwordUpdateFailed: 'Gagal memperbarui kata sandi. Periksa kata sandi saat ini.',
        usernameRequired: 'Nama pengguna tidak boleh kosong.',
        usernameTooShort: 'Nama pengguna minimal 3 karakter.',
        profileUpdated: 'Profil berhasil diperbarui.',
        profileUpdateFailed: 'Gagal memperbarui profil.',
        languageChanged: 'Bahasa Diubah',
        languageChangedDesc: 'Bahasa antarmuka diperbarui.',
        passwordMismatchError: 'Kata sandi saat ini tidak cocok.',
        usernameExistsError: 'Nama pengguna sudah ada. Silakan pilih yang lain.',
    }
  },
   // Notifications (General)
   notifications: {
       permissionGrantedTitle: "Notifikasi Diaktifkan",
       permissionGrantedDesc: "Anda sekarang akan menerima notifikasi.",
       permissionDeniedTitle: "Notifikasi Ditolak",
       permissionDeniedDesc: "Anda dapat mengaktifkan notifikasi nanti di pengaturan browser Anda.",
       permissionErrorTitle: "Kesalahan Izin",
       permissionErrorDesc: "Tidak dapat meminta izin notifikasi.",
       notSupportedTitle: "Notifikasi Tidak Didukung",
       notSupportedDesc: "Browser Anda tidak mendukung notifikasi.",
       tooltip: "Notifikasi",
       title: "Notifikasi",
       description: "Pembaruan terkini dan tindakan yang diperlukan.",
       empty: "Tidak ada notifikasi baru.",
   },
};

export default id;
