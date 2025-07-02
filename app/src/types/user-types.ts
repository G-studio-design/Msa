// src/types/user-types.ts

// This file contains type definitions related to users,
// separated from the server-side logic to comply with 'use server' module constraints.

export interface User {
    id: string;
    username: string;
    role: string;
    password?: string;
    email?: string | null;
    whatsappNumber?: string | null;
    profilePictureUrl?: string | null;
    displayName?: string | null;
    createdAt?: string;
    googleRefreshToken?: string | null;
    googleAccessToken?: string | null;
    googleAccessTokenExpiresAt?: number | null;
}

export interface AddUserData {
    username: string;
    password: string;
    role: string;
    email?: string;
    displayName?: string;
}

export interface UpdateProfileData {
    userId: string;
    username?: string;
    role?: string;
    email?: string | null;
    whatsappNumber?: string | null;
    profilePictureUrl?: string | null;
    displayName?: string | null;
}

export interface UpdatePasswordData {
    userId: string;
    currentPassword?: string;
    newPassword: string;
}

export interface UpdateUserGoogleTokensData {
    refreshToken?: string | null;
    accessToken: string | null;
    accessTokenExpiresAt: number | null;
}
