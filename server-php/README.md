# Akhyles: cuentas y copias privadas en IONOS

PHP 8.2+, PDO MySQL, OpenSSL, mbstring y HTTPS. Base MySQL/MariaDB **dedicada**.
Las dependencias de Google y SMTP se fijan en `composer.lock`. El servicio social
Node existente continúa separado y no se publica con este paquete.

## Publicación

1. Crear una carpeta aislada `akhyles-accounts` en el Hosting Premium. Subir
   `src`, `bin`, `public`, `vendor`, `bootstrap.php`, `schema.sql` y `.htaccess`.
   **No subir** `tests`, claves del ordenador, backups ni configuración de ejemplo
   como configuración real. La raíz del subdominio debe ser exclusivamente
   `akhyles-accounts/public`; la configuración queda un nivel por encima.
2. Crear una base dedicada a Akhyles, sin reutilizar tablas de las otras webs.
3. Copiar `config.example.php` a `config.local.php` y completar los valores en el
   alojamiento. Generar una clave aleatoria de 32 bytes codificada en base64;
   conservar una copia privada fuera del hosting. Perder esta clave impide
   recuperar los entrenamientos cifrados. No rotarla sin migrar las copias.
4. Desde SSH: `php bin/migrate.php`. La versión de PHP CLI debe ser 8.2 o superior.
5. Conectar `api.akhyles.com` a `public` y asignar un certificado válido para el
   subdominio. No modificar el destino de la portada ni el correo existente.
6. Configurar el cliente OAuth WEB de Google y el cliente Android con paquete
   `com.javiermartinrosado.akhyles` y la huella de la firma de la APK. El ID web es
   público; los secretos de base y SMTP solo van en `config.local.php`.
7. Probar SMTP con cuenta de pruebas autorizada y confirmar entrega real de
   verificación, bienvenida y recuperación. Los emails no son publicidad.
8. Programar por SSH `php /ruta/akhyles-accounts/bin/worker.php` cada minuto o
   cinco minutos. Las peticiones de cuenta intentan una entrega inmediata; la
   cola persistente reintenta fallos con espera progresiva. Supervisar tareas
   con ocho intentos fallidos; se conservan hasta siete días.
9. Programar `php bin/backup.php` diariamente, copiar el archivo cifrado a un
   destino externo al hosting y acordar una retención (propuesta: 30 días).
   Probar `php bin/restore.php archivo.encrypted` en una base **vacía** separada.
   No se restauran sesiones: el usuario vuelve a autenticarse. Las 20 versiones
   por cuenta ayudan ante errores de sincronización, pero no sustituyen al backup.
10. Comprobar `/health`, registro, Google, verificación, SMTP, restauración y
    aislamiento antes de definir `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com`
    al compilar la app. El cliente sin esta variable comunica guardado local.

## Contrato HTTP

- `POST /auth/register`: email, name, password → challengeId, mensaje genérico.
- `POST /auth/verify`: challengeId, code → token y usuario verificado.
- `POST /auth/login`: email, password → sesión de 30 días.
- `POST /auth/forgot`, `POST /auth/reset`: recuperación por código de un uso.
- `GET /auth/google/config`, `POST /auth/google`: identidad verificada por Google.
- `POST /auth/google/link`: vincular el mismo correo con una sesión autenticada.
- `GET /me`, `DELETE /me` con confirmEmail, `POST /auth/logout`.
- `GET /sync`, `PUT /sync`: estado y revisión; 409 si otro dispositivo avanzó.
- `GET /sync/versions` y `GET /sync/versions/{revision}`: hasta 20 copias por cuenta.

La API deduce siempre el propietario de la sesión. Nunca confía en un owner del
cuerpo. El backup privado no activa publicaciones de Comunidad. AES-256-GCM
protege el contenido en la base, vinculado al ID del propietario; esto no es
cifrado de extremo a extremo. Email y nombre son datos de cuenta accesibles al
operador. Contraseñas bcrypt y tokens/códigos almacenados mediante hash.

Los backups externos pueden contener cuentas borradas hasta expirar su retención.
Antes de volver a producción tras una restauración debe aplicarse el registro
de solicitudes de borrado. Este procedimiento debe quedar configurado y reflejado
en la política real antes del lanzamiento público.

## Pruebas

`php tests/accounts.php`: API real con SQLite aislado. Para repetir con MariaDB,
usar AKHYLES_TEST_DSN, AKHYLES_TEST_USER y AKHYLES_TEST_PASSWORD apuntando a una
base dedicada VACÍA. Nunca ejecutar contra una base de usuarios reales.
`php tests/backup.php`: cifrado, restauración y rechazo de destino no vacío.

Desde la raíz del proyecto: `node scripts/start-account-qa.mjs` inicia un entorno
de prueba local (PHP 8094, app web 8093). Su buzón es simulado y nunca envía correo
real. `node node_modules/@playwright/test/cli.js test tests/e2e/account-sync.spec.ts
--output=test-results/account-browser` ejecuta pruebas con dos dispositivos.
