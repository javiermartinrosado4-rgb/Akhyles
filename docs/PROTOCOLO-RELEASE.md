# Protocolo obligatorio de publicación

Este documento se aplica a cualquier cambio de Web, API o Android. No sustituye las listas técnicas de despliegue: fija el orden y las condiciones para continuar.

## Antes de cualquier publicación

1. Revisar `git diff` y separar cambios ajenos al alcance.
2. Ejecutar `npm.cmd run release:doctor -- web`, `-- android` o `-- api` según el destino, además de las pruebas afectadas. Registrar cualquier fallo heredado y no atribuirlo al cambio.
3. Ejecutar `npm.cmd run security:dependencies`; una vulnerabilidad alta o crítica de producción bloquea la publicación hasta evaluarla y resolverla formalmente.
4. Para cambios de datos o sincronización: probar cuenta con historial, sesión activa, dos dispositivos, modo sin conexión y restauración cloud.
5. Para API: ejecutar migración en entorno de prueba, generar backup cifrado y restaurarlo en una base vacía. Confirmar que incluye tablas `account_sync_*`.
6. No activar Sync V2 globalmente. Habilitarlo mediante `php bin/sync-v2.php correo enable` solo para cuentas de prueba y verificar su manifiesto antes de ampliar el grupo.

## Publicar API y Web

1. Publicar la API primero con su migración aditiva. Verificar `/health`, HTTPS y autenticación real.
2. Comprobar que el backup diario externo y la alerta de restauración siguen activos antes de activar una migración de datos.
3. Exportar Web con `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com` y `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com/community`.
4. Verificar que el bundle incluye la URL API correcta y ejecutar el preflight SFTP de solo lectura.
5. Publicar con `scripts/deploy-ionos.ps1`; tras la publicación, hacer recarga completa, iniciar sesión y comprobar `Guardado en el dispositivo y en la nube`.
6. Revisar métricas de sync: errores, conflictos, operaciones pendientes y migraciones no verificadas. Si empeoran, desactivar V2 para las cuentas afectadas y no continuar el despliegue.
   Programar `php bin/sync-v2-report.php --require-verified`; cualquier salida `2` debe generar una alerta operativa y bloquear la ampliación del rollout.

## Publicar Android en Google Play

Antes de generar una APK/AAB por un cambio visual, abrir `npm.cmd run android:visual`, comprobarlo con el perfil sintético y obtener la aprobación visual del titular. Este modo de QA con recarga rápida es el procedimiento predeterminado para iterar; la compilación firmada se reserva para el resultado ya aprobado.

1. Incrementar versión y `versionCode`; no reutilizar un `versionCode` publicado.
2. Crear APK/AAB firmado con las URLs de producción y verificar firma, manifiesto, permisos, versión y hash SHA-256.
3. Instalar la APK en un dispositivo real y probar inicio de sesión, sesión sin conexión, finalización, reanudación, sincronización y actualización desde una versión anterior.
4. Subir únicamente a **Prueba cerrada Alpha**, completar notas y guardar la versión.
5. Enviar a revisión solo después de que la prueba de datos y la verificación del backup sean correctas. No iniciar Producción en el mismo paso.
6. Tras aprobarse, ampliar el grupo de prueba y vigilar métricas antes de decidir un lanzamiento mayor.

## Vigilancia continua

- Crear una cuenta técnica aislada, con una copia inicial válida y sin datos personales. Configurar sus credenciales solo en el secreto del cron, nunca en el repositorio.
- Ejecutar diariamente `npm.cmd run monitor:sync` con `AKHYLES_SYNTHETIC_ACCOUNT_URL`, `AKHYLES_SYNTHETIC_EMAIL` y `AKHYLES_SYNTHETIC_PASSWORD`. El canario inicia dos sesiones, escribe un entrenamiento mínimo, confirma que la segunda lo recibe y lo elimina.
- Si el comando falla, alertar al responsable y bloquear publicaciones hasta investigar. El único posible residuo es un entrenamiento `synthetic-*` dentro de esa cuenta técnica.
- Revisar el informe `php bin/sync-v2-report.php --require-verified` y los contadores agregados de `account_operational_metrics`; no contienen correos, sesiones, pesos ni entrenamientos.

## Staging

- Mantener una API y base de datos distintas para staging, con clave de cifrado, correo y cuenta canario propios. Nunca apuntar staging a la base o secretos de producción.
- Toda migración de datos se prueba primero allí: backup, restore, dos dispositivos, interrupción de red y rollback. Solo después puede pasar a Alpha y producción.

## Claves de cifrado

- Conservar la clave AES-256-GCM fuera del hosting en un gestor seguro y en una copia de recuperación controlada.
- No rotarla directamente. La rotación exige una migración que descifre y recifre copias, revisiones, entidades Sync V2 y backups con una clave nueva; primero se prueba en staging y se valida una restauración completa.
- Si se sospecha exposición de la clave, detener activaciones, preservar evidencia, generar una clave nueva y ejecutar el procedimiento de recifrado antes de reanudar publicaciones.

## Reversión

- Web: volver al bundle anterior validado.
- API: las migraciones son aditivas; desactivar Sync V2 por cuenta y volver al endpoint V1, nunca borrar tablas ni copias durante una incidencia.
- Play: detener el rollout de Alpha; publicar corrección con un `versionCode` nuevo si es necesaria.
- Datos: restaurar únicamente en una base vacía y validar recuentos y manifiestos antes de volver a servirla.
