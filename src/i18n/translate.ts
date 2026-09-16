import { enDomain } from './en-domain';
import { enScreens } from './en-screens';
import { enComponents } from './en-components';
import { enAccount } from './en-account';
import { enCore } from './en-core';

export type Language = 'es' | 'en';
export type LanguagePreference = Language | 'system';
export type TranslationParams = Record<string, string | number>;
export const english: Readonly<Record<string, string>> = { ...enDomain, ...enScreens, ...enComponents, ...enAccount, ...enCore };
let activeLanguage: Language = 'es';
export const setActiveLanguage = (language: Language) => { activeLanguage = language; };
export const getLocale = () => activeLanguage === 'es' ? 'es-ES' : 'en-GB';
export function resolveLanguage(preference: LanguagePreference, deviceTags: readonly string[]): Language {
  if (preference !== 'system') return preference;
  return deviceTags[0]?.toLowerCase().split(/[-_]/)[0] === 'es' ? 'es' : 'en';
}
export function translate(source: string, params: TranslationParams = {}, language: Language = activeLanguage): string {
  let text = source;
  if (language === 'en') {
    if (Object.hasOwn(english, source)) text = english[source];
    else if (Object.hasOwn(english, source.trim())) text = source.replace(source.trim(), () => english[source.trim()]);
  }
  return text.replace(/\{(\w+)\}/g, (token, name: string) => Object.hasOwn(params, name) ? String(params[name]) : token);
}
