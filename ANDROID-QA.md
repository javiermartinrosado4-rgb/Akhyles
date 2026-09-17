# Verificación Android — 11 de septiembre de 2026

## Entrega preparada: 1.0.16 / versionCode 18

La nueva entrega queda enviada a revisión en Prueba cerrada Alpha; queda pendiente la revisión de Google Play.

## Entrega anterior: 1.0.15 / versionCode 17

Enviada a revisión en Prueba cerrada Alpha el 16 de septiembre de 2026. AAB
`artifacts/android/akhyles-release.aab`, 64.285.027 bytes, SHA-256
`734dfaec86b9eb23d76486436bc32e8cea5c354d81fc2cc7ed9e740ff7b3052c`.
Paquete `com.javiermartinrosado.akhyles`, firma SHA-1
`040ea0afd797f22730198cdb4295c4763ab86ab7`, `versionName` 1.0.15 y
`versionCode` 17. `verify-android.mjs` confirmó la firma original, manifest,
permisos y validez del AAB. Play muestra el envío 8 como «En revisión».
Advertencia no bloqueante: no hay archivo de desofuscación porque la release
no usa R8/ProGuard.

Build conectada regenerada con Comunidad `https://api.akhyles.com/community` y
Cuentas `https://api.akhyles.com`. Gradle `assembleRelease` y `bundleRelease`
correctos; firma original conservada. APK: 77.673.895 bytes, SHA-256
`44790cb5a1696985908ed00f6bc5f3018e04878c5a18499ad92e746d3e45f4e7`. AAB:
56.445.047 bytes, SHA-256
`78d7cc3496e576d5a32900ada2c705d5349345d920bb945b53215efd7355afbc`.
`verify-android.mjs` confirma paquete, firma y `versionCode` 16. El AAB se ha
subido al borrador de la prueba cerrada Alpha de Play Console; queda pendiente
el envío final a revisión.

Código actualizado con calendario histórico, Akhyles Points relativos y barra
personalizable por ejercicio (0–100 kg, decimales incluidos). Cada sesión conserva
su barra, sexo y peso corporal para no recalcular el pasado con preferencias nuevas.
TypeScript, ESLint, 93 pruebas y escaneo de secretos pasan.

APK/AAB compilados y verificados con la firma original, versión 8, alineación
APK de 16 KB, AAB válido y manifest sin debug ni HTTP. No probados en móvil físico.
Las dos pruebas de interfaz de barra (0 y 15,5 kg) pasan: recarga, conversión entre
total y por lado, guardado y conservación histórica. Los intentos iniciales
agotaron el tiempo de carga de Metro; repetición final: 2/2, sin errores.
Evidencia: `artifacts/qa-bar-weight-106-confirmed`.

- APK: 78.358.543 bytes; SHA-256 `97f4f467631b47242c43b731e6e775b93674ed3197e63175549cf338cb91f732`.
- AAB: 56.518.984 bytes; SHA-256 `e1ae2977a3d37d2b811c84ef312dce66feb8f19d4a0befbd71344126f760f774`.
- Informe: `artifacts/android/release-verification.json`.
- Exportación de app web actualizada: `artifacts/web-1.0.6`.

Contenido comercial preparado en `docs/WEB-AKHYLES-1.0.6.md`; publicación IONOS
bloqueada por conexión de Edge («Debugger unattached»), incluso tras recargar.
El usuario ha pedido dejar la web en pausa. No se considera actualizado el botón
público de descarga. Cuentas/Comunidad
online siguen pendientes del despliegue; esta compilación es offline.

## Entrega histórica: 1.0.4 / versionCode 6

APK y AAB offline compilados, sin servicio real de cuentas ni Comunidad. La
web mantiene la APK 1.0.3. No se ha publicado la nueva entrega ni subido a Play.

- APK `artifacts/android/akhyles-offline-preview.apk`: 78.313.739 bytes,
  SHA-256 `853bd54d1c2690667fd5d47c5d4b9b4dca3fd6e7935e29cfe410cf64ecbc2c63`.
- AAB `artifacts/android/akhyles-offline-preview.aab`: 56.499.375 bytes,
  SHA-256 `9f9139a9d976677b63162f20963286fa30bad4f061a009e3efcc8d5d93790dbf`.
- Verificador: firma original, APK alineada a 16 KB, AAB validado, versión 6,
  paquete correcto, sin debug, HTTP bloqueado. Resultado completo en
  `artifacts/android/release-verification.json` y manifest adjunto.
- TypeScript, ESLint, 79 pruebas y escaneo de secretos pasan. Nueve pruebas de
  navegador pasan: cuatro de cuentas y cinco de regresión de la app.
