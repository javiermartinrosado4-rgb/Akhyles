# Prompt de Codex para preparar Akhyles en Mac

Copia el bloque siguiente en Codex una vez clonado el repositorio en el Mac.

```text
Prepara y lleva Akhyles a una build iOS de TestFlight, comprobada en un iPhone. El repositorio ya tiene configuración EAS; no crees un proyecto Expo nuevo.

REPOSITORIO Y ESTADO
- Repositorio: https://github.com/javiermartinrosado4-rgb/Akhyles.git
- Trabaja sobre `main` actualizado con `git pull origin main` y registra el SHA inicial.
- Lee `AGENTS.md` si existe, además de `README.md`, `DIARIO.md`, `docs/IOS.md`, `docs/PRIVACIDAD.md`, `docs/ELIMINAR-CUENTA.md` y `docs/PROTOCOLO-RELEASE.md`.
- La configuración ya contiene el EAS project ID `0d55315c-62ca-4ecf-a9d1-736ba51ea21d`. Confírmalo con `npx eas-cli@latest project:info` tras autenticarte. No uses `eas init`, `eas project:init`, `--force` ni crees un proyecto duplicado.
- El nombre visible del proyecto EAS es Akhyles. El bundle ID iOS es `com.javiermartinrosado.akhyles`. La versión del código base es `1.0.36`; revisa App Store Connect y el `buildNumber` antes de incrementarlos.
- EAS ya tiene en el entorno `production` estas variables públicas: `EXPO_PUBLIC_ACCOUNT_URL` y `EXPO_PUBLIC_COMMUNITY_URL`, apuntando a los endpoints HTTPS de producción. Comprueba su presencia sin imprimir secretos.
- La política local usa Expo CNG: conserva `ios/` fuera de Git salvo que exista una razón técnica concreta y documentada.

CUENTAS Y CREDENCIALES
- Instala opcionalmente el complemento oficial de Expo para Codex con `codex plugin add expo@openai-curated` si Codex todavía no lo tiene.
- Autentícate en EAS con la cuenta Expo propietaria del proyecto y comprueba `npx eas-cli@latest project:info`. Usa el flujo interactivo en el terminal para el inicio de sesión; nunca pidas ni copies contraseñas o tokens al chat.
- Para firmar y distribuir se necesita acceso autorizado al Apple Developer Program y a App Store Connect. Verifica que la ficha de la app ya existe con el Bundle ID indicado. No cambies el Bundle ID ni aceptes contratos, compras, cambios legales o fiscales.
- Antes de guardar certificados o perfiles en EAS, explica qué credenciales se crearán/subirán y pide al propietario que realice el acceso sensible en el terminal. No guardes `.p8`, `.p12`, perfiles, contraseñas ni tokens en Git.
- La integración de App Store Connect aún no está conectada al proyecto EAS. Configúrala solo con una cuenta autorizada; no envíes la app a revisión pública.

GOOGLE SIGN-IN EN iOS
- El código iOS de Google Sign-In ya existe para Comunidad y Cuentas.
- Sigue `docs/IOS.md`: falta crear/verificar el cliente OAuth iOS de Google para el bundle ID `com.javiermartinrosado.akhyles` y obtener su `REVERSED_CLIENT_ID`.
- Configura el valor público `AKHYLES_GOOGLE_IOS_URL_SCHEME` en el entorno EAS `production`. No uses el OAuth Android ni inventes un valor. Confirma que las APIs de Cuentas y Comunidad devuelven el client ID web esperado y validan el token y nonce.
- Revisa la directriz 4.8 actual de App Review para los flujos reales de acceso. Determina si hace falta Sign in with Apple. No añadas un botón simulado ni alteres el backend sin una implementación real y completa.
- Si falta acceso a Google Cloud, continúa con las tareas independientes y deja instrucciones claras al propietario. Nunca expongas secretos en logs.

AUDITORÍA, COMPILACIÓN Y PRUEBAS
1. Revisa componentes con variantes de plataforma y audita almacenamiento, entrenamiento offline, sincronización, Cuentas, Comunidad, selección de fotos, notificaciones, navegación y permisos de iOS.
2. Ejecuta el doctor/configuración Expo, TypeScript, lint y las pruebas relevantes. Corrige regresiones de iOS sin romper Android o Web.
3. Usa el perfil `production` existente de `eas.json`; revisa `autoIncrement` y evita reutilizar un número de build de App Store Connect.
4. Genera una build de iOS para TestFlight con EAS después de resolver las credenciales y variables requeridas. Revisa el log completo y confirma que la build aparece procesada en App Store Connect.
5. Instala TestFlight en un iPhone real y prueba onboarding, reinicio, idioma español/inglés, rutina, sesión, almacenamiento local, modo offline, login por correo y Google, sincronización con Android/Web, Comunidad, foto, permisos y notificaciones.
6. Basa las etiquetas de privacidad, clasificación por edades y metadatos en la funcionalidad y políticas reales del proyecto. No inventes datos legales, fiscales, médicos o de privacidad.
7. Sigue `docs/PROTOCOLO-RELEASE.md` para cualquier cambio de backend/sincronización. No publiques Web/API ni alteres servicios de producción sin autorización específica.
8. Actualiza `docs/IOS.md` y `DIARIO.md` con lo realizado, la versión/build, resultados y pendientes, sin incluir secretos.

LÍMITES Y ENTREGA
- Trabaja en una rama de trabajo si necesitas modificar código. No sobrescribas cambios preexistentes.
- No envíes la app a App Review ni la publiques en la App Store hasta que el propietario confirme expresamente el envío público.
- Si una acción exige contraseña, token, CAPTCHA, aceptación de contrato, pago o autorización de acceso, detente y pide al propietario que la complete; sigue mientras tanto con trabajo independiente.
- Al terminar, informa el SHA inicial/final, cambios, comandos y resultados, build/TestFlight, pruebas en dispositivo, decisiones que debe confirmar el propietario y próximos pasos exactos.
```
