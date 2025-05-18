-- Contoh skema SQL untuk database Msarch App
-- Anda perlu menjalankan ini di server MySQL Anda (misalnya melalui phpMyAdmin)
-- untuk membuat tabel-tabel yang diperlukan.

-- Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL,
    password VARCHAR(255), -- Akan menyimpan hash password
    email VARCHAR(255) UNIQUE,
    whatsappNumber VARCHAR(50),
    profilePictureUrl VARCHAR(1024),
    displayName VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    googleRefreshToken TEXT,
    googleAccessToken TEXT,
    googleAccessTokenExpiresAt BIGINT -- Menyimpan timestamp epoch (milidetik)
);

-- Indeks untuk pencarian yang lebih cepat
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Tabel Proyek (Projects)
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    status VARCHAR(100) NOT NULL,
    progress INT DEFAULT 0,
    assignedDivision VARCHAR(100),
    nextAction TEXT,
    workflowId VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy VARCHAR(255) NOT NULL, -- ID atau username pengguna yang membuat
    scheduleDate DATE,
    scheduleTime TIME,
    scheduleLocation VARCHAR(255),
    surveyDate DATE,
    surveyTime TIME,
    surveyDescription TEXT
    -- Anda bisa menambahkan foreign key ke users(id) untuk createdBy jika diperlukan
    -- FOREIGN KEY (createdBy) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_assignedDivision ON projects(assignedDivision);

-- Tabel File Proyek (Project Files)
CREATE TABLE IF NOT EXISTS project_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projectId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    uploadedBy VARCHAR(255) NOT NULL, -- username atau ID pengguna
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    path VARCHAR(1024) NOT NULL, -- Path relatif terhadap PROJECT_FILES_BASE_DIR
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_files_projectId ON project_files(projectId);

-- Tabel Riwayat Alur Kerja Proyek (Project Workflow History)
CREATE TABLE IF NOT EXISTS project_workflow_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projectId VARCHAR(255) NOT NULL,
    division VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_workflow_history_projectId ON project_workflow_history(projectId);

-- Tabel Permintaan Izin (Leave Requests)
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    displayName VARCHAR(255),
    requestDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leaveType VARCHAR(100) NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    approvedRejectedBy VARCHAR(255), -- userId of Owner
    approvedRejectedAt TIMESTAMP NULL,
    rejectionReason TEXT,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_userId ON leave_requests(userId);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Tabel Notifikasi (Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    projectId VARCHAR(255),
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isRead BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL -- Jika proyek dihapus, projectId di notifikasi jadi NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_userId_isRead ON notifications(userId, isRead);

-- Tabel Alur Kerja (Workflows) - Disarankan untuk tetap menggunakan JSON untuk fleksibilitas
-- Jika Anda ingin memindahkannya ke DB, skemanya bisa seperti ini:
-- CREATE TABLE IF NOT EXISTS workflows (
--     id VARCHAR(255) PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     description TEXT,
--     steps JSON NOT NULL -- Menyimpan array langkah sebagai JSON
-- );

-- Tabel Hari Libur (Holidays) - Sama seperti Workflows, JSON mungkin lebih mudah dikelola
-- CREATE TABLE IF NOT EXISTS holidays (
--     id VARCHAR(255) PRIMARY KEY,
--     date DATE NOT NULL,
--     name VARCHAR(255) NOT NULL,
--     type VARCHAR(100) NOT NULL, -- National Holiday, Company Event, etc.
--     description TEXT
-- );
-- CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Catatan:
-- - Anda mungkin perlu menyesuaikan tipe data atau panjang field sesuai kebutuhan.
-- - Pertimbangkan untuk menggunakan UUID untuk ID agar lebih unik secara global jika aplikasi Anda berkembang.
-- - Password harus di-hash sebelum disimpan. Skema ini hanya menyediakan kolomnya.
-- - Untuk `steps` pada tabel `workflows`, menyimpan sebagai JSON bisa menjadi opsi jika struktur langkahnya kompleks dan bervariasi.
--   Alternatifnya adalah membuat tabel terpisah untuk `workflow_steps` dan `workflow_transitions` (lebih kompleks tapi lebih relasional).
--   Untuk saat ini, saya sarankan tetap menggunakan `workflows.json` dan `holidays.json` karena lebih mudah dimodifikasi.

