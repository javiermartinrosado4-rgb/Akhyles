# Idiomas de la app

La app ofrece español e inglés. En el primer inicio usa el idioma principal del dispositivo: español para `es-*` e inglés para el resto. La opción «Idioma del dispositivo» sigue los cambios del sistema; una elección explícita tiene prioridad.

El selector está en bienvenida, creación del perfil, cuenta y configuración. La preferencia se guarda de forma independiente en `akhyles:language:v1`; no sustituye el perfil ni modifica el historial o las copias de nube.

## Añadir textos

Los textos fuente y los datos de catálogo siguen en español. Los diccionarios `src/i18n/en-*.ts` contienen la traducción inglesa. No deben importar lógica de entrenamiento: esa lógica utiliza las funciones de presentación de `translate.ts`.

Para frases dinámicas se usa `t('Texto con {name}', { name })`, sin concatenar palabras traducidas. Las fechas y números se formatean con `locale` de `useLanguage()`. No se convierten las unidades de las cargas.

`Txt`, `Button`, `Choice` y `Field` traducen sus etiquetas de interfaz. El contenido escrito por personas debe conservarse: usar `translate={false}` en `Txt` y `translateTitle={false}` en las opciones que ya contienen un nombre de ejercicio localizado. No guardar una traducción de presentación como un nuevo nombre personalizado.

## Comprobación

- `npm run typecheck`
- `npm run lint`
- `npm test` — cobertura del catálogo, mensajes y parámetros de traducción.
- `npx tsx scripts/audit-translations.ts` — inventario de literales españoles sin traducción.
- `npx playwright test tests/e2e/language.spec.ts` — detección, persistencia, formularios y pantalla estrecha; requiere el servidor local.

Se ha añadido `expo-localization` y su configuración para español e inglés. Las aplicaciones nativas necesitan una nueva compilación para incorporar este módulo; la verificación web no sustituye una prueba en dispositivo físico.
