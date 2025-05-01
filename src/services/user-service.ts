// src/services/user-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

// Define the structure of a user in the database
export interface User {
    id: string;
    username: string;
    role: string;
    passwordHash: string; // Store hashed password
    email?: string;
    googleUid?: string;
    displayName?: string;
    createdAt?: string; // Use ISO string for dates
}

// Define the structure for creating a new user
interface NewUserData {
    username: string;
    password: string; // Plain password received from form
    email: string;
    googleUid: string;
    displayName: string;
}

// Define the structure for updating a user's password
interface UpdatePasswordData {
    userId: string;
    currentPassword?: string; // Only needed for user-initiated changes, not admin resets
    newPassword: string;
}

// Define the structure for updating a user's profile (excluding password)
interface UpdateProfileData {
    userId: string;
    username: string;
    role: string;
}

// Define the structure for adding a user directly (by admin)
interface AddUserData {
    username: string;
    password: string; // Plain password received from form
    role: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// --- Helper Functions ---

/**
 * Reads the user data from the JSON file.
 * @returns A promise that resolves to an array of User objects.
 */
async function readUsers(): Promise<User[]> {
    try {
        await fs.access(DB_PATH); // Check if file exists
    } catch (error) {
        // If the file doesn't exist, create it with an empty array
        console.log("User database file not found, creating a new one.");
        await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
        return [];
    }

    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        return JSON.parse(data) as User[];
    } catch (error) {
        console.error("Error reading user database:", error);
        throw new Error('Failed to read user data.'); // Or return empty array
    }
}

/**
 * Writes the user data to the JSON file.
 * @param users An array of User objects to write.
 * @returns A promise that resolves when the write operation is complete.
 */
