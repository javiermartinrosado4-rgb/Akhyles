# Auditoría técnica de Akhyles — 14 de septiembre de 2026

## Alcance y método

Revisión de arquitectura, código propio de frontend/backend, persistencia, autenticación, autorización, configuración, despliegue, scripts y pruebas. Primera inspección sin modificaciones; correcciones conservadoras y segunda pasada orientada a regresiones. Se conservaron los numerosos cambios que ya existían en el árbol de trabajo. No se desplegó, publicó, envió correo real ni modificaron bases de datos externas. Las pruebas usan cuentas, servidores y bases de datos sintéticos locales.

Esto no certifica ausencia de vulnerabilidades. La inspección de dependencias se apoya en sus auditorías, no en una lectura línea a línea de todo `node_modules`/`vendor`. Android/iOS y los servicios externos requieren las comprobaciones expresamente indicadas al final.

## Arquitectura y flujos

- Expo SDK 57, React 19, React Native 0.86, TypeScript 6; expo-router organiza bienvenida, onboarding, entrenamiento, calendario, progreso, perfil, comunidad, cuentas e importación/gestión de rutinas.
- Estado local centralizado en `Store`, AsyncStorage, cola de persistencia y recuperación. Preferencias, rutinas, planes por fecha, versiones históricas, sesiones activas y registros se conservan localmente. Sesiones nativas en SecureStore; web en almacenamiento del navegador.
- Cuenta privada: PHP/PDO (mínimo del proyecto 8.2; pruebas locales con 8.4.25), MySQL/MariaDB; verificación por correo, contraseñas, Google, tokens y copias AES-GCM con revisiones y conflictos explícitos. Correo mediante outbox y trabajador SMTP.
- Comunidad: Node 24, SQLite, tokens y contraseñas scrypt; perfiles, imágenes procesadas con sharp, seguidores/bloqueos, rutinas/progreso con consentimiento y colaboraciones de entrenador.
- La identidad privada y la identidad social son distintas. La sincronización no debe cruzar propietarios.
- Configuración cliente: `EXPO_PUBLIC_ACCOUNT_URL`, `EXPO_PUBLIC_COMMUNITY_URL` y Google/configuración Expo. Las variables `EXPO_PUBLIC_*` son públicas. Credenciales de BD, SMTP, cifrado, backups y firma Android deben permanecer fuera del código y del bundle.
- Flujos revisados: alta/verificación/login/logout, cambio de usuario/dispositivo, edición y generación de rutinas, entrenamiento interrumpido/reanudado/finalizado, progresión, corrección de registros, planificación/calendario, importación, publicación y privacidad, entrenamiento gestionado, conflictos y recuperación de copias.

## Hallazgos corregidos

