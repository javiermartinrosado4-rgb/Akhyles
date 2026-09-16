import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import { LanguagePreference, resolveLanguage, setActiveLanguage, translate, TranslationParams } from './translate';

export const LANGUAGE_STORAGE_KEY = 'akhyles:language:v1';
const LanguageContext = createContext({
  language: 'es' as 'es' | 'en', locale: 'es-ES', preference: 'system' as LanguagePreference,
  setPreference: (_value: LanguagePreference) => {}, error: '',
  t: (text: string, params?: TranslationParams) => translate(text, params),
});
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locales = useLocales();
  const [preference, setValue] = useState<LanguagePreference>('system');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const writes = useRef(Promise.resolve());
  const language = resolveLanguage(preference, locales.map(locale => locale.languageTag));
  // Presentation helpers outside React use the same language; no stored workout data is changed.
  setActiveLanguage(language);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then(value => {
      if (alive && (value === 'es' || value === 'en' || value === 'system')) setValue(value);
    }).catch(() => { if (alive) setError('No se ha podido recuperar el idioma guardado.'); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  const setPreference = useCallback((value: LanguagePreference) => {
    setValue(value); setError('');
    writes.current = writes.current.then(() => AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, value))
      .catch(() => setError('No se ha podido guardar el idioma. Vuelve a seleccionarlo para reintentar.'));
  }, []);
  const value = useMemo(() => ({ language, locale: language === 'es' ? 'es-ES' : 'en-GB', preference, setPreference, error,
    t: (text: string, params?: TranslationParams) => translate(text, params, language),
  }), [language, preference, setPreference, error]);
  return <LanguageContext.Provider value={value}>{ready ? children : null}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
