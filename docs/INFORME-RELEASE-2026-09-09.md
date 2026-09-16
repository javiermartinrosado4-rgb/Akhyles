# Informe de preparación de release — 9 de septiembre de 2026

## Estado real

Se ha preparado y probado el código de despliegue y una compilación Android firmada
`1.0.0`, `versionCode` 2. **No se ha activado un backend público, Google OAuth real
ni una pista de Play.** Faltan hosting/dominio, proyecto Google, datos legales y una
sesión de Play accesible. La herramienta de navegador no expuso navegadores ni
sesiones en esta ejecución; el control nativo de Windows devolvió además
`native pipe is unavailable` en ambos intentos. No se ha contratado hosting ni publicado producción.

## URLs y artefactos

- URL de Comunidad en producción: pendiente, no inventada.
- URL de privacidad y solicitud de borrado: pendientes de alojamiento y datos reales.
- APK: `artifacts/android/akhyles-offline-preview.apk` (73793097 bytes).
  SHA-256: `1289a061a93cd29db4f56722986b5c27a30f14861681aac75f5e32910f4bbcfd`.
- AAB: `artifacts/android/akhyles-offline-preview.aab` (52102935 bytes).
  SHA-256: `72d6c56eefc7ba6a00078437cded144b5d3a5e3640820843ed0fe1da2b8fdc77`.

Estos nuevos artefactos tienen tipo de compilación release y firma original, pero
son **offline**. No deben anunciarse como Comunidad/Google activados ni enviarse como
la versión conectada solicitada. Los artefactos anteriores se han conservado.
La release conectada se generará al definir y comprobar `EXPO_PUBLIC_COMMUNITY_URL`.

APK auxiliar no distribuible: `artifacts/android/akhyles-local-test.apk`, SHA-256
`6991594d309d66b239f412754bb6230ab1b4915a7612a293c925763ad8716808`.
Tras las pruebas se cerró la sesión sintética, se detuvo su backend y se reinstaló
la APK offline firmada en el emulador. Se restauró el ajuste temporal de escritura
manuscrita de Android; no se borraron los entrenamientos locales.

## Git

Cambios de implementación en `6c7f248` (backend/copias) y `478a635`
(Android/sesiones/guardias). La documentación y materiales se envían en un tercer
commit independiente. El hash final enviado se comunica en la entrega; consultar
`git log -3 --oneline` y `git rev-parse origin/main` para verificarlos.

## Cambios

API: configuración que falla si producción carece de base absoluta/orígenes
explícitos; límites detrás del proxy, errores con ID sin filtrar datos, SQLite WAL
y borrado seguro. Compose: HTTPS automático con Caddy, API sin puerto público,
volumen persistente, usuario sin privilegios, límites, healthchecks y copias diarias
cifradas Restic con retención de 30 días. Requiere inicialización y alertas reales.

Android: validación HTTPS tanto al configurar como en ejecución, bloqueo de
loopback/IPs/nombres locales y guardia DNS/TLS/salud antes de release conectada.
Sesión en SecureStore con migración de tokens antiguos. Google verifica firma
mediante biblioteca oficial y revisa audiencia, emisor, caducidad, correo verificado,
nonce de un uso y `sub`; cancelación no autentica. Se corrigió el script PowerShell
para pasar correctamente una sola tarea Gradle al generar solo APK o AAB.

## Pruebas

- 55 pruebas de lógica, API, persistencia, privacidad, URLs, Google simulado y copias.
- TypeScript y ESLint correctos.
- 27 pruebas web completas, incluidas cuentas, fotos, seguimiento y progreso.
- Restic: snapshot de WAL, cifrado, lectura completa, restauración, integridad y
  limpieza sobre repositorio local sintético; no bucket externo.
- Gradle APK/AAB, firma, misma SHA-1, manifest, permisos, `zipalign -P 16`,
  `jarsigner` y `bundletool validate` correctos.
- Emulador Android 16/API 36 x86_64: actualización conservando una sesión/dos series
  y tema, navegación, historial offline tras cierre/reapertura, aviso de Google
  indisponible. Sin dispositivo físico conectado.
- Variante local de Android contra base sintética: registro, restauración de sesión
  SecureStore, cierre/login con contraseña, selector de foto/cancelación, publicación
  y progreso compartido (1 sesión, 2 series, 35 kg × 9) comprobados. Compartir rutina
  abre la hoja de Android y su enlace muestra 1 día/5 ejercicios sin pesos personales;
  no se envió a terceros ni se sustituyó la rutina local. No equivale a producción HTTPS.
- Expo SDK 57 compatible; `expo-doctor` 20/21 por Nitro Google Sign-In/New Architecture.
- Auditoría: 15 avisos moderados transitivos; 0 altos/críticos. Resolver/mitigar antes
  de producción; no se ha aplicado una actualización incompatible a ciegas.

Detalle y límites en [ANDROID-QA.md](../ANDROID-QA.md). La validación ZIP no sustituye
pruebas de ejecución en dispositivos ARM64 o con páginas de memoria de 16 KB.

## Material de Play

Nombre, descripciones, clasificación propuesta y checklist: [GOOGLE-PLAY.md](GOOGLE-PLAY.md).
Icono PNG 512, imagen destacada 1024 × 500 y dos capturas reales en `assets/play/`.
Privacidad: [PRIVACIDAD.md](PRIVACIDAD.md). Borrado externo: [ELIMINAR-CUENTA.md](ELIMINAR-CUENTA.md).
Los textos legales necesitan datos del titular; no son URLs publicadas. Falta
completar normas/aceptación, bloqueo y operación de moderación antes de UGC público.
La edad IARC la determinará Play con el cuestionario real, no este documento.

## Cuentas y credenciales que conservar

- Carpeta privada `%USERPROFILE%/.local/akhyles-android/signing/`, con `akhyles.jks`
  y `signing.properties`. No borrar, sustituir ni subir a Git. Conservar copia privada externa.
- Cuenta propietaria de GitHub y permisos del repositorio.
- Cuenta del hosting, acceso SSH, cuenta del dominio/DNS y acceso al disco persistente.
- Credencial restringida del bucket y contraseña Restic, guardadas fuera del host
  además de su configuración privada. Sin contraseña no hay recuperación.
- Proyecto Google Cloud, clientes Android/web, cuentas de prueba y sus propietarios.
- Cuenta de Play Console, titular legal, clave de distribución Play App Signing si
  difiere de la local, email de soporte y canal de privacidad.

No se incluyen valores secretos en este informe ni en Git.

## Para continuar con los accesos externos

1. Hosting > servidor/proyecto: proveedor, IP/endpoint y acceso existente. Dominio >
   DNS: dominio elegido. Almacenamiento > bucket privado: endpoint y región; secretos
   solo en el host. Guía [DESPLIEGUE-COMUNIDAD.md](DESPLIEGUE-COMUNIDAD.md).
2. https://console.cloud.google.com/auth/overview > proyecto > Branding, Audience,
   Clients. Cliente Android `com.javiermartinrosado.akhyles`, SHA-1
   `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`; cliente web en el
   mismo proyecto. Hace falta únicamente su ID público, no el secreto.
3. https://play.google.com/console > Akhyles > Prueba interna. Verificar permisos,
   integridad/firma, ficha y subir AAB conectado. No publicar producción sin nueva
   confirmación explícita del titular.

Falta probar registro/contraseña/fotos/rutinas/progreso contra el HTTPS real,
Google real y cancelación en Android, restauración externa y la instalación desde Play.
