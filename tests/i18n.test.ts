import test from 'node:test';
import assert from 'node:assert/strict';
import { english, resolveLanguage, setActiveLanguage, getLocale, translate } from '../src/i18n/translate';
import { messages } from '../src/content/es';
import { catalog } from '../src/data/catalog';
import { emptyPreferences } from '../src/data/options';
import { displayName } from '../src/logic/routine';

test('language follows the primary device language with English fallback', () => {
  for (const tag of ['es', 'es-ES', 'es-MX', 'ES_ar']) assert.equal(resolveLanguage('system', [tag]), 'es');
  for (const tags of [['en-US'], ['fr-FR', 'es-ES'], ['ja-JP'], []]) assert.equal(resolveLanguage('system', tags), 'en');
  assert.equal(resolveLanguage('es', ['en-US']), 'es');
  assert.equal(resolveLanguage('en', ['es-ES']), 'en');
});
test('translations interpolate values without translating personal data', () => {
  assert.equal(translate('Idioma', {}, 'en'), 'Language');
  assert.equal(translate('Idioma', {}, 'es'), 'Idioma');
  assert.equal(translate('English', {}, 'en'), 'English');
  assert.equal(translate('{name}', { name: 'Pecho' }, 'en'), 'Pecho');
  assert.equal(translate('My custom exercise', {}, 'en'), 'My custom exercise');
  for (const source of ['constructor', '__proto__', 'toString']) assert.equal(translate(source, {}, 'en'), source);
  assert.equal(translate('{toString} {constructor}', {}, 'en'), '{toString} {constructor}');
  assert.equal(translate('{name} {missing}', { name: '$& {other}' }, 'en'), '$& {other} {missing}');
});
test('every existing message and built-in exercise has an English translation', () => {
  const neutral = new Set([' kg', 'kg', ' cm · ', 'cm', ' min', '<60', ' S']);
  for (const section of Object.values(messages)) for (const source of Object.values(section)) {
    assert.ok(english[source] || neutral.has(source), `Missing message: ${source}`);
  }
  for (const exercise of catalog) assert.ok(english[exercise.name], `Missing exercise: ${exercise.name}`);
});
test('presentation locale changes without changing stored catalog names', () => {
  const names = catalog.map(exercise => exercise.name);
  setActiveLanguage('en');
  assert.equal(getLocale(), 'en-GB');
  assert.equal(translate('Idioma'), 'Language');
  setActiveLanguage('es');
  assert.equal(getLocale(), 'es-ES');
  assert.deepEqual(catalog.map(exercise => exercise.name), names);
});
test('English translations retain every interpolation placeholder', () => {
  const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
  for (const [source, translated] of Object.entries(english)) {
    assert.deepEqual(placeholders(translated), placeholders(source), `Placeholder mismatch: ${source}`);
  }
});
test('exercise presentation never translates user overrides, even when they match a dictionary key', () => {
  const exercise = catalog[0];
  const prefs = { ...emptyPreferences, names: { [exercise.id]: 'Pecho' } };
  try {
    setActiveLanguage('en');
    assert.equal(displayName(exercise.id, prefs), 'Pecho');
    assert.equal(displayName(exercise.id, emptyPreferences), english[exercise.name]);
    const custom = { ...exercise, id: 'custom-localization', custom: true, name: 'Espalda' };
    assert.equal(displayName(custom.id, { ...emptyPreferences, custom: [custom] }), 'Espalda');
    setActiveLanguage('es');
    assert.equal(displayName(exercise.id, emptyPreferences), exercise.name);
  } finally { setActiveLanguage('es'); }
});