| Severidad | Problema | Corrección/evidencia |
|---|---|---|
| HIGH | Una escritura HTTP de colaboración podía terminar después de revocar la relación; una petición ya autenticada podía escribir tras revocar su sesión. | Revalidación después de leer el cuerpo y tras procesamiento asíncrono de imágenes. Regresiones con cuerpo HTTP retenido: 404/401, antes 200. |
| HIGH | Reutilización de sesión social al cambiar el propietario de la cuenta privada y respuestas antiguas que podían afectar a la sesión actual. | Clave social por propietario, desmontaje del proveedor y descarte de respuestas de sesiones antiguas. Logout social local independiente de conexión. |
| HIGH | Estructuras corruptas anidadas llegaban a pantallas; validación de rangos podía lanzar excepciones. | Prevalidación de colecciones, mapas, sesiones e historial; rangos defensivos; bloqueo de navegación mientras la recuperación local falla, conservando los bytes originales. |
| HIGH | Rutinas importadas podían contener rangos, referencias o estructuras que luego impedían recuperar el estado. | Validación explícita antes de importar, límites y referencias conocidas; rechazo de campos ajenos. Regresión de aductores personalizados. |
| HIGH | PHP convertía mapas vacíos de barras/modos de carga en arrays, incompatibles con la aplicación. | Normalización de diccionarios; pruebas de ida y vuelta en SQLite y MariaDB. |
| HIGH | El editor semanal existente no era accesible desde ninguna ruta activa. | Acceso explícito desde Entrenamiento, reutilizando el componente existente. |
| HIGH | Quitar el último ejercicio seleccionado podía dejar el índice activo fuera del array y romper la sesión. | Reconciliación del índice y protección al reanudar, evitando copiar el borrador de un ejercicio eliminado al siguiente. |
| HIGH | Una sesión sin finalizar pasada medianoche se descartaba al reabrir la app. | Se conserva hasta finalizarla o descartarla explícitamente; Hoy la muestra como pendiente, separada del plan del nuevo día. Pruebas unitaria y E2E de recuperación de borradores aprobadas. |
| HIGH | Sustituir un ejercicio ya registrado durante una sesión activa reutilizaba su ID y podía mostrar el sustituto como completado. | Los registros ya realizados son inmutables: la sustitución actualiza rutina y trabajo pendiente, pero la sesión conserva la prescripción original registrada. Prueba unitaria de reanudación y regresión E2E añadidas. |
| HIGH | La API PHP de copias privadas validaba la envoltura, pero podía cifrar rutina, registros o sesión activa estructuralmente corruptos. | Validación anidada y con límites para prescripciones, rangos, series, rutina, historial y sesión activa; regresiones PHP añadidas para rutina y registro inválidos. |
| HIGH | Operaciones de cuenta/recuperación podían completarse sobre una sesión cambiada. | Exclusión de operaciones incompatibles y comprobación de generación/estado antes de restaurar. |
| MEDIUM | Vista previa confundida con la sesión activa y reanudación inaccesible tras cambiar el plan. | Correspondencia entre sesión mostrada, contador y acción; acceso separado a la sesión pendiente. |
| MEDIUM | Fechas `YYYY-MM-DD` se interpretaban como UTC y cambiaban de día en zonas occidentales. | Preservación de claves de calendario; prueba con zona America/Los_Angeles. |
| MEDIUM | Publicaciones automáticas concurrentes podían llegar desordenadas y dispararse al teclear. | Debounce y serialización de subida de rutina/progreso públicos. |
| MEDIUM | Cálculo de progreso repetido al escribir en un campo local. | Memoización; benchmark reproducible con 416 sesiones/521 mediciones (~410 ms iniciales en esta máquina, no presupuesto de rendimiento móvil). |
| MEDIUM | Offset decimal de publicaciones provocaba error interno. | Validación de entero seguro y límite; regresión HTTP 400. |
| MEDIUM | La retención guardaba 21 versiones, aunque el límite previsto era 20. | Corrección de umbral; prueba de 24 subidas y recuento exacto de 20 versiones. |
| MEDIUM | Gradle podía firmar una release manual con la clave debug por defecto. | Rechazo explícito si no se proporciona configuración de firma; cambio también en el plugin generador. |
| LOW | Promesa de notificaciones sin capturar y etiquetas largas sin ajuste. | Manejo de rechazo y ajuste del texto de botones. |
| LOW | El límite interno de entrada HTTP permitía 8 MB aunque las fotografías anunciaban un máximo de 5 MB. | Corte de la petición en 5 MB, antes de acumular bytes adicionales en memoria. |

No se ha confirmado un hallazgo CRITICAL. HIGH no equivale automáticamente a explotación remota demostrada: la tabla distingue las condiciones y pruebas disponibles.

## Verificación registrada

- `npm run check`: TypeScript, ESLint, 123 tests unitarios/integración y escáner de secretos aprobados en la pasada registrada. El escáner no sustituye una revisión del historial Git ni detecta todos los formatos de secreto.
- Tras las dos correcciones posteriores: `npm run typecheck` y los 124 tests unitarios/integración aprobados, incluida la regresión de sustitución tras trabajo registrado.
- PHP 8.4 local: lint correcto, 40 aserciones de cuentas en SQLite y backup cifrado/restauración aprobados. La prueba MariaDB exige una instancia de loopback aislada y se bloquea explícitamente si no está configurada; no se usó ningún servicio externo.
- Restic: backup cifrado, comprobación integral, restauración, integridad SQLite y limpieza de staging aprobados con repositorio local sintético. Requirió añadir la herramienta local al PATH.
- Composer audit: sin avisos de vulnerabilidades.
- npm audit: 15 entradas de severidad moderada; ninguna alta/crítica según la base consultada. No equivale a 15 vulnerabilidades independientes.
- Exportación web de producción aprobada tras las últimas correcciones: `artifacts/audit-web-verified-20260914`, bundle principal aproximado de 1,8 MB y 62 assets. Aviso de caché Metro incompatible recuperado automáticamente; no error de compilación.
- Android: `:app:assembleRelease :app:bundleRelease` aprobados para cuatro arquitecturas. APK y AAB en `android/app/build/outputs`, sin sobrescribir los paquetes publicados de `artifacts/android`. APK verificado con apksigner y alineación de 16 KB; AAB validado con bundletool y firma JAR. Certificado SHA-1 original `040ea0afd797f22730198cdb4295c4763ab86ab7`. Manifest sin debug, cleartext ni backup habilitados. La prueba negativa sin credenciales de firma también pasó. Avisos de APIs/Gradle obsoletos y certificado JAR autofirmado/orden de entradas, no errores de build.
- No había dispositivo/emulador conectado a ADB: no se instaló sobre ningún teléfono ni se ejecutó QA nativo interactivo.
- Auditoría de traducciones: 36 literales candidatos sin traducción (la herramienta también recoge fragmentos/plantillas). No aprobada como cobertura completa de inglés; no bloquea compilación. Revisión visual de capturas móvil/escritorio, claro/oscuro: sin desbordamiento horizontal en recorridos probados, pero etiqueta «Entrenamiento» truncada en móvil.
- `git diff --check` señala dos espacios finales en documentación previa de Google Play, sin cambios estéticos sobre ese trabajo del usuario. Lint sintáctico PHP aprobado.
- E2E final: **46/46 aprobadas**, 2 workers, ~1,1 minutos; evidencias en `test-results/audit-verified-20260914`. Incluye todos los archivos de la suite y la regresión nueva de sesiones. Pruebas en Chromium sobre la aplicación web de desarrollo con backend local aislado; no equivale a E2E Android ni a pruebas de servicios productivos.

