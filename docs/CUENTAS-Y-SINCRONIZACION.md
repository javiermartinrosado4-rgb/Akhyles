# Cuentas y sincronización de Akhyles

Implementación iniciada el 10 de septiembre de 2026, autorizada por el titular.

Revisión del 11 de septiembre: implementación local terminada; todavía no está
desplegada en IONOS. Superadas 79 pruebas de la app y 36 comprobaciones de cuentas
tanto con SQLite como con MariaDB, más restauración de backup cifrado. Cuatro
flujos de navegador verifican registro y recuperación en otro navegador, conflicto
entre dispositivos, cambio de cuenta, desconexión y edición durante una subida.
Los correos de estas pruebas se capturan localmente; Google usa identidades de
prueba en el servidor. No equivalen a entrega SMTP ni OAuth real en Android.

## Diseño

Servicio de cuentas PHP 8.2+ y MySQL/MariaDB para el Hosting Premium ya contratado.
El servicio social Node existente se conserva; no es necesario migrar fotos,
seguidores y publicaciones para habilitar copias privadas. La cuenta de copias
es independiente del antiguo acceso experimental de Comunidad.

La aplicación guarda primero en el dispositivo y sincroniza después. El servidor
asocia cada copia exclusivamente al identificador autenticado, nunca a un email
o identificador de usuario enviado en el cuerpo. La sincronización usa una
revisión del servidor y comparación de la última copia confirmada. Una escritura
basada en una revisión antigua recibe 409. Las copias divergentes requieren una
elección explícita, con archivo de recuperación previo; nunca se regeneran rutinas
por actualizar la APK ni por iniciar sesión.

El correo sirve para acceso, verificación, bienvenida y recuperación. No se
incorpora una suscripción comercial. Google se verifica en el servidor mediante
su biblioteca oficial. La vinculación de un Google nuevo a una cuenta por correo
requiere autenticar la cuenta existente; no se vinculan solo por coincidir el email.

## Activación pendiente de verificación

- Comprobar PHP, extensiones y MySQL del alojamiento en una carpeta aislada.
- Crear base dedicada, configuración privada fuera de la raíz pública y acceso SFTP.
- Configurar OAuth web/Android real y huella de firma de la APK.
- Configurar SMTP autenticado, remitente, SPF/DKIM y probar entrega.
- Conectar `api.akhyles.com` y verificar HTTPS, backups y restauración.
- Ejecutar pruebas de reinstalación, dos dispositivos, pérdida de conexión y
  aislamiento entre cuentas antes de distribuir la APK conectada.

No se considera nube activada por el mero hecho de compilar una APK o crear DNS.
