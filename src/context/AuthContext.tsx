// src/context/AuthContext.tsx
'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '@/services/user-service'; // Import the User type

// Define the shape of the context value
interface AuthContextProps {
  currentUser: User | null; // Store the logged-in user object (or null)
  setCurrentUser: Dispatch<SetStateAction<User | null>>; // Function to update the user
  logout: () => void; // Function to handle logout
}

// Create the context with an undefined initial value
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Create the provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Initialize state from sessionStorage on the client-side
    if (typeof window !== 'undefined') {
      const storedUser = sessionStorage.getItem('currentUser');
      try {
        return storedUser ? (JSON.parse(storedUser) as User) : null;
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        sessionStorage.removeItem('currentUser'); // Clear invalid data
        return null;
      }
    }
    return null; // Default to null on the server or if no stored user
  });

  // Persist user changes to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentUser) {
        // IMPORTANT: Never store sensitive data like passwords in sessionStorage
        const { password, ...userToStore } = currentUser;
        sessionStorage.setItem('currentUser', JSON.stringify(userToStore));
      } else {
        sessionStorage.removeItem('currentUser');
      }
    }
  }, [currentUser]);

  // Logout function
  const logout = useCallback(() => {
    setCurrentUser(null);
    // No need to explicitly remove from sessionStorage here,
    // the useEffect above will handle it when currentUser becomes null.
    // Optionally redirect to login page after logout
    // router.push('/'); // Requires importing useRouter
    console.log("User logged out.");
  }, []);


  // Provide the context value to children
  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook for easy context consumption
export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
