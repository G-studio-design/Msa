// src/services/user-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
// bcrypt removed as hashing is disabled

// Define the structure of a user in the database
export interface User {
    id: string;
    username: string;
    role: string;
    // SECURITY RISK: Storing plain text password instead of hash
    password?: string; // Store plain text password - NOT RECOMMENDED
    email?: string;
    whatsappNumber?: string; // Added WhatsApp number
    profilePictureUrl?: string; // Added profile picture URL
    googleUid?: string; // Keep for potential future use, though functionality is removed
    displayName?: string;
    createdAt?: string; // Use ISO string for dates
}

// Define the structure for updating a user's password
interface UpdatePasswordData {
    userId: string;
    currentPassword?: string; // Less critical without hashing, but might still be used for verification
    newPassword: string;
}

// Define the structure for updating a user's profile (excluding password)
interface UpdateProfileData {
    userId: string;
    username: string;
    role: string; // Keep role here for admin updates, but settings page won't change it
    email?: string; // Make email optional for update data
    whatsappNumber?: string; // Make WhatsApp optional
    profilePictureUrl?: string | null; // Allow setting to null/undefined explicitly
    displayName?: string; // Allow explicit displayName update
}

// Define the structure for adding a user directly (by admin)
interface AddUserData {
    username: string;
    password: string; // Plain password received from form
    role: string;
}


const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'users.json');

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
        const parsedData = JSON.parse(data);
        if (!Array.isArray(parsedData)) {
            console.error("User database file does not contain a valid JSON array. Resetting.");
            await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
            return [];
        }
        // Add default empty strings for new fields if they don't exist
        return (parsedData as any[]).map(user => ({
            ...user,
            email: user.email || '',
            whatsappNumber: user.whatsappNumber || '',
            profilePictureUrl: user.profilePictureUrl || undefined, // Keep undefined if not present
            displayName: user.displayName || user.username, // Set displayName default to username
        })) as User[];
    } catch (error) {
        console.error("Error reading or parsing user database:", error);
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
        // Ensure no passwordHash fields are written
        const usersToWrite = users.map(u => {
            const { passwordHash, ...userWithoutHash } = u as any;
            return userWithoutHash;
        });
        await fs.writeFile(DB_PATH, JSON.stringify(usersToWrite, null, 2), 'utf8');
        console.log("User data written to DB_PATH successfully."); // Log success
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
 * Verifies a user's password by comparing plain text.
 * SECURITY RISK: This is insecure. Use password hashing in production.
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

    if (user.role === 'Pending') {
        console.log(`Login failed for ${username}: User is pending activation.`);
        // throw new Error('PENDING_ACTIVATION'); // Throw specific error
        return null; // Keep returning null for now as login page expects it
    }

    if (!user.password) {
         console.error(`Login failed for ${username}: User has no password stored.`);
         return null;
    }

    if (password === user.password) {
        console.log(`Password match successful for user "${username}".`);
        // Omit password before returning user object
        const { password: _p, ...userWithoutPassword } = user;
        return userWithoutPassword;
    } else {
        console.log(`Password mismatch for user "${username}". Stored: "${user.password}", Provided: "${password}"`);
        return null;
    }
}

/**
 * Adds a new user directly (typically by an admin). Stores password in plain text.
 * SECURITY RISK: Storing plain text passwords is highly insecure.
 *
 * @param userData Data for the new user (username, password, role).
 * @returns A promise that resolves to the newly created User object (without password).
 * @throws An error if the username already exists or another issue occurs.
 */
