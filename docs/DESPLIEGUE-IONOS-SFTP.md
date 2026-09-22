# Despliegue reproducible en IONOS

Antes de cualquier publicación, seguir también el [protocolo obligatorio de publicación](PROTOCOLO-RELEASE.md). Para cambios de sincronización, API y Web se publican en ese orden y Sync V2 permanece limitado a cuentas de prueba hasta verificar su manifiesto.

Este procedimiento sustituye el Explorador Web de IONOS para las publicaciones
normales. No usa ZIPs ni el selector de archivos del navegador, por lo que evita
el fallo recurrente de control remoto `Debugger unattached`.

## Preparación única

En IONOS, dentro del contrato Hosting Premium, crear cuentas SFTP dedicadas:

- `akhyles-deploy-web`, restringida a `/akhyles-web-app`.
- `akhyles-deploy-api`, restringida a
  `/akhyles-api-release/akhyles-accounts-20260911-083447`.

No reutilizar la cuenta de la base de datos. Anotar el host, puerto 22 y cada
usuario desde la ficha de la cuenta SFTP. IONOS documenta que las credenciales
son propias de cada acceso SFTP.

Crear una copia privada de `deploy/ionos-deploy.example.json` como:

- `.private/ionos-deploy.web.json`
- `.private/ionos-deploy.api.json`

Para usuarios restringidos, `remoteRoot` debe ser `/`. Configurar `verifyUrl`
como `https://app.akhyles.com/` en web y
`https://api.akhyles.com/community/health` en API.

Guardar cada contraseña únicamente en el Administrador de credenciales de
Windows con el destino que indique `credentialTarget`. No incluir contraseñas
en JSON, Git, el diario o variables permanentes. El script obtiene ese secreto
solo durante la conexión SFTP y elimina su helper temporal al finalizar. La
contraseña se transporta codificada dentro del helper temporal para que los
caracteres especiales no sean interpretados por `cmd`; el cliente solo realiza
un intento de contraseña por prueba.

La primera conexión debe validar la clave de host del servidor y guardarla en
`%USERPROFILE%\.ssh\known_hosts`. El despliegue exige esa comprobación y no
acepta hosts desconocidos.

## Uso

Primero mostrar la transferencia prevista, sin cambiar el servidor:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Api
```

Para comprobar credencial, host y permiso SFTP sin publicar ni modificar nada:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web -TestConnection
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Api -TestConnection
```

Si falla, puede añadirse `-Diagnostics` a **un único** intento de prueba. El
registro sirve para confirmar el intercambio SFTP; no imprime la contraseña.

Transferir y verificar públicamente:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web -Deploy
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Api -Deploy
```

`-Deploy` ejecuta siempre un preflight SFTP de lectura antes de transferir. Si
la autenticación, la clave de host o el acceso al directorio fallan, se aborta
sin subir ningún archivo.

La web transfiere primero recursos y deja `index.html` y `metadata.json` para el
final. La API solo permite publicar `schema.sql`, `src/Accounts.php` y `src/Community.php`; no
puede transferir `config.local.php`, binarios de backup ni otros secretos por accidente. Cada
despliegue termina comprobando la URL de producción.

## Operación segura

- Revocar una cuenta SFTP comprometida desde IONOS y crear otra limitada al
  directorio correspondiente.
- No emplear el Explorador Web de IONOS como mecanismo de despliegue.
- No ejecutar con `-Deploy` sin revisar primero la simulación.
- Tras crear o cambiar una cuenta SFTP, ejecutar primero `-TestConnection` una
  sola vez y conservar su resultado en el diario. Si falla, no atribuir la causa
  al proveedor ni recrear cuentas hasta contrastarlo con una cuenta existente.
- Si cambia el host o la clave del servidor, verificar su fingerprint en IONOS
  antes de actualizar `known_hosts`.

## Protocolo obligatorio de publicaciÃ³n web

Antes de generar `dist`, usar siempre las URLs de producciÃ³n:

```powershell
$env:EXPO_PUBLIC_ACCOUNT_URL = 'https://api.akhyles.com'
$env:EXPO_PUBLIC_COMMUNITY_URL = 'https://api.akhyles.com/community'
Remove-Item Env:AKHYLES_ANDROID_LOCAL -ErrorAction SilentlyContinue
npx.cmd expo export --platform web --output-dir dist
```

Si falta `EXPO_PUBLIC_ACCOUNT_URL`, la web entra deliberadamente en modo local.
El respaldo web de `src/services/account.ts` evita que una exportaciÃ³n de
producciÃ³n vuelva a quedar sin API, pero no sustituye la configuraciÃ³n.

Antes de publicar, comprobar:

1. `curl.exe -fsSL --max-time 20 https://api.akhyles.com/health` devuelve
   `service: akhyles-accounts`, `ok: true` y `schema: 1`.
2. El certificado HTTPS de `api.akhyles.com` estÃ¡ vÃ¡lido y asignado en IONOS.
3. El bundle generado contiene `api.akhyles.com`:

   ```powershell
   Select-String -Path dist\_expo\static\js\web\entry-*.js -Pattern 'api.akhyles.com'
   ```

4. El preflight SFTP pasa:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web -TestConnection
   ```

Solo entonces ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web -WebSource dist -Deploy
```

El script deja `metadata.json` e `index.html` para el final. Después verificar
`https://app.akhyles.com/` y abrir `/account` con una recarga completa: nunca
debe aparecer el aviso de servicio de cuentas no activado. Tras iniciar sesión,
probar “Sincronizar ahora” y confirmar “Guardado en el dispositivo y en la
nube”. Si falla HTTPS, CORS, el bundle o la sincronización, detener el proceso;
no publicar una versión offline como solución.
