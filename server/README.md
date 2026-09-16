# Servidor de Comunidad

Producción: seguir [la guía de operación](../docs/DESPLIEGUE-COMUNIDAD.md).
`NODE_ENV=production` exige base absoluta persistente y `GYM_ALLOWED_ORIGINS`
explícito (vacío para Android sin web). La sesión nativa usa SecureStore, con
migración desde el almacenamiento anterior; web mantiene almacenamiento local.
Copias: `server/backup-worker.ts` y Restic con restauración ensayada localmente.
Prueba reproducible con Restic en PATH: `node --import tsx scripts/test-backup-recovery.ts`.

Backend de Akhyles con Node 24, SQLite y procesamiento de imágenes con sharp. Las cuentas y fotografías están en `server/data/akhyles.sqlite`; no se incluyen en Git. El historial de entrenamiento completo sigue siendo local a cada dispositivo.

## Probar en este equipo

`Abrir Akhyles.cmd` inicia la app y el servidor de Comunidad. Si ya tienes Expo abierto, ejecuta `npm.cmd run server` en otra terminal desde la raíz del proyecto. API: `http://127.0.0.1:8082/health`. No se crean cuentas ni fotos de ejemplo en la base real.

En Comunidad, crea una cuenta con @ y contraseña de al menos 10 caracteres. Puedes probar otra cuenta en otro navegador. El @ del perfil de entrenamiento es local; el @ de Comunidad es único entre las cuentas de ese servidor.

Las fotografías se seleccionan y previsualizan antes de publicar. Solo al pulsar Publicar se envían al servidor. Se admiten JPEG, PNG y WebP de hasta 5 MB/25 megapíxeles; se convierten a JPEG de hasta 1600 px sin los metadatos originales. Todas las publicaciones son públicas, incluidas sus URLs de imagen. Solo el propietario puede borrarlas. Los me gusta y seguidores se guardan por cuenta. Una denuncia oculta el contenido para quien la envía y queda en la tabla `reports` para revisión manual del operador; no implica retirada global automática.

## Rutinas compartidas

Desde Distribución semanal se puede publicar una rutina y compartir su enlace mediante la hoja de compartir del dispositivo (WhatsApp incluido). Rutina y progreso son privados por defecto: solo los seguidores mutuos pueden verlos después de que el propietario active cada opción en su perfil. El enlace guarda exclusivamente los días, ejercicios, series, rangos de repeticiones y notas asociadas; nunca pesos, historial, medidas ni sesiones. La rutina se abre siempre como vista previa y se copia únicamente tras confirmarlo; al importarla se ponen las cargas a cero y las notas personales ya existentes del receptor tienen prioridad. El progreso compartido es un resumen opcional de sesiones, series y mejor serie registrada por ejercicio, que se actualiza al completar una sesión.

## Alojamiento común

Se necesita un servicio con proceso Node persistente y disco persistente; SQLite no debe residir en un sistema de archivos efímero. Esta revisión no ha contratado ni publicado un alojamiento.

1. Clonar el proyecto, instalar Node 24 y ejecutar `npm ci` (incluye `tsx`, usado para arrancar el servidor).
2. Configurar las variables del proceso:
   - `GYM_API_HOST`: `127.0.0.1` por defecto; usar `0.0.0.0` si el proveedor necesita escuchar fuera del contenedor.
   - `GYM_API_PORT`: `8082` por defecto.
   - `GYM_DATABASE`: ruta absoluta en disco persistente al archivo SQLite.
   - `GYM_ALLOWED_ORIGINS`: orígenes exactos de la app separados por comas, por ejemplo `https://gym.example.com`. Por defecto admite únicamente `http://localhost:8081` y `http://127.0.0.1:8081`.
3. Arrancar desde la raíz con `npm run server`, configurar reinicio del proceso y un proxy HTTPS. Consultar `/health` como comprobación de disponibilidad.
4. En el frontend, definir `EXPO_PUBLIC_COMMUNITY_URL=https://api.gym.example.com` antes de iniciar Expo o ejecutar `npx expo export --platform web`. Es una dirección pública, no una contraseña. Servir la exportación con fallback de rutas a `index.html`.
5. En dispositivos móviles también se necesita esta variable con la dirección alcanzable del servidor; `127.0.0.1` en el teléfono apunta al propio teléfono.

Las claves de sesión son aleatorias, expiran a los 30 días y se almacenan mediante hash en el servidor. Las contraseñas se derivan con scrypt y sal individual. El cliente guarda el token de sesión en el almacenamiento local del dispositivo, nunca la contraseña. El transporte por Internet requiere HTTPS. Hay límites por IP para autenticación, por usuario para peticiones y para subidas. El @ y el nivel son declarados por cada usuario; no hay verificación de identidad ni protección contra cuentas múltiples para manipular estadísticas. No está implementada la recuperación de contraseña por correo.

Para copias de seguridad, detener el proceso y copiar la base SQLite junto con cualquier archivo `-wal`/`-shm` presente, o utilizar una herramienta de backup de SQLite en caliente. Antes de un uso público amplio se necesita concretar el servicio de recuperación de cuentas, el flujo de moderación y la operación del alojamiento.

## Propuestas de ejercicios

Los ejercicios personalizados pueden enviarse a `POST /exercise-proposals`. Permanecen en la cola privada del autor (`GET /exercise-proposals/me`) con estado `pending` y nunca se publican automáticamente. Define `GYM_ADMIN_ACCOUNT_IDS` con una lista separada por comas de IDs de cuenta Akhyles para habilitar la revisión: `GET /admin/exercise-proposals?status=pending` y `PATCH /admin/exercise-proposals/:id` con `{"status":"approved"}` o `{"status":"rejected"}`. La aprobación deja la propuesta lista para su incorporación deliberada al catálogo en una versión posterior.

## Comparaciones

Progreso envía únicamente nivel, fechas, identificadores de ejercicios homologados y fuerza estimada de los últimos 28 días. Se excluyen máquinas sin homologar, ejercicios personalizados, series de más de 12 repeticiones y sesiones sin nivel guardado o de otro nivel. El usuario participa al pulsar Compartir registros y comparar; puede borrar su muestra con Retirar mis datos. Las muestras sin actualizar durante 28 días se descartan de los cálculos y se purgan al recibir una comparación.

Cada ejercicio necesita dos registros separados al menos 7 días y el último dentro de la última semana. El cambio relativo se normaliza a 28 días. Se usan todos los participantes del mismo nivel que tienen los mismos ejercicios de la muestra personal, excluyendo al propio usuario. Se necesitan 5; mientras tanto, la interfaz muestra que faltan datos. La clasificación usa una banda de ±1 punto porcentual respecto a la media. Es un indicador experimental de ritmo, diferente de la puntuación total de carga relativa y sin una validación como clasificación deportiva.

## Verificación

`npm run check` incluye pruebas de nivel, ventanas temporales, media, muestra mínima, consentimiento revocable, autenticación, propiedad de publicaciones, imágenes inválidas, seguimiento, likes, denuncias y persistencia tras reiniciar. Las pruebas sociales de navegador usan una base en memoria independiente de la base real. Las pruebas de persistencia crean bases temporales en `test-results`, excluida de Git.

Referencias de implementación: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [react-native-svg](https://docs.expo.dev/versions/v57.0.0/sdk/svg/), [ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/), [SQLite de Node](https://nodejs.org/api/sqlite.html), [salida de imágenes con sharp](https://sharp.pixelplumbing.com/api-output/).
