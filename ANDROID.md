# Akhyles para Android

> Revisión del código: 1.0.6, `versionCode` 8. La release conectada requiere URL pública HTTPS
> comprobada y produce `akhyles-release.apk` / `.aab`. Sin hosting, usar
> `-OfflinePreview`: produce `akhyles-offline-preview.apk` / `.aab`, sin cuentas en nube ni Comunidad.
> El script exige la firma existente; no crea otra si falta. Validación repetible:
> `node scripts/verify-android.mjs RUTA_APK RUTA_AAB`.

La aplicación Android comparte pantallas, rutinas, historial y lógica con la versión web. El identificador es `com.javiermartinrosado.akhyles`; el esquema de enlaces es `akhyles://`.

## Compilar en Windows

Requisitos: Node 24, JDK 17, Android SDK API 36 y Build Tools 36. La primera compilación descarga Gradle, NDK y CMake si faltan. Configura `JAVA_HOME` y `ANDROID_HOME` o usa las herramientas instaladas en `.local/akhyles-android/java` y `AppData/Local/Android/Sdk`.

```powershell
npm.cmd ci
npm.cmd run check
npm.cmd run android:apk
npm.cmd run android:aab
```

Para generar ambos formatos:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1 -Format both
```

La release conectada se guarda en `artifacts/android/akhyles-release.apk` y `artifacts/android/akhyles-release.aab`. Se incluyen ARM64 (móviles actuales) y x86_64 (emulador). La APK contiene el código y los recursos: no necesita Metro ni Expo Go. La carpeta de resultados se excluye de Git.

## Firma y actualizaciones

El script exige y reutiliza la firma existente en `%USERPROFILE%/.local/akhyles-android/signing/`. Conserva una copia privada de **toda esa carpeta**: `akhyles.jks` y `signing.properties`. Las contraseñas no se imprimen ni se incluyen en Git. Si falta, recupera la copia; no crees otra. Para actualizar una instalación conservando sus datos deben mantenerse el identificador y la firma; incrementa `android.versionCode` en `app.config.ts` para cada versión publicada.

No desinstales la app para actualizar: instala encima con `adb install -r`. Los entrenamientos web y Android se almacenan por separado; los datos del navegador no aparecen automáticamente en una instalación nueva de Android. Se conserva la clave histórica de almacenamiento para futuras actualizaciones. Las cuentas y fotos de Comunidad residen en el servidor.

## Cuentas, nube y Google

El servicio de cuentas PHP es independiente del backend social experimental.
Configuración: [server-php/README.md](server-php/README.md).
Solo tras desplegarlo y verificar HTTPS, correo, Google y recuperación real:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1 -Format both -AccountUrl https://api.akhyles.com
```

El script verifica el servicio antes de compilar. Las cuentas conservan primero
el estado local y después sincronizan la copia privada del usuario autenticado.
Los cambios divergentes piden elegir una copia; no se regenera la rutina al
actualizar. Para recuperar en una instalación nueva, debe existir una copia
confirmada en la nube y accederse con la misma cuenta. Las pruebas de navegador
no sustituyen la prueba de actualización/reinstalación en Android.

La URL se incorpora a la APK al compilar; activar el servidor no conecta
automáticamente una APK offline ya distribuida. Nunca incluir contraseñas,
claves SMTP ni claves de cifrado en variables `EXPO_PUBLIC_*`.

## Comunidad experimental

Define `EXPO_PUBLIC_COMMUNITY_URL` con la URL HTTPS real del backend **antes de compilar**. Opcionalmente, define `EXPO_PUBLIC_WEB_URL` con la URL HTTPS de la app web para que los enlaces compartidos tengan una vista previa accesible desde el navegador. Sin ella, se usa el enlace nativo que requiere Akhyles instalada.

Sin servidor configurado, la APK permite entrenar y guardar datos sin conexión y explica que Comunidad todavía no está disponible. No conecta accidentalmente al propio móvil. Google necesita además `GYM_GOOGLE_CLIENT_ID` en el backend y un cliente OAuth Android con el identificador del paquete y la huella SHA-1 de la firma. Se utiliza Credential Manager, un nonce emitido por el servidor y la verificación del ID token existente; cancelar el selector no inicia ninguna sesión.

Para probar un servidor local en el emulador (build exclusivamente de prueba):

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1 -Format apk -CommunityUrl http://10.0.2.2:8082 -LocalTest
```

Esta variante se guarda como `akhyles-local-test.apk`. Las builds normales bloquean tráfico HTTP sin cifrar. No distribuyas una variante de prueba local como versión de producción.

## EAS como alternativa

`eas.json` incluye `preview` (APK) y `production` (AAB). Inicia sesión con `eas.cmd login`, vincula el proyecto mediante `eas.cmd init` y configura sus variables de entorno. Como `app.config.ts` es dinámico, añade el `extra.eas.projectId` real que facilite EAS. Importa la firma local en EAS para mantener compatibles las actualizaciones; no generes otra firma para la misma aplicación ya instalada.

```powershell
eas.cmd build --platform android --profile preview
eas.cmd build --platform android --profile production
```

Publicar en Google Play es un paso separado y requiere la cuenta de Play Console y la configuración de la ficha. No se publica automáticamente al compilar un AAB.

## Verificación

Resultados y límites concretos de esta entrega: [ANDROID-QA.md](ANDROID-QA.md).

`npm.cmd run check` comprueba tipos, lint y lógica/servidor. `npm.cmd run test:e2e` usa la app web en localhost:8081 y valida los flujos compartidos. Las pruebas web no sustituyen las pruebas nativas. `scripts/android-ui.mjs` permite inspeccionar la interfaz del emulador y guardar capturas en `artifacts/android/qa`; utiliza `ANDROID_SERIAL` para elegir dispositivo.

Referencias: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [generación de APK con EAS](https://docs.expo.dev/build-reference/apk/), [autenticación Google en Expo](https://docs.expo.dev/guides/google-authentication/).
