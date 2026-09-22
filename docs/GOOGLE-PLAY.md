# Materiales para Google Play

La secuencia vigente de compilación, pruebas Alpha, envío y reversión está en el [protocolo obligatorio de publicación](PROTOCOLO-RELEASE.md). No iniciar Producción mientras haya un cambio de datos o sincronización sin validar en Alpha.

## Estado de la entrega Alpha — próxima 1.0.16 / versionCode 18

La versión 1.0.16 fue enviada a revisión en Prueba cerrada Alpha el 17 de
septiembre de 2026 a las 12:09 CEST, tras completar la validación técnica y la
confirmación explícita. Play la registra como envío 9, en revisión.

## Entrega publicada anterior — 1.0.15 / versionCode 17

El AAB validado se envió a Prueba cerrada Alpha el 16 de septiembre de 2026.
Play registra el envío 8 como «En revisión». No se ha iniciado Producción.

Estado: **identidad del desarrollador verificada** (correo recibido). La ficha estÃ¡ en condiciones de completar revisiÃ³n y entrar en pruebas internas con la APK/AAB final.

## Identidad de la aplicaciÃ³n

| Campo | Valor |
| --- | --- |
| Nombre | Akhyles |
| Paquete | `com.javiermartinrosado.akhyles` |
| VersiÃ³n publicada anterior | 1.0.15 (`versionCode` 17) |
| CategorÃ­a propuesta | Salud y bienestar |
| Email de soporte | `javi@akhyles.com` |
| Sitio web | `https://akhyles.com` |
| PolÃ­tica de privacidad | `https://akhyles.com/politica-de-privacidad/` |

## Checklist de envÃ­o (secuencia recomendada)

1. Entra en Play Console > app `Akhyles` (`com.javiermartinrosado.akhyles`).
2. Completa titular, email, web y enlaces legales HTTPS.
3. Completa Seguridad y tratamiento de datos.
4. Sube el AAB firmado de producciÃ³n (misma clave de firma).
5. Inicia prueba interna cerrada y valida instalaciÃ³n, actualizaciÃ³n y flujo offline.
6. Si la revisiÃ³n lo pide, prepara la transiciÃ³n a prueba cerrada/abierta.

## Links Ãºtiles

- Pruebas internas: <https://support.google.com/googleplay/android-developer/answer/9845334>  
- Borrado de cuentas y datos: <https://support.google.com/googleplay/android-developer/answer/13327111>  
- Requisitos de cuentas personales: <https://support.google.com/googleplay/android-developer/answer/14151465>

## Nueva entrega preparada — 1.0.16 / versionCode 18

El 17 de septiembre de 2026 se generó y validó el AAB firmado de producción y se subió a **Prueba cerrada Alpha**. Play reconoce `com.javiermartinrosado.akhyles`, `18 (1.0.16)`, con el nombre interno **Perfil y comunidad 1.0.16**. El borrador queda guardado en la pantalla de revisión y requiere confirmación explícita para enviarlo.

- AAB SHA-256: `DCC7C70AFE0F9A42B0046B1F09BDB379A447FB518BE84DAF04C46952DF4651C4`.
- SHA-1: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Tamaño AAB: 64.286.883 bytes; descarga nueva estimada por Play: 41,2 MB.
- Advertencia no bloqueante: falta archivo de desofuscación; no se usa R8/ProGuard.
- Dispositivos: 8.786 teléfonos y 4.692 tablets, sin pérdidas ni altas respecto a la versión anterior.
- Envío 9 realizado el 17 de septiembre de 2026 a las 12:09 CEST; Play muestra **En revisión**. No se ha iniciado Producción.

## Corrección Android preparada — 1.0.17 / versionCode 19

Se generó y validó el AAB `artifacts/android/akhyles-release.aab` con la corrección del límite SQLite local y la limpieza de copias de recuperación. Play reconoce `19 (1.0.17)` en Prueba cerrada Alpha. La versión 10 está guardada como borrador y aún no se ha enviado a revisión.

