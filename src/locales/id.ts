
// src/locales/id.ts
const id = {
  // Login Page
  login: {
    title: 'Login Msaarch APP',
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
    bypassButton: 'Lewati Login sebagai Admin (Dev)', // New
    bypassTitle: 'Lewati Login', // New
    bypassing: 'Melewati...', // New
    // Google related translations removed
     validation: {
        usernameRequired: 'Nama pengguna wajib diisi.',
        passwordRequired: 'Kata sandi wajib diisi.',
     }
  },
  // Account Setup Page translations removed
  // dashboardLayout, dashboardPage, tasksPage, manageUsersPage, adminActionsPage, settingsPage remain the same
   // Dashboard Layout (Sidebar/Header)
   dashboardLayout: {
    menuTitle: 'Menu',
    menuDescription: 'Navigasi dan opsi pengguna.',
    dashboard: 'Dasbor',
    tasks: 'Tugas',
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
    activeTasks: 'Tugas Aktif',
    activeTasksDesc: 'Tugas yang sedang berjalan atau tertunda',
    completedTasks: 'Tugas Selesai',
    completedTasksDesc: 'Tugas yang berhasil diselesaikan',
    pendingActions: 'Tindakan Tertunda',
    pendingActionsDesc: 'Tugas menunggu persetujuan atau langkah selanjutnya',
    taskOverview: 'Gambaran Tugas',
    allTasksDesc: 'Semua tugas di seluruh divisi.',
    divisionTasksDesc: 'Tugas yang relevan dengan divisi {division}.',
    noTasks: 'Tidak ada tugas ditemukan.',
    assignedTo: 'Ditugaskan ke',
    nextAction: 'Berikutnya',
    taskCanceled: 'Tugas ini dibatalkan.',
    taskCompleted: 'Tugas Selesai', // Added translation
    addNewTask: 'Tambah Tugas Baru', // Added translation
    status: {
      completed: 'Selesai',
      inprogress: 'Sedang Berjalan',
      pendingapproval: 'Menunggu Persetujuan',
      delayed: 'Tertunda',
      canceled: 'Dibatalkan',
      pending: 'Tertunda',
      scheduled: 'Terjadwal',
      pendinginput: 'Menunggu Input', // Added status if needed
      pendingoffer: 'Menunggu Penawaran', // Added status if needed
      pendingdpinvoice: 'Menunggu Faktur DP', // Added status if needed
      pendingadminfiles: 'Menunggu File Admin', // Added status if needed
      pendingarchitectfiles: 'Menunggu File Arsitek', // Added status if needed
      pendingstructurefiles: 'Menunggu File Struktur', // Added status if needed
      pendingfinalcheck: 'Menunggu Pemeriksaan Akhir', // Added status if needed
      pendingscheduling: 'Menunggu Penjadwalan', // Added status if needed
    },
     progress: '{progress}% Selesai',
  },
  // Tasks Page
  tasksPage: {
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
     toast: {
        permissionDenied: 'Izin Ditolak',
        notYourTurn: 'Bukan giliran Anda untuk memperbarui progres.',
        missingInput: 'Input Kurang',
        provideDescOrFile: 'Harap berikan deskripsi atau unggah file.',
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
        sidangScheduledDesc: 'Semua pihak terkait diberitahu.',
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
  // Manage Users Page
  manageUsersPage: {
    title: 'Kelola Pengguna',
    description: 'Tambah, ubah, atau hapus akun pengguna untuk semua divisi (Hanya Pemilik/Admin Umum/Admin Pengembang).',
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
    showPasswordButtonLabel: 'Tampilkan Kata Sandi', // Updated Label
    hidePasswordButtonLabel: 'Sembunyikan Kata Sandi', // Updated Label
    passwordHidden: 'Tersembunyi', // Added translation for hidden password
    noUsers: 'Tidak ada pengguna ditemukan.',
    deleteUserButtonLabel: 'Hapus Pengguna',
    deleteDialogTitle: 'Konfirmasi Penghapusan',
    deleteDialogDesc: 'Apakah Anda yakin ingin menghapus pengguna "{username}"? Tindakan ini tidak dapat dibatalkan.',
    deleteDialogCancel: 'Batal',
    deleteDialogConfirm: 'Hapus Pengguna',
    cannotChangeLastAdminRoleHint: 'Tidak dapat mengubah peran Admin Umum terakhir.',
    cannotChangeLastDevAdminRoleHint: 'Tidak dapat mengubah peran Admin Pengembang terakhir.', // Added
    activateUserButtonLabel: 'Aktifkan Pengguna', // Kept
    activateUserDialogTitle: 'Aktifkan Pengguna', // Kept
    activateUserDialogDesc: 'Tetapkan peran untuk mengaktifkan pengguna "{username}".', // Kept
    activateUserSubmitButton: 'Aktifkan Pengguna', // Kept
    activatingUserButton: 'Mengaktifkan...', // Kept
    roles: {
       Owner: 'Pemilik',
       'General Admin': 'Admin Umum',
       'Admin Proyek': 'Admin Proyek',
       Arsitek: 'Arsitek',
       Struktur: 'Struktur',
       'Admin Developer': 'Admin Pengembang', // Added role
       Pending: 'Menunggu Aktivasi', // Kept
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
        cannotDeleteLastDevAdmin: 'Tidak dapat menghapus Admin Pengembang terakhir.', // Added
        cannotChangeLastAdminRole: 'Tidak dapat mengubah peran Admin Umum terakhir.',
        cannotChangeLastDevAdminRole: 'Tidak dapat mengubah peran Admin Pengembang terakhir.', // Added
        permissionDenied: 'Izin Ditolak', // Added
        devCannotEditOwnerGA: 'Admin Pengembang tidak dapat mengubah Pemilik atau Admin Umum.', // Added
        gaCannotEditOwnerDev: 'Admin Umum tidak dapat mengubah Pemilik atau Admin Pengembang.', // Added
        activateUserSuccess: 'Pengguna Diaktifkan', // Kept
        activateUserDesc: 'Pengguna {username} telah diaktifkan.', // Kept
        activateUserError: 'Aktivasi Gagal', // Kept
        activateUserErrorDesc: 'Tidak dapat mengaktifkan pengguna {username}.', // Kept
        cannotEditPending: 'Aktifkan pengguna terlebih dahulu sebelum mengubah.', // Kept
    },
    validation: {
       usernameMin: 'Nama pengguna minimal 3 karakter',
       passwordMin: 'Kata sandi minimal 6 karakter',
       roleRequired: 'Peran diperlukan',
       usernameExists: 'Nama pengguna sudah ada.', // Added validation message
    }
  },
   // Admin Actions Page
   adminActionsPage: {
       title: 'Tindakan Admin - Ubah Judul Tugas',
       description: 'Pengguna dengan izin yang sesuai (Pemilik, Admin Umum, Admin Proyek) dapat mengubah judul tugas di sini.',
       tableHeaderId: 'ID Tugas',
       tableHeaderTitle: 'Judul Saat Ini',
       tableHeaderStatus: 'Status',
       tableHeaderActions: 'Tindakan',
       noTasks: 'Tidak ada tugas ditemukan.',
       toast: {
           error: 'Kesalahan',
           titleEmpty: 'Judul tidak boleh kosong.',
           titleUpdated: 'Judul Diperbarui',
           titleUpdatedDesc: 'Judul tugas {id} berhasil diubah.',
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
    usernameHint: 'Masukkan nama pengguna baru Anda.', // Updated hint
    usernamePlaceholder: 'Masukkan nama pengguna baru',
    updateProfileButton: 'Perbarui Nama Pengguna', // Changed button text
    updatingProfileButton: 'Memperbarui...', // Changed button text
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
    emailNotificationsHint: 'Terima pembaruan email untuk penugasan tugas dan perubahan status.',
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
      passwordsDontMatch: 'Kata sandi baru tidak cocok.',
      passwordTooShort: 'Kata sandi baru minimal 6 karakter.',
      passwordUpdated: 'Kata sandi berhasil diperbarui.',
      passwordUpdateFailed: 'Gagal memperbarui kata sandi. Periksa kata sandi saat ini.',
      usernameRequired: 'Nama pengguna tidak boleh kosong.',
      usernameTooShort: 'Nama pengguna minimal 3 karakter.',
      profileUpdated: 'Nama pengguna berhasil diperbarui.', // Changed text
      profileUpdateFailed: 'Gagal memperbarui nama pengguna.', // Changed text
      languageChanged: 'Bahasa Diubah',
      languageChangedDesc: 'Bahasa antarmuka diperbarui.',
      passwordMismatchError: 'Kata sandi saat ini tidak cocok.',
      usernameExistsError: 'Nama pengguna sudah ada. Silakan pilih yang lain.',
    }
  },
};

export default id;

