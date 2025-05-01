const en = {
  // Login Page
  login: {
    title: 'My Project Manager Login', // Updated title
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
  },
  // Dashboard Layout (Sidebar/Header)
  dashboardLayout: {
    menuTitle: 'Menu',
    menuDescription: 'Navigation and user options.',
    dashboard: 'Dashboard',
    tasks: 'Tasks',
    manageUsers: 'Manage Users',
    adminActions: 'Admin Actions',
    settings: 'Settings',
    logout: 'Logout',
    appTitle: 'My Project Manager', // Updated application title
    toggleMenu: 'Toggle Menu Panel',
  },
  // Dashboard Page
  dashboardPage: {
    title: 'Dashboard',
    activeTasks: 'Active Tasks',
    activeTasksDesc: 'Tasks currently in progress or pending',
    completedTasks: 'Completed Tasks',
    completedTasksDesc: 'Tasks successfully finished',
    pendingActions: 'Pending Actions',
    pendingActionsDesc: 'Tasks awaiting approval or next step',
    taskOverview: 'Task Overview',
    allTasksDesc: 'All tasks across divisions.',
    divisionTasksDesc: 'Tasks relevant to the {division} division.', // Use {division} as placeholder
    noTasks: 'No tasks found.',
    assignedTo: 'Assigned to',
    nextAction: 'Next',
    taskCanceled: 'This task was canceled.',
    status: {
      completed: 'Completed',
      inprogress: 'In Progress', // Corrected key
      pendingapproval: 'Pending Approval', // Corrected key
      delayed: 'Delayed',
      canceled: 'Canceled',
      pending: 'Pending',
      scheduled: 'Scheduled', // Added status
    },
    progress: '{progress}% Complete', // Use {progress} as placeholder
  },
  // Tasks Page
  tasksPage: {
    statusLabel: 'Status',
    nextActionLabel: 'Next Action',
    assignedLabel: 'Assigned',
    progressLabel: 'Progress',
    none: 'None',
    uploadProgressTitle: 'Upload Progress ({role})', // Use {role}
    descriptionLabel: 'Description / Notes',
    descriptionPlaceholder: 'Provide details for the {division} stage...', // Use {division}
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
    scheduleSidangTitle: 'Schedule Sidang ({role})', // Use {role}
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
    markFailButton: 'Mark as Fail', // Added Fail button text
    completedMessage: 'Progress Completed Successfully!',
    canceledMessage: 'Progress Canceled',
    uploadedFilesTitle: 'Uploaded Files',
    uploadedFilesDesc: 'History of files uploaded during the process.',
    loadingFiles: 'Loading file list...',
    noFiles: 'No files uploaded yet.',
    uploadedByOn: 'Uploaded by {user} on {date}', // Use {user}, {date}
    workflowHistoryTitle: 'Workflow History',
    workflowHistoryDesc: 'Timeline of actions taken.',
    loadingHistory: 'Loading history...',
    historyActionBy: '{action} by {division}', // Use {action}, {division}
    toast: {
      permissionDenied: 'Permission Denied',
      notYourTurn: 'Not your turn to update progress.',
      missingInput: 'Missing Input',
      provideDescOrFile: 'Please provide a description or upload files.',
      progressSubmitted: 'Progress Submitted',
      notifiedNextStep: 'Notified {division} for next step.', // Use {division}
      onlyOwnerDecision: 'Only Owner can make this decision.',
      progressCanceled: 'Progress Canceled',
      offerApproved: 'Offer Approved',
      offerApprovedDesc: 'General Admin notified for DP Invoice.',
      dpApproved: 'DP Invoice Approved',
      dpApprovedDesc: 'Project Admin notified for Admin Files.',
      progressCompleted: 'Progress Completed Successfully!',
      failNotImplemented: 'Fail logic not implemented yet.', // Added Fail logic message
      missingScheduleInfo: 'Missing Schedule Info',
      provideDateTimeLoc: 'Please provide date, time, and location.',
      sidangScheduled: 'Sidang Scheduled',
      sidangScheduledDesc: 'All relevant parties notified.',
      cannotAddCalendarYet: 'Cannot Add Yet',
      mustScheduleFirst: 'Sidang must be scheduled first.',
      calendarError: 'Calendar Error',
      couldNotAddEvent: 'Could not add event to Google Calendar.',
      addedToCalendar: 'Added to Google Calendar',
      eventId: 'Event ID: {id}', // Use {id}
      errorFindingSchedule: 'Error',
      couldNotFindSchedule: 'Could not find scheduling information.',
    }
  },
  // Manage Users Page
  manageUsersPage: {
    title: 'Manage Users',
    description: 'Add, edit, or remove user accounts for all divisions (Owner/GA only).', // Updated description
    addUserButton: 'Add User',
    addUserDialogTitle: 'Add New User',
    addUserDialogDesc: 'Enter the details for the new user account.',
    editUserButtonLabel: 'Edit User', // Added
    editUserDialogTitle: 'Edit User: {username}', // Added {username}
    editUserDialogDesc: 'Update the username or role for this user.', // Added
    editUserSubmitButton: 'Save Changes', // Added
    editingUserButton: 'Saving...', // Added
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
    tableHeaderPassword: 'Password', // Added Password header
    tableHeaderRole: 'Role / Division',
    tableHeaderActions: 'Actions',
    showPasswordButtonLabel: 'Show Password', // Added
    hidePasswordButtonLabel: 'Hide Password', // Added
    noUsers: 'No users found.',
    deleteUserButtonLabel: 'Delete User', // Added
    deleteDialogTitle: 'Confirm Deletion',
    deleteDialogDesc: 'Are you sure you want to delete user "{username}"? This action cannot be undone.', // Use {username}
    deleteDialogCancel: 'Cancel',
    deleteDialogConfirm: 'Delete User',
    cannotChangeLastAdminRoleHint: 'Cannot change the role of the last General Admin.', // Added
    roles: { // Added role translations
      Owner: 'Owner',
      'General Admin': 'General Admin',
      'Admin Proyek': 'Project Admin',
      Arsitek: 'Architect',
      Struktur: 'Structure',
    },
    toast: {
      userAdded: 'User Added',
      userAddedDesc: 'User {username} created successfully.', // Use {username}
      userUpdated: 'User Updated', // Added
      userUpdatedDesc: 'User {username} updated successfully.', // Added {username}
      userDeleted: 'User Deleted',
      userDeletedDesc: 'User {username} removed.', // Use {username} instead of ID
      error: 'Error',
      usernameExists: 'Username already exists.',
      cannotDeleteSelf: 'You cannot delete your own account.', // Added
      cannotDeleteLastAdmin: 'Cannot delete the last General Admin.', // Added
      cannotChangeLastAdminRole: 'Cannot change the role of the last General Admin.', // Added
    },
    validation: {
      usernameMin: 'Username must be at least 3 characters',
      passwordMin: 'Password must be at least 6 characters',
      roleRequired: 'Role is required',
    }
  },
  // Admin Actions Page (Reusing some strings here for access denied)
  adminActionsPage: {
      title: 'Admin Actions - Modify Task Titles',
      description: 'Users with appropriate permissions (Owner, General Admin, Admin Proyek) can modify task titles here.',
      tableHeaderId: 'Task ID',
      tableHeaderTitle: 'Current Title',
      tableHeaderStatus: 'Status',
      tableHeaderActions: 'Actions',
      noTasks: 'No tasks found.',
      toast: {
          error: 'Error',
          titleEmpty: 'Title cannot be empty.',
          titleUpdated: 'Title Updated',
          titleUpdatedDesc: 'Task {id} title changed successfully.', // Use {id}
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
    usernameHint: 'Username cannot be changed.', // Kept for reference, but now editable
    usernamePlaceholder: 'Enter new username', // Added placeholder
    updateProfileButton: 'Update Profile', // Added button text
    updatingProfileButton: 'Updating...', // Added button loading state text
    passwordCardTitle: 'Update Password', // Changed title
    currentPasswordLabel: 'Current Password',
    currentPasswordPlaceholder: 'Enter current password',
    newPasswordLabel: 'New Password',
    newPasswordPlaceholder: 'Enter new password',
    confirmPasswordLabel: 'Confirm New Password',
    confirmPasswordPlaceholder: 'Confirm new password',
    updatePasswordButton: 'Update Password',
    updatingPasswordButton: 'Updating...', // Added state for button
    notificationsCardTitle: 'Notification Preferences',
    emailNotificationsLabel: 'Email Notifications',
    emailNotificationsHint: 'Receive email updates for task assignments and status changes.',
    inAppNotificationsLabel: 'In-App Notifications',
    inAppNotificationsHint: 'Show notifications within the application.', // Updated hint
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
        passwordsDontMatch: 'New passwords do not match.',
        passwordTooShort: 'New password must be at least 6 characters.',
        passwordUpdated: 'Password updated successfully.',
        passwordUpdateFailed: 'Failed to update password. Check current password.',
        usernameRequired: 'Username cannot be empty.', // Added username validation
        usernameTooShort: 'Username must be at least 3 characters.', // Added username validation
        profileUpdated: 'Profile updated successfully.', // Added profile success message
        profileUpdateFailed: 'Failed to update profile.', // Added profile error message
        languageChanged: 'Language Changed', // Added language change toast title
        languageChangedDesc: 'Interface language updated.', // Added language change toast description
    }
  },
};

export default en;