- El servidor privado supera 36 comprobaciones con SQLite y 36 con MariaDB,
  además de restauración cifrada. SMTP/Google reales y recuperación Android
  contra IONOS siguen pendientes: no confundir los dobles de prueba con producción.

Las secciones inferiores corresponden a entregas históricas.

Prueba nativa adicional: instalación y arranque correctos en emulador API 36;
pantalla de cuenta offline inspeccionada y continuación al alta local comprobada.
Captura: `artifacts/android/qa/account-104-offline.png`. No había una versión
anterior del paquete en ese emulador: actualización con datos antiguos y
recuperación de nube real siguen pendientes de prueba física.

## Revisión actual: versionCode 4

**Estado: Akhyles 1.0.2, vista previa offline firmada. No hay backend público ni Google OAuth real
activados; no se ha subido a Play.** Los apartados posteriores titulados Entrega y
Comprobaciones describen la revisión histórica `versionCode` 1.

| Archivo nuevo excluido de Git | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/android/akhyles-offline-preview.apk` | 77337141 | `0033db96b76ea26f1b77bf00594c40b57382233ce85abf3b3837c6be91e7d3ff` |
| `artifacts/android/akhyles-offline-preview.aab` | 55626442 | `16e41d80c530bcbfe9f9096be3d0974da74e9e12144efa8c23ecc1d27d06877c` |

Comprobación reproducible: `node scripts/verify-android.mjs artifacts/android/akhyles-offline-preview.apk artifacts/android/akhyles-offline-preview.aab`.
Informe generado: `artifacts/android/release-verification.json`; manifest extraído
en `artifacts/android/release-manifest.xml`. Firma original conservada, SHA-1
`04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.

- Compilación Gradle `assembleRelease` + `bundleRelease` correcta.
- APK: `apksigner verify`, misma firma, `zipalign -P 16` correctos.
- AAB: `bundletool validate`, `jarsigner -verify` y certificado coincidente correctos.
- Manifest de ambos: paquete correcto, sin debug, `allowBackup=false`, HTTP bloqueado.
- Permisos: INTERNET, VIBRATE, USE_BIOMETRIC, USE_FINGERPRINT y permiso interno
  DYNAMIC_RECEIVER_NOT_EXPORTED. SecureStore declara biometría, aunque este flujo
  guarda la sesión sin solicitar autenticación biométrica. Sin cámara, micrófono,
  lectura global de fotos ni superposición.
- 69 pruebas de lógica/API/configuración/restauración; tipos y lint correctos.
- Guardia de release sin URL pública: salida 1 esperada, impide compilar por error
  una release conectada sin backend configurado.
- 27 pruebas web aprobadas en ejecución completa. Primer intento interrumpido por
  Metro bloqueado; reiniciado y repetido con éxito.
- Dependencias compatibles con Expo SDK 57. `expo-doctor`: 20/21; permanece el aviso
  de Nitro Google Sign-In no probado por React Native Directory en New Architecture.
- `npm audit`: 15 avisos moderados, 0 altos/críticos. Incluyen dependencias transitivas
  de Expo (`uuid` vía `xcode`, `decode-uri-component` vía `query-string`). No se ha
  aplicado `audit fix --force`, que propone cambios incompatibles de SDK. Pendiente
  resolver/mitigar antes de producción, especialmente el parser de enlaces.
- Copia Restic 0.19.1 (descarga oficial con SHA-256 verificado): backup cifrado,
  lectura completa, restauración, integridad SQLite y limpieza de staging probados
  sobre repositorio local sintético. No se ha probado un bucket externo.

La build actual de Akhyles no se ha instalado aún: en esta verificación no había móvil
físico ni emulador conectados. La evidencia anterior se obtuvo en emulador Android 16/API
36 x86_64; la APK v2 instalada entonces
con `adb install -r`: conserva tema oscuro, una sesión y dos series de la prueba
anterior. Navegación a Calendario/Progreso/Comunidad correcta; Google sin endpoint
muestra indisponibilidad. Cierre forzado y arranque con Wi-Fi/datos apagados conserva
el historial; conectividad restaurada. Capturas nuevas `artifacts/android/qa/release-v2-*`.
Dos capturas reales revisadas visualmente para Play en `assets/play/screenshots/`.

Variante separada `akhyles-local-test.apk`, mismo `versionCode` y firma, únicamente
para `http://10.0.2.2:8082` en emulador: registro nativo, sesión recuperada tras cierre
forzado mediante SecureStore, selector de fotos (apertura/cancelación/selección),
publicación de imagen sintética y progreso compartido (1 sesión, 2 series, 35 kg × 9)
verificados. Cierre de sesión y login nativo con contraseña recuperan el perfil,
foto y enlaces. Compartir rutina abre la hoja de Android (cancelada sin enviar);
su enlace abre un plan de 1 día/5 ejercicios sin pesos personales. No se sustituyó
la rutina local. La base usada es `test-results/android-community.sqlite`, no la base
local del usuario. El asistente de escritura manuscrita/teclado flotante de Gboard
interfirió al principio con las coordenadas del automatizador; se cerró el tutorial
y se usó navegación de teclado y ocultación explícita del IME. No hubo cierre por
excepción de la app. Esta variante HTTP no es distribuible como producción.

