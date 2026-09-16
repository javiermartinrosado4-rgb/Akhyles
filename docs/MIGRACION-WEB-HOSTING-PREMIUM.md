# Migración de `akhyles.com` a Hosting Premium

Estado: preparado, sin cambio público efectuado.

## Bloqueo confirmado en IONOS — 11 de septiembre de 2026

- El panel identifica `akhyles.com` y `api.akhyles.com` en el contrato
  `108337238` (MyWebsite Now Plus), frente al Hosting Premium `47175101`.
- La conexión del subdominio con el espacio web exige trasladarlo de contrato,
  pero el asistente de traslado de `api.akhyles.com` devuelve «No se puede
  llevar a cabo este proceso».
- `https://api.akhyles.com/health` devuelve una página HTML de aparcamiento
  de IONOS, no la respuesta del servicio. Las cuentas NO están activas.
- El dominio principal tiene vinculados la web MyWebsite NOW y el correo
  `javi@akhyles.com`. La documentación oficial advierte que un traslado
  interno restablece el uso del dominio y elimina las direcciones de correo
  vinculadas: no ejecutar la secuencia de cambio inferior sin resolver antes
  la preservación del correo y la continuidad de la web.
- Siguiente paso: consultar con IONOS una asignación del subdominio al Hosting
  Premium que conserve web y correo, o acordar una migración completa con
  respaldo de buzones, restauración probada y costes confirmados. No se han
  modificado DNS, contratos, buzones ni la APK durante esta comprobación.

Referencia oficial:
https://www.ionos.es/ayuda/dominios/transferir-un-dominio-dentro-de-11-ionos/transferir-un-dominio-a-otro-contrato-en-11-ionos-mismo-id-de-cliente/

### Consulta enviada a soporte — 11 de septiembre de 2026

- Con autorización del usuario, se envió desde `javi@akhyles.com` a
  `soporte@ionos.es` el correo «Consulta técnica: api.akhyles.com en Hosting
  Premium sin afectar web ni correo». Webmail confirmó «Enviado».
- Se solicitaron revisión humana, número de caso y respuesta escrita sobre
  asignación del subdominio, virtual host/directorio público y HTTPS dentro
  de los contratos existentes. Se indicó expresamente que no se autorizan
  traslados del dominio principal, borrados, cambios de contrato ni compras.
- El asistente automático del panel respondió que no puede abrir un caso;
  sus sugerencias genéricas de DNS no confirman la asignación del alojamiento.
- Pendiente de respuesta de soporte y número de caso. Envío confirmado no
  equivale a recepción confirmada ni a apertura de ticket. Las cuentas siguen
  sin activarse y no se han modificado DNS ni contratos.

## Objetivo

Servir la web de Akhyles y la API `api.akhyles.com` desde el Hosting Premium
ya contratado, sin añadir un VPS ni otra cuota recurrente. El sitio actual se
mantiene publicado mediante MyWebsite NOW hasta la validación final.

## Copia de recuperación

- Origen: `https://www.akhyles.com`
- Fecha: 2026-09-11
- Páginas: inicio, sobre Akhyles, funciones, contacto, aviso legal y privacidad.
- Archivo: `artifacts/website-backup/20260911-104921.zip`
- SHA-256: `5CB5511DC98A12EB36D7E7C26C2B1E06B37FC8F4987CEC0E4301D340D093D4C3`
- La copia es una captura pública de recuperación; no sustituye el editor ni se
  publica automáticamente.

## Previsualización estática preparada

- Generada a partir de la copia: `artifacts/website-static-stage/20260911-104921`.
- Paquete listo para carga: `artifacts/website-static-stage/akhyles-web-stage-20260911-104921.zip`.
- SHA-256: `D251D45358282BA211A13DBB21CF8AD52489380198AEFE1963B9E957A073A985`.
- Directorio aislado creado en Hosting Premium: `/akhyles-web-stage`.
- No se ha cargado ni asociado a ningún dominio; el sitio público sigue intacto.

## Secuencia de cambio

1. Construir y revisar una versión estática equivalente en una carpeta aislada
   del Hosting Premium, sin alterar la web actual.
2. Probarla desde un dominio técnico o una ruta de previsualización.
3. Tras confirmar que navegación, enlaces legales, contacto y descarga de APK
   funcionan, mover el destino de `akhyles.com` y `www.akhyles.com` al Hosting
   Premium. Este es el único paso con impacto público y exige confirmación en
   ese momento.
4. Solicitar/validar el certificado SSL del nuevo destino.
5. Crear o mover `api.akhyles.com` al mismo contrato y asignarlo a
   `akhyles-api-release/.../public`; después, resolver las rutas PHP y probar
   HTTPS antes de actualizar la APK.
6. Mantener MyWebsite NOW y la copia de recuperación intactos hasta que tanto
   web como API hayan sido comprobados desde redes externas.

## Reversión

Antes de cancelar o eliminar MyWebsite NOW, conservar la asignación y cambiar
de nuevo el destino del dominio si la web estática o el certificado fallan. No
eliminar la instancia MyWebsite, el antiguo directorio de API ni archivos de
base de datos durante la migración.

## Pendiente técnico

- La web actual usa MyWebsite NOW (WordPress gestionado). No hay exportación
  estática visible en su panel, por lo que la copia pública es la salvaguarda y
  la sustitución se debe validar visualmente.
- El formulario de contacto del constructor no puede trasladarse como HTML
  estático sin configurar un destino de correo/servidor propio.
- `api.akhyles.com` tiene SSL en el contrato MyWebsite actual y no se pudo mover
  de forma aislada al Hosting Premium. La migración del dominio principal es la
  vía prevista para unificarlo.