export async function addUser(userData: AddUserData): Promise<Omit<User, 'password'>> {
    console.log('Attempting to add user:', userData.username, userData.role);
    const users = await readUsers();

    const usernameExists = users.some(u => u.username.toLowerCase() === userData.username.toLowerCase());
    if (usernameExists) {
        console.error(`Username "${userData.username}" already exists.`);
        throw new Error('USERNAME_EXISTS');
    }

    const newUser: User = {
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        username: userData.username,
        password: userData.password,
        role: userData.role,
        email: `${userData.username}@placeholder.example.com`,
        whatsappNumber: '', // Initialize new fields
        profilePictureUrl: undefined,
        displayName: userData.username, // Default display name to username
        createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    await writeUsers(users);

    console.log(`User "${newUser.username}" added successfully with role "${newUser.role}" (Password stored in plain text - INSECURE).`);
    const { password: _p, ...newUserWithoutPassword } = newUser;
    return newUserWithoutPassword;
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
 * Updates a user's profile information (username, role, email, whatsapp, picture). Password is not updated here.
 * @param updateData Data containing userId and fields to update.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the user is not found or the new username is taken.
 */
export async function updateUserProfile(updateData: UpdateProfileData): Promise<void> {
    console.log(`Attempting to update profile for user ID: ${updateData.userId}`);
    console.log("Update data received:", updateData); // Log received update data
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`User with ID "${updateData.userId}" not found for profile update.`);
        throw new Error('USER_NOT_FOUND');
    }

    // Check if the new username is already taken by another user (if username is being changed)
    if (updateData.username && updateData.username !== users[userIndex].username) {
        const newUsernameLower = updateData.username.toLowerCase();
        const usernameConflict = users.some(u => u.id !== updateData.userId && u.username.toLowerCase() === newUsernameLower);
        if (usernameConflict) {
            console.error(`New username "${updateData.username}" is already taken.`);
            throw new Error('USERNAME_EXISTS');
        }
    }

    // Update user data selectively
    const updatedUser = { ...users[userIndex] };
    if (updateData.username) updatedUser.username = updateData.username;
    if (updateData.role) updatedUser.role = updateData.role; // Allow role update (e.g., from admin page)
    if (updateData.email !== undefined) updatedUser.email = updateData.email; // Allow setting email to empty string
    if (updateData.whatsappNumber !== undefined) updatedUser.whatsappNumber = updateData.whatsappNumber;
    if (updateData.profilePictureUrl !== undefined) {
        // Handle null or undefined to potentially remove the picture
        updatedUser.profilePictureUrl = updateData.profilePictureUrl || undefined;
         console.log(`Updating profilePictureUrl for ${updateData.userId} to: ${updatedUser.profilePictureUrl}`);
    }

    // Update displayName if username changes and displayName wasn't explicitly updated
    if (updateData.username && updateData.username !== users[userIndex].username && !updateData.displayName) {
        updatedUser.displayName = updateData.username;
    } else if (updateData.displayName) { // Allow explicit displayName update if provided
        updatedUser.displayName = updateData.displayName;
    }


    users[userIndex] = updatedUser;
     console.log(`User object for ${updateData.userId} prepared for writing:`, users[userIndex]);

    await writeUsers(users);
    console.log(`User profile for ${updateData.userId} updated successfully in database file.`);
}


/**
 * Updates a user's password (stores plain text).
 * SECURITY RISK: Storing plain text passwords is highly insecure.
 * @param updateData Data containing userId, optional currentPassword, and newPassword.
 * @returns A promise that resolves when the password is updated.
 * @throws An error if the user is not found or current password mismatch (if provided).
 */
export async function updatePassword(updateData: UpdatePasswordData): Promise<void> {
    console.warn("Updating password using plain text storage - INSECURE.");
    console.log(`Attempting to update password for user ID: ${updateData.userId}`);
    let users = await readUsers();
    const userIndex = users.findIndex(u => u.id === updateData.userId);

    if (userIndex === -1) {
        console.error(`User with ID "${updateData.userId}" not found for password update.`);
        throw new Error('USER_NOT_FOUND');
    }

    const user = users[userIndex];

    // Only perform current password check if it's provided (e.g., from user settings page)
    // Skip check if currentPassword is not provided (e.g., admin reset)
    if (updateData.currentPassword) {
         if (!user.password) {
             console.error(`Password update failed for ${updateData.userId}: User has no password set.`);
             throw new Error('PASSWORD_MISMATCH');
         }
        if (updateData.currentPassword !== user.password) {
            console.error(`Current password mismatch for user ID: ${updateData.userId}`);
            throw new Error('PASSWORD_MISMATCH');
        }
         console.log(`Current password verified for user ${updateData.userId}.`);
    } else {
        console.log(`Password reset/update initiated for user ID: ${updateData.userId} (current password check skipped).`);
    }

    users[userIndex] = { ...user, password: updateData.newPassword };

    await writeUsers(users);
    console.log(`Password for user ${updateData.userId} updated successfully (Plain text - INSECURE).`);
}

/**
 * Gets all users from the database, including passwords.
 * SECURITY RISK: Returning passwords should only be done for privileged roles (Owner, General Admin).
 * The consuming component (ManageUsersPage) should handle role-based access control.
 * @returns A promise that resolves to an array of all User objects (including passwords).
 */
export async function getAllUsers(): Promise<User[]> {
    const users = await readUsers();
    // Return the full user object, including password
    // The frontend will handle displaying/hiding based on the logged-in user's role
    return users;
}


// --- Google Sign-In related functions (Removed/Commented Out) ---

/**
 * Finds or creates a user based on Google UID.
 * If the user exists, update their displayName and profile picture.
 * If the user doesn't exist, create a new user with role 'Pending'.
 * @param googleUser The user object returned from Google Sign-In.
 * @returns A promise that resolves to the found or created User object (without password).
 * @throws An error if there's an issue reading/writing the database.
 */
// export async function findOrCreateUserByGoogleUid(googleUser: { uid: string; email: string | null; displayName: string | null; photoURL: string | null }): Promise<Omit<User, 'password'>> {
//     const users = await readUsers();
//     const existingUserIndex = users.findIndex(u => u.googleUid === googleUser.uid);

//     if (existingUserIndex !== -1) {
//         // User found by Google UID
//         const existingUser = users[existingUserIndex];
//         console.log(`User found by Google UID: ${existingUser.username}`);

