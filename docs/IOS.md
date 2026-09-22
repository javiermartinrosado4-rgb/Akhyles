# Publicación de Akhyles en iOS

Estado de preparación: 22 de septiembre de 2026.

## Ya preparado

- Expo SDK 57 y React Native 0.86 son las versiones declaradas por el proyecto.
- `app.config.ts` define el identificador iOS estable
  `com.javiermartinrosado.akhyles` y el primer `buildNumber` (`1`).
- El perfil `production` de `eas.json` permite generar la build iOS en EAS sin
  mantener una carpeta `ios/` en el repositorio.
- El repositorio está vinculado al proyecto EAS `0d55315c-62ca-4ecf-a9d1-736ba51ea21d`
  desde `extra.eas.projectId` en `app.config.ts`.
- En el entorno EAS `production` están configuradas como texto público las URLs
  `EXPO_PUBLIC_ACCOUNT_URL` y `EXPO_PUBLIC_COMMUNITY_URL`, apuntando a la API de
  producción de Akhyles.
- Las notificaciones de EAS para builds y envíos están activadas en la cuenta
  propietaria del proyecto.
- Icono, splash, localización español/inglés, selector de fotografías y
  notificaciones están declarados mediante la configuración de Expo.
- Las URLs de producción de Cuentas y Comunidad se validan como HTTPS antes de
  las builds conectadas.
- La política de privacidad y la documentación de eliminación de cuenta existen
  en `docs/PRIVACIDAD.md` y `docs/ELIMINAR-CUENTA.md`.

## Pendiente de Apple

- Activación de Apple Developer y acceso a App Store Connect.
- Confirmar publicación individual u organización; el nombre legal elegido será
  relevante para el vendedor visible en la App Store.
- Crear el App ID y la ficha de Akhyles en App Store Connect.
- Vincular la cuenta con EAS y configurar certificados/perfiles de firma.
- Crear y probar el cliente OAuth de Google para iOS.
- Configurar `AKHYLES_GOOGLE_IOS_URL_SCHEME` en el entorno EAS de producción
  con el valor `REVERSED_CLIENT_ID` del cliente OAuth iOS. La configuración de
  Expo añade el esquema de retorno requerido por Google Sign-In; el identificador
  es público y no se debe guardar ningún archivo de credenciales en Git.
- Resolver la estrategia de acceso con Apple antes de revisión: la app ofrece
  acceso social con Google y la directriz 4.8 puede exigir una opción equivalente
  de Sign in with Apple.
- Completar metadatos, clasificación por edades, privacidad, export compliance,
  cuenta de revisión y capturas reales de iPhone.

## Flujo de la primera build

1. Iniciar sesión en EAS y vincular el proyecto cuando Apple esté activa.
2. Ejecutar desde Windows:

   ```powershell
   eas.cmd build --platform ios --profile production
   ```

3. Subir la build a TestFlight.
4. Probar en iPhones reales Perfil, avatar, campana, Comunidad, ranking,
   logros, login, fotografías y recordatorios.
5. Corregir incidencias de dispositivo y enviar la build a App Review.

La app ya dispone de componentes nativos para Google en iOS, tanto para Comunidad
como para Cuentas. El inicio de sesión requiere el cliente OAuth iOS y su esquema
de retorno configurados antes de generar el binario de TestFlight.

## Carpeta `ios/`

No se crea ni se conserva una carpeta nativa iOS mientras no haya cambios
específicos de Xcode. EAS genera el proyecto durante la build mediante
Continuous Native Generation. Solo se generará localmente con
`npx expo prebuild --platform ios` si necesitamos abrirlo en Xcode o depurar
una integración nativa.
