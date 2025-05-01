// src/services/user-service.ts

interface NewUserData {
    username: string;
    password: string; // Password should be hashed server-side before storing
    email: string;
    googleUid: string;
    displayName: string;
}

/**
 * Creates a new user account, stores it (pending activation),
 * and notifies administrators.
 *
 * @param userData The data for the new user.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the username already exists or another issue occurs.
 */
export async function createUserAccount(userData: NewUserData): Promise<void> {
    console.log('Attempting to create user account:', userData.username, userData.email);

    // --- TODO: Replace with actual backend/database interaction ---

    // 1. Check if username exists in your database
    const usernameExists = false; // Simulate check - replace with actual DB query
    if (usernameExists) {
        console.error(`Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS'); // Specific error for frontend handling
    }

    // 2. Hash the password securely (use bcrypt or similar on the SERVER)
    //    DO NOT store plain text passwords!
    const hashedPassword = `hashed_${userData.password}`; // Simulation! Replace with actual hashing.

    // 3. Store user details in your database with 'Pending' status/role
    //    Example structure: { id: 'new_user_id', username: userData.username, passwordHash: hashedPassword, email: userData.email, googleUid: userData.googleUid, displayName: userData.displayName, role: 'Pending', createdAt: new Date() }
    console.log(`Simulating storage of user "${userData.username}" with role 'Pending'. Hashed password: ${hashedPassword}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate DB operation

    // 4. Notify Admins (Owner/General Admin)
    //    This could be an email, an in-app notification, or a webhook call.
    console.log(`Simulating notification to Admins about new user "${userData.username}" pending activation.`);
    // Example: await sendAdminNotification(`New user "${userData.username}" (${userData.email}) requires activation.`);
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate notification

    // --- End of TODO section ---

    console.log(`User account for "${userData.username}" created successfully (pending activation).`);
}

/**
 * Activates a pending user account.
 *
 * @param userId The ID of the user to activate.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the user is not found or cannot be activated.
 */
export async function activateUser(userId: string): Promise<void> {
    console.log(`Attempting to activate user with ID: ${userId}`);

    // --- TODO: Replace with actual backend/database interaction ---

    // 1. Find the user by ID in your database.
    // 2. Check if the user exists and has the 'Pending' role/status.
    // 3. Update the user's role/status to a default active role (e.g., 'Arsitek' or a basic 'User' role).
    console.log(`Simulating activation of user ${userId}. Setting role to 'Arsitek'.`); // Example default role
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate DB operation

    // 4. Optionally, notify the user that their account is now active.
    console.log(`Simulating notification to user ${userId} about account activation.`);

    // --- End of TODO section ---

    console.log(`User ${userId} activated successfully.`);
}

// Example function to simulate sending notifications (replace with actual implementation)
// async function sendAdminNotification(message: string) {
//     console.log("--- ADMIN NOTIFICATION ---");
//     console.log(message);
//     console.log("--------------------------");
//     // Implement actual email sending or push notification logic here
// }
