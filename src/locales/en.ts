
// src/locales/en.ts
const en = {
  // Login Page
  login: {
    title: 'Msaarch APP Login',
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
    bypassButton: 'Bypass Login as Admin (Dev)', // New
    bypassTitle: 'Bypass Login', // New
    bypassing: 'Bypassing...', // New
    // Google related translations removed
    validation: {
        usernameRequired: 'Username is required.',
        passwordRequired: 'Password is required.',
    }
  },
  // Account Setup Page translations removed
  // dashboardLayout, dashboardPage, tasksPage, manageUsersPage, adminActionsPage, settingsPage remain the same
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
    appTitle: 'Msaarch APP',
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
    divisionTasksDesc: 'Tasks relevant to the {division} division.',
    noTasks: 'No tasks found.',
    assignedTo: 'Assigned to',
    nextAction: 'Next',
    taskCanceled: 'This task was canceled.',
    taskCompleted: 'Task Completed', // Added translation
    addNewTask: 'Add New Task', // Added translation
    status: {
      completed: 'Completed',
      inprogress: 'In Progress',
      pendingapproval: 'Pending Approval',
      delayed: 'Delayed',
      canceled: 'Canceled',
      pending: 'Pending',
      scheduled: 'Scheduled',
      pendinginput: 'Pending Input', // Added status if needed
      pendingoffer: 'Pending Offer', // Added status if needed
      pendingdpinvoice: 'Pending DP Invoice', // Added status if needed
      pendingadminfiles: 'Pending Admin Files', // Added status if needed
      pendingarchitectfiles: 'Pending Architect Files', // Added status if needed
      pendingstructurefiles: 'Pending Structure Files', // Added status if needed
      pendingfinalcheck: 'Pending Final Check', // Added status if needed
      pendingscheduling: 'Pending Scheduling', // Added status if needed
    },
    progress: '{progress}% Complete',
  },
  // Tasks Page
  tasksPage: {
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
    toast: {
      permissionDenied: 'Permission Denied',
      notYourTurn: 'Not your turn to update progress.',
      missingInput: 'Missing Input',
      provideDescOrFile: 'Please provide a description or upload files.',
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
      sidangScheduledDesc: 'All relevant parties notified.',
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
  // Manage Users Page
  manageUsersPage: {
    title: 'Manage Users',
    description: 'Add, edit, or remove user accounts (Owner, General Admin, Admin Developer only).', // Updated description
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
    activateUserButtonLabel: 'Activate User',
    activateUserDialogTitle: 'Activate User',
    activateUserDialogDesc: 'Assign a role to activate user "{username}".',
    activateUserSubmitButton: 'Activate User',
    activatingUserButton: 'Activating...',
    roles: {
      Owner: 'Owner',
      'General Admin': 'General Admin',
      'Admin Proyek': 'Project Admin',
      Arsitek: 'Architect',
      Struktur: 'Structure',
      'Admin Developer': 'Admin Developer',
      Pending: 'Pending Activation',
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
      activateUserSuccess: 'User Activated',
      activateUserDesc: 'User {username} has been activated.',
      activateUserError: 'Activation Failed',
      activateUserErrorDesc: 'Could not activate user {username}.',
      cannotEditPending: 'Activate the user first before editing.',
      userNotFound: 'User not found.',
    },
    validation: {
      usernameMin: 'Username must be at least 3 characters',
      passwordMin: 'Password must be at least 6 characters',
      roleRequired: 'Role is required',
      usernameExists: 'Username already exists.',
    },
    accessDeniedTitle: 'Access Denied', // Added
    accessDeniedDesc: 'You do not have the required permissions to view this page.', // Added
  },
  // Admin Actions Page
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
          titleUpdatedDesc: 'Task {id} title changed successfully.',
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
    usernamePlaceholder: 'Enter username', // Updated placeholder
    displayNameLabel: 'Display Name', // Added
    emailLabel: 'Email Address', // Added
    emailPlaceholder: 'Enter your email', // Added
    whatsappLabel: 'WhatsApp Number', // Added
    whatsappPlaceholder: 'Enter WhatsApp number (optional)', // Added
    changePictureButton: 'Change Picture', // Added
    pictureHint: 'Upload a new profile picture (JPG, PNG).', // Added
    updateProfileButton: 'Update Profile', // Changed button text
    updatingProfileButton: 'Updating...', // Changed button text
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
    emailNotificationsHint: 'Receive email updates for task assignments and status changes.',
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
        requiredFields: 'Username and Email are required.', // Added
        invalidEmail: 'Please enter a valid email address.', // Added
        passwordsDontMatch: 'New passwords do not match.',
        passwordTooShort: 'New password must be at least 6 characters.',
        passwordUpdated: 'Password updated successfully.',
        passwordUpdateFailed: 'Failed to update password. Check current password.',
        usernameRequired: 'Username cannot be empty.', // Kept for potential use
        usernameTooShort: 'Username must be at least 3 characters.', // Kept for potential use
        profileUpdated: 'Profile updated successfully.', // Changed text
        profileUpdateFailed: 'Failed to update profile.', // Changed text
        languageChanged: 'Language Changed',
        languageChangedDesc: 'Interface language updated.',
        passwordMismatchError: 'Current password does not match.',
        usernameExistsError: 'Username already exists. Please choose another.',
    }
  },
};

export default en;