### Pruebas añadidas y actualizadas

Ocho nuevas pruebas unitarias/integración: colecciones corruptas, rutinas inválidas, rango malformado, aductores personalizados, fecha sin zona, índice activo tras eliminación, escritura HTTP con permisos revocados y paginación decimal. Dos nuevas comprobaciones PHP de diccionarios y retención. Una nueva E2E de aislamiento social por propietario y logout offline. Actualizadas pruebas existentes para el editor accesible, pestañas con rol `tab`, campos de carga actuales, favoritas fuera del formulario y eliminación del simulador antiguo. La Comunidad de QA utiliza un backend efímero, no las cuentas del servidor de desarrollo del usuario.

Las primeras ejecuciones E2E no se consideran aprobadas: hubo timeouts de Metro y seis fallos de selectores/expectativas antiguas. Se reinició únicamente el servidor de QA con `CI=1` (sin recarga en caliente) y se repitieron pruebas. No se rebajaron las comprobaciones de datos persistidos para esconder errores.

## Decisiones y riesgos pendientes

- No se ha aplicado `npm audit fix --force`: proponía cambios incompatibles de Expo/router. El aviso de `decode-uri-component` requiere una actualización compatible; la versión corregida 0.5.0 cambia a ESM y no es un reemplazo seguro para consumidores CommonJS antiguos. `uuid` también aparece transitivamente en tooling. Referencia: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr.
- La validación PHP ahora cubre las colecciones que pueden romper recuperación (rutina, historial y sesión activa), pero no sustituye un esquema versionado compartido con el cliente. Mantener fixtures heredados y ejecutar también la suite MariaDB en una instancia aislada antes de activar ese servicio.
- Cuentas y Comunidad no están habilitadas en la release offline por defecto. Falta validar infraestructura real: HTTPS/DNS, Google con firma/orígenes finales, SMTP, cron, alertas, cuotas y restauración externa. No se activaron para ocultar esta limitación.
- Persistencia web basada en localStorage: límites de cuota, borrado del navegador y cualquier XSS futuro pueden afectar a datos/sesiones. El guardado optimista conserva cambios en memoria y muestra fallo, pero cerrar antes de recuperar almacenamiento puede perder lo no escrito.
- El historial grande todavía exige medir latencia/memoria en Android real; memoizar no cambia la complejidad del cálculo inicial. Fotos y assets nuevos de más de 1 MB aumentan transferencia/memoria.
- No se ejecutó pentesting destructivo, carga contra producción, entrega SMTP real ni flujo Google interactivo real. No se ha probado iOS desde Windows.
- Conviene una revisión funcional específica del editor de entrenador. La sustitución durante una sesión activa conserva de forma explícita el trabajo ya registrado; no se rediseñó el resto de ese flujo.
- MEDIUM: el editor de entrenador ya muestra error ante un plan inválido, pero la entrada de rangos necesita una revisión de interacción; no se modificó el modelo de edición completo.

## Criterio de publicación

**NOT READY para producción.** Hay una base comprobada y numerosas correcciones, pero persisten endurecimiento de copias privadas y verificación operativa/nativa. No se certifica producción con tests verdes mientras existan estas limitaciones.

Antes de publicar: endurecer el esquema PHP manteniendo compatibilidad, resolver/aceptar formalmente los avisos de dependencias, validar Google/SMTP/HTTPS/cron/backups en el entorno final y ejecutar los flujos críticos en Android real. Verificar también que el `versionCode` elegido no se haya utilizado ya en Play; no se incrementó ni se publicó una nueva versión durante esta auditoría.