- SHA-256: `09AE440F10A3AA6784688BC9790A747C56D55ED97A307368936C4A81B6992B67`.
- SHA-1: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Solo advertencia no bloqueante: falta archivo de desofuscación; no se usa R8/ProGuard.
- Compatibilidad sin cambios: 8.786 teléfonos y 4.692 tablets.

### Estado posterior al envío — 1.0.17 / versionCode 19

El 17 de septiembre de 2026 a las 12:33 CEST se confirmó el envío 10 a **Prueba cerrada Alpha**. Play muestra `19 (1.0.17)` como **En revisión**. El envío anterior 9 (1.0.16) quedó cancelado al reiniciar la revisión. Producción no iniciada.

## Recuperación cloud y limpieza de migración — 1.0.18 / versionCode 20

Se generó y validó el AAB `artifacts/android/akhyles-release.aab` con recuperación desde el historial cifrado de la nube y limpieza segura de las antiguas copias locales. Play reconoce `20 (1.0.18)` en **Prueba cerrada Alpha** como borrador de la versión 11.

- SHA-256 AAB: `7702ADF256E4C1405C9035C8AE5431BFD89F7D46F8DD6910EA5B6C70AD34C50C`.
- SHA-1: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Validación Play: 8.786 teléfonos y 4.692 tablets, sin exclusiones nuevas; 0 errores bloqueantes.
- Advertencia no bloqueante: no hay archivo de desofuscación; la build no usa R8/ProGuard.
- Estado: borrador guardado, aún no enviado a revisión. Producción no iniciada.

### Estado posterior al envío — 1.0.18 / versionCode 20

El 17 de septiembre de 2026 a las 12:51 CEST se confirmó el envío 11 a **Prueba cerrada Alpha**. Play muestra `20 (1.0.18)` como **En revisión**. Producción no iniciada.
- Latest Play delivery: version 1.0.28 / versionCode 31, submitted to Closed Alpha review on 2026-09-21. Production was not started.
- AAB SHA-256: `33CB9FEDA7CEF559B15005364BE37051EB19BF9ACD241DBFC556ED2137841F83`.
- Play status: **Changes under review**. Compatibility reported by Play: 8,676 phones, 4,769 tablets, 9 cars, 45 Chromebooks and 1 Android XR.

## Latest Play delivery - 1.0.29 / versionCode 32

- Signed production AAB: `artifacts/android/akhyles-release.aab`.
- AAB SHA-256: `B85825E22428A3053EE17C2DB1343A43CA1EAFCE0B7856D9FB4A98C978D7FF40`.
- Uploaded to **Closed Alpha** with release notes: `Logo de inicio más grande y mejoras visuales en botones y selección de días.`
- Submitted to Google Play review. Current status: **Changes under review**. Production was not started.

## Latest Play delivery - 1.0.32 / versionCode 35

- Signed production AAB: `artifacts/android/akhyles-release.aab`.
- AAB SHA-256: `C69853DB56618EA35BD8601FF328A0A78F99F199A178667E98613BA5F8F5A573`.
- Uploaded to **Closed Alpha** with synchronization, visual, logo, achievements and startup-animation changes.
- Submitted to Google Play review on 22 September 2026. Current status: **Changes under review**. Production was not started.

## Entrega enviada a revisión - 1.0.33 / versionCode 36

- Fixes a mobile sync conflict that could leave a completed workout local and pending after choosing the device copy.
- Signed APK and AAB generated and verified locally; AAB SHA-256: `4C2FF22CE4130AC73BC057428E4454EE43E3EAB80003F53B713D5CFD84FC26FD`.
- Subido a **Prueba cerrada Alpha** y enviado a revisión el 22 de septiembre de 2026.
- Play Console muestra **Cambios en revisión** y confirma `1 cambio enviado a revisión`.
- La advertencia de desofuscación es no bloqueante; la build no usa R8/ProGuard.
- Producción no iniciada. La prueba en un Android físico queda pendiente hasta que Google apruebe y distribuya la versión a los testers.
