# Acceso con Google (web y Android)

## Pantallas y datos exactos pendientes

Abrir https://console.cloud.google.com/auth/overview y seleccionar el proyecto
propietario. **Google Auth Platform > Branding**: Akhyles, soporte, dominios y
privacidad reales. **Audience**: público adecuado y cuentas de prueba si usa Testing.

**Clients > Create client > Android**:

- Nombre: Akhyles Android local release.
- Paquete: `com.javiermartinrosado.akhyles`.
- SHA-1 existente: `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.

**Clients > Create client > Web application**: cliente que será audiencia del backend
y Credential Manager. Compartir solo el Client ID `.apps.googleusercontent.com`,
que es público. Si se usa web, añadir su origen HTTPS exacto. El flujo de ID token
no necesita client secret ni redirect URI de backend. Ningún secreto en `EXPO_PUBLIC_*`.

Si Play App Signing distribuye con otra clave, crear también un cliente Android con
la SHA-1 de **Play Console > Configuración > Integridad de la app > Certificado de
la clave de firma de aplicaciones**. La clave de subida no sustituye a esa huella.
Conservar ambas; no cambiar la firma local.

Estado: código integrado; clientes reales y login Google sin confirmar. Los tests
con verificador simulado no son evidencia de activación.

1. En Google Cloud, configura la pantalla de consentimiento, el correo de asistencia y la información pública de la aplicación.
2. Autoriza los orígenes exactos donde se abre Akhyles (desarrollo: `http://localhost:8081` y `http://127.0.0.1:8081`; producción: el dominio HTTPS real).
3. Define `GYM_GOOGLE_CLIENT_ID` en el entorno del servidor con el identificador terminado en `.apps.googleusercontent.com` y reinicia el servidor de Comunidad. No se necesita un secreto de cliente para este flujo.
4. Si la aplicación de Google está en pruebas, incluye las cuentas de prueba en su configuración.
5. Para Android, crea además un cliente OAuth de tipo Android con el paquete `com.javiermartinrosado.akhyles` y la huella SHA-1 de la firma de publicación que figura en `ANDROID-QA.md`. El cliente web sigue siendo el `webClientId` que recibe el flujo nativo para verificar el ID token en el backend.
6. Añade el dominio HTTPS real a los orígenes autorizados del cliente web. El cliente Android se vincula por paquete y SHA-1, no por origen web.
7. Abre Inicio, Perfil o Comunidad y usa el botón oficial de Google. Comprueba cancelación, cierre de sesión y acceso posterior con la misma cuenta tanto en web como en Android.

El servidor verifica firma, audiencia, emisor, caducidad, correo verificado y nonce de un solo uso mediante la biblioteca oficial. La identidad se vincula al `sub` de Google, nunca a un nombre o correo recibido sin verificar. No se fusionan cuentas existentes automáticamente. La rutina y el historial siguen siendo locales; acceder desde otro dispositivo no los sincroniza.

La APK ya integra Credential Manager para Android, pero no se debe anunciar ni activar Google hasta completar estos clientes y las pruebas contra el backend HTTPS real.

Documentación: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