Pendientes: TLS/DNS público, despliegue Docker real (Docker no instalado en este
equipo), copia externa/alertas, clientes Google y pruebas con cuenta real, teléfono
ARM64, ejecución con páginas de 16 KB, ficha legal y pista interna de Play.
Guías: `docs/DESPLIEGUE-COMUNIDAD.md`, `server/GOOGLE-SETUP.md`, `docs/GOOGLE-PLAY.md`.

## Evidencia histórica: versionCode 1

## Entrega

Akhyles 1.0.0 (versionCode 1), paquete `com.javiermartinrosado.akhyles`.
APK release firmada, con JavaScript y recursos incluidos. AAB release firmado.
Android mínimo API 24, objetivo API 36; arquitecturas ARM64 y x86_64.

| Archivo local, excluido de Git | Bytes | SHA-256 |
| --- | ---: | --- |
| `artifacts/android/akhyles-preview.apk` | 73761061 | `413ba923bbdd8d86f80833baa10d231726d108061c66ec1b2c1d04ff80bd8ab1` |
| `artifacts/android/akhyles-release.aab` | 52075111 | `bb6d8c1e7bf05b43ad8cec230fdbd30b8c193131c9ac472d60ad9d3a7a95ede8` |

Firma local de publicación, distinta de la firma debug. SHA-1 del certificado:
`04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
La clave privada y sus contraseñas están fuera del repositorio; ver [ANDROID.md](ANDROID.md).

## Comprobaciones realizadas

- `npm run check`: tipos y lint correctos; 44 pruebas de lógica/servidor aprobadas.
- `npm run test:e2e`: 26 pruebas web aprobadas en una ejecución completa.
- `expo install --check`: dependencias compatibles con SDK 57.
- Gradle `:app:assembleRelease :app:bundleRelease`: ambas compilaciones correctas.
- `apksigner verify`: firma APK válida (v2).
- `zipalign -c -P 16 4`: alineación del contenedor APK correcta.
- `jarsigner -verify`: firma del AAB verificada. Emite avisos de certificado autofirmado, ausencia de timestamp y orden de entradas ZIP/JarInputStream; no sustituye la validación del formato Android.
- `bundletool validate`: estructura del AAB válida. Se utiliza la [herramienta oficial de Android](https://developer.android.com/tools/bundletool).
- Manifest release: sin `debuggable`, sin backup automático, sin HTTP en claro y sin permisos de cámara, micrófono, galería completa ni superposición de ventanas.

## Pruebas nativas

Emulador Android 16/API 36, x86_64, 1080 × 2400. Instalación de la APK release, sin Expo Go ni dependencia de Metro.

- Primer arranque, marca GB, onboarding y generación de rutina de un día: correctos.
- Dos series de **35 kg × 9**: registradas; siguiente carga **36,25 kg**.
- Cierre forzado y reapertura: el borrador conserva pesos y repeticiones.
- Finalización omitiendo otros cuatro ejercicios: una sesión y dos series en Progreso.
- Pestañas Entrenamiento, Calendario, Progreso, Comunidad y Perfil: accesibles.
- Tema oscuro: aplicado y conservado tras actualizar la aplicación.
- Selector nativo de fotos: apertura, cancelación y selección de una imagen sintética de prueba; no pide acceso a toda la galería.
- Enlace `akhyles://shared-routine` sin identificador: muestra error comprensible; botón Volver operativo en la APK final.
- Google sin servidor configurado: aviso inmediato de indisponibilidad, sin cierre inesperado.
- Actualización con `adb install -r`: mantiene historial y preferencias.
- Arranque final con Metro detenido y Wi-Fi/datos del emulador desactivados: Entrenamiento y el historial de Progreso siguen disponibles. Conectividad restaurada después de la prueba.
- Inspección visual final: navegación inferior en una línea, sin palabras partidas, en tema oscuro.
- Sin errores AndroidRuntime/ReactNativeJS del proceso de Akhyles. El historial de salida solo refleja el cierre forzado de prueba y la actualización del paquete. Una ejecución simultánea accidental de UIAutomator falló en la herramienta de pruebas, no en la app; las inspecciones posteriores se ejecutaron en serie.