async function writeUsers(users: User[]): Promise<void> {
    try {
        await fs.writeFile(DB_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing user database:", error);
        throw new Error('Failed to save user data.');
    }
}

// --- Main Service Functions ---

/**
 * Finds a user by their username. Case-insensitive search.
 * @param username The username to search for.
 * @returns A promise that resolves to the User object or null if not found.
 */
export async function findUserByUsername(username: string): Promise<User | null> {
    const users = await readUsers();
    const lowerCaseUsername = username.toLowerCase();
    return users.find(u => u.username.toLowerCase() === lowerCaseUsername) || null;
}

/**
 * Finds a user by their ID.
 * @param userId The ID of the user to search for.
 * @returns A promise that resolves to the User object or null if not found.
 */
export async function findUserById(userId: string): Promise<User | null> {
    const users = await readUsers();
    return users.find(u => u.id === userId) || null;
}

/**
 * Verifies a user's password.
 * @param username The username.
 * @param password The plain text password to verify.
 * @returns A promise that resolves to the User object if credentials are valid, otherwise null.
 */
export async function verifyUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await findUserByUsername(username);
    if (!user || user.role === 'Pending') { // Don't allow pending users to log in
        return null;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    return match ? user : null;
}

/**
 * Creates a new user account from Google Sign-In, stores it (pending activation),
 * and notifies administrators.
 *
 * @param userData The data for the new user.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the username already exists or another issue occurs.
 */
export async function createUserAccount(userData: NewUserData): Promise<void> {
    console.log('Attempting to create user account:', userData.username, userData.email);
    const users = await readUsers();

    // 1. Check if username exists
    const usernameExists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (usernameExists) {
        console.error(`Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }
     // Check if email exists (optional, but good practice)
     const emailExists = users.some(u => u.email?.toLowerCase() === userData.email?.toLowerCase());
     if (emailExists) {
         console.error(`Email "${userData.email}" is already associated with an account.`);
         // Consider a different error code if needed, e.g., EMAIL_EXISTS
         throw new Error('EMAIL_EXISTS'); // Or a more generic error
     }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // 3. Prepare new user object
    const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Generate a unique ID
        username: userData.username,
        passwordHash: hashedPassword,
        email: userData.email,
        googleUid: userData.googleUid,
        displayName: userData.displayName,
        role: 'Pending', // Start as Pending
        createdAt: new Date().toISOString(),
    };

    // 4. Add user and write back to file
    users.push(newUser);
    await writeUsers(users);

    // 5. Notify Admins (Simulated)
    console.log(`Simulating notification to Admins about new user "${newUser.username}" pending activation.`);
    // await sendAdminNotification(`New user "${newUser.username}" (${newUser.email}) requires activation.`);

    console.log(`User account for "${newUser.username}" created successfully (pending activation).`);
}

/**
 * Adds a new user directly (typically by an admin).
 *
 * @param userData Data for the new user (username, password, role).
 * @returns A promise that resolves to the newly created User object.
 * @throws An error if the username already exists or another issue occurs.
 */
export async function addUser(userData: AddUserData): Promise<User> {
    console.log('Attempting to add user:', userData.username, userData.role);
    const users = await readUsers();

    // 1. Check if username exists
    const usernameExists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (usernameExists) {
        console.error(`Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // 3. Prepare new user object
    const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, // Generate a unique ID
        username: userData.username,
        passwordHash: hashedPassword,
        role: userData.role, // Set role directly
        email: `${userData.username}@placeholder.example.com`, // Placeholder email
        displayName: userData.username, // Default display name
        createdAt: new Date().toISOString(),
    };

    // 4. Add user and write back to file
    users.push(newUser);
    await writeUsers(users);

    console.log(`User "${newUser.username}" added successfully with role "${newUser.role}".`);
    return newUser;
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
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        console.error(`User with ID "${userId}" not found for activation.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];
    if (user.role !== 'Pending') {
        console.warn(`User "${userId}" is not in Pending state (current role: ${user.role}).`);
        // Decide if you want to throw an error or just log and return
        throw new Error('USER_NOT_PENDING');
    }

    // Update the user's role (e.g., to 'Arsitek')
    users[userIndex] = { ...user, role: 'Arsitek' }; // Example default active role
    await writeUsers(users);

    // Notify user (Simulated)
    console.log(`Simulating notification to user ${userId} about account activation.`);

    console.log(`User ${userId} activated successfully.`);
}

/**
 * Deletes a user account.
 * @param userId The ID of the user to delete.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the user is not found.
 */
export async function deleteUser(userId: string): Promise<void> {
    console.log(`Attempting to delete user with ID: ${userId}`);
    let users = await readUsers();
    const initialLength = users.length;
    users = users.filter(u => u.id !== userId);

    if (users.length === initialLength) {
        console.error(`User with ID "${userId}" not found for deletion.`);
        throw new Error('USER_NOT_FOUND');
    }

    await writeUsers(users);
    console.log(`User ${userId} deleted successfully.`);
}

/**
 * Updates a user's profile information (username, role).
 * @param updateData Data containing userId, new username, and new role.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the user is not found or the new username is taken.
 */
export async function updateUserProfile(updateData: UpdateProfileData): Promise<void> {
    console.log(`Attempting to update profile for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`User with ID "${updateData.userId}" not found for profile update.`);
        throw new Error('USER_NOT_FOUND');
    }

    // Check if the new username is already taken by another user
    const newUsernameLower = updateData.username.toLowerCase();
    const usernameConflict = users.some(u => u.id !== updateData.userId && u.username.toLowerCase() === newUsernameLower);
    if (usernameConflict) {
        console.error(`New username "${updateData.username}" is already taken.`);
        throw new Error('USERNAME_EXISTS');
    }

    // Update user data
    users[userIndex] = {
        ...users[userIndex],
        username: updateData.username,
        role: updateData.role,
        // Optionally update displayName if username changes
        displayName: updateData.username,
    };

    await writeUsers(users);
    console.log(`User profile for ${updateData.userId} updated successfully.`);
}


/**
 * Updates a user's password.
 * Handles both user-initiated changes (requires current password) and admin resets.
 * @param updateData Data containing userId, optional currentPassword, and newPassword.
 * @returns A promise that resolves when the password is updated.
 * @throws An error if the user is not found, current password mismatch (if provided), or hashing fails.
 */
export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    console.log(`Attempting to update password for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`User with ID "${updateData.userId}" not found for password update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];

    // If currentPassword is provided, verify it (user-initiated change)
    if (updateData.currentPassword) {
        const match = await bcrypt.compare(updateData.currentPassword, user.passwordHash);
        if (!match) {
            console.error(`Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
    } else {
        // If currentPassword is NOT provided, assume it's an admin reset
        console.log(`Admin password reset initiated for user ID: ${updateData.userId}`);
    }

    // Hash the new password
    const newHashedPassword = await bcrypt.hash(updateData.newPassword, SALT_ROUNDS);

    // Update the user's password hash
    users[userIndex] = { ...user, passwordHash: newHashedPassword };

    // Write the updated user list back to the file
    await writeUsers(users);
    console.log(`Password for user ${updateData.userId} updated successfully.`);
}

/**
 * Gets all users from the database.
 * @returns A promise that resolves to an array of all User objects.
 */
export async function getAllUsers(): Promise<User[]> {
    return readUsers();
}


// Example function to simulate sending notifications (replace with actual implementation)
// async function sendAdminNotification(message: string) {
//     console.log("--- ADMIN NOTIFICATION ---");
//     console.log(message);
//     console.log("--------------------------");
//     // Implement actual email sending or push notification logic here
// }
