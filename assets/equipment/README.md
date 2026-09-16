# Fotos de equipamiento

42 fotografías de producto para los 86 ejercicios del catálogo. Las variantes
que utilizan el mismo equipo comparten imagen; los montajes con banco y barra
o mancuernas añaden una segunda miniatura. La correspondencia está en
`src/data/equipment.ts`. No se adivina la máquina de los ejercicios personalizados.

Procedencia: catálogo público de Gymleco y máquina de elevaciones laterales
sentadas de Skelcore. `sources.json` conserva la página original de cada foto.
Las fotografías pertenecen a sus respectivos titulares; no son imágenes de
dominio público ni una identificación del modelo exacto del gimnasio del usuario.
La vista ampliada muestra el crédito y el enlace de procedencia.

Descarga reproducible: `node scripts/download-equipment.mjs`. Se solicitan
versiones de 640 píxeles al CDN del fabricante. El script solo descarga archivos
ausentes. Metro los incluye en la aplicación; no hay enlaces remotos de imágenes
durante el entrenamiento.

Las fotografías locales de `adductor-machine.png` y `triceps-machine.png` se generaron específicamente para Akhyles y aparecen en la app con la atribución «Akhyles · imagen generada». No proceden de un catálogo externo.

Tratamiento visual en `EquipmentPhoto.tsx`: foto completa sin recortar la máquina,
velo salvia suave, marco redondeado y colores adaptados al tema claro/oscuro.
Se han retirado los distintivos promocionales de press sentado e hip thrust con
la herramienta integrada ImageGen. Los resultados están en
`seated-press-edited.png` y `hip-thrust-edited.png`; sus originales JPG se conservan.
Las demás fotos no necesitan retoque generativo. Los prompts exactos están en
`prompts.md`. El script de descarga recupera los originales, no reproduce los
retoques generativos ya incluidos en el repositorio.
