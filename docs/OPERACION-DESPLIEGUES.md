# Operación de despliegues de Akhyles

Este documento es la referencia operativa antes de publicar web, API o una
actualización de la app. No contiene contraseñas ni claves.

## Regla de parada

No publicar si la comprobación SFTP de solo lectura falla. El script bloquea
automáticamente `-Deploy` en ese caso; primero se corrige la credencial y se
vuelve a comprobar. No se intenta una publicación a medias ni se recrean
cuentas por intuición.

## Secuencia obligatoria

1. Ejecutar la simulación del destino.
2. Ejecutar opcionalmente `-TestConnection` una sola vez para diagnosticar o
   comprobar el acceso antes de la ventana de publicación.
3. Ejecutar `-Deploy`: el script ejecuta **obligatoriamente** su propia prueba
   SFTP de lectura justo antes de subir. Si falla, bloquea la publicación.
4. Comprobar la URL pública indicada en la configuración.
5. Anotar en `DIARIO.md` fecha, destino, resultado de la prueba y URL
   verificada. Nunca anotar secretos.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web -TestConnection
powershell -ExecutionPolicy Bypass -File scripts/deploy-ionos.ps1 -Target Web -Deploy
```

Para API se sustituye `Web` por `Api`.

## Ubicación de credenciales

Las credenciales se almacenan solo en el Administrador de credenciales de
Windows. Las configuraciones privadas en `.private/ionos-deploy.*.json` solo
guardan el identificador de esa credencial, nunca su valor. La guía técnica es
`docs/DESPLIEGUE-IONOS-SFTP.md`.

## Si una contraseña debe cambiarse

1. Generar una contraseña única y robusta.
2. Guardarla en el Administrador de credenciales con su identificador existente.
3. Guardarla en IONOS.
4. Ejecutar de inmediato `-TestConnection` exactamente una vez.
5. Registrar únicamente el éxito o error y la fecha en el diario.

Una contraseña no se considera válida por estar guardada: solo tras pasar la
prueba SFTP de lectura.

El lanzador codifica la contraseña antes de entregarla a OpenSSH para preservar
caracteres especiales, y limita cada prueba a un único intento. No sustituir ese
paso por un script que interpole directamente la contraseña en `cmd`.
