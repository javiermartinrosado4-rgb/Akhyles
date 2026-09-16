# Operación de Comunidad

Estado: implementación y pruebas locales. Hosting, DNS, certificado público y
repositorio externo de copias pendientes de acceso del titular. No hay URL de
producción confirmada. Un Compose escrito no acredita un servicio desplegado.

Para la separación entre `akhyles.com` en IONOS y `api.akhyles.com`, consultar
[IONOS-Y-API-AKHYLES.md](IONOS-Y-API-AKHYLES.md).

## Arquitectura

Una instancia Node 24 detrás de Caddy, SQLite/WAL y fotos en el volumen persistente
`akhyles_akhyles_data`. Solo Caddy publica 80/443. No escalar a varias réplicas:
nonces y límites están en memoria. Reiniciar invalida nonces, conserva sesiones y cuentas.

API como usuario `node`, raíz de solo lectura, capacidades Linux retiradas y límites
de memoria/procesos. SQLite usa claves foráneas, WAL, espera de bloqueo y borrado
seguro. Los errores inesperados registran únicamente un ID de petición, sin cuerpos,
tokens ni IP. Revisar por separado los registros que mantenga el proveedor.

## Accesos y configuración

Abrir panel del hosting > servidor Linux: hacen falta IP pública, región, usuario
SSH y acceso existente. Docker Compose, disco persistente y puertos 80/443. La API
admite hasta 1 GB y las copias hasta 3 GB; dimensionar también el sistema operativo.
Abrir panel del dominio > DNS: registro A/AAAA de la API hacia el servidor.
Abrir almacenamiento > bucket privado externo: endpoint S3, región y credencial
limitada al prefijo de Akhyles. Introducir secretos directamente en el host.

Clonar el repositorio. Crear `server/.env.production` y `server/.env.backup` a partir
de sus ejemplos, con permisos 0600 y fuera de Git.

| Variable | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `GYM_DATABASE` | `/data/akhyles.sqlite`, disco persistente |
| `GYM_API_HOST` / `GYM_API_PORT` | `0.0.0.0` / `8082`, sin publicar el puerto |
| `GYM_ALLOWED_ORIGINS` | Vacío para solo Android; orígenes HTTPS reales exactos para web |
| `GYM_TRUST_PROXY` | `1` solo con API aislada detrás de Caddy, que sustituye `X-Forwarded-For` |
| `GYM_GOOGLE_CLIENT_ID` | ID público del cliente WEB real; vacío hasta crearlo |
| `GYM_API_DOMAIN` / `CADDY_EMAIL` | Dominio real / correo para certificados |
| `RESTIC_REPOSITORY` | Repositorio S3 externo dedicado |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Solo en `.env.backup` privado |

Crear `server/backup-password.txt` con contraseña aleatoria fuerte mediante el gestor
de secretos. Guardar otra copia privada fuera del host. UID 1000 debe poder leer el
archivo, con permisos 0600. Sin esa contraseña no se pueden recuperar las copias.

```bash
docker compose -f deploy/community/compose.yaml build
docker compose -f deploy/community/compose.yaml run --rm --no-deps backup restic init
docker compose -f deploy/community/compose.yaml up -d
docker compose -f deploy/community/compose.yaml ps
```

`restic init` solo la primera vez sobre el repositorio dedicado comprobado. Validar
sintaxis con `docker compose -f deploy/community/compose.yaml config --quiet`;
no imprimir la configuración interpolada con secretos. Caddy emite y renueva TLS,
redirige HTTP a HTTPS y añade HSTS.

Comprobar desde fuera `/health`, CORS, registro, contraseña, fotos, privacidad de
rutinas/progreso y borrado de cuenta sintética. Recrear API y verificar persistencia.
Configurar alertas externas para errores, disponibilidad, disco y copias.

## Copias y recuperación

`server/backup-worker.ts` realiza copia al arrancar y cada 24 horas. SQLite online
backup incluye transacciones confirmadas del WAL. Verifica integridad y claves
foráneas, envía con cifrado Restic y comprueba el repositorio. Después aplica
retención de 30 días solo al host `akhyles-community` y etiqueta `community`.
El staging temporal se elimina. Ajustar el ciclo de vida del bucket: conservar
versiones borradas puede prolongar el plazo efectivo de retención.

Healthcheck falla tras 26 horas sin copia. Docker no envía avisos ni reinicia un
servicio solo por estar `unhealthy`: conectar alertas del hosting. RPO previsto 24 h;
RTO pendiente de medir. Staging máximo 2 GB: ampliar antes de que la base lo alcance.

Simulacro mensual, en carpeta nueva privada:

```bash
restic snapshots --host akhyles-community --tag community
restic check --read-data
restic restore ID_VERIFICADO --target /ruta/nueva/restore-check
```

Verificar SQLite con `verifyDatabase` de `server/backup.ts` y arrancar una API de
prueba aislada para comprobar cuenta, foto, rutina y progreso. Anotar snapshot,
fecha, duración y resultado. El `check` diario de Restic no sustituye a este ensayo.

Recuperación real: detener API, conservar volumen actual, restaurar en volumen nuevo,
verificar y cambiar el montaje. Invalidar sesiones recuperadas y reconciliar las
solicitudes de borrado posteriores al snapshot antes de reabrir. Nunca usar
`docker compose down -v` para actualizar: elimina los volúmenes.

## Release y actualización

Definir `EXPO_PUBLIC_COMMUNITY_URL` real y ejecutar `scripts/build-android.ps1 -Format both`.
El script comprueba DNS público y `/health` por TLS, sin redirecciones. La app y su
configuración rechazan IPs, loopback, HTTP y dominios locales. `-LocalTest` solo
genera una APK HTTP para pruebas; `-OfflinePreview` genera archivos distintos sin
Comunidad. Ninguna variante acredita despliegue público.

Antes de actualizar: copia externa exitosa y commit previo anotado. Después:
contenedor nuevo, salud, flujo social y persistencia. Rollback al commit anterior
con el mismo volumen si el esquema es compatible; si no, recuperar como se indica.

Referencias: [SQLite online backup](https://nodejs.org/api/sqlite.html),
[repositorios cifrados Restic](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html).
