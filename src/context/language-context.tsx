
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import translations from '@/lib/translations';

type Language = 'en' | 'hi' | 'mr';
type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, params?: Record<string, any> | any[]) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi' || savedLanguage === 'mr')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: TranslationKey, params?: Record<string, any> | any[]): string => {
    const langDict = translations[language] || translations.en;
    let text = (langDict as any)[key] || (translations.en as any)[key] || String(key);

    if (params) {
      if (Array.isArray(params)) {
        params.forEach((arg, index) => {
          text = text.split(`{${index}}`).join(String(arg));
        });
      } else {
        Object.entries(params).forEach(([k, v]) => {
          text = text.split(`{${k}}`).join(String(v));
        });
      }
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
