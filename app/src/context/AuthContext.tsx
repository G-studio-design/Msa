
// src/context/AuthContext.tsx
'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types/user-types';

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
  const router = useRouter(); // Get router instance
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Initialize state from localStorage on the client-side
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('currentUser'); // Use localStorage
      try {
        return storedUser ? (JSON.parse(storedUser) as User) : null;
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('currentUser'); // Use localStorage
        return null;
      }
    }
    return null; // Default to null on the server or if no stored user
  });

  // Persist user changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (currentUser) {
        // IMPORTANT: Never store sensitive data like passwords in localStorage
        const { password, ...userToStore } = currentUser;
        localStorage.setItem('currentUser', JSON.stringify(userToStore)); // Use localStorage
      } else {
        localStorage.removeItem('currentUser'); // Use localStorage
      }
    }
  }, [currentUser]);

  // Logout function
  const logout = useCallback(() => {
    setCurrentUser(null);
    // The useEffect above will handle removing from localStorage
    console.log("User logged out. Redirecting to login page.");
    router.push('/'); // Redirect to login page after logout
  }, [router]); // Add router to dependency array


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
