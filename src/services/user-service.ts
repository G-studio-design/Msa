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
    googleUid?: string; // Keep for potential future use, though functionality is removed
    displayName?: string;
    createdAt?: string; // Use ISO string for dates
}

// // Define the structure for creating a new user (Removed as Google Sign-In is removed)
// interface NewUserData {
//     username: string;
//     password: string; // Plain password received from form
//     email: string;
//     googleUid: string;
//     displayName: string;
// }

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
        // Add basic validation to ensure it's an array
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("User database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        return parsedData as User[];
    } catch (error) {
        console.error("Error reading or parsing user database:", error);
        // Attempt to recover by writing an empty array if parsing fails
        try {
            console.log("Attempting to reset user database due to read/parse error.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        } catch (writeError) {
            console.error("Failed to reset user database:", writeError);
            throw new Error('Failed to read or reset user data.');
        }
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
    console.log(`Verifying credentials for username: "${username}"`);
    const user = await findUserByUsername(username);

    if (!user) {
        console.log(`User "${username}" not found.`);
        return null;
    }
    console.log(`User "${username}" found. ID: ${user.id}, Role: ${user.role}`);

    // Ensure user is not pending activation (though this state is now unlikely without Google Sign-In)
    if (user.role === 'Pending') {
        console.log(`Login failed for ${username}: User is pending activation.`);
        return null;
    }

    if (!user.passwordHash) {
         console.error(`Login failed for ${username}: User has no password hash stored.`);
         return null; // Cannot compare if hash doesn't exist
    }

    try {
        console.log(`Comparing provided password with hash for user "${username}"...`);
        const match = await bcrypt.compare(password, user.passwordHash);

        if (match) {
            console.log(`Password match successful for user "${username}".`);
            return user; // Login successful
        } else {
            console.log(`Password mismatch for user "${username}".`);
            return null; // Login failed (wrong password)
        }
    } catch (error) {
        console.error(`Error during password comparison for user "${username}":`, error);
        // Treat comparison errors as failed login for security
        return null;
    }
}


// // Function createUserAccount removed as Google Sign-In is removed.
// export async function createUserAccount(userData: NewUserData): Promise<void> { ... }


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


// // Function activateUser removed as Google Sign-In flow is removed.
// export async function activateUser(userId: string, role: string): Promise<void> { ... }

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
         if (!user.passwordHash) {
             console.error(`Password update failed for ${updateData.userId}: User has no password hash.`);
             throw new Error('PASSWORD_HASH_MISSING');
         }
        const match = await bcrypt.compare(updateData.currentPassword, user.passwordHash);
        if (!match) {
            console.error(`Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
         console.log(`Current password verified for user ${updateData.userId}.`);
    } else {
        // If currentPassword is NOT provided, assume it's an admin reset (or initial setup)
        console.log(`Password reset/update initiated for user ID: ${updateData.userId} (current password check skipped).`);
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

// // Function resetAllPasswords removed as it was primarily for development/debug with previous changes.
// export async function resetAllPasswords(defaultPassword: string): Promise<void> { ... }

// // Example function to simulate sending notifications removed
// async function sendAdminNotification(message: string) { ... }

// --- Development/Debug Function ---
// Can be added back if needed for specific testing scenarios
// async function runPasswordReset() { ... }
