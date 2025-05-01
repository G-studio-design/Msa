'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';

// Export the Language type
export type Language = 'en' | 'id';

interface LanguageContextProps {
  language: Language;
  setLanguage: Dispatch<SetStateAction<Language>>;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state from localStorage or default to 'en'
  const [language, setLanguage] = useState<Language>(() => {
      // Check localStorage only on the client-side
      if (typeof window !== 'undefined') {
          const storedLang = localStorage.getItem('appLanguage');
          if (storedLang === 'id' || storedLang === 'en') {
              return storedLang;
          }
      }
    return 'en'; // Default language
  });

  // Persist language changes to localStorage
  useEffect(() => {
      if (typeof window !== 'undefined') {
         localStorage.setItem('appLanguage', language);
      }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextProps => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
