import { useLanguage } from '../i18n';
import { Card, Notice, Txt } from './ui';
export function LanguageSelector() {
  const { preference, error } = useLanguage();
  return <Card>
    <Txt weight="600">Idioma</Txt>
    <Notice>El idioma inglés está temporalmente desactivado mientras terminamos de revisar sus traducciones.</Notice>
    <Txt muted size={12}>Idioma activo: Español{preference !== 'es' ? " (restaurado automáticamente)" : ""}.</Txt>
    {!!error && <Notice error>{error}</Notice>}
  </Card>;
}