//         // Update display name and photo if necessary
//         let needsUpdate = false;
//         if (googleUser.displayName && existingUser.displayName !== googleUser.displayName) {
//             existingUser.displayName = googleUser.displayName;
//             needsUpdate = true;
//         }
//         if (googleUser.photoURL && existingUser.profilePictureUrl !== googleUser.photoURL) {
//             existingUser.profilePictureUrl = googleUser.photoURL;
//             needsUpdate = true;
//         }

//         if (needsUpdate) {
//             users[existingUserIndex] = existingUser;
//             await writeUsers(users);
//             console.log(`User profile updated from Google data for ${existingUser.username}`);
//         }

//         const { password: _p, ...userWithoutPassword } = existingUser;
//         return userWithoutPassword;

//     } else {
//         // No user found with this Google UID, check if email exists
//         let emailExists = false;
//         if (googleUser.email) {
//             emailExists = users.some(u => u.email?.toLowerCase() === googleUser.email?.toLowerCase());
//         }

//         if (emailExists) {
//             // Throw an error or handle linking - for now, prevent creation if email exists without Google UID
//             console.error(`Google Sign-In failed: Email ${googleUser.email} already exists for a non-Google user.`);
//             throw new Error('EMAIL_EXISTS_NON_GOOGLE'); // Or handle linking logic
//         }


//         // Create a new user with 'Pending' role
//         console.log(`Creating new user from Google Sign-In for email: ${googleUser.email}`);
//         const newUserId = `usr_goog_${Date.now()}`; // Unique ID
//         const newUser: User = {
//             id: newUserId,
//             // Use email prefix or a random string if display name is null for username
//             username: googleUser.displayName?.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now().toString().slice(-5)}`,
//             role: 'Pending', // New users from Google start as Pending
//             password: '', // No password for Google sign-in users initially
//             email: googleUser.email || `${newUserId}@placeholder.example.com`, // Use placeholder if no email
//             whatsappNumber: '',
//             profilePictureUrl: googleUser.photoURL || undefined,
//             googleUid: googleUser.uid,
//             displayName: googleUser.displayName || 'New User',
//             createdAt: new Date().toISOString(),
//         };

//         // Ensure the generated username doesn't conflict (rare, but possible)
//         let finalUsername = newUser.username;
//         let counter = 1;
//         while (users.some(u => u.username.toLowerCase() === finalUsername.toLowerCase())) {
//             finalUsername = `${newUser.username}_${counter}`;
//             counter++;
//         }
//         newUser.username = finalUsername;
//         newUser.displayName = googleUser.displayName || finalUsername; // Update display name too if username changed

//         users.push(newUser);
//         await writeUsers(users);
//         console.log(`New user ${newUser.username} created with role 'Pending'. Needs activation.`);
//         const { password: _p, ...newUserWithoutPassword } = newUser;
//         return newUserWithoutPassword;
//     }
// }

/**
 * Activates a pending user by assigning a role and optionally a password.
 * Stores password in plain text if provided.
 * SECURITY RISK: Storing plain text passwords is highly insecure.
 *
 * @param userId The ID of the user to activate.
 * @param role The role to assign.
 * @param password (Optional) The password to set for the user.
 * @returns A promise that resolves when the operation is complete.
 * @throws An error if the user is not found or is already active.
 */
// export async function activateUser(userId: string, role: string, password?: string): Promise<void> {
//     console.log(`Attempting to activate user ID: ${userId} with role: ${role}`);
//     let users = await readUsers();
//     const userIndex = users.findIndex(u => u.id === userId);

//     if (userIndex === -1) {
//         console.error(`User with ID "${userId}" not found for activation.`);
//         throw new Error('USER_NOT_FOUND');
//     }

//     const user = users[userIndex];

//     if (user.role !== 'Pending') {
//         console.error(`User ${user.username} is already active with role ${user.role}.`);
//         throw new Error('USER_ALREADY_ACTIVE');
//     }

//     user.role = role;
//     if (password) {
//         user.password = password; // Store plain text password
//         console.warn(`Password set for activated user ${user.username} (Plain text - INSECURE).`);
//     } else if (!user.googleUid) {
//         // If it's not a Google user and no password provided, maybe throw error or set a default?
//         // For now, we allow activation without password if needed, but it's risky for non-Google accounts.
//         console.warn(`Activating user ${user.username} without a password. Consider setting one.`);
//     }

//     users[userIndex] = user;
//     await writeUsers(users);
//     console.log(`User ${user.username} activated successfully with role ${role}.`);
// }

// --- Notification Service Stub ---
// Replace with actual notification logic (e.g., email, in-app)
// async function notifyAdminsOfProfileChange(username: string, changes: Partial<User>) {
//     console.log(`NOTIFICATION: User '${username}' updated their profile. Changes:`, changes);
//     // Find Admin/Owner users
//     // Send notification (e.g., email, websocket message)
// }

// async function notifyAdminsOfPasswordChange(username: string) {
//     console.log(`NOTIFICATION: User '${username}' updated their password.`);
//     // Find Admin/Owner users
//     // Send notification
// }