Capturas locales: `artifacts/android/qa/`. `scripts/android-ui.mjs` permite repetir inspecciones, pulsaciones y capturas mediante ADB. No ejecutes dos inspecciones simultáneamente. Los datos usados son de prueba en el emulador, no datos del usuario.

## Pendiente antes de una publicación pública

- No se ha configurado una URL pública HTTPS de Comunidad ni OAuth real. No se han probado inicio/cancelación reales con cuentas de Google en Android ni publicación social contra un backend de producción. La lógica del servidor y los flujos sociales web sí tienen pruebas automáticas.
- `expo-doctor` supera 20/21 comprobaciones: React Native Directory marca `react-native-nitro-google-signin` como no probado con New Architecture. El módulo compila en esta aplicación; eso no equivale a certificar todos los flujos de autenticación.
- No probado en un teléfono físico ARM64, versiones antiguas de Android ni dispositivos con páginas de memoria de 16 KB. La alineación ZIP comprobada no sustituye esas pruebas de ejecución.
- No publicado en Google Play. El AAB generado no implica aprobación de Play Console.
- Los datos del navegador no se migran automáticamente a Android. No desinstalar para actualizar y conservar una copia privada de la firma.

Esta entrega valida el funcionamiento local descrito, no garantiza ausencia absoluta de errores ni activa servicios externos sin sus credenciales.

## Entrega Android preparada en Google Play — 1.0.16 / versionCode 18

Preparada el 17 de septiembre de 2026. El AAB `artifacts/android/akhyles-release.aab` se compiló con la firma existente y se subió a **Prueba cerrada Alpha** como borrador de la versión 9. Play lo reconoce como `18 (1.0.16)` para `com.javiermartinrosado.akhyles`.

- AAB: 64.286.883 bytes.
- SHA-256: `DCC7C70AFE0F9A42B0046B1F09BDB379A447FB518BE84DAF04C46952DF4651C4`.
- SHA-1 del certificado: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Producción incluida: `https://api.akhyles.com` y `https://api.akhyles.com/community`.
- Validación Play: sin errores bloqueantes; 8.786 teléfonos y 4.692 tablets compatibles.
- Advertencia no bloqueante: no hay archivo de desofuscación asociado; esta build no usa R8/ProGuard.
- Estado: enviada a revisión el 17 de septiembre de 2026 a las 12:09 CEST. No se ha publicado Producción.

## Corrección de almacenamiento local preparada — 1.0.17 / versionCode 19

Se generó un nuevo AAB con la corrección de `SQLITE_FULL`: AsyncStorage pasa de su límite de 6 MB a 50 MB y las copias de recuperación antiguas se podan antes de guardar otra. El AAB se subió como borrador a **Prueba cerrada Alpha** y Play lo reconoce como `19 (1.0.17)`.

- AAB: 64.287.147 bytes.
- SHA-256: `09AE440F10A3AA6784688BC9790A747C56D55ED97A307368936C4A81B6992B67`.
- SHA-1 del certificado sin cambios: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Validación Play: 8.786 teléfonos y 4.692 tablets compatibles; sin errores bloqueantes.
- Advertencia no bloqueante: no hay archivo de desofuscación asociado; no se usa R8/ProGuard.
- Estado: borrador guardado, pendiente de confirmación explícita para enviarlo a revisión. Producción no iniciada.

### Estado posterior al envío — 1.0.17 / versionCode 19

El 17 de septiembre de 2026 a las 12:33 CEST se confirmó el envío a **Prueba cerrada Alpha**. Play registró el **envío 10** como **En revisión**; el envío 9 (1.0.16) quedó cancelado al reiniciar la revisión. Producción no iniciada.

## Recuperación cloud y limpieza de migración — 1.0.18 / versionCode 20

Se generó y validó el AAB con recuperación desde el historial cifrado de la nube y limpieza segura de las antiguas claves locales `akhyles:archive:*`. Play reconoce `20 (1.0.18)` en **Prueba cerrada Alpha**, guardado como borrador de la versión 11.

- AAB: 64.287.894 bytes.
- SHA-256 AAB: `7702ADF256E4C1405C9035C8AE5431BFD89F7D46F8DD6910EA5B6C70AD34C50C`.
- SHA-1 del certificado sin cambios: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Verificación: paquete correcto, `versionCode 20`, manifest seguro y permisos esperados.
- Play: 8.786 teléfonos, 4.692 tablets y sin exclusiones nuevas; solo advertencia no bloqueante de desofuscación.
- Estado: borrador guardado para revisión. No enviado a revisión; Producción no iniciada.

### Estado posterior al envío — 1.0.18 / versionCode 20

El 17 de septiembre de 2026 a las 12:51 CEST se confirmó el envío 11 a **Prueba cerrada Alpha**. Play muestra `20 (1.0.18)` como **En revisión**. Producción no iniciada.
