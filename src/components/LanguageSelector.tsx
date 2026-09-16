import { useLanguage } from '../i18n';
import { Card, Choice, Notice, Txt } from './ui';
export function LanguageSelector() {
  const { preference, setPreference, error } = useLanguage();
  return <Card>
    <Txt weight="600">Idioma</Txt>
    <Choice title="Usar el idioma del dispositivo" description="Se usa inglés cuando el idioma del dispositivo no está disponible."
      selected={preference === 'system'} onPress={() => setPreference('system')} icon="globe" />
    <Choice title="Español" selected={preference === 'es'} onPress={() => setPreference('es')} />
    <Choice title="English" selected={preference === 'en'} onPress={() => setPreference('en')} />
    <Txt muted size={12}>El cambio se aplica al instante y se guarda en este dispositivo.</Txt>
    {!!error && <Notice error>{error}</Notice>}
  </Card>;
}
