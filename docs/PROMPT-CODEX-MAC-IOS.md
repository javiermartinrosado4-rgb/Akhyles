# Prompt para Codex en el Mac — publicación de Akhyles para iOS

Pega el bloque completo en Codex, abierto en el clon de Akhyles. El propietario iniciará sesión en Expo, Apple Developer/App Store Connect y Google Cloud Console en el Mac para que Codex pueda operar con esas sesiones.

```text
Completa la preparación, compilación, pruebas y publicación de Akhyles para iOS. El propietario de Akhyles está presente en este Mac y ha autorizado el uso de sus cuentas de Expo, Apple Developer/App Store Connect y Google Cloud Console para esta tarea. Usa esas sesiones y lleva el trabajo hasta publicar la app en la App Store. No vuelvas a pedir autorización para los pasos normales de configuración, builds, TestFlight o envío a App Review.

REPOSITORIO Y ESTADO ACTUAL
- Repositorio: https://github.com/javiermartinrosado4-rgb/Akhyles.git
- Actualiza `main` con `git pull origin main`; registra el SHA inicial. Debe incluir el prompt actualizado y la configuración EAS reciente. No crees otro repositorio.
- Lee `AGENTS.md` si existe, `README.md`, `DIARIO.md`, `docs/IOS.md`, `docs/PRIVACIDAD.md`, `docs/ELIMINAR-CUENTA.md` y `docs/PROTOCOLO-RELEASE.md`.
- EAS ya tiene un proyecto creado. El ID es `0d55315c-62ca-4ecf-a9d1-736ba51ea21d`, el nombre visible es Akhyles y su cuenta propietaria es `akhylesapp`. Comprueba el proyecto con `npx eas-cli@latest project:info` tras autenticar la CLI. No ejecutes `eas init`, `eas project:init`, `--force`, ni crees o enlaces un proyecto nuevo.
- `app.config.ts` ya incluye el EAS project ID. El Bundle ID iOS estable es `com.javiermartinrosado.akhyles`; no lo cambies.
- La app base está en versión `1.0.36`, iOS `buildNumber` `1` y Android `versionCode` `39`. Comprueba App Store Connect y `eas.json` antes de incrementar. No alteres Android salvo que sea imprescindible para una corrección común.
- El proyecto usa Expo CNG: no mantengas ni publiques `ios/` generado en Git, salvo que una necesidad nativa concreta lo exija y quede documentada.
- El entorno EAS `production` ya contiene las variables públicas `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com` y `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com/community`. Verifica sus nombres, valores y entorno sin imprimir secretos.
- El complemento oficial Expo para Codex puede instalarse en este Mac con `codex plugin add expo@openai-curated` si no está instalado. No crees una app de ejemplo con `create-expo-app`.

AUTENTICACIÓN Y CREDENCIALES
- Inicia sesión en Expo/EAS con la cuenta propietaria y en Apple Developer/App Store Connect con la cuenta autorizada que ya abrió el propietario en este Mac. Si hace falta, usa los comandos EAS interactivos oficiales y deja que el propietario complete autenticación/2FA en el Mac.
- No pidas contraseñas, códigos 2FA ni tokens en el chat. No los escribas en archivos del proyecto, logs, commits o GitHub.
- Configura en EAS las credenciales y la conexión App Store Connect que hagan falta para compilar, subir a TestFlight y publicar. Nunca guardes `.p8`, `.p12`, certificados o perfiles en Git.
- No aceptes contratos, acuerdos legales/fiscales, pagos ni compras nuevas en nombre del propietario. Si Apple exige alguno, detente justo en ese paso y pide al propietario que lo acepte.

GOOGLE SIGN-IN NATIVO EN iOS
- El código nativo Google Sign-In de iOS para Cuentas y Comunidad ya está preparado en `src/components/AccountGoogle.ios.tsx` y `src/components/GoogleSignIn.ios.tsx`.
- En Google Cloud Console, abre el proyecto existente **Akhyles**; no crees otro proyecto ni cambies el consentimiento OAuth de producción sin necesidad.
- Comprueba los clientes OAuth existentes y crea un cliente de tipo iOS para el Bundle ID exacto `com.javiermartinrosado.akhyles` si todavía no existe. No reutilices el cliente Android ni crees secretos para el cliente nativo iOS.
- Obtén el valor `REVERSED_CLIENT_ID`/esquema de retorno del cliente iOS y configúralo como `AKHYLES_GOOGLE_IOS_URL_SCHEME` en el entorno EAS `production`. Es un identificador público, no una contraseña. No inventes su valor.
- Comprueba que las APIs de Cuentas y Comunidad devuelven el client ID web correcto y que validan token y nonce. Prueba ambos inicios de sesión en un iPhone real. Si Google Cloud muestra un aviso sobre consentimiento, verificación o usuarios de prueba, no lo ocultes: determina si afecta a la publicación y registra el estado real.
- Revisa la directriz 4.8 vigente de Apple sobre inicio social y evalúa los flujos de Google/correo existentes. Si App Review requiere Sign in with Apple, implementa un flujo real de extremo a extremo (cliente, nonce y validación segura del token en servidor, alta/vinculación de cuentas y eliminación). Añade pruebas y configuración Expo nativa; no pongas un botón simulado. Despliega cambios de API solo si son indispensables, siguiendo `docs/PROTOCOLO-RELEASE.md` y verificando salud/compatibilidad antes.

AUDITORÍA Y COMPILACIÓN
1. Inspecciona variantes de plataforma y audita almacenamiento, entrenamiento offline, sincronización, navegación, Cuentas, Comunidad, imágenes/fotos, notificaciones, permisos y compatibilidad iOS de las dependencias nativas.
2. Comprueba que los textos de permisos de fotos/cámara/notificaciones sean veraces y estén localizados. Conserva la política de privacidad y el flujo de eliminación de cuenta; corrige discrepancias reales.
3. Ejecuta Expo config/doctor, typecheck, lint y pruebas relevantes. Distingue errores existentes de regresiones nuevas. No uses Expo Go para declarar probado un módulo nativo que requiere una build propia.
4. Confirma que el perfil `production` de `eas.json` produce una build iOS de App Store/TestFlight y que el auto-increment no reutiliza una versión/build ya cargada. Compila mediante EAS, revisa los logs completos y resuelve fallos reales.
5. En App Store Connect, usa o crea la ficha de Akhyles con el Bundle ID exacto. Completa metadatos en español e inglés, URL de soporte/política de privacidad, clasificación por edades, privacidad, export compliance, capturas y notas para revisión usando información verificada del proyecto. No inventes identidad legal, declaraciones de privacidad, clasificación, territorios ni precio. Si falta un dato que solo conoce el propietario, pídele ese dato concreto y sigue con el resto.
6. Sube primero a TestFlight, espera el procesamiento y prueba en un iPhone real: instalación limpia, onboarding, persistencia tras reinicio, idiomas, crear/editar rutina, guardar sesión, modo offline, login por correo y Google, recuperación/vinculación, sincronización con Android/Web, Comunidad, selección y publicación de foto, permisos, recordatorios y navegación.
7. Si la revisión exige cuenta de prueba, prepara una cuenta de revisión aislada con datos de demostración y deja instrucciones de acceso para Apple; no uses credenciales ni datos de usuarios reales.
8. Sigue el protocolo del repositorio para cambios de API/sincronización, backups, release y rollback. No publiques cambios web que no sean necesarios para la compatibilidad móvil.

CAMBIOS, GIT Y PUBLICACIÓN
- Trabaja en una rama `release/ios` desde el `main` más reciente y conserva cualquier cambio previo del propietario. No incluyas archivos locales `.env`, claves, perfiles o datos personales.
- Actualiza `docs/IOS.md` y `DIARIO.md` con cambios, versiones, comandos, resultados de TestFlight, dispositivos probados, metadatos completados y pendientes; nunca incluyas secretos.
- Tras superar las comprobaciones, crea commits claros y súbelos a GitHub. Genera la build desde ese estado registrado.
- El propietario ya autoriza la publicación iOS: después de TestFlight, pruebas reales y metadatos verificados, envía la versión a App Review y completa su publicación en la App Store. No pares para pedir una segunda autorización de publicación.
- Informa al final el SHA inicial/final, commits, versión/build, estado de EAS y App Store Connect, URL/estado de TestFlight o App Store, pruebas ejecutadas y cualquier bloqueo externo concreto.
```
