// src/locales/en.ts
const en = {
  // Login Page
  login: {
    title: 'Msaarch APP Login',
    description: 'Enter your credentials.', // Simplified description
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter your username',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    loginButton: 'Login',
    loggingIn: 'Logging in...',
    success: 'Login Successful',
    redirecting: 'Redirecting to dashboard...',
    fail: 'Login Failed',
    invalidCredentials: 'Invalid username or password.',
    bypassButton: 'Bypass Login as Admin (Dev)',
    bypassTitle: 'Bypass Login',
    bypassing: 'Bypassing...',
    validation: {
        usernameRequired: 'Username is required.',
        passwordRequired: 'Password is required.',
    }
  },
  // Dashboard Layout
  dashboardLayout: {
    menuTitle: 'Menu',
    menuDescription: 'Navigation and user options.',
    dashboard: 'Dashboard',
    projects: 'Projects', // Renamed
    manageUsers: 'Manage Users',
    adminActions: 'Admin Actions',
    settings: 'Settings',
    logout: 'Logout',
    appTitle: 'Msaarch APP',
    toggleMenu: 'Toggle Menu Panel',
  },
  // Dashboard Page
  dashboardPage: {
    title: 'Dashboard',
    activeProjects: 'Active Projects', // Renamed
    activeProjectsDesc: 'Projects currently in progress or pending', // Renamed
    completedProjects: 'Completed Projects', // Renamed
    completedProjectsDesc: 'Projects successfully finished', // Renamed
    pendingActions: 'Pending Actions',
    pendingActionsDesc: 'Projects awaiting approval or next step', // Renamed
    projectOverview: 'Project Overview', // Renamed
    allProjectsDesc: 'All projects across divisions.', // Renamed
    divisionProjectsDesc: 'Projects relevant to the {division} division.', // Renamed
    noProjects: 'No projects found.', // Renamed
    assignedTo: 'Assigned to',
    nextAction: 'Next',
    projectCanceled: 'This project was canceled.', // Renamed
    projectCompleted: 'Project Completed', // Renamed
    addNewProject: 'Add New Project', // Renamed
    status: {
      completed: 'Completed',
      inprogress: 'In Progress',
      pendingapproval: 'Pending Approval',
      delayed: 'Delayed',
      canceled: 'Canceled',
      pending: 'Pending',
      scheduled: 'Scheduled',
      pendinginput: 'Pending Input',
      pendingoffer: 'Pending Offer',
      pendingdpinvoice: 'Pending DP Invoice',
      pendingadminfiles: 'Pending Admin Files',
      pendingarchitectfiles: 'Architect', // Corrected spelling
      pendingstructurefiles: 'Structure', // Corrected spelling
      pendingfinalcheck: 'Pending Final Check',
      pendingscheduling: 'Pending Scheduling',
      owner: 'Owner', // Added translation for roles used in 'assignedTo'
      generaladmin: 'General Admin',
      adminproyek: 'Project Admin',
      arsitek: 'Architect',
      struktur: 'Structure',
      admindeveloper: 'Admin Developer',
    },
    progress: '{progress}% Complete',
    averageProgressTitle: 'Average Progress',
    averageProgressDesc: 'Average completion rate across all your projects.',
    statusDistributionTitle: 'Project Status Distribution', // Added
    statusDistributionDesc: 'Overview of projects by current status.', // Added
    noProjectDataForChart: 'No project data available for chart.', // Added
  },
  // Projects Page (Renamed from Tasks Page)
  projectsPage: {
    statusLabel: 'Status',
    nextActionLabel: 'Next Action',
    assignedLabel: 'Assigned',
    progressLabel: 'Progress',
    none: 'None',
    uploadProgressTitle: 'Upload Progress ({role})',
    descriptionLabel: 'Description / Notes',
    descriptionPlaceholder: 'Provide details for the {division} stage...',
    attachFilesLabel: 'Attach Files',
    selectedFilesLabel: 'Selected files:',
    submitButton: 'Submit Progress',
    submittingButton: 'Submitting...',
    ownerActionTitle: 'Owner Action Required',
    ownerActionDesc: 'Review the submitted documents and decide whether to proceed.',
    cancelProgressButton: 'Cancel Progress',
    continueProgressButton: 'Continue Progress',
    cancelDialogTitle: 'Are you sure?',
    cancelDialogDesc: 'Canceling this progress cannot be undone. The status will be marked as Canceled.',
    cancelDialogCancel: 'Back',
    cancelDialogConfirm: 'Confirm Cancelation',
    scheduleSidangTitle: 'Schedule Sidang ({role})',
    dateLabel: 'Date',
    timeLabel: 'Time',
    locationLabel: 'Location',
    locationPlaceholder: 'e.g., Main Conference Room',
    confirmScheduleButton: 'Confirm Schedule',
    schedulingButton: 'Scheduling...',
    addCalendarButton: 'Add Sidang to Google Calendar',
    addingCalendarButton: 'Adding...',
    sidangOutcomeTitle: 'Declare Sidang Outcome',
    sidangOutcomeDesc: 'Mark the progress as completed successfully or failed based on the sidang results.',
    markSuccessButton: 'Mark as Success',
    markFailButton: 'Mark as Fail',
    completedMessage: 'Progress Completed Successfully!',
    canceledMessage: 'Progress Canceled',
    uploadedFilesTitle: 'Uploaded Files',
    uploadedFilesDesc: 'History of files uploaded during the process.',
    loadingFiles: 'Loading file list...',
    noFiles: 'No files uploaded yet.',
    uploadedByOn: 'Uploaded by {user} on {date}',
    workflowHistoryTitle: 'Workflow History',
    workflowHistoryDesc: 'Timeline of actions taken.',
    loadingHistory: 'Loading history...',
    historyActionBy: '{action} by {division}',
    projectListTitle: 'Project List', // Renamed
    projectListDescription: 'View and manage ongoing projects.', // Renamed
    filterButton: 'Filter by Status',
    filterStatusLabel: 'Filter Statuses',
    filterClear: 'Show All',
    noProjectsFound: 'No projects match the current filters.', // Renamed
    viewDetails: 'View Details',
    backToList: 'Back to List',
    toast: {
      permissionDenied: 'Permission Denied',
      notYourTurn: 'Not your turn to update progress.',
      missingInput: 'Missing Input',
      provideDescOrFile: 'Please provide a description or upload files.',
      provideOfferFile: 'Please upload offer files.',
      offerSubmitted: 'Offer Submitted',
      progressSubmitted: 'Progress Submitted',
      notifiedNextStep: 'Notified {division} for next step.',
      onlyOwnerDecision: 'Only Owner can make this decision.',
      progressCanceled: 'Progress Canceled',
      offerApproved: 'Offer Approved',
      offerApprovedDesc: 'General Admin notified for DP Invoice.',
      dpApproved: 'DP Invoice Approved',
      dpApprovedDesc: 'Project Admin notified for Admin Files.',
      progressCompleted: 'Progress Completed Successfully!',
      failNotImplemented: 'Fail logic not implemented yet.',
      missingScheduleInfo: 'Missing Schedule Info',
      provideDateTimeLoc: 'Please provide date, time, and location.',
      sidangScheduled: 'Sidang Scheduled',
      sidangScheduledDesc: 'All relevant parties notified. Attempting to add to calendar.',
      cannotAddCalendarYet: 'Cannot Add Yet',
      mustScheduleFirst: 'Sidang must be scheduled first.',
      calendarError: 'Calendar Error',
      couldNotAddEvent: 'Could not add event to Google Calendar.',
      addedToCalendar: 'Added to Google Calendar',
      eventId: 'Event ID: {id}',
      errorFindingSchedule: 'Error',
      couldNotFindSchedule: 'Could not find scheduling information.',
    }
  },
  // Add Project Page (Renamed from Add Task Page)
  addProjectPage: {
      title: 'Create New Project', // Renamed
      description: 'Enter the project title and upload initial files (Owner/General Admin only).', // Renamed
      titleLabel: 'Project Title', // Renamed
      titlePlaceholder: 'Enter the full project title', // Renamed
      filesLabel: 'Initial Files (Optional)',
      filesHint: 'Upload any initial documents or briefs related to the project.', // Renamed
      createButton: 'Create Project', // Renamed
      creatingButton: 'Creating...',
      accessDenied: 'You do not have permission to add new projects.', // Renamed
      toast: {
          success: 'Project Created', // Renamed
          successDesc: 'Project "{title}" added successfully. Project Admin notified for offer.', // Renamed
          error: 'Failed to Create Project', // Renamed
      },
      validation: {
          titleMin: 'Project title must be at least 5 characters.', // Renamed
      }
  },
  // Manage Users Page
  manageUsersPage: {
    title: 'Manage Users',
    description: 'Add, edit, or remove user accounts (Owner, General Admin, Admin Developer only).',
    addUserButton: 'Add User',
    addUserDialogTitle: 'Add New User',
    addUserDialogDesc: 'Enter the details for the new user account.',
    editUserButtonLabel: 'Edit User',
    editUserDialogTitle: 'Edit User: {username}',
    editUserDialogDesc: 'Update the username or role for this user.',
    editUserSubmitButton: 'Save Changes',
    editingUserButton: 'Saving...',
    usernameLabel: 'Username',
    usernamePlaceholder: 'e.g., john_doe',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter secure password',
    roleLabel: 'Role / Division',
    rolePlaceholder: 'Select a division',
    cancelButton: 'Cancel',
    addUserSubmitButton: 'Add User',
    addingUserButton: 'Adding...',
    tableHeaderUsername: 'Username',
    tableHeaderPassword: 'Password',
    tableHeaderRole: 'Role / Division',
    tableHeaderActions: 'Actions',
    showPasswordButtonLabel: 'Show Password',
    hidePasswordButtonLabel: 'Hide Password',
    passwordHidden: 'Hidden',
    passwordNotSet: 'Not Set',
    noUsers: 'No users found.',
    deleteUserButtonLabel: 'Delete User',
    deleteDialogTitle: 'Confirm Deletion',
    deleteDialogDesc: 'Are you sure you want to delete user "{username}"? This action cannot be undone.',
    deleteDialogCancel: 'Cancel',
    deleteDialogConfirm: 'Delete User',
    cannotChangeLastAdminRoleHint: 'Cannot change the role of the last General Admin.',
    cannotChangeLastDevAdminRoleHint: 'Cannot change the role of the last Admin Developer.',
    roles: {
      Owner: 'Owner',
      'General Admin': 'General Admin',
      'Admin Proyek': 'Project Admin',
      Arsitek: 'Architect', // Corrected spelling
      Struktur: 'Structure', // Corrected spelling
      'Admin Developer': 'Admin Developer',
    },
    toast: {
      userAdded: 'User Added',
      userAddedDesc: 'User {username} created successfully.',
      userUpdated: 'User Updated',
      userUpdatedDesc: 'User {username} updated successfully.',
      userDeleted: 'User Deleted',
      userDeletedDesc: 'User {username} removed.',
      error: 'Error',
      usernameExists: 'Username already exists.',
      cannotDeleteSelf: 'You cannot delete your own account.',
      cannotDeleteLastAdmin: 'Cannot delete the last General Admin.',
      cannotDeleteLastDevAdmin: 'Cannot delete the last Admin Developer.',
      cannotChangeLastAdminRole: 'Cannot change the role of the last General Admin.',
      cannotChangeLastDevAdminRole: 'Cannot change the role of the last Admin Developer.',
      permissionDenied: 'Permission Denied',
      editPermissionDenied: 'You do not have permission to edit this user.',
      devCannotEditOwnerGA: 'Admin Developer cannot edit Owner or General Admin.',
      gaCannotEditOwnerDev: 'General Admin cannot edit Owner or Admin Developer.',
      userNotFound: 'User not found.',
    },
    validation: {
      usernameMin: 'Username must be at least 3 characters',
      passwordMin: 'Password must be at least 6 characters',
      roleRequired: 'Role is required',
      usernameExists: 'Username already exists.',
    },
    accessDeniedTitle: 'Access Denied',
    accessDeniedDesc: 'You do not have the required permissions to view this page.',
  },
  // Admin Actions Page
  adminActionsPage: {
      title: 'Admin Actions - Modify Project Titles', // Renamed
      description: 'Users with appropriate permissions (Owner, General Admin, Admin Proyek) can modify project titles here.', // Renamed
      tableHeaderId: 'Project ID', // Renamed
      tableHeaderTitle: 'Current Title',
      tableHeaderStatus: 'Status',
      tableHeaderActions: 'Actions',
      noProjects: 'No projects found.', // Renamed
      toast: {
          error: 'Error',
          titleEmpty: 'Title cannot be empty.',
          titleUpdated: 'Title Updated',
          titleUpdatedDesc: 'Project {id} title changed successfully.', // Renamed
      },
       accessDeniedTitle: 'Access Denied',
       accessDeniedDesc: 'You do not have permission to access this page.',
  },
  // Settings Page
  settingsPage: {
    title: 'Settings',
    description: 'Manage your account and application settings.',
    profileCardTitle: 'Profile Information',
    usernameLabel: 'Username',
    usernamePlaceholder: 'Enter username',
    displayNameLabel: 'Display Name',
    emailLabel: 'Email Address',
    emailPlaceholder: 'Enter your email',
    whatsappLabel: 'WhatsApp Number',
    whatsappPlaceholder: 'Enter WhatsApp number (optional)',
    changePictureButton: 'Change Picture',
    uploadingPictureButton: 'Uploading...',
    pictureHint: 'Upload a new profile picture (PNG, JPG). Max 2MB.',
    updateProfileButton: 'Update Profile',
    updatingProfileButton: 'Updating...',
    passwordCardTitle: 'Update Password',
    currentPasswordLabel: 'Current Password',
    currentPasswordPlaceholder: 'Enter current password',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Enter new password',
    confirmPasswordLabel: 'Confirm New Password',
    confirmPasswordPlaceholder: 'Confirm new password',
    updatePasswordButton: 'Update Password',
    updatingPasswordButton: 'Updating...',
    notificationsCardTitle: 'Notification Preferences',
    emailNotificationsLabel: 'Email Notifications',
    emailNotificationsHint: 'Receive email updates for project assignments and status changes.', // Renamed
    inAppNotificationsLabel: 'In-App Notifications',
    inAppNotificationsHint: 'Show notifications within the application.',
    languageCardTitle: 'Language Settings',
    languageCardDescription: 'Choose your preferred display language.',
    languageSelectLabel: 'Display Language',
    languageSelectPlaceholder: 'Select language',
    languageSelectHint: 'Select the language for the application interface.',
    languageEnglish: 'English',
    languageIndonesian: 'Bahasa Indonesia',
    toast: {
        error: 'Error',
        success: 'Success',
        fieldsRequired: 'All password fields are required.',
        requiredFields: 'Username and Email are required.',
        invalidEmail: 'Please enter a valid email address.',
        passwordsDontMatch: 'New passwords do not match.',
        passwordTooShort: 'New password must be at least 6 characters.',
        passwordUpdated: 'Password updated successfully.',
        passwordUpdateFailed: 'Failed to update password. Check current password.',
        usernameRequired: 'Username cannot be empty.',
        usernameTooShort: 'Username must be at least 3 characters.',
        profileUpdated: 'Profile updated successfully.',
        profileUpdateFailed: 'Failed to update profile.',
        languageChanged: 'Language Changed',
        languageChangedDesc: 'Interface language updated.',
        passwordMismatchError: 'Current password does not match.',
        usernameExistsError: 'Username already exists. Please choose another.',
    }
  },
  // Notifications (General)
  notifications: {
      permissionGrantedTitle: "Notifications Enabled",
      permissionGrantedDesc: "You will now receive notifications.",
      permissionDeniedTitle: "Notifications Denied",
      permissionDeniedDesc: "You can enable notifications later in your browser settings.",
      permissionErrorTitle: "Permission Error",
      permissionErrorDesc: "Could not request notification permission.",
      notSupportedTitle: "Notifications Not Supported",
      notSupportedDesc: "Your browser does not support notifications.",
      tooltip: "Notifications",
      title: "Notifications",
      description: "Recent updates and required actions.",
      empty: "No new notifications.",
  },
};

export default en;
