import type { Language } from '@/context/LanguageContext';
import en from '@/locales/en';
import id from '@/locales/id';

// Define a type for the dictionary structure
type Translations = typeof en; // Use one language as the base type

const dictionaries: Record<Language, Translations> = {
  en,
  id,
};

export const getDictionary = (lang: Language): Translations => {
  return dictionaries[lang] || dictionaries.en; // Fallback to English
};
