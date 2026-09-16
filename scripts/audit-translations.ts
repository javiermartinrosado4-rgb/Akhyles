/** Read-only inventory of untranslated Spanish UI literals. Run with tsx. */
import ts from 'typescript';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { english } from '../src/i18n/translate';
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(dir, entry.name)) : /\.tsx?$/.test(entry.name) ? [join(dir, entry.name)] : []);
}
const missing = new Map<string, string>();
for (const file of [...walk('src/screens'), ...walk('src/components'), ...walk('src/app'), ...walk('src/state'), ...walk('src/services')]) {
  if (/anatomy|demo-/.test(file)) continue;
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (ts.isTemplateExpression(node)) {
      const text = node.head.text + node.templateSpans.map(span => '{}' + span.literal.text).join('');
      if (/[áéíóúñ¿¡]|\b(el|la|los|las|tu|tus|del|para|con|sin|de|peso|series|entrenamiento|sesiones|ejercicios)\b/i.test(text)) {
        missing.set(text, `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
    }
    if (ts.isStringLiteral(node) || ts.isJsxText(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim();
      if (/[áéíóúñ¿¡]|\b(el|la|los|las|tu|tus|del|para|con|sin|de|peso|series|entrenamiento|sesiones|ejercicios)\b/i.test(text)
        && text !== 'Español' && !english[text] && !/^([.#/]|https?:)/.test(text) && text.length > 2) {
        missing.set(text, `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
for (const [text, location] of missing) console.log(JSON.stringify({ location, text }));
console.log(`${missing.size} untranslated Spanish UI literals found.`);
process.exitCode = missing.size ? 1 : 0;
