# Diario de Akhyles

## Estado vigente — 22 de septiembre de 2026

Este resumen se ha contrastado con el repositorio en `main` y con el estado visible de Play Console. Las entradas fechadas que siguen registran lo ocurrido en cada fase; las referencias a estados pendientes corresponden al momento de cada entrada.

- **Código y versiones:** Expo SDK 57, app `1.0.38`, Android `versionCode 41` e iOS `buildNumber 1` en `app.config.ts`. Proyecto EAS `0d55315c-62ca-4ecf-a9d1-736ba51ea21d`.
- **Android / Google Play:** AAB `41 (1.0.38)` subida y guardada como borrador de Prueba cerrada — Alpha, con notas en es-ES. Play muestra la versión `39 (1.0.36)` como la última publicada del canal. La nueva versión no se ha enviado a revisión ni a Producción. No había dispositivo Android conectado para instalar y probar esta build.
- **AAB actual:** `artifacts/android/akhyles-release.aab`, 71.098.905 bytes, SHA-256 `5DE1208313F739954D79406B28B9B241BED386701BF3ACF993F68F70290BD9EA`. Firma original comprobada, certificado SHA-1 `040ea0afd797f22730198cdb4295c4763ab86ab7`, paquete correcto, `versionCode 41`, manifiesto seguro y permisos revisados. APK acompañante SHA-256 `8D0C12F8894FA9F58C9E76FA3EA56311842BD7FCF76AFB21FC081DE4A9948B11`.
- **Responsividad de entrenamiento:** commit `5f111a6` desacopla los campos de peso, repeticiones y notas del estado global durante la escritura. La persistencia se agrupa con 350 ms y se fuerza al perder foco, cambiar de ejercicio, salir, desmontar la pantalla o pasar a segundo plano. TypeScript y ESLint pasaron. No se midió todavía el comportamiento en dispositivo físico.
- **Web y API:** la API PHP y la Web se actualizaron el 22/09 con las rutas de colaboración. Las URLs públicas respondieron correctamente y la Web sirve el bundle nuevo. La pestaña Entrenador sigue detrás de la condición de habilitación de producción descrita en el código; falta probar con dos cuentas reales invitación, aceptación y sincronización.
- **Frases:** hay 21 frases y una selección diaria estable en `src/content/motivation.ts`.
- **Sincronización:** `/sync/revision` y el flujo de copia completa están implementados. Sync V2 tiene entidades, outbox y servidor preparados, pero el cliente aún no usa las operaciones incrementales como vía principal; activación por cuenta y migración siguen pendientes.
- **iOS:** la última entrada del diario indica que el envío de `1.0.36 (1)` estaba en cola en Expo. No consta envío a App Store Connect, TestFlight ni publicación en App Store. Verificar el estado de esa cola antes de iniciar otra build iOS.

### Android 1.0.38 / versionCode 41 — borrador Alpha — 22 de septiembre de 2026

- Incrementadas la versión de Android desde `1.0.37 / 40` a `1.0.38 / 41`, manteniendo el paquete y la firma Android existentes.
- Las comprobaciones de HTTPS/DNS de Cuentas y Comunidad, `release:doctor -- android` y el análisis de dependencias pasaron; este último no detectó vulnerabilidades altas o críticas.
- Generadas APK y AAB release con URLs de producción. La compilación Gradle terminó correctamente para ARM64 y x86_64. `verify-android.mjs` confirmó firma, certificado, paquete, versión, permisos y manifiesto.
- Subida la AAB a **Prueba cerrada — Alpha**. Play reconoció `41 (1.0.38)`; se guardó como borrador con las notas: "Mejoras en la respuesta al registrar entrenamientos y en el guardado de tus datos. Correcciones y ajustes internos."
- El borrador no se envió a revisión: el protocolo pide instalación y prueba en un Android físico, y `adb devices` no mostró ningún dispositivo conectado. No se inició Producción.

### Responsividad al editar entrenamientos — 22 de septiembre de 2026

- Se identificó que cada tecla llamaba a `update()` del Store, recalculaba datos derivados, actualizaba el estado global y encolaba el guardado completo.
- Los campos de series, carga base y notas ahora conservan el borrador local mientras se escribe. Se persiste agrupado tras 350 ms y al perder foco, cambiar de ejercicio, salir de la pantalla, desmontarla o enviar la app a segundo plano.
- Los cambios se publicaron en el commit `5f111a6 perf: defer workout input persistence`. `npm.cmd run typecheck` y `npm.cmd run lint` finalizaron correctamente. Pendiente medir input lag en un móvil físico con la versión Alpha.

### Actualización de API y Web para colaboraciones — 22 de septiembre de 2026

- Corregida la tipificación del plugin opcional de Google para iOS en `app.config.ts`; `npm.cmd run typecheck` y `npm.cmd run release:doctor -- api` finalizaron correctamente. La auditoría de dependencias no detectó vulnerabilidades altas ni críticas.
- Publicada la API PHP mediante SFTP tras superar su preflight de solo lectura. `https://api.akhyles.com/community/health` respondió `200` con `ok: true`. Al iniciar la API, la migración aditiva de `community_coaching` añade las columnas necesarias para las solicitudes de colaboración.
- Exportada y publicada la Web con las URLs de producción. `npm.cmd run release:doctor -- web` fue correcto; `https://app.akhyles.com/` respondió `200` y sirve `entry-efa2fd66b7eddac7dab5ed347e7fa6e5.js`.
- Pendiente: comprobar autenticado el recorrido de invitar, aceptar y revocar una colaboración con dos cuentas reales. No se creó ninguna relación de prueba en cuentas reales durante el despliegue.

### Vinculación inicial con Expo EAS — 22 de septiembre de 2026

- Creada la organización/proyecto EAS desde Expo y guardado su identificador en `app.config.ts` (`extra.eas.projectId`).
- Corregido el nombre visible del proyecto EAS a **Akhyles**. Añadidas en el entorno `production` las URLs públicas de Cuentas y Comunidad; activados los avisos por correo de builds y envíos.
- Instalado el complemento oficial de Expo para Codex en el perfil local de este equipo; no forma parte del repositorio y cada Mac puede instalarlo si lo desea.
- Verificada la configuración Expo de producción con bundle ID `com.javiermartinrosado.akhyles`, versión `1.0.36`, EAS project ID correcto, modo de Comunidad local desactivado y sin tráfico cleartext.
- EAS CLI `24.7.0` quedó disponible con `npx`. `eas project:info` requiere iniciar sesión en la cuenta Expo (`eas login` o `EXPO_TOKEN`); no se introdujeron credenciales en este equipo. La comprobación autenticada queda pendiente antes de compilar.

### Google Play Alpha: version 1.0.36 / versionCode 39 - 22 de septiembre de 2026

- Subida y procesada correctamente en el canal **Prueba cerrada - Alpha** la AAB `akhyles-release.aab`.
- Google Play reconoce `39 (1.0.36)` y las notas de version en `es-ES`.
- El cambio se envio a revision desde **Resumen de publicacion**. Produccion no se ha modificado.
- Play muestra unicamente la advertencia de mapa de desofuscacion no adjunto; no bloquea el envio. La prueba en dispositivo fisico sigue pendiente porque `adb devices` no detecto ningun dispositivo.

### Preparación Android 1.0.36 / versionCode 39 — 22 de septiembre de 2026

- Incrementada la versión desde `1.0.35 / 38` a `1.0.36 / 39`, sin reutilizar el código de Play.
- Generados los artefactos release conectados con `https://api.akhyles.com` y `https://api.akhyles.com/community`: [AAB](artifacts/android/akhyles-release.aab) y APK.
- Verificado: `release:doctor -- android`, firma SHA-1 original `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`, manifest seguro, cleartext desactivado y sin cámara, micrófono ni permisos de almacenamiento. AAB SHA-256 `7039BA072E512CFE8C2560164C6235ADEC2FC84257AEFDA34B66776684E00FEA`; APK SHA-256 `277DF4AF9DBD94CBE06745B3BC0024811CE8DF987E38640AA7024BAA1024059C`.
- El dispositivo real no estaba conectado (`adb devices` sin dispositivos). Por protocolo, la prueba de instalación, actualización, sesión, offline y sincronización queda pendiente. La subida posterior a Google Play Alpha está registrada en la entrada anterior.

### Entrega web de cambios de entrenador y navegación — 22 de septiembre de 2026

- La vista mensual de gráficas ya ocupa exactamente el mes elegido; se elimina el punto contextual del mes previo que desplazaba visualmente el inicio del periodo.
- La navegación web muestra el logo de Akhyles en la barra lateral y traslada el acceso al perfil al extremo derecho de la cabecera.
- Se retiraron por completo los flujos de vídeos técnicos y reseñas profesionales del cliente, contrato de Comunidad y configuración de API. Las tablas históricas se conservan sin uso para no borrar datos existentes de forma irreversible.
- Verificado: TypeScript, 172 pruebas activas, auditoría de dependencias y exportación web de producción.
- Publicado el bundle en `https://app.akhyles.com/` tras preflight SFTP y verificación automática. La pestaña Entrenador sigue oculta en builds de producción.

### Integración real del espacio de entrenador — 22 de septiembre de 2026

- El progreso privado del cliente se sincroniza automáticamente con todos sus entrenadores activos, sin depender de las opciones públicas de Comunidad.
- El calendario del expediente combina el plan real del cliente con sus entrenamientos guardados. Solo los días completados con un registro persistido abren el informe detallado; los previstos y no realizados no inventan series ni resultados.
- Se retiraron las ediciones locales no persistentes del calendario de entrenador. Al revocar la colaboración se elimina además la copia privada de progreso de ese entrenador.
- Se alinearon las API Node local y PHP de producción para devolver expedientes, agenda, solicitudes y métricas de entrenador basados en los mismos datos reales.
- Verificado: TypeScript, 21 pruebas específicas activas, prueba integrada de sincronización/revocación y recorrido local hasta Hugo > Calendario > sesión del 15 de septiembre.

### Retornos de navegación por contexto — 22 de septiembre de 2026

- Los botones **Volver** ya no dependen del historial ambiguo de las pestañas. Entrenador, ficha del deportista, plan gestionado, Comunidad, rutina compartida, cuenta, logros y ajustes regresan explícitamente a su pantalla de origen.
- El recorrido `Entrenador → Deportista → Plan/Calendario → Volver` conserva tanto el deportista como la sección que estaba abierta, sin caer en Entrenamiento.
- Verificado: TypeScript correcto y navegación local de vuelta desde ficha y rutina gestionada.

### Expediente de entrenador: acceso completo, calendario e indicadores — 22 de septiembre de 2026

- Una colaboración activa de entrenador pasa a ser de acceso deportivo completo: historial, rutina, sesiones, peso corporal, A-Points, mapa y notas se sincronizan automáticamente; revocar la colaboración elimina el acceso. Se mantienen las tablas antiguas de permisos solo por compatibilidad de migración.
- El expediente se simplifica a **Resumen**, **Plan**, **Calendario** y **Evolución**. Se retiran Sesiones como pestaña separada, Revisiones y todo el flujo visible de vídeos técnicos.
- Calendario integra el informe completo de la sesión seleccionada. Las comparaciones de cada ejercicio usan exclusivamente la primera serie de referencia e incluyen carga, repeticiones y porcentaje de rendimiento; todas las series permanecen desplegables.
- El Resumen muestra fecha de inicio, días de seguimiento, última actividad, evolución de A-Points desde la línea base, adherencia, fuerza y una acción prioritaria.
- La demo local incluye anatomía femenina y puntuaciones musculares coloreadas para Lucía, además de una rutina disponible para cada cliente.
- Verificado: TypeScript, pruebas específicas de comparativas/espacio de entrenador y recorrido local hasta Calendario con informe de sesión y mapa muscular.

### Informe completo de sesiones para entrenadores — 22 de septiembre de 2026

- Añadida la pestaña **Sesiones** al expediente del deportista. Ofrece selector de sesiones completas, resumen de duración, peso corporal autorizado, ejercicios, series, repeticiones y volumen registrado.
- Cada ejercicio se puede desplegar para ver todas las series, cargas y repeticiones por lado, carga de barra o máquina, marca de máquina, rango y series previstas, y la nota compartida del ejercicio.
- Se muestran comparaciones con la última sesión que contiene el ejercicio y con la semana previa: fuerza estimada, repeticiones y volumen. La lectura rápida se mantiene en la cabecera de cada tarjeta; el detalle queda bajo demanda.
- La sincronización privada de una colaboración ahora envía el contexto ampliado de sesión solo cuando el deportista autoriza el permiso de progreso. Las instantáneas públicas de Comunidad siguen siendo compactas y no reciben esos campos.
- Verificado en esta fase: TypeScript, ESLint de los archivos modificados, 17 pruebas activas de Comunidad y recorrido local Web hasta Entrenador > Clientes > Sesiones. La pestaña separada Sesiones fue retirada después y el informe quedó integrado en Calendario.

### Android 1.0.35 y corrección de iconos web — 22 de septiembre de 2026

- Generado AAB release firmado de `1.0.35` (`versionCode 38`), con la corrección de fuentes Feather/FontAwesome en web, exclusión de fotos Base64 del estado privado y límite HTTP JSON de 8 MB.
- Verificado localmente: `release-doctor` correcto, firma y empaquetado del AAB válidos; SHA-256 del AAB: `69011C8891F93D1F6F1D0373BA3131740A46CD6636214618EFE4B72BD6D252A7`.
- En esta build, `verify-android.mjs` marcó `CAMERA` como inesperado. La configuración actual de 1.0.36 bloquea expresamente ese permiso y la comprobación posterior del manifest no lo encontró.
- La web se publicó y se verificó visualmente en `https://app.akhyles.com/`: los iconos ya se muestran correctamente.
- Google Play Console recibió la versión `38 (1.0.35)` en **Prueba cerrada — Alpha** y muestra `1 cambio enviado a revisión`. No se inició Producción. La comprobación en un móvil físico sigue pendiente de que el tester reciba esta versión.

### Corrección inicial de copias grandes en sincronización — 22 de septiembre de 2026

- Se confirmó que «La copia es demasiado grande» procede del límite de 4.500.000 bytes del cuerpo JSON en `server-php/public/index.php`, no de la condición de carrera de la versión 1.0.32.
- La causa más probable era que `cloudState()` conservaba la foto de perfil Base64 dentro de la copia privada; una sola foto podía acercar la petición al límite junto con el historial.
- `cloudState()` ya elimina las fotos `data:image/...` del documento privado. Los avatares pequeños integrados se conservan; las fotos pertenecen a Comunidad y no se pierden.
- Añadida regresión en `tests/sync-v2.test.ts`: una foto Base64 de 1,9 MB no puede entrar en la copia privada.
- Verificado: `npm.cmd run typecheck` correcto y 4 pruebas de Sync V2 correctas.
- Pendiente: conectar el cliente Android/web al Sync V2 incremental ya preparado en servidor y probarlo en una nueva APK. La comprobación real en el teléfono requiere distribuir esa actualización.
- Aumentado el límite de lectura del cuerpo JSON de la API de 4,5 MB a 8 MB como margen de compatibilidad para copias antiguas. El límite interno de estado sigue siendo 10 MB y el Sync V2 mantiene 250 KB por entidad.
- Nota de despliegue: al publicar hay que comprobar que `post_max_size` de PHP/IONOS no sea inferior a 8 MB; cambiar solo `index.php` no puede superar un límite impuesto antes por PHP.

### Espacio de entrenador (prueba local) — 22 de septiembre de 2026

- Creado el espacio de Entrenador experimental: pestaña exclusiva para perfiles de entrenador, panel de deportistas, solicitudes recibidas, indicadores de adherencia/evolución y acceso al detalle de cada colaboración.
- El perfil deja de ocupar una pestaña: se abre desde el avatar, arriba a la derecha, tanto en móvil como en web.
- Las colaboraciones ahora distinguen quién inicia la solicitud y el cliente puede autorizar o retirar de forma independiente la gestión de rutina, el seguimiento privado y el uso anónimo en estadísticas agregadas.
- Añadidas rutas y tablas de servidor para permisos, solicitudes bidireccionales, detalles de cliente y métricas profesionales públicas con umbral mínimo de muestra. En esta fase la pestaña de entrenador estaba limitada a desarrollo local; sigue oculta en builds de producción por `trainerWorkspaceEnabled()`.
- Verificado en esta fase: TypeScript y las pruebas nuevas de métricas del espacio de entrenador. La web y la AAB se entregaron después; la activación funcional de la pestaña en producción sigue pendiente.

### Rotación completa de frases motivacionales — 22 de septiembre de 2026

- Se integraron las 8 frases que estaban en la lista antigua en la rotación activa del entrenamiento: ahora hay 21 frases disponibles.
- La selección diaria usa una semilla basada en la fecha: cambia cada día, permanece estable durante ese día y coincide con la frase de los recordatorios.
- Se revisaron posibles atribuciones. Se conservaron las ya conocidas de Javi, Dalinar Kholin/Brandon Sanderson, Marco Aurelio y Yoda; se identificaron como posibles atribuciones Kratos, el proverbio yiddish y John Sanei. Las restantes quedan sin autor para no atribuirlas sin confirmación.
- Esta era la situación al implementar la rotación. La web se desplegó después y la AAB 1.0.36 se generó y subió posteriormente a Alpha con este código; falta comprobarlo en un Android físico.

### Envío de Android 1.0.33 a revisión — 22 de septiembre de 2026

- La versión `1.0.33` (`versionCode 36`) se subió a **Prueba cerrada Alpha** y se envió a revisión en Google Play.
- Play Console muestra **Cambios en revisión** y confirma `1 cambio enviado a revisión`; Producción no iniciada.
- AAB SHA-256: `4C2FF22CE4130AC73BC057428E4454EE43E3EAB80003F53B713D5CFD84FC26FD`.
- La advertencia de desofuscación es no bloqueante. La prueba en Android físico queda pendiente hasta la aprobación y distribución a testers.

### Sincronización casi instantánea móvil-web — 22 de septiembre de 2026

- Se añadió una señal autenticada y ligera de revisión (`GET /sync/revision`) que no devuelve el progreso privado. La web visible la consulta cada segundo y solo descarga el estado completo cuando la revisión cambia; se conserva la sincronización periódica y por foco como respaldo.
- Al elegir «la copia de este dispositivo» en un conflicto, Akhyles vuelve a leer la nube y comprueba tanto la revisión como el contenido exacto antes de marcar la copia como guardada.
- Se añadió una prueba de dos clientes abiertos y un verificador reproducible. En la ejecución local, el segundo cliente recibió el entrenamiento sin recarga en 353 ms.
- Verificado: TypeScript y lint de los archivos modificados correctos; 45 aserciones de integración PHP correctas; export web de producción sin endpoints locales. La batería global conserva fallos anteriores ajenos en mapas/fuerza y una incompatibilidad de `tsx` con `react-native` bajo Node 24.
- API y web publicadas tras superar ambos preflight SFTP. `https://api.akhyles.com/sync/revision` responde 401 sin autenticación (ruta activa y protegida) y `https://app.akhyles.com/` sirve `entry-6b937cff85eb68700e7597890f0b5aa2.js`, que contiene la nueva señal de revisión y la API de producción.
- La comprobación posterior con el teléfono real mostró que la versión 1.0.32 podía conservar el entrenamiento local y quedar en «sincronización pendiente» cuando la revisión cambiaba al resolver un conflicto. La nube y la web seguían en la copia del 21/9, por lo que el fallo se delimitó al envío móvil, no al receptor web.
- Android 1.0.33 (`versionCode 36`) reintenta inmediatamente una revisión concurrente y no cierra «usar este dispositivo» hasta volver a descargar y comparar exactamente la copia publicada. La prueba provocó una segunda revisión entre la elección y el envío: el reintento conservó la copia local y el receptor abierto la obtuvo en 261 ms.
- APK y AAB firmados de 1.0.33 generados y verificados localmente. SHA-256: APK `142AF9856757A812C6B7375397FD6235A087B6770979BF3A867AC738EBC5FDAE`; AAB `4C2FF22CE4130AC73BC057428E4454EE43E3EAB80003F53B713D5CFD84FC26FD`. No se han subido a Google Play ni enviado a revisión; falta la prueba en un Android físico.

### Rediseño visual de Akhyles — 21 de septiembre de 2026

- Se trasladaron las referencias visuales aprobadas a `referencias-visuales/Estetica de la app/Nuevo Diseño Akhyles/`.
- Se actualizó la identidad visual de web y móvil: verde oscuro, dorado cálido, mármol en la navegación móvil y una jerarquía más limpia de tarjetas, títulos y controles.
- En Entrenamiento, «Tu semana» precede a la sesión seleccionada; los días de descanso quedan compactos y «Cambiar ejercicio para hoy» pasa a ser una acción secundaria.
- Se retiraron del Calendario su introducción redundante y la leyenda textual de colores.
- Se sustituyó la escala arcoíris de A-Points por materiales: piedra, mármol blanco, bronce, mármol verde, plata, mármol negro con kintsugi y oro. Los rangos son Iniciado 0–24, Atleta 25–49, Guerrero 50–69, Competidor 70–89, Héroe 90–109, Semidiós 110–149 y Olimpian 150+; la fórmula y los registros no cambian.
- Se añadió la corona de laurel para Logros y un busto clásico decorativo exclusivo de escritorio; el logo se conserva sin cambios.
- Se eliminó «Un paso a la vez» de Inicio. En el entrenamiento, la navegación entre ejercicios ahora muestra únicamente flechas, manteniendo sus etiquetas accesibles.
- Al iniciar o preparar una sesión, cada ejercicio recupera el peso y las repeticiones de su último registro; sigue siendo posible editar cada serie y la fórmula de progresión no cambia.
- Al introducir peso o repeticiones en la primera serie, esos valores actualizan las series posteriores que estén vacías o que aún conserven la sugerencia inicial; nunca sustituyen una edición distinta ya hecha.
- El día seleccionado dentro de «Tu semana» usa ahora el dorado principal, con texto de contraste, para que la selección sea inmediata.
- Se revisó la resolución de conflictos de copias: elegir el dispositivo publica esa copia en la nube y elegir la nube restaura esa copia localmente, actualizando la revisión confirmada y archivando ambas versiones.
- La escala interna histórica de A-Points se conserva intacta y ahora se convierte solo al presentarla: la referencia interna 1000 equivale a 150 visuales. La conversión se aplica al total, mapa corporal, perfiles, ranking, Comunidad, historial y gráficas compartidas; 150 o más permanece en Olimpian sin limitar el número mostrado.
- Se redujeron superficies repetidas: el descanso y la hidratación pasan a una franja informativa única, con el agua en azul; las series de cada ejercicio comparten un único contenedor con divisores.
- El último ejercicio pendiente muestra «Guardar y finalizar», termina la sesión y vuelve a Hoy; si quedaban ejercicios sin registrar, al guardar se navega al siguiente pendiente para que la sesión no quede abierta de forma ambigua.
- El dorado se refinó hacia un oro antiguo más luminoso: acciones destacadas tienen un borde de luz y una sombra muy tenue, mientras que la corona de laurel usa un degradado metálico sutil. Textos, iconos y bordes conservan el tono plano para asegurar legibilidad.
- Verificado: `npm.cmd run typecheck` correcto y revisión visual local web. Las pruebas pendientes relacionadas con demográficos históricos provienen de cambios locales previos en `src/logic/progress.ts` y no se han alterado.

### Publicación web del refinado del dorado — 21 de septiembre de 2026

- Se generó el export Web de producción con la nueva paleta de oro cálido, el efecto metálico sutil de la corona y el brillo contenido de las acciones principales.
- Preflight SFTP superado y versión publicada en `https://app.akhyles.com/`.
- Verificado: la portada responde HTTP 200 y el bundle remoto contiene la API de producción y los nuevos tonos dorados.

### Publicación web de los cambios de entrenamiento — 21 de septiembre de 2026

- Exportación web generada con `https://api.akhyles.com` y `https://api.akhyles.com/community`.
- Preflight SFTP de IONOS superado y exportación publicada en `https://app.akhyles.com/`.
- Verificado: portada y `/account` responden, el bundle remoto coincide con el export local y contiene la URL de la API de producción.
- Publicada una nueva composición de la estatua web: busto oscuro desplazado a la izquierda para evitar el recorte de la cabeza. También se publicó la selección dorada del día activo en «Tu semana».

### Publicación web: perfiles de Comunidad — 19 de septiembre de 2026

- Web exportada con las URLs de producción y publicada en `https://app.akhyles.com/`.
- Bundle publicado: `entry-f20e743fd70d4425497277f0e5ab4f3b.js`.
- Verificaciones: API saludable, bundle con `api.akhyles.com`, preflight SFTP correcto y comprobación HTTP posterior superada.
- Incluye la nueva presentación tipo Instagram del perfil de Comunidad, con foto, estadísticas, biografía, gimnasio y seguimiento.

### Publicacion Android 1.0.27 y sincronizacion Git/Play - 18 de septiembre de 2026

- Se incremento la version Android a `1.0.27` (`versionCode 30`) y se subio a `main` en el commit `a3f741f`.
- Se genero el APK/AAB con las URLs publicas de produccion (`https://api.akhyles.com` y `https://api.akhyles.com/community`) y se verificaron firma, manifiesto, permisos y ausencia de endpoints locales.
- El AAB `akhyles-release.aab` se subio a la prueba cerrada Alpha como `30 (1.0.27)` con lanzamiento al 100%.
- Google Play mostro unicamente el aviso informativo de que no hay archivo de desofuscacion (no usamos R8/ProGuard). Se envio el cambio a revision; Play confirmo `1 cambio enviado a revision`.
- El registro final del diario se sincronizo en Git con el commit `9717225`.

### Correccion de export Web sin sincronizacion - 18 de septiembre de 2026

- La exportacion anterior habia heredado `.env.local`: faltaba `EXPO_PUBLIC_ACCOUNT_URL` y Comunidad apuntaba a `127.0.0.1:8082`, por lo que la web arrancaba en modo local.
- Se regenero el bundle con `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com`, `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com/community`, `AKHYLES_ANDROID_LOCAL=0` y cache de Metro limpio.
- La web publica fue verificada con HTTP 200; el bundle `entry-8d22631b82f780b91608063cda0abd75.js` contiene ambas URLs de produccion y no contiene localhost.

### Publicacion web de la correccion del solapamiento - 18 de septiembre de 2026

- Se publico el export Web corregido por SFTP tras superar el preflight obligatorio.
- `https://app.akhyles.com/` respondio HTTP 200 y sirve `entry-a0e56e14d8a486bfe6326452682dcd08.js`.

### Captura y correccion del solapamiento de notas - 18 de septiembre de 2026

- Se guardo la captura recibida en `referencias-visuales/Estetica de la app/Bug visual superposicion notas descanso cambio ejercicio.png`.
- La causa era que `Field` asignaba `flex: 0` a los campos multilinea; en Web el contenedor colapsaba y las acciones se pintaban encima del textarea.
- Los campos multilinea ahora conservan su altura natural (`flexBasis: auto`), evitando el solapamiento.

### Publicacion web de la correccion del layout de notas - 18 de septiembre de 2026

- Se genero y publico el export Web unicamente por SFTP tras el preflight obligatorio.
- `https://app.akhyles.com/` respondio HTTP 200 y sirve el bundle `entry-3f854dab3766b5f2e0d6755229235f98.js`.

### Publicacion web del selector desplegable - 18 de septiembre de 2026

- Se genero el export Web y se publico unicamente por SFTP tras superar el preflight obligatorio.
- La web publica sirve el bundle `entry-4d0ace83bd763d83c3de42df1dd7b3b8.js` y fue verificada en `https://app.akhyles.com/` con HTTP 200.

### Selector desplegable de ejercicios - 18 de septiembre de 2026

- Se sustituyo la tira horizontal de ejercicios por un selector entre los botones de ejercicio anterior y siguiente.
- La flecha despliega verticalmente todos los ejercicios numerados y permite cambiar directamente de ejercicio; al seleccionar uno, el menu se cierra.

### Publicacion web de la pantalla de ejercicio - 18 de septiembre de 2026

- Se exporto la Web y se publico unicamente en IONOS por SFTP, despues del preflight obligatorio de lectura.
- Se transfirieron 72 archivos y `index.html` quedo estrictamente para el final.
- `https://app.akhyles.com/` respondio HTTP 200 y sirve el bundle `entry-2048ff1f9bc71bffd1f2a9ce61d0329a.js`.

### Reordenacion de la pantalla de ejercicio - 18 de septiembre de 2026

- El selector de pesos distintos por lado queda en un unico toggle verde junto a las series efectivas y controla todos los sets del ejercicio.
- Las notas del ejercicio aparecen inmediatamente despues de las series; cambiar ejercicio y el aviso de calentamiento quedan debajo.
- Se eliminaron los toggles repetidos dentro de cada serie para evitar estados inconsistentes.

### Preparación de entrenamientos sin repeticiones — 18 de septiembre de 2026

- Los entrenamientos futuros ahora se pueden guardar indicando únicamente los pesos; las repeticiones siguen siendo obligatorias al registrar una sesión realizada o editar un histórico.
- La preparación usa un valor interno temporal solo para completar el flujo y no guarda repeticiones ficticias en el entrenamiento futuro.

### Publicación de la corrección de almacenamiento — 18 de septiembre de 2026

- La web corregida se publicó en `https://app.akhyles.com/` y se verificó con HTTP 200 sirviendo el bundle `entry-a6acb25bb12100d96934b889d51f7533.js`.
- El AAB firmado `1.0.26` (`versionCode 29`) se subió a Prueba cerrada Alpha y se envió a revisión de Google Play. SHA-256: `4A5CD924B97D8F3220E03443628271E7130DCDC6F294C32CDA1BDA671A00CE4D`.
- Play muestra los cambios en revisión mientras ejecuta sus comprobaciones automáticas; la publicación para testers queda pendiente de que Google complete esas comprobaciones/revisión.

### Corrección definitiva del almacenamiento local y pausa de inglés — 18 de septiembre de 2026

- Se sustituyó en Android el estado único de `AsyncStorage` por una base SQLite local (`akhyles-state.db`). La migración lee el estado anterior una sola vez y solo lo elimina después de guardarlo correctamente.
- Los estados inválidos se conservan en una tabla de recuperación limitada a tres copias y no bloquean el arranque; si SQLite no puede abrirse, la app puede continuar para recuperar la copia cloud.
- Se dejó `AsyncStorage_db_size_in_MB=50` mediante plugin de configuración para proteger instalaciones antiguas durante la migración.
- El idioma queda temporalmente fijado en español y se ocultan las opciones de inglés/sistema hasta completar la revisión de traducciones.
- Requiere una nueva build Android (`1.0.26`, `versionCode 29`); el APK release se compiló correctamente el 18/09/2026 (SHA-256 `E1AE2977A3D37D2B811C84EF312DCE66FEB8F19D4A0BEFBD71344126F760F774`). No se ha publicado Play ni se han hecho cambios externos en esta fase.

### Publicación web de mejoras de entrenamiento — 18 de septiembre de 2026

- Se exportó y publicó únicamente la Web, sin generar ni publicar Play.
- Preflight SFTP de Web correcto; se transfirieron 72 archivos y se dejó `index.html` para el final.
- URL verificada: `https://app.akhyles.com/` HTTP 200, bundle servido `entry-46a4e86b6c9172afd63d667b8266390c.js`.
- El aviso de versión queda integrado en el cliente; su endpoint API se publicará por separado porque esta operación fue solo Web.

## APK de prueba publicada en la web (14 de septiembre de 2026)

- Se compiló y verificó la APK Android conectada de **Akhyles 1.0.7** (`versionCode` 9), firmada con la clave de publicación existente.
- Se publicó en la rama `apk-downloads` del repositorio como `akhyles-android-1.0.7-preview.apk` (77.471.951 bytes), en el commit `e4b9b9a07c755663217fe390d6788815b3bc421d`.
- En MyWebsite NOW se actualizó únicamente el destino del botón «Descargar APK de prueba» y se publicó la portada. La verificación externa confirma que tanto `https://akhyles.com/` como `https://www.akhyles.com/` enlazan ya a la APK 1.0.7 y que el archivo responde HTTP 200.

## Punto de control — Play Console (14 de septiembre de 2026)

- La ficha de Play Store predeterminada de **Akhyles** está completada y guardada como cambio pendiente de revisión.
- Se ha creado el borrador de la versión para la prueba cerrada **Alpha** y se ha configurado **España** como único territorio de prueba.
- La cuenta requiere una prueba cerrada antes de solicitar acceso a producción: al menos 12 testers deben aceptar participar y mantenerse apuntados de forma continua durante 14 días.
- **Pendiente:** recibir del titular los emails de los testers (se recomienda reunir 13–15 para cubrir bajas). Cuando lleguen, añadirlos a la lista de testers de la prueba cerrada, compartirles el enlace de participación y lanzar la versión cuando exista el AAB apto para esta distribución.

## Estado exacto para la próxima sesión — publicación de la web

Esta sección prevalece sobre cualquier nota anterior del diario relativa a la web o a IONOS.

- La APK Android **1.0.6** está publicada y comprobada: la URL estable responde 200 y entrega
  `akhyles-android-1.0.6-preview.apk` (78.358.543 bytes):
  `https://github.com/javiermartinrosado4-rgb/Akhyles/raw/refs/heads/apk-downloads/akhyles-android-1.0.6-preview.apk`.
- El contenido estático preparado que debe servirse desde la web está en
  `artifacts/website-static-stage/20260911-104921/`. Su `index.html` ya enlaza a la APK 1.0.6.
- En IONOS, el dominio `akhyles.com` se trasladó al contrato **47175101 — Hosting Premium**
  y el usuario ya guardó correctamente el destino **`/akhyles-web-stage`**. El panel muestra:
  «Se ha establecido la conexión del dominio con el espacio web» y «Objetivo /akhyles-web-stage».
- Estado público inmediatamente tras el cambio: `http://akhyles.com` y `http://www.akhyles.com`
  responden **403**; `index.html` responde **500**; HTTPS muestra error de protocolo SSL. Esto
  no demuestra propagación correcta: la carpeta remota no está sirviendo el sitio aún.
- Diagnóstico de continuación: comprobar en el **Webspace Explorer de IONOS** que
  `/akhyles-web-stage/` contenga los archivos del paquete estático, en particular
  `/akhyles-web-stage/index.html`. Si está vacía o incompleta, subir el contenido de
  `artifacts/website-static-stage/20260911-104921/` a esa carpeta, sin crear una carpeta
  adicional dentro de ella. No tocar ni borrar la instalación WordPress de `/`.
- Después de la carga, verificar en este orden: `http://akhyles.com/` debe mostrar la web y
  contener el enlace de la APK 1.0.6; luego esperar la provisión/propagación del certificado y
  verificar `https://akhyles.com/` y `https://www.akhyles.com/`. Si persiste 403/500 con un
  `index.html` remoto presente, revisar permisos de carpeta/archivo y configuración SSL con IONOS.
- Limitación de esta sesión: la integración de Edge deja navegar y leer IONOS, pero no expone
  clics de formularios ni selector de archivos. Para que el agente pueda cargar archivos por UI
  en otra sesión, activar en la app de escritorio ChatGPT/Codex: **Configuración → Uso de la
  computadora → Computer Use / Any App**, mantener Edge visible y abrir un chat nuevo mencionando
  `@Edge` o `@Computer`.

Última actualización: 11 de septiembre de 2026 (cierre de ciclo funcional completo; APK 1.0.6 firmada)

## Punto de control para retomar (12 de septiembre de 2026, 09:30 CET)

- App: **cerrado** en local; los cambios funcionales pedidos en entrenamiento, calendario,
  peso por lado/barra, puntos, rutina desplegable, historial de semanas y ranking ya
  están integrados y probados en el árbol actual.
- Web: lo que falta hoy es **cerrar edición real de `akhyles.com`** (contenidos de la
  web siguen siendo el estado anterior si no se vuelve a entrar y confirmar desde Edge
  en IONOS/preview).  
  Objetivo de mañana: validar qué bloque queda por adaptar y publicar el bloque actualizado
  de 1.0.6 en portada + páginas funcionales.
- Si la edición en IONOS no es viable hoy, activar plan B: subir la versión estática
  preparada en `artifacts/website-static-stage/20260911-104921` a un directorio técnico
  de pruebas en hosting, validar rutas y, solo tras OK, conectar el dominio.
- Checklist exacto para mañana:
  1. Abrir `https://editor.mywebsite-now.com/.../content` en Edge y localizar el modo de edición de secciones.
  2. Parchar texto de Inicio/Funciones/Sobre Akhyles y sustituir bloque de descarga genérico.
  3. Verificar soporte/eliminar cuenta y privacidad con datos reales.
  4. Comprobar descarga, botones y enlaces antes de publicar.
  5. Guardar captura + hash de verificación de la página publicada.

## Entrega 1.0.6 — calendario, Points y barra personalizable

- Calendario mensual con límites históricos de rutina, días pasados incumplidos
  en rojo y racha que conserva el contexto temporal. Akhyles Points v3 relativos
  a sexo y peso corporal de cada sesión, 86 referencias beta, 11 grupos y escala
  orientativa 0–100 / cerca de 1000 sin techo. Comunidad ampliada en pruebas locales.
- «Por lado» permite barra de 0–100 kg, incluidos decimales. Se recuerda por
  ejercicio y queda congelada en cada sesión. Total/por lado convierte solamente
  la carga externa; la barra se suma una vez. Los registros antiguos conservan
  sus valores por defecto (20 kg básicos, 0 resto).
- TypeScript, ESLint, 93 pruebas y revisión de secretos pasan. Dos pruebas de
  navegador de barra (0 y 15,5) pasan tras recuperar el arranque de Metro.
- APK/AAB offline 1.0.6, versionCode 8, compilados y verificados. Firma original,
  alineación 16 KB y manifest comprobados; prueba física pendiente. Artefactos
  anteriores archivados en `artifacts/android/archive-1.0.5` (pueden contener
  versiones anteriores distintas). App web exportada en `artifacts/web-1.0.6`.
- APK publicada en rama `apk-downloads`, commit `6f1d3d7ae492daf6bd2e221a53cfab2ac79922e1`,
  archivo `akhyles-android-1.0.6-preview.apk`. SHA-256:
  `97f4f467631b47242c43b731e6e775b93674ed3197e63175549cf338cb91f732`.
- Web IONOS sin publicar: Edge devuelve «Debugger unattached», incluso tras
  recarga. El usuario pidió terminar la app y dejar la web en pausa. Contenido
  concreto preparado en `docs/WEB-AKHYLES-1.0.6.md`; botón público todavía antiguo.
  No se ha cambiado DNS, correo ni contrato. API pública aún responde HTML.
- Servidores locales restaurados en 8081/8082/8083 y 8090/8091; Comunidad demo
  en 9010 con Álex y Lucía. No se han borrado datos de las pestañas del usuario.

## Estado registrado — cuentas y nube, 11 de septiembre

Esta sección prevalece sobre las entradas históricas inferiores.

- Implementadas las cuentas privadas de Akhyles por correo verificado y acceso
  Google, recuperación de contraseña, bienvenida mediante cola de correo y
  eliminación de cuenta. Google y SMTP reales siguen pendientes de configurar.
- El nuevo servicio `server-php` usa PHP 8.2+ y MySQL/MariaDB para aprovechar el
  Hosting Premium existente. El panel incluye PHP, SFTP/SSH y cron; hay 3 bases
  usadas de 500. No se necesita un VPS para este servicio de cuentas. El backend
  social Node anterior sigue separado y no se ha migrado.
- La app guarda primero localmente y después sincroniza por cuenta. Conserva
  rutinas, pesos, historial, calendario y sesión en curso; una actualización no
  regenera la rutina. Las copias divergentes no se pisan automáticamente y se
  archivan antes de elegir. Cambiar de cuenta separa los progresos.
- Servidor con sesiones caducables, verificación de email de un uso, límites de
  intentos, comprobación de identidad Google y aislamiento por propietario.
  Copias de progreso cifradas en la base, hasta 20 revisiones y herramientas de
  backup/restauración cifrados. No es cifrado de extremo a extremo.
- QA local: TypeScript y ESLint correctos, 79 pruebas de app/servidor Node,
  36 comprobaciones de cuentas en SQLite y otras 36 en MariaDB, prueba de backup
  cifrado y 9 flujos de navegador (4 de cuentas y 5 regresiones de entrenamiento).
  Se ha probado recuperación en otro navegador, conflicto de dos dispositivos,
  cambio de cuenta, desconexión y edición durante una subida.
- Los correos de QA se capturan localmente y Google se prueba con identidades
  simuladas en el servidor. Todavía NO se ha verificado entrega SMTP, OAuth
  Android real ni reinstalación con nube en un teléfono físico.
- Paquete del servicio preparado sin secretos, pruebas ni datos de usuarios:
  `artifacts/accounts/akhyles-accounts-20260911-001102.zip`, SHA-256
  `B6D8ACEAEAE591733C7CCA1D0C18E3702AA212C3718954955CCC3F99B4891FF6`.
  Se han comprobado las reglas `.htaccess` incluidas. Dependencias Composer
  fijadas; auditoría sin avisos conocidos en la comprobación realizada.
- APK y AAB internos 1.0.4 / versionCode 6 compilados y validados: misma firma,
  paquete `com.javiermartinrosado.akhyles`, alineación, estructura AAB y manifest
  correctos; HTTP bloqueado. Son vistas previas OFFLINE, no APK conectadas.
  APK: 78.313.739 bytes, SHA-256
  `853BD54D1C2690667FD5D47C5D4B9B4DCA3FD6E7935E29CFE410CF64ECBC2C63`.
  AAB: 56.499.375 bytes, SHA-256
  `9F9139A9D976677B63162F20963286FA30BAD4F061A009E3EFCC8D5D93790DBF`.
  Rutas: `artifacts/android/akhyles-offline-preview.apk` y `.aab`.
  La web conserva la APK offline 1.0.3. No se ha publicado ni cambiado el hosting.
- APK instalada y abierta correctamente en emulador Android API 36. La pantalla
  de cuenta muestra el aviso offline, impide iniciar sesión sin servicio y permite
  continuar al alta local. Captura: `artifacts/android/qa/account-104-offline.png`.
  No había una instalación previa de este paquete en el emulador: esta prueba
  no demuestra por sí sola migración desde la APK pública en un móvil real.
- Documentación de IONOS, Android y privacidad actualizada localmente. El
  borrador de privacidad NO se ha publicado y requiere completar responsable,
  conservación de backups y revisión antes de activar la recogida en producción.
- La revisión de secretos ahora incluye cambios y archivos nuevos no ignorados,
  además del índice Git. Se conservan todos los cambios previos del proyecto;
  no se ha hecho commit ni push de esta implementación.

### Despliegue IONOS realizado hoy

- Base de datos de producción MariaDB 11.8 creada como «Akhyles accounts»;
  las 8 tablas de cuentas, sesiones y progreso se importaron correctamente y
  las copias de seguridad de IONOS están activas durante 7 días.
- Paquete corregido sin secretos extraído en
  `/akhyles-api-release/akhyles-accounts-20260911-083447`; el directorio
  `public/` se vinculó al dominio técnico del Hosting. La extracción antigua
  en `/akhyles-api` quedó aislada y requiere confirmación explícita antes de
  eliminarla.
- `api.akhyles.com` se creó con SSL, pero IONOS lo asignó al contrato de la web
  y no permite conectarlo al Hosting Premium sin trasladar el dominio/contrato.
  El dominio técnico sí arranca el servicio, pero todavía no ofrece HTTPS válido.
  No mover `akhyles.com` ni la web existente sin decidir esa estrategia.

### Siguiente paso concreto

Decisión de coste (11 de septiembre): no contratar VPS ni otro servicio
recurrente por ahora. Se ha autorizado iniciar la preparación de la migración
de la web actual de `akhyles.com` al Hosting Premium ya contratado. La web
pública actual ha sido revisada como referencia y se conservará una copia
verificable antes de cambiar su destino. El traslado permitirá vincular
`api.akhyles.com` al mismo Hosting y activar el backend sin añadir una cuota
mensual. Estado: pendiente de reautenticación en IONOS para revisar las
opciones exactas de traslado; no se ha modificado aún el dominio ni eliminado
el sitio existente.

Preparación de migración (11 de septiembre): recuperada la web pública actual
en `artifacts/website-backup/20260911-104921.zip` (SHA-256:
`5CB5511DC98A12EB36D7E7C26C2B1E06B37FC8F4987CEC0E4301D340D093D4C3`).
La secuencia, pruebas y reversión están documentadas en
`docs/MIGRACION-WEB-HOSTING-PREMIUM.md`. La web sigue publicada en MyWebsite
NOW y no se ha tocado el destino de `akhyles.com`.

También está preparada una versión estática aislada y empaquetada en
`artifacts/website-static-stage/akhyles-web-stage-20260911-104921.zip`.
En IONOS se creó únicamente la carpeta vacía `/akhyles-web-stage` dentro del
Hosting Premium; no se han cargado archivos ni asociado dominios todavía.

Introducir los accesos privados SFTP/SSH y SMTP (no en el chat), crear una base
dedicada y configurar `config.local.php` fuera de la raíz pública. Asociar el
subdominio al directorio `public`, verificar HTTPS, configurar OAuth web/Android,
cron y backups externos; probar entrega y restauración reales. Solo entonces
compilar con `-AccountUrl https://api.akhyles.com` y distribuir tras QA Android.
No se ha creado ninguna base, cambiado DNS ni contratado ningún servicio.
Guía operativa: `server-php/README.md` y `docs/IONOS-Y-API-AKHYLES.md`.

## Registro histórico

## Situación actual

- La aplicación web, Android y el backend se denominan **Akhyles**.
- El paquete Android actual es `com.javiermartinrosado.akhyles` y el enlace nativo es `akhyles://`.
- TypeScript, las 69 pruebas automatizadas y la comprobación de secretos han pasado después del cambio de marca.
- La app no se ha publicado aún en Google Play.
- El sitio público es `https://akhyles.com`; la portada, la política de privacidad y la página de eliminación de cuenta se gestionan en el editor IONOS.
- Los binarios internos validados son `artifacts/android/akhyles-offline-preview.apk` y `artifacts/android/akhyles-offline-preview.aab`: Akhyles 1.0.2 (`versionCode` 4), paquete `com.javiermartinrosado.akhyles`, esquema `akhyles://`, firma de publicación conservada y tráfico HTTP bloqueado.

## Última entrada

- **Entrega Android 1.0.2:** APK y AAB offline actualizados tras integrar las fotos y la lógica vigente. Firma de publicación, alineación de APK, estructura del AAB, versión, permisos y manifest validados correctamente. Los archivos siguen siendo una vista previa offline: aún no son el AAB de producción para Play porque falta configurar el backend público HTTPS y OAuth real.

- **Fotos de ejercicios:** se auditaron las 86 referencias del catálogo. Aductores en máquina y extensión de tríceps en máquina ya tienen fotografías locales adecuadas, y el peso muerto convencional usa la barra olímpica. Todos los ejercicios del catálogo cuentan con una asignación explícita de equipamiento, sin imagen de reserva. Validado en la edición de ejercicios con la prueba visual automatizada de Playwright, además de TypeScript, ESLint, 69 pruebas unitarias y revisión de secretos.

- El generador de Full Body establece ahora primero dos ejercicios pesados por sesión: uno de torso y otro de pierna. Alterna las prioridades de pecho/espalda y cuádriceps/bisagra para repartir el trabajo semanal.
- En rutinas de hasta tres días, al introducir una tracción horizontal de espalda, Akhyles prioriza una tracción vertical antes de repetir otro remo.
- La alternancia de espalda se aplica a todos los splits: antes de repetir un patrón, Akhyles programa el contrario. Con cuatro series directas semanales, quedan dos de tracción horizontal y dos de vertical.
- En el split Torso A / Torso B, la orientación queda fija para que sea legible: Torso A prioriza remo horizontal y Torso B jalón vertical.
- Los pajaritos de hombro solo se generan por encima de seis series semanales directas de hombro, tras haber programado press militar y elevaciones laterales.
- Con cuatro series directas semanales de pecho, Akhyles reparte una exposición de press y otra de pec dec. Los días de pierna de splits de cuatro o cinco días comienzan con un básico pesado de cuádriceps: prensa en Pierna A y sentadilla en multipower en Pierna B cuando están disponibles.
- El sustituto prioritario del press de banca tumbado en máquina es ahora el press sentado en máquina, para cubrir gimnasios con esa disposición.
- Las sesiones automáticas evitan duplicar predicadores, rumanos, presses del mismo ángulo o abdominales (salvo especialización de abs). Con dos días de pierna, cada uno incluye extensión de cuádriceps y curl de isquios sentado o tumbado cuando están disponibles.
- Para principiantes, las sugerencias dejan de incluir aislamientos en cable de hombro, bíceps o tríceps, el pec dec sentado en cable y los demás tirones en cable distintos del jalón. Los jalones neutro y abierto permanecen disponibles por su ejecución sencilla.
- Se añadió la extensión de tríceps en máquina al catálogo principiante. Así, los planes de cuatro o cinco días pueden mantener un ejercicio directo de brazos en cada día de torso sin recurrir al cable.
- Las rutinas automáticas pasan a tener un mínimo de cinco ejercicios por sesión; si falta trabajo principal se completan con accesorios compatibles. Se añadió Aductores en máquina como grupo propio y, con dos días de pierna, se reparte aductor en el primero y gemelo en el segundo.
- El reparto de aductor y gemelo se mantiene incluso si solo hay máquinas y poleas; cuando falten alternativas de pierna, el quinto ejercicio puede ser un segundo abdominal distinto.
- Se añadieron pruebas de estas reglas y la comprobación completa terminó correctamente: TypeScript, ESLint, 69 pruebas y revisión de secretos.
- Se integró el logo final de la app como fuente única de los iconos Android y del PNG de Play; la web se dejó intacta porque su actualización la gestiona el titular.
- El editor de ejercicios muestra la foto orientativa del equipo, permite guardar cualquier rango válido de 1 a 30 repeticiones y avisa —sin bloquear— cuando se sale de la recomendación de hipertrofia de 4–15.
- Se añadió el peso muerto convencional con barra como bisagra de cadera Tier A, solo desde nivel intermedio, con aviso de orientación a fuerza. Para hipertrofia se prioriza el rumano en multipower cuando está disponible.
- El calendario permite usar como destino de un movimiento el sábado o domingo de la semana anterior. La racha pasa a medirse semanalmente: el 50% del plan la conserva y el 100% recibe un refuerzo visual.
- Se regeneró la capa nativa Android desde la configuración actual de Expo para eliminar el paquete y esquema antiguos.
- Se compiló y validó un AAB firmado de Akhyles; el manifest confirma `com.javiermartinrosado.akhyles`, `akhyles://`, `versionCode` 3, Android mínimo 24 y objetivo 36.
- La comprobación completa terminó correctamente: TypeScript, ESLint, 69 pruebas y revisión de secretos.

## Trabajo en curso

- 10 de septiembre de 2026: el repositorio público se renombró a `Akhyles` y se habilitó una descarga temporal de la APK Android 1.0.2 desde la rama `apk-downloads`: `https://github.com/javiermartinrosado4-rgb/Akhyles/raw/refs/heads/apk-downloads/akhyles-android-1.0.2-preview.apk`. Es una vista previa offline; no sustituye al futuro lanzamiento en Google Play.
- La portada del editor ya enlaza a esa APK y su bloque se tituló «Prueba Akhyles en Android». Queda pendiente mejorar el texto del botón y añadir el bloque editorial sobre sesiones de 45 minutos, dos series y mesociclos con referencias antes de la próxima publicación web.

- La portada publicada apunta al identificador correcto de Google Play: `com.javiermartinrosado.akhyles`.
- La política de privacidad y la página de eliminación de cuenta están publicadas y disponibles desde el pie de página.
- Se ha eliminado todo el texto de plantilla visible detectado. La página de eliminación incluye contenido legal en español y un contacto real; la sección de soporte de «Sobre Akhyles» muestra `javi@akhyles.com` en lugar de campos vacíos.
- La verificación integral local ha pasado el 10 de septiembre de 2026: TypeScript, ESLint, 69 pruebas y comprobación de secretos.
- La ficha local de Google Play incorpora el dominio, el correo de soporte y la URL pública definitiva de privacidad.
- Los binarios históricos con el nombre o paquete anterior no deben utilizarse. El AAB validado de Akhyles es el único artefacto candidato para futuras pruebas internas; antes de producción habrá que generar otra build con el backend HTTPS de Comunidad configurado.

## Actualizacion funcional - 10 de septiembre de 2026

- Los tiers se muestran ahora como un bloque propio y destacado dentro de Perfil, fuera de la edicion de datos y gimnasio. Un favorito por encima del nivel se conserva como sugerencia aspiracional y se avisa expresamente de que su ejecucion es dificil.
- La recomendacion de subida de nivel no cambia nada sola: pide al menos sesiones, tiempo sostenido y mejora de carga en varios ejercicios antes de invitar a revisar el nivel. Al confirmarlo, el generador abre variantes mas avanzadas.
- En Torso/Pierna, para principiantes y personas mayores de 48 anos, Pierna A recibe un solo basico pesado de cuadriceps y Pierna B un solo basico pesado de isquios. Los accesorios siguen completando extension y curl.
- Se corrigio el selector de dias del alta: los siete numeros se distribuyen con el ancho disponible, evitando que se recorten visualmente en pantallas estrechas.
- Se corrigio de nuevo el selector de dias tras la captura en `referencias-visuales/Bugs visuales`: cada boton numerico conserva ahora un area tactil amplia, pero usa relleno lateral reducido para que del 1 al 7 se lean completos en iPhone.
- Series semanales ahora refleja trabajo real: muestra `hechas esta semana / objetivo semanal` por grupo muscular, contando unicamente las series directas registradas desde el lunes.
- Se retiro del alta, Perfil, validacion y almacenamiento activo toda la funcion de porcentaje graso y estimacion fotografica. Los perfiles ya guardados se limpian de esos campos al abrirse, evitando que interfieran con el historial de peso.
- Debajo del peso corporal, tanto al crear la cuenta como en Perfil, se puede activar un recordatorio semanal local. Solicita el permiso del sistema solo tras marcar la opcion y lo cancela al desactivarla.
- Desde el entrenamiento en curso aparece `Cambiar ejercicio para hoy`, con las mismas alternativas compatibles que el editor de rutina y sincronizacion inmediata de la sesion.
- Se elimino la tanda de APK/AAB historicos de la marca anterior. Los binarios que deben conservarse son los de Akhyles; la APK vigente es ahora 1.0.3.
- Lista interna de frases anadida en `src/data/quotes.ts` para su futura rotacion en producto.
- El borrador web ya comunica las graficas, la deteccion de subidas y bajadas de carga y los consejos para la siguiente sesion. Tambien aclara la descarga temporal de la APK y su boton ya no promete Google Play. Aun queda por completar el bloque editorial de sesiones de 45 minutos, dos series, mesociclos y referencias antes de publicar.
- APK interna actualizada: `artifacts/android/akhyles-offline-preview.apk` es Akhyles 1.0.3 (`versionCode` 5), firmada con la clave de publicacion ya existente (SHA-1 `040ea0afd797f22730198cdb4295c4763ab86ab7`) y compilada tras las reglas nuevas. El AAB 1.0.2 queda como historico hasta generar su pareja 1.0.3.
- APK de vista previa recompilada tras el contador semanal real, retirada de porcentaje graso, recordatorio de peso y cambio de ejercicio durante la sesion. Conserva `com.javiermartinrosado.akhyles`, version `1.0.3` / `versionCode` 5 y la firma de actualizacion existente. SHA-256: `DD8CBAEEE3A2003A606229DEC697EED3D4A1AFE684451128CAB15C8D2F9D1856`.
- La APK 1.0.6 está disponible públicamente desde el botón de descarga de `akhyles.com`. La portada publicada debe usar el enlace de la rama `apk-downloads` a `akhyles-android-1.0.6-preview.apk`.
- El binario de esa misma URL se actualizo con los cambios de esta sesion en la rama `apk-downloads` (commit `58305c3`): 78.271.535 bytes y SHA-256 `DD8CBAEEE3A2003A606229DEC697EED3D4A1AFE684451128CAB15C8D2F9D1856`.
- La seccion de descarga temporal de Android se recoloco al comienzo de la portada, antes de los bloques de pasos, funciones y graficas, para que la APK 1.0.3 sea accesible nada mas entrar.

## Pendientes para Google Play

1. Desplegar Comunidad en una URL HTTPS pública y configurar sus copias de seguridad.
2. Configurar los clientes OAuth de Google de producción si se mantiene el acceso con Google.
3. Generar el AAB firmado de Akhyles y probarlo en un dispositivo Android físico.
4. Completar en Play Console la ficha, Seguridad de los datos, clasificación de contenido y datos del titular.
5. Si la cuenta de Play es personal y nueva, completar la prueba cerrada requerida antes de solicitar acceso a producción.

## Verificaci\u00f3n web â€” 11 de septiembre de 2026, 20:20 CET

- Tras extraer el paquete en `/akhyles-web-stage`, `http://akhyles.com/` y `/index.html` responden 200. La portada actualmente servida contiene el enlace de APK 1.0.3.
- Causa: el ZIP hist\u00f3rico `artifacts/website-static-stage/akhyles-web-stage-20260911-104921.zip` contiene por error la APK 1.0.3. Para sustituirlo, usar `artifacts/website-static-stage/akhyles-web-stage-1.0.6-corrected.zip` (SHA-256 `8109ACE971843BB22D444530BC1C7C2E03593DC08747E0C6EA28ADE86CBFA015`), que contiene el enlace correcto de APK 1.0.6, y extraerlo con reemplazo en la misma carpeta.

## Estado actual de la web - 11 de septiembre de 2026, 20:20 CET

- El paquete corregido fue extraido en `/akhyles-web-stage`. La comprobacion externa confirma que `http://akhyles.com/` responde 200 y la portada enlaza a `akhyles-android-1.0.6-preview.apk`.
- No reutilizar el ZIP historico `akhyles-web-stage-20260911-104921.zip`: contiene el enlace 1.0.3. El paquete valido queda en `artifacts/website-static-stage/akhyles-web-stage-1.0.6-corrected.zip`.

## Datos confirmados

- Dominio público: `akhyles.com`.
- Email de soporte publicado: `javi@akhyles.com`.
- La Comunidad permite cuentas, perfiles, fotos públicas, seguimiento, reacciones y denuncias; los datos de entrenamiento permanecen locales salvo que el usuario decida compartirlos.

## Cuentas y sincronización — 12 de septiembre de 2026

- Se creó el proyecto de Google Cloud **Akhyles** y se configuró OAuth para usuarios externos.
- Están creados los clientes OAuth de Android (paquete `com.javiermartinrosado.akhyles` y la firma de publicación local) y web. El cliente web queda autorizado para `https://akhyles.com` y `https://www.akhyles.com`.
- La pantalla de consentimiento de Google muestra Akhyles, el correo de soporte y la política de privacidad publicada. Su estado está en **producción**, por lo que no queda limitado a usuarios de prueba. No se descargaron ni guardaron secretos OAuth en el repositorio.
- El subdominio `api.akhyles.com` ya apunta a la carpeta pública del paquete PHP en IONOS. HTTP alcanza el backend y éste exige HTTPS, pero HTTPS sigue fallando en la negociación TLS aunque el certificado aparece como protegido en IONOS. Resolver ese certificado/propagación antes de activar clientes.
- La base dedicada de IONOS existe. Falta crear de forma segura `config.local.php` fuera de `public`, con la contraseña de la base, la clave de cifrado persistente y credenciales SMTP. No guardar ninguna de esas credenciales en Git ni en paquetes de despliegue.
- Antes de compilar el AAB conectado, añadir al cliente OAuth Android el SHA-1 de la clave de firma de Google Play cuando Play lo muestre tras la primera subida. El AAB actual sigue siendo offline y no debe subirse para activar cuentas.

### Incidencia HTTPS para soporte IONOS

- **Síntoma:** `http://api.akhyles.com/health` alcanza el backend y recibe el rechazo esperado por exigir HTTPS (400), mientras que `https://api.akhyles.com/health` falla antes de llegar a PHP durante la negociación TLS (`ERR_SSL_PROTOCOL_ERROR` / alerta TLS interna).
- **Configuración comprobada:** el subdominio apunta a `/akhyles-api-release/akhyles-accounts-20260911-083447/public`. El panel de IONOS muestra el certificado wildcard `*.akhyles.com` como protegido y vigente, pero el certificado no se está sirviendo correctamente para `api.akhyles.com`.
- **Petición para IONOS:** revisar la asignación/activación del certificado SSL wildcard al subdominio `api.akhyles.com` después del cambio de destino web y forzar, si procede, su reprovisión. No modificar el destino de `akhyles.com` ni el correo existente.

## Reglas para retomar

- Leer este diario antes de continuar.
- 12 de septiembre de 2026: se auditó la cuenta privada y se prepararon `docs/PRIVACIDAD.md`, `docs/ELIMINAR-CUENTA.md`, `docs/PLAY-DATOS-SEGURIDAD.md` y `docs/CHECKLIST-LANZAMIENTO-CUENTAS.md`. La declaración distingue datos privados sincronizados de Comunidad; si Comunidad queda accesible en el AAB, sus fotos y contenido compartido se deben declarar antes de enviar Seguridad de datos.
- 12 de septiembre de 2026: no extraer ZIPs con rutas en Webspace Explorer para actualizar las páginas legales. IONOS está materializando `carpeta\\index.html` como nombre de archivo plano, no como directorio, por lo que `akhyles.com` continúa sirviendo la versión anterior. Subir cada `index.html` dentro de su carpeta real o usar SFTP; comprobar siempre con HTTP antes de actualizar Play.
- Actualizar esta fecha y las secciones afectadas al terminar cada avance relevante.
- No publicar en Play Console, activar servicios externos ni cambiar cuentas o permisos sin confirmación expresa del titular. Las acciones reversibles del proyecto y del editor web sí están autorizadas por el titular.

## Incidencia MyWebsite y dominio — 14 de septiembre de 2026

- Se confirmó que el proyecto MyWebsite NOW **Akhyles** sigue existiendo y que
  el editor es completamente accesible. Permite editar textos, secciones,
  páginas, diseño y enlaces, y muestra la acción de volver a publicar.
- El proyecto continúa asociado internamente solo a su URL temporal de
  `websitebuilder.online`. En su panel aparece que no hay ningún dominio propio
  vinculado, aunque la web pública de `https://akhyles.com` permanece visible.
- En la gestión de dominios, la opción de conectar una web existente no ofrece
  el proyecto Akhyles como candidato. Esto confirma una incoherencia de
  asociación dentro de IONOS, no un problema del contenido del editor.
- `http://www.akhyles.com` redirige correctamente al dominio principal, pero
  `https://www.akhyles.com` seguía devolviendo `ERR_SSL_PROTOCOL_ERROR`. El
  certificado wildcard figura como asignado, protegido y vigente. No se ha
  reemitido, reasignado ni eliminado para evitar introducir una incidencia mayor.
- Se mantuvieron intactos el destino de `api.akhyles.com`, el correo del dominio,
  el proyecto MyWebsite y el dominio principal. No se debe reiniciar, borrar ni
  recrear ninguno de esos elementos sin una explicación previa de impacto y un
  plan de reversión.
- Se redactó el informe para soporte desde `javi@akhyles.com` a
  `soporte@ionos.es`. El titular lo envió personalmente. Solicita que IONOS
  corrija la asociación entre MyWebsite, `akhyles.com` y `www.akhyles.com`,
  restablezca HTTPS en `www`, preserve API y correo, y responda con instrucciones
  a ese mismo buzón.

### Estado de espera

- Esperar respuesta de IONOS antes de publicar cambios desde MyWebsite o tocar
  la asignación de dominios/certificados. El editor y el borrador de correo se
  han dejado abiertos para retomar el trabajo sin perder contexto.

## Comprobación pendiente de web publicada — 14 de septiembre de 2026

- El usuario publicó desde MyWebsite NOW la versión editada de la portada. El
  borrador del editor contiene el contenido nuevo de Akhyles (mapa de fuerza,
  comunidad y gráficas), pero la web pública no se ha servido de forma estable.
- Verificaciones realizadas en IONOS:
  - `akhyles.com` está administrado por IONOS y su destino es **MyWebsite NOW**.
  - `www.akhyles.com` también está administrado por IONOS y su destino es el
    mismo proyecto **MyWebsite NOW**.
  - Ambos destinos apuntan al proyecto `mywebsite_now-8aa7d3d4-b9db-4a67-9c84-0afe9bc3017f`.
  - El certificado **SSL Starter Wildcard** para `*.akhyles.com` aparece como
    protegido, con validez desde el **14/09/2026** hasta el 09/03/2027.
- Incidencia observada en la parte pública: en comprobaciones consecutivas
  `www.akhyles.com` devolvió contenido anterior, `404 Not Found` de nginx y
  finalmente `ERR_SSL_PROTOCOL_ERROR`. Esto indica propagación/provisión SSL
  incompleta o inconsistente en los servidores de IONOS, no un error de
  contenido ni una asignación DNS visible incorrecta.
- **Siguiente comprobación obligatoria:** esperar a la propagación del SSL y
  verificar con recarga completa, en este orden:
  1. `https://akhyles.com/`
  2. `https://www.akhyles.com/`
  3. Que ambas muestren la misma portada nueva, sin 404 ni error SSL, y que
     aparezcan las secciones actualizadas de mapa de fuerza, comunidad y gráficas.
- Si cualquiera de las URLs sigue dando `ERR_SSL_PROTOCOL_ERROR`, 404 o la
  versión anterior tras la propagación, responder al hilo abierto con soporte
  IONOS con esos síntomas y pedir una **reprovisión del certificado wildcard y
  de la asignación MyWebsite NOW para `www.akhyles.com`**, sin cambiar el
  destino de `api.akhyles.com` ni los registros de correo.
- **Verificación completada (14/09/2026):** `https://www.akhyles.com/` vuelve
  a cargar correctamente por HTTPS, redirige a `akhyles.com` y sirve la portada
  nueva con el mapa de fuerza, la descarga Android, comunidad y gráficas. La
  incidencia de propagación SSL de la web principal queda resuelta.

## Área privada web de Akhyles — 14 de septiembre de 2026

- Se ha preparado la base de escritorio de la aplicación web existente. No es
  una segunda web ni afecta a la portada pública de MyWebsite NOW: reutiliza
  las mismas pantallas, navegación, rutina, calendario, progreso, comunidad y
  cuenta de Akhyles.
- En pantallas web de al menos 840 px, la aplicación deja de mostrarse como una
  vista previa de móvil de 480 px. Ahora dispone de un área de trabajo de hasta
  1.440 px, navegación lateral y contenido centrado de hasta 1.060 px. En
  móvil conserva la navegación inferior y el diseño compacto.
- La interfaz y los datos se mantienen locales mientras no exista sesión de
  cuenta; al activar la API de cuentas, el flujo de inicio de sesión y la
  sincronización ya presentes en el proyecto serán el puente entre móvil y web.
- Política de acceso preparada: en la compilación web de producción, si existe
  `EXPO_PUBLIC_ACCOUNT_URL`, las rutas de rutina, entrenamiento, calendario,
  progreso, comunidad y perfil redirigen a cuenta cuando no hay sesión válida.
  La portada solo ofrece iniciar sesión o crear una cuenta. El desarrollo local
  conserva acceso sin cuenta para construir y verificar la interfaz antes del
  despliegue.
- Validación realizada: `npm run typecheck` completado correctamente tras el
  cambio. No se ha desplegado, publicado ni modificado ninguna configuración
  de IONOS durante este avance.

### Siguientes pasos para activar el área privada

1. Resolver en IONOS la disponibilidad HTTPS de `https://api.akhyles.com/health`
   y terminar la configuración privada del backend (base de datos, cifrado,
   SMTP, copias y restauración).
2. Probar registro, inicio de sesión, recuperación de acceso y sincronización
   entre un navegador y un dispositivo Android real, incluyendo conflictos de
   copias.
3. Generar una compilación web estática de la aplicación y publicarla en una
   ruta o subdominio separado del editor MyWebsite NOW; mantener la portada
   pública actual intacta hasta validar esa zona privada.
4. Configurar en Google OAuth los orígenes y redirecciones HTTPS definitivos de
   esa URL web antes de habilitar el acceso con Google en producción.
5. Tras las pruebas externas, enlazar desde la portada pública un acceso claro
   a «Entrar en Akhyles».

## Gráficas mensuales — 14 de septiembre de 2026

- Al consultar un mes, la gráfica conserva como contexto la última medición del
  mes inmediatamente anterior y une la línea con todas las mediciones del mes
  elegido. Una línea discontinua marca el comienzo del periodo seleccionado.
- No se arrastran registros anteriores a ese mes previo: así se mantiene la
  continuidad visual sin extender artificialmente la escala con datos antiguos.
- Se añadió una prueba de regresión para meses con varias mediciones y la
  comprobación completa pasó: 125 pruebas, TypeScript y ESLint.

## Diagnóstico de API de cuentas — 14 de septiembre de 2026

- La comprobación externa confirma que `https://api.akhyles.com/health` ya
  negocia HTTPS correctamente y alcanza Apache; el certificado wildcard y el
  destino del subdominio no son el bloqueo actual.
- La ruta devuelve HTTP 503 desde la aplicación PHP. Al validar la configuración
  privada local, la clave de cifrado tiene el formato correcto y existen los
  datos de conexión, pero el host configurado de MariaDB no resuelve por DNS
  desde este entorno. Esto puede impedir que `bootstrap.php` abra
  PDO y explica el 503 de `/health`.
- Se generó un paquete de despliegue sin secretos para el backend de cuentas.
  Queda pendiente que IONOS confirme el nombre de host MariaDB vigente y la
  conectividad desde Hosting Premium; después hay que instalar la configuración
  privada en el servidor, ejecutar la migración y volver a comprobar `/health`.
- Los valores de OAuth web y SMTP siguen pendientes en la configuración privada.
  No bloquean una respuesta sana de `/health`, pero sí el acceso con Google y
  el envío real de verificación/recuperación por correo.

### Estado actualizado: acceso a MariaDB

- Se ha comprobado que el dominio, HTTPS, Apache y la API alcanzan el servidor
  MariaDB de IONOS. El bloqueo ya no está en DNS, SSL ni en el despliegue web.
- MariaDB rechaza la conexión del usuario técnico que usa la API (`dbu933672`)
  desde el alojamiento de IONOS con error 1045. Ese usuario es una credencial
  interna de la aplicación: permite que la API lea y guarde cuentas, sesiones y
  progreso en la base de datos; no es un usuario de Akhyles ni de Javier.
- En el panel de IONOS se pudo cambiar su contraseña, pero no aparece una
  opción para revisar o modificar sus permisos ni para recrearlo. La rotación
  de contraseña y la sincronización de la configuración privada no resolvieron
  el rechazo. No se guarda ninguna contraseña en este diario, en el proyecto
  ni en Git.
- phpMyAdmin abre con otra cuenta técnica administrada por IONOS, distinta de
  la que utiliza la API. Esa cuenta permite ver las tablas de Akhyles, pero no
  consultar ni cambiar los permisos del usuario de la API.
- **Próximo paso:** pedir a IONOS que revise o recree el usuario de MariaDB que
  utiliza la API y le conceda acceso a la base desde el alojamiento de IONOS.
  Cuando lo confirmen, se actualizará de forma privada la configuración de la
  API y se validará que `https://api.akhyles.com/health` responda correctamente
  antes de activar el registro/inicio de sesión web o generar el AAB final.

### Resolución (14 de septiembre de 2026)

- El problema **no era IONOS ni los permisos de MariaDB**. La copia publicada de
  `bootstrap.php` estaba cargando por error `config.example.php`, que contiene
  valores de ejemplo, en lugar de `config.local.php`, donde está la
  configuración privada real.
- Se limpió `config.local.php`: queda una sola definición de la contraseña de
  base de datos y no se ha guardado ningún secreto en este diario ni en Git.
- Se corrigió el inicio de la API para que cargue `config.local.php` y se retiró
  el diagnóstico temporal que podía exponer detalles internos ante un error.
- Verificación final: `https://api.akhyles.com/health` responde **HTTP 200** con
  estado `ok`. La base de datos y el esquema están accesibles. OAuth de Google
  sigue sin configurar y el SMTP real continúa pendiente; no bloquean
  `/health`, pero sí faltan para Google y el envío efectivo de verificaciones
  o recuperaciones por correo.

### Verificacion de correo y cuentas (14 de septiembre de 2026)

- Se ha actualizado de forma privada la configuracion SMTP del buzon tecnico
  de Akhyles. Ninguna contrasena, codigo de verificacion ni otra credencial se
  guarda en este diario, el repositorio o Git.
- La prueba real de registro devolvio respuesta correcta y el correo
  **"Verifica tu correo de Akhyles"** llego a la bandeja de entrada del buzon
  de soporte. Queda por tanto verificado el envio SMTP de produccion.
- Para activar una cuenta, el usuario debe introducir en la app el codigo
  recibido; el codigo caduca y solo se puede usar una vez. Google OAuth sigue
  pendiente de configuracion y es independiente del alta por correo.

### Recuperacion de la configuracion privada (14 de septiembre de 2026)

- Durante la activacion de Google se corrompio la sintaxis de
  `config.local.php` en el editor remoto; por ello la API paso a responder 503.
- La copia diaria de IONOS no incluia ese archivo privado. Se repuso desde la
  copia local privada mediante SFTP, en la carpeta publicada correcta.
- La sintaxis de PHP ya queda recuperada, pero MariaDB rechaza la contrasena de
  la copia local (error 1045). La contrasena valida que tenia el archivo remoto
  anterior no puede recuperarse desde la copia de IONOS.
- Siguiente paso: establecer una nueva contrasena para el usuario tecnico de
  MariaDB en IONOS y actualizar a la vez el archivo privado de la API; comprobar
  inmediatamente que `/health` vuelve a HTTP 200 antes de retomar Google.
- No se han registrado contrasenas, codigos ni otros secretos en este diario.

### Recuperacion verificada de MariaDB (14 de septiembre de 2026)

- Se establecio una nueva contrasena privada, compatible con el limite de
  longitud de IONOS, para el usuario tecnico de la base de datos.
- La misma configuracion privada se subio por SFTP exclusivamente a la carpeta
  publicada de la API. El portapapeles del equipo se restauro tras el cambio.
- Verificacion final: `https://api.akhyles.com/health` responde **HTTP 200**
  con `ok: true` y el esquema de base de datos accesible.
- El inicio con Google quedaba pendiente hasta activar de forma segura el
  identificador publico de OAuth en el backend, sin editar manualmente el
  archivo remoto; ese paso se completo en la actualizacion siguiente.

### Google en produccion (14 de septiembre de 2026)

- Se configuro el identificador publico del cliente web de Google desde la
  copia privada local y se publico por SFTP, sin usar el editor remoto.
- Verificacion: `/health` responde **HTTP 200** y confirma
  `googleConfigured: true`.
- Antes de subir la primera version a Google Play queda probar un inicio real
  con una cuenta de Google en la compilacion Android de lanzamiento.

### Web privada de Akhyles (14 de septiembre de 2026)

- Se conserva `akhyles.com` como portada publica gestionada con MyWebsite NOW.
  La zona autenticada de la aplicacion se alojara de forma independiente en
  `app.akhyles.com`; asi la portada, el correo y las descargas actuales no se
  sustituyen ni se ven afectados.
- Se exporto correctamente la aplicacion Expo para web con
  `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com`. El resultado local esta en
  `dist/` (66 archivos, 8,86 MB) e incluye una regla de servidor para que al
  recargar rutas privadas como `/account` no haya un error 404.
- En IONOS se creo el subdominio `app.akhyles.com` y la carpeta aislada
  `/akhyles-web-app` dentro del Hosting Premium 47175101. IONOS aun lo mostraba
  como "Creando" al terminar esta comprobacion: falta que aparezca en el
  selector de dominios, vincularlo a esa carpeta y cargar el contenido de
  `dist/`.
- La activacion interna termino despues: `app.akhyles.com` ya esta vinculado a
  `/akhyles-web-app` y el panel confirma que tiene SSL asignado. Se preparo el
  paquete local `artifacts/akhyles-web-app-20260914.zip` (7,4 MB), que conserva
  la estructura completa de `dist/` para subirlo y extraerlo en esa carpeta.
- Despues de que el HTTPS del subdominio este operativo, anadir
  `https://app.akhyles.com` a los origenes autorizados del cliente web de
  Google y comprobar en un navegador el alta, el inicio por correo y el inicio
  con Google. Finalmente, anadir a la portada publica un enlace
  "Entrar en Akhyles" hacia ese subdominio.
- No se han anotado contrasenas, codigos, tokens ni otras credenciales.

### Web privada publicada y verificada (14 de septiembre de 2026)

- Se subio y extrajo el export web de Akhyles en `/akhyles-web-app`, la carpeta
  vinculada en IONOS a `https://app.akhyles.com`. El subdominio mantiene HTTPS
  activo y no modifica la portada publica de `akhyles.com`.
- Verificacion publica: `https://app.akhyles.com/` carga la pantalla privada;
  `https://app.akhyles.com/account?mode=register` carga tambien al abrirla o
  recargarla directamente. Se corrigio la regla `.htaccess` para evitar el
  error 500 que producia la primera regla de rutas de Expo en IONOS.
- La API de cuentas ahora autoriza especificamente el origen
  `https://app.akhyles.com`. Asi la web puede llamar a `api.akhyles.com` sin
  bloqueo CORS; se comprobo que el endpoint de configuracion de Google
  responde HTTP 200 con ese origen.
- En la pantalla web de alta ya se muestra el boton oficial de Google, junto
  con el alta por correo. No se realizo un inicio de sesion real ni se creo
  ninguna cuenta de prueba durante esta comprobacion.
- Se regenero el archivo de despliegue local para que refleje la regla de
  rutas corregida: `artifacts/akhyles-web-app-20260914.zip` (7.393.203 bytes,
  SHA-256 `973B22B16D040EE5A902229C46A95B9EF2E80B3FA8C84D6A4BFF8EE73C84C2FB`).
- La portada publica de `akhyles.com` incluye ya el boton visible **"Entrar
  en Akhyles"** en el bloque inicial. Enlaza a `https://app.akhyles.com` y
  conserva intactos la descarga de la APK y el resto del contenido publico.
- Se republico la portada desde MyWebsite NOW y se verifico la version publica:
  el boton aparece con ese texto y apunta al subdominio privado correcto.

### Origen OAuth de la web privada (14 de septiembre de 2026)

- Se anadio `https://app.akhyles.com` al cliente OAuth web **Akhyles Web** en
  Google Cloud, junto a los origenes existentes de la portada.
- Google Cloud confirmo el guardado del cliente. Este cambio elimina el bloqueo
  por origen no autorizado al pulsar "Continuar con Google" desde la web.
- La propia consola advierte que la propagacion puede tardar unos minutos (en
  algunos casos, mas tiempo). No depende de la aprobacion de Google Play ni
  requiere publicar una nueva APK.

### Guardado automatico en la nube (14 de septiembre de 2026)

- El guardado en la nube ya esta preparado para las cuentas que hayan iniciado
  sesion: el primer cambio se sincroniza automaticamente poco despues de
  entrar, se vuelve a comprobar cada 30 segundos y tambien al regresar a la
  aplicacion. El boton de sincronizacion solo sirve para forzar una comprobacion
  inmediata, no es necesario usarlo normalmente.
- La aplicacion conserva una copia local para poder seguir usandose sin red; el
  estado "pendiente" significa que aun no ha podido confirmar la copia remota
  (por ejemplo, durante los primeros segundos, sin conexion o si se estaba
  usando una compilacion sin servicio de cuentas).
- Se verifico que `https://api.akhyles.com` supera las comprobaciones de HTTPS,
  DNS y salud del servicio, con Google configurado. El chequeo de tipos del
  proyecto tambien finaliza correctamente.
- Los paquetes de lanzamiento actuales ya incorporan
  `https://api.akhyles.com`: `artifacts/android/akhyles-release.apk` y
  `artifacts/android/akhyles-release.aab`, generados el 14 de septiembre.
- Pendiente de distribucion: la descarga publica de `akhyles.com` todavia
  enlaza al APK de vista previa offline anterior. Hay que sustituir ese archivo
  por el APK de lanzamiento conectado antes de que los probadores lo instalen.

### Cuenta unica para Akhyles y Comunidad (14 de septiembre de 2026)

- La primera propuesta de una credencial firmada entre la API PHP y un servidor
  Node queda sustituida por la integracion directa descrita abajo: no se va a
  desplegar ese servidor ni crear una clave compartida.
- Comunidad guarda un vinculo unico con el identificador interno de la cuenta.
  Las cuentas nuevas recibiran un perfil social sin segundo registro ni segunda
  contrasena; el @ se podra personalizar despues desde el perfil.
- Se anadio una prueba que verifica que dos accesos con la misma cuenta reutilizan
  exactamente el mismo perfil de Comunidad. Las 126 pruebas del proyecto y la
  comprobacion de tipos terminan correctamente.
- Las cuentas antiguas de Comunidad no se fusionan automaticamente por nombre
  de usuario: requeriran un flujo posterior de vinculacion autenticada para no
  arriesgar publicaciones, seguidores o perfiles de otra persona.

### Comunidad integrada en la API PHP (14 de septiembre de 2026)

- Se ha elegido no contratar un VPS. Comunidad se esta trasladando a
  `https://api.akhyles.com/community`, dentro del mismo servicio PHP y MariaDB
  que ya usan las cuentas y las copias privadas.
- La identidad de la cuenta principal se valida directamente en el servidor:
  al entrar en Comunidad se crea o recupera un perfil asociado al mismo
  identificador. No hay una segunda sesion, contrasena, correo compartido ni
  servicio Node que mantener.
- El esquema nuevo incluye perfiles sociales, privacidad, rutinas compartidas,
  progreso compartido y muestras anonimas de comparacion. El cliente ya dirige
  estas funciones a la sesion principal de Akhyles.
- El 14 de septiembre se ejecutó y verificó la migración aditiva en la base
  `Akhyles accounts`: existen `community_profiles`, `community_routines`,
  `community_progress` y `community_samples`. No se modificaron ni borraron
  cuentas, sesiones ni copias privadas existentes.
- Pendiente inmediato: subir los archivos PHP de Comunidad a la versión activa
  de `api.akhyles.com` sin sobrescribir `config.local.php`; después comprobar
  el endpoint público de salud y, con una cuenta real, el perfil automático y
  las opciones de privacidad. El alojamiento actual de IONOS es suficiente; no
  requiere compra ni una clave nueva de servidor.
- Despliegue preparado el 14 de septiembre: el paquete local actual es
  `artifacts/accounts/akhyles-accounts-20260914-223114.zip` (SHA-256
  `B4663E4282B4B7BE6C13B3071323C317145ADBDE235DE4A6C17BC6B90D8292C3`).
  Las pruebas de TypeScript y las 126 pruebas automatizadas pasaron. Para no
  sobrescribir la configuración privada, la subida prevista es de
  `bootstrap.php` y `schema.sql` en la raíz de la versión activa, `Accounts.php`
  y `Community.php` en `src/`, e `index.php` en `public/`; nunca subir
  `config.local.php`.
- El destino activo confirmado en IONOS es
  `/akhyles-api-release/akhyles-accounts-20260911-083447/public`. La carga no
  llegó a comenzar: el conector de control remoto falló al abrir el selector de
  archivos de IONOS. No es un fallo de credenciales ni de la API y no se ha
  modificado ningún archivo publicado.
- Próximos pasos, por orden: recuperar el control de IONOS, subir los cinco
  archivos indicados en sus carpetas correspondientes, verificar
  `https://api.akhyles.com/community/health`, probar con una cuenta existente
  que se cree/recupere el perfil de Comunidad automáticamente y, solo después,
  exportar y publicar las nuevas compilaciones web y Android.
- El modulo social completo anterior (fotos, seguidores y entrenador) aun debe
  terminar de trasladarse antes de anunciar Comunidad como funcionalidad publica.

### Despliegue de Comunidad verificado (14 de septiembre de 2026)

- Se actualizaron en la version activa de `api.akhyles.com` los cinco archivos
  previstos: `bootstrap.php`, `schema.sql`, `src/Accounts.php`,
  `src/Community.php` y `public/index.php`. `config.local.php` no se modifico.
- Verificacion externa: `https://api.akhyles.com/community/health` responde
  HTTP 200 con `{"service":"akhyles-community","ok":true,"identity":"akhyles-account"}`.
- Pendiente: probar con una cuenta existente la creacion/recuperacion automatica
  del perfil de Comunidad y sus opciones de privacidad antes de exportar y
  publicar nuevas compilaciones web y Android.

### Sincronizacion de cuenta reparada (14 de septiembre de 2026)

- IONOS rechazaba las reglas `mod_rewrite` del `.htaccess` con un error 500 y
  no entregaba la cabecera `Authorization` a PHP. Se sustituyo por la directiva
  compatible `SetEnvIf Authorization "^(.*)$" HTTP_AUTHORIZATION=$1`.
- `public/index.php` tambien admite `getallheaders()` como respaldo para los
  entornos compartidos que no rellenan `$_SERVER['HTTP_AUTHORIZATION']`.
- Se creo una sesion nueva con Google y se verifico en la aplicacion web el
  estado: "Guardado en el dispositivo y en la nube", con copia confirmada el
  14/09/2026 a las 23:00:46. `config.local.php` no se modifico.

### Candidato de release conectado (14 de septiembre de 2026)

- Se validaron por HTTPS, DNS y salud `https://api.akhyles.com` y
  `https://api.akhyles.com/community`; Google esta configurado en el servicio
  de cuentas. TypeScript, ESLint y las 126 pruebas automatizadas finalizaron
  correctamente.
- La web conectada se exporto en `artifacts/web-community-release/` con
  `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com` y
  `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com/community` (65 archivos,
  8.86 MB). Esta es la version que habilita Comunidad en el cliente.
- Se generaron los artefactos Android conectados: `akhyles-release.apk`
  (SHA-256 `FA0FD3E692A470F7461DFDDB33F030E00FBC07506D5AF7A70D2E901E96C3DA99`)
  y `akhyles-release.aab`
  (SHA-256 `C39F49CEC8B7095064A3C6A0E1A53EEBA6CE9D12CE1DB4B89F28F937A0D7BCD3`).
- Pendiente de autorizacion de publicacion: sustituir la web de produccion por
  este export y distribuir el AAB mediante el canal de pruebas de Google Play.

### Web de Comunidad publicada (14 de septiembre de 2026)

- Se publico `artifacts/akhyles-web-community-20260914.zip` en
  `/akhyles-web-app` de IONOS, conservando las reglas SPA de `.htaccess` y
  sustituyendo `index.html`, `metadata.json` y los recursos de la version.
- Verificacion externa: `https://app.akhyles.com/` sirve el bundle
  `entry-9bed5d4230bb4d35eb19ee7ef6cd4a50.js`, configurado con
  `https://api.akhyles.com` y `https://api.akhyles.com/community`.
- La sincronizacion de cuenta y Comunidad quedan disponibles tambien en el
  cliente web de escritorio. El AAB de Android continua listo, pero aun no se
  ha enviado a Google Play.

### Comunidad completada (14 de septiembre de 2026)

- Se amplió el backend de Comunidad con publicaciones de texto, reacciones,
  seguimiento, bloqueos, denuncias, gimnasios, privacidad, ranking y
  colaboraciones de entrenador. No se añadió almacenamiento de fotos.
- El `@` del perfil principal se sincroniza con Comunidad y queda reservado de
  forma única en el servidor; un nombre repetido se rechaza.
- Se publicó `schema.sql` y `src/Community.php` en la API, y se extrajo
  `akhyles-web-community-full-20260914.zip` sobre `/akhyles-web-app`.
- Verificación externa: la API responde 200 en `/community/health` y la web
  pública sirve `entry-51483db47d33772487b47b8cf72ab8bc.js`.
- Corrección de publicación: `Community.php` quedó finalmente sobrescrito en
  `/akhyles-api-release/akhyles-accounts-20260911-083447/src/Community.php`
  (21,37 KB; 14/09/2026, 23:51). La copia subida por error a la raíz no es la
  que carga la aplicación.
- Cierre de sesión: API y web comprobadas con respuesta HTTP 200. Comunidad
  queda publicada con `@` único sincronizado, sin almacenamiento de fotos.

### Pendiente: experiencia integral de entrenadores en Comunidad (15 de septiembre de 2026)

- Se aparca la propuesta visual actual de perfiles de entrenador. La maqueta
  local creada para explorarla usa datos ficticios y no representa todavía la
  dirección de producto aprobada.
- Antes de retomar la implementación, redefinir la experiencia como una parte
  nativa de Comunidad: identidad y datos propios de Akhyles, acceso coherente
  desde los perfiles sociales y un recorrido integral para descubrir,
  comparar, solicitar acompañamiento y gestionar clientes.
- No continuar integrando ni publicando la interfaz actual hasta validar ese
  nuevo planteamiento visual y de producto.

### Despliegue estable pendiente de activación (15 de septiembre de 2026)

- El fallo recurrente de publicación no es de la API: es el control remoto del
  navegador al abrir el selector del Explorador Web de IONOS (`Debugger
  unattached`). No usar ese explorador para despliegues normales.
- Se ha añadido `scripts/deploy-ionos.ps1`. Primero muestra una simulación y
  solo transfiere con `-Deploy`, por SFTP, comprobando la clave conocida del
  host y verificando la URL pública al terminar.
- Web publica recursos antes de `index.html`; API queda limitada a `schema.sql`
  y `src/Community.php`, por lo que no puede sobrescribir
  `config.local.php`.
- Falta crear en IONOS dos cuentas SFTP restringidas (web y API), almacenar sus
  contraseñas en el Administrador de credenciales de Windows y realizar una
  conexión de validación. La guía es `docs/DESPLIEGUE-IONOS-SFTP.md`.

### Acceso de despliegue y conservación de secretos (15 de septiembre de 2026)

- Las contraseñas SFTP **no se guardan en este diario**, en Git ni en
  `.private/akhyles-access.md`. Se guardan cifradas para este usuario de Windows
  en el Administrador de credenciales. El script las recupera por su identificador,
  sin imprimirlas.
- Web: cuenta `acc809652538`, host `home508084090.1and1-data.host`, puerto 22;
  credencial de Windows `Akhyles/IONOS/deploy-web`; configuración privada
  `.private/ionos-deploy.web.json`.
- API: cuenta restringida existente `acc961399692`, directorio
  `/akhyles-api-release/akhyles-accounts-20260911-083447`. Su contraseña previa
  fue rechazada y deberá quedar almacenada como
  `Akhyles/IONOS/deploy-api` tras renovarla.
- Para retomar: ejecutar primero la simulación de
  `scripts/deploy-ionos.ps1`; el script exige `known_hosts` verificado y termina
  con comprobación HTTP. Consultar `docs/DESPLIEGUE-IONOS-SFTP.md`.
- Se añadió el modo `-TestConnection`: solo ejecuta `pwd` y `ls` por SFTP, sin
  publicar, crear ni modificar archivos. La prueba inicial contra
  `acc961399692` también fue rechazada; como la contraseña segura de esa cuenta
  no estaba previamente verificada, el resultado es **inconcluso** y no permite
  culpar a IONOS ni a la cuenta web nueva.
- Protocolo permanente creado en `docs/OPERACION-DESPLIEGUES.md`: cada
  despliegue exige simulación, prueba SFTP de lectura, publicación y verificación
  HTTP, registrando el resultado sin secretos.
- Se preparó una credencial nueva de API para `acc961399692` y se guardó solo
  en `Akhyles/IONOS/deploy-api`. Está pendiente de confirmar el cambio en IONOS
  y ejecutar inmediatamente la prueba de lectura; hasta entonces no publicar.
- Corrección permanente del lanzador: se detectó que el helper `cmd` podía
  interpretar caracteres especiales de una contraseña. Ahora recibe solo una
  representación Base64, la decodifica justo antes de entregarla a OpenSSH y
  limita el intento a una contraseña. Esto evita corrupción de secretos y tres
  rechazos consecutivos por una sola prueba.
- Validación posterior completada: `-TestConnection` con `acc961399692` se
  autenticó correctamente y listó su raíz restringida, sin cambios remotos.
  El formato de salida también se normalizó para que mensajes SFTP enviados por
  stderr no se presenten como un error de PowerShell cuando el código de salida
  es correcto.
- Barrera técnica añadida: cualquier ejecución con `-Deploy` inicia un
  preflight SFTP de solo lectura con el mismo destino y credencial. Si no se
  autentica correctamente, el script termina antes de construir la sesión de
  transferencia y deja explícito que no se ha publicado ningún archivo.

### Instrucción estándar para actualización integral

Cuando se solicite una actualización completa, usar esta instrucción literal:

> Actualiza todo lo pendiente de Akhyles: web, API, Android/Google Play y
> documentación. Haz una revisión completa antes de publicar: cambios,
> migraciones, pruebas, compilación, credenciales, SFTP, salud de API, versión
> pública web y estado de Play Console. Tienes autorización para publicar solo
> los destinos cuya verificación sea correcta. Si algo falla, no lo publiques:
> diagnostícalo, corrígelo si es seguro y deja en el diario la causa, la
> solución, las verificaciones realizadas y cualquier paso pendiente. No guardes
> secretos en archivos ni en el diario.

- El alcance de “todo” incluye todos los cambios pendientes ya implementados,
  pero no inventar cambios de producto no solicitados.
- En web y API, `-Deploy` ejecuta obligatoriamente el preflight SFTP; no hay
  que recordar el comando de comprobación por separado.
- Antes de confirmar el resultado, comprobar build/tests aplicables, migraciones
  necesarias, HTTP público/health de API y que el artefacto Android y Play
  Console correspondan a la versión publicada.

### Actualización integral — resultado parcial seguro (15 de septiembre de 2026)

- Web publicada por SFTP con el preflight obligatorio correcto. Se verificó
  públicamente `https://app.akhyles.com/` contra el bundle
  `entry-c108695ffd18be7c1caea72c89487210.js` del export `web-1.0.11`.
- Validaciones locales correctas: TypeScript y 131 pruebas de aplicación; la
  integración aislada de cuentas sobre MariaDB pasó 40/40. La sintaxis de
  `server-php/src/Community.php` también es válida.
- API **no publicada en esta actualización**: su migración idempotente no puede
  conectarse desde este equipo porque el host MariaDB configurado no resuelve
  por DNS local. La API pública actual sigue sana; no se subió código que pueda
  requerir tablas aún no migradas. Para terminar este destino hay que ejecutar
  `bin/migrate.php` desde el entorno IONOS que sí alcanza la base, o disponer
  del host MariaDB accesible correcto, y repetir después el preflight y la
  publicación limitada.
- Android/Google Play no se modificó en este paso: la versión 1.0.11 ya está
  en el circuito de Play pendiente de su revisión/distribución externa. No se
  genera ni publica un AAB adicional mientras la actualización de API esté
  bloqueada.
- El APK y AAB 1.0.11 con `versionCode` 13 se verificaron correctamente. Los
  comprobadores públicos de cuentas y Comunidad también pasaron mediante
  `tsx`; no invocarlos con `node` directo porque importan módulos TypeScript.

### Diagnóstico de SFTP de IONOS (15 de septiembre de 2026)

- La cuenta dedicada de web `acc809652538` existe, usa SFTP y tiene como
  directorio `/`. La credencial se conserva en el Administrador de credenciales
  bajo `Akhyles/IONOS/deploy-web`; no copiar ni guardar su valor en este diario.
- `scripts/deploy-ionos.ps1` ya evita `sftp -b`, porque ese modo fuerza
  `BatchMode=yes` e impedía usar `SSH_ASKPASS`. La conexión llega al host,
  comprueba la clave conocida y OpenSSH confirma que ha enviado una contraseña.
- Aun así, IONOS rechaza la autenticación de esa cuenta tras los cambios de
  contraseña. Esto descarta DNS, clave de host, red, IPv4/IPv6 y el antiguo
  problema de portapapeles, pero **no basta para atribuir la causa a IONOS**:
  `acc809652538` y el automatismo SFTP son nuevos y no se usaron para los
  despliegues anteriores.
- El Explorador web autenticado de IONOS muestra la raíz vacía, mientras
  `app.akhyles.com` y `api.akhyles.com` responden desde Apache. Antes de usar
  una subida alternativa hay que identificar el directorio real asociado a esos
  subdominios; no subir archivos a la raíz vacía.
- Directorios confirmados desde la configuración de dominios de IONOS:
  `app.akhyles.com` → `/akhyles-web-app` y `api.akhyles.com` →
  `/akhyles-api-release/akhyles-accounts-20260911-083447/public`. La
  configuración privada de web ya usa `/akhyles-web-app`; la cuenta restringida
  de API ve el directorio padre como su raíz virtual.
- Verificación controlada posterior: se generó una contraseña nueva localmente,
  se guardó directamente bajo `Akhyles/IONOS/deploy-web` y se introdujo en el
  formulario de IONOS desde esa misma fuente. El formulario la validó como
  fuerte, el titular guardó el cambio y se esperaron más de dos minutos. SFTP
  sigue devolviendo `Permission denied`. La conclusión queda pendiente de
  contraste: primero probar el mismo script, host y `known_hosts` con la cuenta
  de API existente mediante `-TestConnection`, sin publicar archivos. Solo si
  esa prueba funciona se aislará el problema a la configuración de la cuenta
  web nueva; no borrar ni recrear ninguna cuenta antes.

### Diferenciar base de datos y SFTP (15 de septiembre de 2026)

- `dbs16115434` es la base de datos MariaDB del backend, no una cuenta SFTP.
  El problema histórico fue una descoordinación entre la contraseña de MariaDB
  y `config.local.php`.
- En el estado actual, `https://api.akhyles.com/health` responde 200 después
  de ejecutar `bootstrap.php`, que abre PDO con la configuración de base de
  datos. Por tanto, la credencial de MariaDB que está desplegada funciona y no
  explica el rechazo de la cuenta SFTP web.
- Se retiraron las contraseñas heredadas en texto plano de
  `.private/akhyles-access.md`. Sus ubicaciones seguras son
  `Akhyles/IONOS/database-dbs16115434` y `Akhyles/IONOS/deploy-api` en el
  Administrador de credenciales de Windows.

### Actualizacion integral completada (15 de septiembre de 2026)

- Se completo el destino de API que habia quedado pendiente. La comprobacion
  de estructura en phpMyAdmin confirmo que las tablas previas ya existian y
  que solo faltaba `community_notifications`. Se aplico una migracion aditiva
  con `CREATE TABLE IF NOT EXISTS`; no se modificaron ni eliminaron datos.
- Se publico la API con `scripts/deploy-ionos.ps1 -Target Api -Deploy`. El
  preflight SFTP obligatorio fue correcto y la subida quedo limitada a
  `server-php/schema.sql` y `server-php/src/Community.php`.
- Verificacion posterior correcta: la comprobacion de cuentas publico que
  Google esta configurado y la comprobacion publica de Comunidad confirmo
  HTTPS, DNS y el endpoint de salud. La web continuaba ya publicada y
  verificada; Android/Play sigue en el estado de revision/distribucion
  externa ya indicado arriba.

### Actualizacion integral — perfil y notificaciones (16 de septiembre de 2026)

- Verificaciones locales antes de publicar: `npm.cmd run typecheck`, `npm.cmd run lint` (0 errores) y `npm.cmd test` (130 correctas, 2 omitidas heredadas).
- Simulación de SFTP correcta: Web (66 archivos) y API (2 archivos). El preflight obligatorio de `-Deploy` volvió a pasar en ambos destinos.
- Web publicada desde `artifacts/web-1.0.11-current`, con el perfil unificado, campana de notificaciones, historial completo, avatar optimizado, Ranking y Logros. Verificación pública correcta en `https://app.akhyles.com/` contra el bundle recién generado.
- API publicada con la transferencia limitada a `server-php/schema.sql` y `server-php/src/Community.php`. Verificación pública correcta en `https://api.akhyles.com/community/health`.
- No se han guardado secretos ni datos de cuentas en este registro.

### Release Android conectada preparada (16 de septiembre de 2026)

- Se incrementó la versión para evitar reutilizar el código ya presente en Play: `1.0.12`, `versionCode` 14.
- Se generaron `artifacts/android/akhyles-release.apk` y `artifacts/android/akhyles-release.aab` con las URLs públicas de Cuentas y Comunidad.
- Las comprobaciones HTTPS/DNS y salud de ambos servicios pasaron. La firma se conserva (`SHA-1 040ea0afd797f22730198cdb4295c4763ab86ab7`) y `verify-android.mjs` confirmó `versionCode` 14.
- Play Console tiene abierto el borrador del canal de prueba cerrada. La carga del AAB queda pendiente de seleccionar el archivo en el selector nativo del navegador; no se ha declarado una subida que no se haya verificado.

### Release Android 1.0.13 preparada (16 de septiembre de 2026)

- Play indicó que el código 14 ya estaba usado; se incrementó a `1.0.13`, `versionCode` 15.
- Se generaron y verificaron de nuevo los binarios conectados firmados (`akhyles-release.apk` y `akhyles-release.aab`), conservando la clave de publicación.
- La web se exportó y publicó de nuevo desde `artifacts/web-1.0.13-current`; verificación pública correcta en `https://app.akhyles.com/`.
- Las notas de versión permanecen guardadas en el borrador de Play Console. El AAB 15 debe sustituir al rechazado antes de pasar a revisión.
- Por indicación del titular, no se elimina todavía el AAB rechazado (código 14): queda conservado dentro del borrador de Play Console, en el lanzamiento `releases/6`, hasta que se apruebe la sustitución.
- El paquete válido para sustituirlo queda guardado localmente en `artifacts/android/akhyles-release.aab` (AAB 15) y `artifacts/android/akhyles-release.apk` (APK 15). El borrador se conserva en: `https://play.google.com/console/u/0/developers/5992696928131909522/app/4976308998348517963/tracks/4699202944684152722/releases/6/prepare`.
### Envío a revisión de Google Play (16 de septiembre de 2026)

- El AAB `15 (1.0.13)` fue reconocido por Play Console y se guardaron el nombre y las notas de versión.
- Tras confirmar el envío, Play Console muestra `1 cambio enviado a revisión`. La versión queda pendiente de la revisión de Google; no se ha forzado ninguna publicación adicional.

### Preparación interna de iOS (16 de septiembre de 2026)

- Se añadió a `app.config.ts` la configuración iOS estable: bundle identifier
  `com.javiermartinrosado.akhyles` y `buildNumber` inicial `1`. No se creó la
  carpeta nativa `ios/`: EAS la generará mediante Continuous Native Generation.
- Se documentó el flujo completo de publicación, TestFlight, revisión,
  permisos, OAuth y requisitos pendientes en `docs/IOS.md`.
- Se reservó `assets/app-store/ios/` para capturas y materiales específicos de
  iPhone, sin guardar credenciales ni certificados.
- Quedan pendientes de la activación de Apple Developer: App ID, ficha de
  App Store Connect, firma EAS, OAuth iOS, decisión sobre Sign in with Apple,
  capturas reales y pruebas en iPhone.
- La referencia anterior a conservar el AAB Android 14 queda superada: se
  retiró del borrador y el AAB 15 (1.0.13) es el enviado a revisión de Google Play.

### Auditoría integral y actualización — 16 de septiembre de 2026 — 1.0.13

- Código y documentación: corregido el error bloqueante de ESLint en
  `MachineBrandSelect`; el despliegue Web ahora usa `dist` por defecto para no
  transferir un export antiguo. Sin credenciales ni artefactos privados en Git.
- Verificaciones locales: `npm.cmd run check` correcto; tipos correctos, lint
  con 0 errores y 4 avisos no bloqueantes heredados, 134 pruebas correctas y 2
  omitidas. `npx.cmd expo export --platform web` correcto.
- Android: build conectada `assembleRelease` + `bundleRelease` correcta con
  Comunidad `https://api.akhyles.com/community` y Cuentas
  `https://api.akhyles.com`; firma original, paquete correcto y `versionCode`
  15 confirmados por `verify-android.mjs`. No se publicó un binario porque Play
  Console ya tiene la versión 1.0.13 en revisión.
- Web: SFTP de solo lectura correcto; se publicó el export `dist` y la
  verificación posterior confirmó HTTP 200 y que `app.akhyles.com` sirve el
  bundle `entry-fa1456babc5517cbee3fad26a1bde87e.js` recién generado.
- API: SFTP de solo lectura correcto; `/health` de Cuentas y
  `/community/health` responden 200, HTTPS y Google configurado. No se publicó
  la API nueva: la pública es PHP y las rutas nuevas de marcas/notificaciones
  están en el servidor Node experimental; transferir solo PHP no las activaría.
  Pendiente unificar backend y migraciones antes de publicar esas funciones.
- Play Console: estado comprobado en sesión autenticada; la ficha muestra
  “Cambios en revisión” y el lanzamiento `Perfil y comunidad 1.0.13` en prueba
  cerrada Alpha. No se inició otro lanzamiento ni se forzó publicación.
- E2E: el runner local quedó bloqueado esperando una instancia Expo/demo previa
  en 8081 y se detuvo sin marcar la suite como aprobada. La API local sí
  respondió en 8082; no se tocó ni se reinició la demo existente. PHP/Composer
  no están instalados localmente, por lo que no se pudo ejecutar la suite PHP.
- Estado final: solo Web actualizado. Android, Play y API quedan sin publicar
  por los bloqueos indicados; repetir E2E aislado, instalar el APK en un
  dispositivo físico y unificar Node/PHP antes de la siguiente publicación.

### Verificación directa en pestañas autenticadas — 16 de septiembre de 2026

- Play Console: la pestaña autenticada confirma que `Perfil y comunidad 1.0.13`
  está dentro de “Cambios en revisión”, junto con la prueba cerrada Alpha. No
  se ha iniciado lanzamiento completo ni se han eliminado cambios.
- IONOS: la sesión autenticada está disponible y el hosting muestra el panel
  operativo. El acceso SFTP ya había superado la prueba de lectura y la web
  pública sirve el export actual; no fue necesario repetir una transferencia.
- Decisión: no manipular Play mientras Google revisa la versión enviada y no
  publicar API hasta resolver la diferencia entre el backend Node con rutas
  nuevas y el backend PHP que atiende producción.

### Corrección de acceso Google en Web — 16 de septiembre de 2026

- Causa: el export web publicado se había generado heredando `.env.local`, que
  no definía `EXPO_PUBLIC_ACCOUNT_URL`; la web arrancaba en “MODO LOCAL” y no
  inicializaba Google Identity Services.
- Solución: regenerar el export en producción con Cuentas
  `https://api.akhyles.com` y Comunidad
  `https://api.akhyles.com/community`, y publicarlo mediante SFTP con preflight
  de lectura correcto.
- Verificaciones: el bundle público cambió a
  `entry-5f4290cc54c7cfd252e901163ff6b744.js`; la web muestra “Gestionar
  cuenta”, la sesión sincronizada y el endpoint `/auth/google/config` responde
  200 con CORS para `https://app.akhyles.com`.

### Comprobación Play Console posterior — 16 de septiembre de 2026

- Panel de control autenticado: Producción está “Inactivo”; Prueba cerrada está
  “Activa” con 1 canal; Prueba interna está “Inactiva”. La versión 1.0.13 se
  encuentra en el canal de prueba cerrada y no está disponible todavía para
  producción general.

### Preparación de nueva entrega Android en Play — 16 de septiembre de 2026 — 1.0.14

- Se incrementó la versión Android a `1.0.14` / `versionCode` 16 y se generó
  el AAB firmado `artifacts/android/akhyles-release.aab` con las URLs públicas
  de Cuentas y Comunidad.
- Verificación local: `bundleRelease` correcta; certificado SHA-1
  `040ea0afd797f22730198cdb4295c4763ab86ab7`; SHA-256 del AAB
  `366bd5fcf851b1fa8526800e5fec71a6d5640e9369c8a6d6285d0ee7ddce0499`.
- Play Console reconoció correctamente el app bundle `16 (1.0.14)` en el
  borrador de la prueba cerrada Alpha, con 8.786 teléfonos y 4.692 tablets
  compatibles y sin dispositivos perdidos frente a la versión anterior.
- Se guardó y envió a revisión la versión `Perfil y comunidad 1.0.14`, con
  notas en español. Play Console muestra ahora “Cambios en revisión”.
- Play muestra una advertencia no bloqueante sobre la ausencia de archivo de
  desofuscación; el build no usa R8/ProGuard. No hay errores de validación.
- El envío final quedó aceptado por Play Console; sus comprobaciones automáticas
  siguen en curso, con un tiempo estimado de hasta 14 minutos. Producción sigue
  sin publicarse.

### Reexport y despliegue Web — 16 de septiembre de 2026

- Se regeneró el export Web con las URLs públicas de Cuentas y Comunidad y se
  publicó por SFTP en IONOS.
- La verificación posterior confirma HTTP 200 en `https://app.akhyles.com/` y
  `/community`, con el bundle nuevo `entry-2594c217d9b71e40d3fdf061d9994c41.js`.
- La pestaña Comunidad carga correctamente Ranking, Logros, Amigos, Mi gym y
  Global tras recargar la web pública.

### Corrección de API pública de Comunidad — 16 de septiembre de 2026

- Causa confirmada del aviso “Ruta de Comunidad no disponible”: la Web ya
  solicitaba `/community/achievements`, pero el backend PHP público no tenía
  las tablas ni las rutas de logros.
- Solución: se añadieron migraciones y endpoints PHP para listar logros,
  reaccionar a ellos y gestionar la preferencia de avisos de felicitaciones,
  además de registrar hitos de puntos y PR al sincronizar progreso.
- Publicación IONOS: preflight SFTP correcto; transferidos `schema.sql` y
  `src/Community.php`; health posterior `200`.
- Verificaciones: CORS preflight desde `https://app.akhyles.com` devuelve
  `204`; una pestaña nueva de la Web carga Comunidad > Logros sin el error.
- Nota: PHP no está instalado en el entorno local, por lo que la validación de
  sintaxis se hizo mediante el arranque y health de la API pública en IONOS.

### Procedimientos de publicación reproducibles — 16 de septiembre de 2026

- Se prepararon dos prompts operativos para futuras actualizaciones: uno para
  publicar Web + API como una unidad verificable y otro para generar, validar y
  enviar nuevas versiones Android a Google Play Console.
- Regla incorporada: ninguna función Web que dependa de una ruta nueva se da por
  publicada hasta comprobar que la ruta equivalente existe en el backend
  público, que la migración se ejecuta y que una prueba autenticada la valida.
- Regla incorporada para Play: no reutilizar `versionCode`, verificar firma,
  AAB, compatibilidad, advertencias y estado de revisión antes de enviar.
- Estado actual registrado: Web y API pública actualizadas; Android `1.0.14`
  / `versionCode 16` enviado a revisión en prueba cerrada Alpha.

### Corrección de logros retroactivos — 16 de septiembre de 2026

- Causa: los estados antiguos podían conservar `achievements: []`; la pantalla
  lo trataba como una lista definitiva y no reconstruía los logros desde el
  historial de entrenamientos.
- Solución local: `StoreProvider` reconstruye los logros derivados durante la
  hidratación, sin duplicarlos. Un historial anterior con una sesión recibe
  ahora `first-workout` / «Primer paso» automáticamente.
- Solución API: se añadió compatibilidad con `/me/notification-preferences`,
  que era la ruta que utilizaba el perfil para cargar y guardar los avisos de
  felicitaciones.
- Pruebas: typecheck correcto; pruebas de logros personales correctas (incluida
  reconstrucción de historial antiguo); `git diff --check` sin errores.
- Publicación: API PHP y migraciones transferidas por SFTP a IONOS con
  preflight correcto; health API `200`. Web reexportada y publicada con el
  bundle `entry-f68a6887b23b4d64177c3d5df8ff0214.js`; Web y API responden `200`.
- Android: la corrección queda preparada en el código, pero no se ha generado
  otra subida porque `1.0.14` / `versionCode 16` ya está en revisión en Play;
  requerirá una nueva versión y `versionCode` superior.

### Perfil personal de logros y rareza comunitaria — 16 de septiembre de 2026

- Se separó definitivamente la colección personal de los logros sociales. El
  perfil dispone de «Ver todos mis logros» y muestra toda la colección local,
  incluso sin Comunidad ni conexión; la Comunidad solo publica actividad si la
  persona decide compartirla.
- La sincronización de logros es idempotente y retroactiva: reconstruye los
  logros desde el historial local y los identifica por una definición estable,
  evitando que se dupliquen al volver a abrir o sincronizar la app.
- Se implementaron tiers dinámicos en API: común (verde), poco común (turquesa),
  raro (azul), épico (morado) y legendario (dorado). Hasta alcanzar una muestra
  de 100 cuentas, se presentan como provisionales; los cálculos se almacenan y
  se actualizan como máximo una vez al día. En los perfiles, los más exclusivos
  aparecen primero.
- La privacidad de logros ya no depende de la de entrenamientos: «Nadie», «Mis
  amigos» o «Todos». El feed respeta esa regla, incluidos los logros de amigos
  mutuos, y las felicitaciones solo funcionan cuando el logro es visible.
- Migración compatible aplicada en IONOS: añade `achievements_visibility`,
  conserva las preferencias públicas existentes y añade índices/tabla de
  rarezas. No se modificaron ni eliminaron datos de usuarios.
- Verificaciones antes de publicar: sintaxis PHP correcta con el runtime local;
  `npm run typecheck`, pruebas (135 correctas, 2 omitidas), comprobación de
  secretos y `git diff --check` correctos. Lint sin errores; mantiene avisos
  previos no bloqueantes de dependencias de hooks y estilo de arrays.
- Publicación: API y Web transferidas por SFTP tras preflight correcto. Health
  de `https://api.akhyles.com/community/health` devuelve `200`; Web pública
  devuelve `200` y carga `entry-7b4861a0c11ab0f7dc64e360431cc892.js`.
- Android: el código queda listo para la siguiente entrega, pero no se crea una
  revisión competidora de `1.0.14` / `versionCode 16`, que permanece en revisión
  en la prueba cerrada de Play. La siguiente subida deberá usar un versionCode
  superior.

### Ajuste de tiers del mapa corporal — 16 de septiembre de 2026

- Se sustituyó «Semidiós» por `Greek God` en el rango de 900 A-Points. El
  rango anterior de 800 pasa a «Mítico», evitando dos tiers con el mismo nombre.
- Los hitos sociales guardados como `points-900` se traducen ahora al mismo
  nombre que el mapa corporal, por lo que Comunidad, Perfil y Progreso mantienen
  una única escala.
- Verificado con typecheck y 7 pruebas del mapa corporal; Web publicada por
  SFTP tras preflight correcto y comprobada con HTTP `200`.

### Ranking global por ciudades — 16 de septiembre de 2026

- El selector de la pestaña Global sustituye «Mi ciudad» por una lista
  alfabética de ciudades que tienen participantes válidos en el ranking. Mantiene
  también la opción «Toda la comunidad».
- Cada ciudad abre su clasificación propia. Si se consulta una ciudad distinta a
  la del perfil, la app calcula y muestra la posición estimada con los A-Points
  actuales, pero no incorpora a la persona al ranking real: la participación
  oficial continúa siendo exclusivamente en la ciudad configurada en su perfil.
- API PHP: nuevo endpoint autenticado `/ranking/cities`; `/ranking` acepta el
  parámetro `city`, agrupa ciudades sin distinguir mayúsculas ni acentos, y
  conserva los bloqueos y los requisitos de participación.
- Verificaciones: sintaxis PHP, typecheck y 18 pruebas correctas (2 omitidas),
  `git diff --check` sin errores, health API `200` y Web `200`.
- Publicación: API y Web desplegadas por SFTP con preflight. Se detectó que el
  script SFTP no regenera el export Web por sí solo; se ejecutó explícitamente
  `expo export --platform web --output-dir dist` antes de la transferencia final.
  La Web pública carga el bundle `entry-b508ebc8cfaea03884188be43587d690.js`.

### Integridad al cambiar gimnasio o ciudad — 16 de septiembre de 2026

- Corrección aplicada: la API pública ahora persiste `gym_id` junto al nombre y
  ciudad del perfil. Antes el cliente lo enviaba, pero el backend lo descartaba,
  por lo que un cambio de gimnasio podía terminar agrupándose solo por texto.
- Al escoger un gimnasio registrado, API toma como canónicos su nombre y ciudad;
  no permite combinar un `gymId` con una ciudad o nombre manipulados. Al editar
  manualmente el gimnasio o la ciudad, se borra esa asociación y no queda un
  gimnasio antiguo vinculado por error.
- El ranking «Mi gym» prioriza ahora el identificador estable del gimnasio; para
  perfiles antiguos sin identificador conserva el agrupamiento normalizado por
  nombre. Las ciudades mantienen agrupación sin diferencias de mayúsculas o
  acentos.
- La interfaz actualiza siempre la ciudad al elegir un gimnasio de los
  resultados, evitando conservar la ciudad anterior por accidente.
- Migración segura de `gym_id` publicada en API. Verificaciones: sintaxis PHP,
  typecheck, 18 pruebas correctas (2 omitidas), comprobación de diff, health API
  `200` y Web `200`. Bundle público: `entry-0169a79978ec83afa77f1dfd9dfd4c54.js`.

### Rareza inicial de logros — 16 de septiembre de 2026

- Se retiró el tier y el texto «Provisional · Muestra en crecimiento». Mientras
  la base estadística no alcanza 100 cuentas elegibles, cada logro recibe una
  rareza inicial razonada por su dificultad: primeros hitos comunes, constancia
  y PR acumulados poco comunes/raros, y grandes hitos épicos o legendarios.
- La regla es idéntica en cliente y API, incluidos los logros locales sin
  conexión. Cuando haya muestra sólida, el porcentaje real vuelve a gobernar el
  tier y se muestra junto a su etiqueta.
- Verificación: sintaxis PHP, typecheck y 9 pruebas correctas. API `200` y Web
  `200` tras el despliegue; bundle `entry-37f54f3eecb4c6729217d3d791510bda.js`.

### Recurso visual de portada — 16 de septiembre de 2026

- Se añadió `assets/web/akhyles-hero-statue-v1.png` como recurso de portada:
  estatua clásica en gris, con fondo oscuro de verde bosque y salvia y espacio
  seguro para el titular en el lado izquierdo.
- La imagen original de Descargas no se ha modificado. La versión de Akhyles se
  mantiene como archivo independiente y se documenta como hero principal para
  la siguiente actualización de la Web; la imagen previa de maquinaria queda
  disponible como alternativa.

### Emblemas de logros — 16 de septiembre de 2026

- Se crea `assets/achievements/` con emblemas transparentes de oro, azul marino y acento turquesa: Primer paso, marca personal, constancia, ascenso de tier y progreso equilibrado.
- Atlas queda reservado al PR de press vertical; no se fuerza la referencia en ejercicios donde no encaja.
- Un resolvedor central asigna el mismo emblema a los logros locales y a los de Comunidad. Los hitos repetibles reciben una placa de cifra legible, sin duplicar imágenes ni incrustar texto.
- La colección personal y el feed de Comunidad muestran ya estos emblemas.

### Mapa corporal adaptable — 16 de septiembre de 2026

- En anchos inferiores a 620 px el mapa muestra una anatomía cada vez con el selector Frontal/Posterior. Antes mantenía dos figuras hasta 340 px y las comprimía en la mayoría de móviles.
- La escala móvil deja de intentar encajar los once tiers, sus nombres y rangos en una sola fila: ahora es una franja limpia de rojo a morado, con Base y Greek God como extremos. Al seleccionar un músculo se mantiene el tier y la puntuación exactos.
- Se suavizaron los degradados y contornos de los músculos para eliminar el aspecto de zonas cortadas o manchadas, sin alterar el espectro, las puntuaciones ni los tiers.
- Verificación: `npm.cmd run typecheck` y 136 pruebas activas correctas (2 omitidas).

### Buscar y añadir amistades desde Comunidad — 16 de septiembre de 2026

- Se expone la pestaña `Personas` directamente en Comunidad. Las llamadas “Encontrar personas” del ranking abren esa pestaña en vez de desviar al perfil local.
- La búsqueda mantiene el @ como vía principal y los resultados incluyen `Seguir` o `Conectar` en la propia lista; ya no hace falta abrir cada perfil para completar la acción. El perfil sigue disponible al tocar la fila.
- Se corrigió la API PHP de producción: ahora incluye `/profiles?q=` y `/connections`, rutas que el cliente ya usaba y que antes respondían “Ruta de Comunidad no disponible”. También se corrigió la consulta de “siguiendo” para devolver realmente los perfiles seguidos.
- La API Node acepta búsqueda por @ o nombre como mejora equivalente. Verificación local: typecheck y 136 pruebas activas correctas; la sintaxis PHP queda pendiente de validación en el servidor porque PHP no está instalado en este equipo.

### Auditoría de entrega Web + API IONOS — 16 de septiembre de 2026 — 1.0.14

- No se publicó ningún destino. La regla de entrega atómica bloqueó correctamente la Web antes de generar o transferir un export: la Web actual consume rutas que no están implementadas en `server-php/src/Community.php`.
- Rutas detectadas sin paridad PHP completa: catálogo y sugerencias de marcas de máquina (`/machine-brands`), propuestas de ejercicios (`/exercise-proposals`), perfiles/reseñas profesionales (`/profiles/{id}/trainer`, `/profiles/{id}/reviews`, `/me/trainer-profile`) y parte de la gestión avanzada de colaboración (`/coaching/progress/me`, consentimiento y rutina por relación). Publicar la Web con esas llamadas habría dejado funciones en error o “Ruta de Comunidad no disponible”.
- Sí se verificó que la corrección de amistades tiene su base PHP: `/profiles?q=`, `/connections` y la consulta de `following` fueron añadidas localmente, con filtros de bloqueo y perfil público. No se transfirieron por la paridad global incompleta.
- Verificaciones locales: `npm.cmd run check` correcto (typecheck, 136 pruebas activas correctas, secreto limpio); lint sin errores y 5 avisos heredados. `git diff --check` correcto. PHP no está instalado en este equipo, por lo que no fue posible ejecutar `php -l`.
- Preflight SFTP de solo lectura correcto para API y Web, con credencial y host key verificadas por el script. API pública `https://api.akhyles.com/community/health`: HTTP 200, `{"service":"akhyles-community","ok":true,"identity":"akhyles-account"}`. Web pública: HTTP 200. Preflight CORS `OPTIONS /community/profiles?q=test` desde `https://app.akhyles.com`: HTTP 204 y `Access-Control-Allow-Origin: https://app.akhyles.com`.
- Pendiente antes de una publicación conjunta: completar o retirar las llamadas Web sin backend PHP, añadir sus migraciones a `schema.sql`, validar sintaxis PHP y repetir export de producción, transferencia API, health/CORS/rutas autenticadas y transferencia Web con `index.html` al final.

### Paridad PHP ampliada antes de publicación — 16 de septiembre de 2026

- Se añadieron migraciones automáticas y equivalentes en `schema.sql` para catálogo de marcas por gimnasio, propuestas de ejercicios, perfiles profesionales y reseñas verificadas.
- Se implementaron sus rutas PHP: `GET/POST /machine-brands`, `POST /exercise-proposals`, `PUT /me/trainer-profile`, `GET /profiles/{id}/trainer` y `GET/PUT /profiles/{id}/reviews`, con límites de datos, visibilidad de perfil profesional y escritura restringida al usuario autenticado.
- Verificación posterior: typecheck y 136 pruebas activas correctas; `git diff --check` correcto. PHP sigue sin estar instalado localmente, por lo que `php -l` y la prueba de estas rutas con un servidor local quedan pendientes. No se realizó despliegue mientras persistan rutas avanzadas de colaboración sin paridad PHP completa.

### Entrega conjunta Web + API IONOS — 16 de septiembre de 2026, 17:37 CEST — 1.0.14

- Se completó la paridad de las funciones de Comunidad usadas por la Web antes de publicar: marcas de máquina, propuestas de ejercicios, perfil profesional, reseñas, consentimiento explícito de estadísticas de progreso y actualización agregada de progreso para colaboraciones activas.
- Se añadieron a `schema.sql` las tablas `community_machine_brands`, `community_exercise_proposals`, `community_trainer_profiles`, `community_trainer_reviews`, `community_coaching_stats_consent` y `community_coaching_progress`. Las rutas también crean las tablas de colaboración de forma segura al primer uso para instalaciones existentes. Las marcas sin gimnasio usan una clave vacía estable, evitando claves primarias nulas.
- Se endureció la privacidad: una reseña profesional solo la puede publicar un cliente con una colaboración activa con ese entrenador; las estadísticas solo se distribuyen a entrenadores activos con consentimiento explícito.
- Verificaciones locales correctas: `npm.cmd run typecheck`, 136 pruebas activas correctas (2 omitidas) y `git diff --check`. PHP no está instalado en este equipo, por lo que no fue posible ejecutar `php -l`; la carga de producción y el healthcheck posterior confirmaron que el archivo PHP publicado arranca sin error.
- API publicada primero por el procedimiento SFTP autorizado, tras preflight correcto de credencial, host key, usuario y destino. Se transfirieron exclusivamente `schema.sql` y `src/Community.php`. `https://api.akhyles.com/community/health` devolvió HTTP 200; `OPTIONS /community/machine-brands` desde `https://app.akhyles.com` devolvió 204 con CORS correcto; las rutas autenticadas probadas sin token devolvieron 401 controlado.
- Web exportada con `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com` y `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com/community`. El preflight SFTP de Web fue correcto y se transfirió `dist`, dejando `index.html` para el final. Web pública HTTP 200 y bundle servido verificado contra el export: `entry-da007568ae41206e1759c0fd17fe9b15.js` (1.920.120 bytes).
- Prueba en navegador real: Entrenamiento y Comunidad cargan; Ranking de Amigos muestra la clasificación y no aparece «Ruta de Comunidad no disponible». No se detectaron errores de consola. El resto de secciones se mantiene bajo las mismas rutas y el bundle verificado.
- Estado final: API y Web publicadas conjuntamente y operativas. No se modificó Android ni Google Play en esta entrega.
- Actualización posterior: Android 1.0.15 / versionCode 17 fue enviada a Prueba cerrada Alpha. Envío 8, registrado el 16 de septiembre de 2026 a las 17:50 CEST, aparece en Play como «En revisión». AAB SHA-256 `734dfaec86b9eb23d76486436bc32e8cea5c354d81fc2cc7ed9e740ff7b3052c`; firma SHA-1 `040ea0afd797f22730198cdb4295c4763ab86ab7`. Advertencia pendiente no bloqueante: falta desofuscación R8/ProGuard, no aplicable a esta build.
- Corrección de procedimiento: el script de SFTP ordenaba por nombre los dos archivos finales y podía transferir `metadata.json` después de `index.html`. Se corrigió para dejar `metadata.json` penúltimo e `index.html` estrictamente último; se repitió el despliegue Web con preflight correcto y verificación HTTP 200.

### Entrega conjunta Web + API IONOS — 17 de septiembre de 2026, 11:52 CEST — 1.0.15

- Alcance publicado: ajustes de entrenamiento y calendario, progreso semanal, sustitución de ejercicio limitada a la sesión activa, progresión por primera serie (objetivo 3 %, tope 5 %), peso por lado, incremento de carga editable y los recursos de Comunidad, logros, notificaciones y marcas de máquina usados por la Web.
- API: se publicaron exclusivamente `schema.sql` y `src/Community.php`, tras comprobar la paridad de los endpoints de la Web. `schema.sql` incluye las tablas de logros, preferencias de notificaciones, marcas, propuestas, perfiles/reseñas profesionales y colaboración; la migración de avatar ejecutada por el servicio amplía `community_profiles.avatar` a `MEDIUMTEXT` de forma compatible con datos existentes.
- Verificaciones locales: `npm.cmd run check` ejecutado sin errores (typecheck, tests y comprobación de secretos; lint con 5 avisos heredados), `git diff --check` correcto y `php -l` correcto para `server-php/src/Community.php` y `server-php/bootstrap.php` mediante `artifacts/tools/php/php.exe`.
- SFTP: preflight de lectura correcto en API y Web, con host `home508084090.1and1-data.host`, clave de host verificada, usuarios y destinos privados esperados. La API se publicó antes de la Web. El export Web se generó con `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com` y `EXPO_PUBLIC_COMMUNITY_URL=https://api.akhyles.com/community`; SFTP transfirió recursos y JavaScript, después `metadata.json` y finalmente `index.html`.
- Bundle publicado: `_expo/static/js/web/entry-39b255e1b725f447390d93a950d119bb.js`, SHA-256 local `E34AF5A9B5DC007EF8856385C26AA6C4FBA3A1A4329318FC82CCFB49D45483D8`. El bundle servido por `https://app.akhyles.com/` coincide exactamente con el export local.
- Producción: `GET https://api.akhyles.com/community/health` devolvió 200; CORS desde `https://app.akhyles.com` correcto; OPTIONS de logros, preferencias de notificaciones, marcas y rarezas devolvieron 204; GET no autenticado de rutas protegidas devolvió 401 controlado, sin 404/503. No apareció «Ruta de Comunidad no disponible».
- Navegador: Web abierta en una pestaña nueva. Entrenamiento, Comunidad/Ranking, Logros, Perfil, Cuenta y Notificaciones cargaron correctamente; Ranking y feed de Logros obtuvieron datos reales de la API. Estado final: Web y API publicadas y verificadas conjuntamente.

### Preparación Android en Google Play — 17 de septiembre de 2026, 12:05 CEST — 1.0.16 / versionCode 18

- Se incrementaron coordinadamente `app.config.ts`, `package.json`, `package-lock.json` y la documentación desde 1.0.15 / 17 a 1.0.16 / 18. El versionCode 18 no estaba usado.
- Verificaciones previas correctas: `npm.cmd run typecheck`, `npm.cmd run check`, `git diff --check`, salud pública de API, CORS/rutas autenticadas controladas y comprobación de secretos. Lint mantiene 5 avisos heredados, sin errores.
- Build: `scripts/build-android.ps1` con AAB, firma existente y URLs `https://api.akhyles.com` y `https://api.akhyles.com/community`. `scripts/verify-android.mjs` correcto; paquete, versión, versionCode, certificado y permisos validados.
- Artefacto: `artifacts/android/akhyles-release.aab`, 64.286.883 bytes, SHA-256 `DCC7C70AFE0F9A42B0046B1F09BDB379A447FB518BE84DAF04C46952DF4651C4`; certificado SHA-1 `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Inspección del AAB: configuración pública correcta, sin localhost/secretos, cleartext desactivado, backup desactivado y sin permisos sensibles no requeridos.
- Play Console: aplicación Akhyles y pista Prueba cerrada Alpha confirmadas. Se creó la versión 9, se subió únicamente el AAB nuevo y Play reconoce `18 (1.0.16)`. Nombre: `Perfil y comunidad 1.0.16`; notas en es-ES solo de cambios incluidos.
- Revisión Play: 0 errores bloqueantes; advertencia no bloqueante por falta de archivo de desofuscación (no aplicable al no usar R8/ProGuard). Compatibilidad: 8.786 teléfonos y 4.692 tablets; descarga nueva estimada 41,2 MB.
- Resultado: tras la confirmación explícita del usuario, se pulsó “Enviar cambios a revisión”. Play registró el envío 9 el 17 de septiembre de 2026 a las 12:09 CEST y muestra **En revisión** en Prueba cerrada Alpha. Producción no iniciada; queda pendiente la revisión de Google.

### Corrección de sincronización Web/API — 17 de septiembre de 2026, 12:17 CEST

- Diagnóstico reproducido en la Web: el estado mostraba “Guardado local; sincronización pendiente” y el error oculto “La copia contiene campos de dispositivo o sesión”.
- Causa: el cliente ya enviaba `achievements` dentro de `cloudState`, pero `server-php/src/Accounts.php` no lo contemplaba en la lista de campos permitidos de `/sync`; cada PUT devolvía HTTP 400.
- Solución: se añadió `achievements` a la allowlist y se incorporó validación de formato, límites y categorías. Se actualizó `scripts/deploy-ionos.ps1` para permitir y transferir `src/Accounts.php` junto con `schema.sql` y `src/Community.php`.
- Verificaciones: PHP sin errores de sintaxis, `npm.cmd run check` correcto (136 pruebas, 2 omitidas, 5 avisos lint heredados, secretos limpios), preflight SFTP correcto y health API HTTP 200.
- Despliegue: API publicada mediante el procedimiento autorizado; `Accounts.php` transferido correctamente.
- Prueba real: “Sincronizar ahora” en `https://app.akhyles.com/account` aceptó la copia y mostró “Guardado en el dispositivo y en la nube”, última copia confirmada 17/09/2026 12:16:10. Los pesos por lado quedan incluidos en el historial sincronizado.

### Corrección Android de SQLITE_FULL — 17 de septiembre de 2026, 12:29 CEST — 1.0.17 / versionCode 19

- Causa confirmada: AsyncStorage Android usa SQLite con límite compilado de 6 MB; la aplicación guarda el historial completo y copias de recuperación de conflictos, por lo que podía devolver `database or disk is full (code 13 SQLITE_FULL)`.
- Solución: `android/gradle.properties` fija `AsyncStorage_db_size_in_MB=50`; `src/storage/repository.ts` conserva solo las cuatro copias de recuperación más recientes antes de crear otra, sin borrar la copia principal ni el historial.
- Verificaciones: typecheck correcto, 50 pruebas de lógica correctas, PHP sin errores de sintaxis y `git diff --check` correcto. Build Android correcta con firma existente y URLs públicas de producción.
- AAB: `artifacts/android/akhyles-release.aab`, 64.287.147 bytes, SHA-256 `09AE440F10A3AA6784688BC9790A747C56D55ED97A307368936C4A81B6992B67`; SHA-1 `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Play Console: se creó la versión 10 en Prueba cerrada Alpha y se subió únicamente el AAB nuevo. Play reconoce `19 (1.0.17)`, con 0 errores bloqueantes y una advertencia no bloqueante de desofuscación.
- Estado final: borrador guardado en revisión, **no enviado todavía**. Pendiente confirmación explícita del usuario para “Enviar cambios a revisión”. Producción no iniciada.

### Envío Android corregido a revisión — 17 de septiembre de 2026, 12:33 CEST

- Play Console registró el **envío 10** de `1.0.17` / `versionCode 19` en **Prueba cerrada Alpha** con estado **En revisión**.
- El envío 9 (`1.0.16`) quedó **Cancelado** porque el usuario confirmó reiniciar la revisión para incluir la corrección de `SQLITE_FULL`.
- AAB enviado: `artifacts/android/akhyles-release.aab`; SHA-256 `09AE440F10A3AA6784688BC9790A747C56D55ED97A307368936C4A81B6992B67`; SHA-1 `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Advertencia no bloqueante: no se adjuntó archivo de desofuscación; la build no usa R8/ProGuard. Producción no iniciada; queda pendiente la revisión de Google.

### Recuperación cloud y limpieza de `CursorWindow` — 17 de septiembre de 2026, 12:50 CEST — 1.0.18 / versionCode 20

- Solución: las recuperaciones se leen y restauran desde el historial cifrado de `/sync/versions`, que conserva hasta 20 revisiones en la nube; ya no se guardan estados completos en AsyncStorage.
- Migración: al iniciar la app se eliminan únicamente las claves legacy `akhyles:archive:*`, sin leer sus valores y sin tocar el estado principal, entrenamientos, pesos ni logros. Esto evita que `CursorWindow` falle al intentar leer una fila antigua demasiado grande.
- Verificaciones: `npm.cmd run check` correcto (136 pruebas activas, 2 omitidas, 5 avisos lint heredados), `git diff --check` correcto y `verify-android.mjs` correcto con APK y AAB. PHP no está instalado localmente.
- AAB: `artifacts/android/akhyles-release.aab`, 64.287.894 bytes, SHA-256 `7702ADF256E4C1405C9035C8AE5431BFD89F7D46F8DD6910EA5B6C70AD34C50C`; SHA-1 `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Play Console: borrador de versión 11 en **Prueba cerrada Alpha**, reconocido como `20 (1.0.18)`. Revisión técnica con 0 errores bloqueantes; advertencia no bloqueante de desofuscación. Aún no enviado a revisión y Producción no iniciada.

### Envío de recuperación cloud a revisión — 17 de septiembre de 2026, 12:51 CEST

- Play Console registró el **envío 11** de `1.0.18` / `versionCode 20` en **Prueba cerrada Alpha** con estado **En revisión**.
- El envío 10 (`1.0.17`) quedó **Cancelado** al reiniciar la revisión para incluir esta corrección. Producción no iniciada.
- La advertencia no bloqueante sigue siendo la ausencia de archivo de desofuscación; la build no usa R8/ProGuard.
- Tarea futura, no incluida en esta entrega: valorar la generación y subida del archivo de desofuscación R8/ProGuard para facilitar el análisis de errores y ANR en próximas versiones.

### Entrega Web + Android — 17 de septiembre de 2026

- Web publicada y verificada en `https://app.akhyles.com/` con los ajustes de peso y repeticiones por lado, referencias de fuerza persistentes, logros simbólicos y privacidad/comunidad actualizadas.
- Android `1.0.23` / `versionCode 25` cargado en Prueba cerrada Alpha y enviado a revisión de Google Play. El envío queda **En revisión**; Producción no iniciada.
- AAB enviado: `android/app/build/outputs/bundle/release/app-release.aab`; SHA-256 `CBA681241626B1AD5101296BDE063C2744EC57EB9E427CABB44514040FDC9C1E`; firma SHA-1 `04:0E:A0:AF:D7:97:F2:27:30:19:8C:DB:42:95:C4:76:3A:B8:6A:B7`.
- Git actualizado en `main`: `424c5af chore: bump Android release to 1.0.23` (incluye `8ed0879 fix: unify community achievements and side load scoring`).

### CorrecciÃ³n de pesos distintos por lado â€” 17 de septiembre de 2026

- Causa: la opciÃ³n Â«Peso diferente por ladoÂ» se mostraba cuando el ejercicio estaba en modo Â«TotalÂ», porque la condiciÃ³n estaba invertida. AdemÃ¡s, al cambiar desde Â«Por ladoÂ» a Â«TotalÂ» se conservaban campos izquierdo/derecho y podÃ­an reaparecer en la ediciÃ³n.
- SoluciÃ³n: la ediciÃ³n por lados queda limitada al modo Â«Por ladoÂ»; al volver a Â«TotalÂ» se limpian los valores laterales y se guarda solo la carga total. Las sesiones histÃ³ricas detectan sus datos laterales y se reabren en el modo correcto, por lo que siguen siendo editables sin perder marcas.
- TambiÃ©n se corrigiÃ³ la resoluciÃ³n de preferencias de carga por ejercicio al iniciar o reabrir un entrenamiento.
- Verificaciones: typecheck correcto, 147 pruebas unitarias correctas (2 omitidas), ESLint de archivos modificados correcto y `git diff --check` correcto. La E2E de Playwright no terminÃ³ al arrancar el entorno web y se detuvo sin errores de aplicaciÃ³n.
- Web: exportada con las URLs de producciÃ³n, publicada por SFTP tras preflight correcto y verificada con HTTP 200. Bundle servido: `entry-4f8e819869331f00347bc0cc010016cd.js`.
- Git: commit `09b5d872878b0469e1aaf380d6e6bd32a16ff6d0` subido a `main`.

### Progresión proporcional y sincronización de futuras sesiones — 18 de septiembre de 2026

- Se cambió la progresión para calcular una subida proporcional del 3 % sobre la carga total realmente registrada, también en ejercicios por lado y cargas pequeñas. Se eliminó la dependencia del incremento disponible.
- Se amplió el soporte de decimales y se conserva el modo total/por lado al editar sesiones históricas.
- Se añadió la actualización de copias futuras del calendario y de versiones futuras de la rutina cuando se recalcula una sesión pasada.
- **Pendiente/no confirmado como resuelto:** el usuario sigue observando que el peso del lunes siguiente no se actualiza al editar el lunes anterior. La corrección no debe considerarse cerrada hasta reproducirlo y verificarlo en la Web con sus datos reales.
- Verificaciones locales: typecheck correcto; 155 pruebas correctas, 2 omitidas y 0 fallos.
- Google Play: **no estÃ¡ actualizado con esta correcciÃ³n**. La versiÃ³n `1.0.24` / `versionCode 27` enviada a Prueba cerrada Alpha contiene el estado anterior y sigue en revisiÃ³n; para incluir este arreglo Android harÃ¡ falta una nueva build con un `versionCode` superior.

### Progresión histórica corregida en local — 18 de septiembre de 2026

- Causa confirmada: al corregir un entrenamiento anterior se actualizaba la rutina viva, pero el calendario de la semana siguiente seguía leyendo una instantánea antigua de `routineVersions`. En los registros por lado existía además riesgo de reinterpretar un total ya normalizado y aparentar el doble de carga.
- Solución: la carga por lado se normaliza una sola vez; se recupera el incremento real configurado del equipo y solo se acepta si queda entre el 3 % y el 5 %. La carga preparada se redondea a cuartos de kilo (`X`, `X,25`, `X,50`, `X,75`); si ningún incremento disponible cabe en el margen, se conserva el peso.
- Al guardar una corrección histórica se crea un límite de rutina desde el día siguiente: el entrenamiento corregido conserva su peso histórico y la siguiente sesión semanal recibe la nueva carga. Ejemplo verificado: 35 kg pasan a 36,25 kg, no a 70 kg ni a 36,05 kg.
- Pruebas locales: TypeScript correcto, ESLint correcto en los archivos modificados, 156 pruebas correctas y 2 omitidas, revisión de secretos y `git diff --check` correctos. La comprobación global de ESLint sigue bloqueada por el bundle generado preexistente `dist-verify`, ajeno al cambio.
- Estado de entrega: corrección implementada en el árbol local; aún no se ha publicado una nueva Web ni una nueva build Android con este arreglo.

### Entrega de progresión histórica corregida — 18 de septiembre de 2026

- Web publicada y verificada en `https://app.akhyles.com/`. El bundle público coincide byte a byte con el export local: `entry-7cd0c0121241411cad13c2f173515fd6.js`, SHA-256 `3FF1A53C82B068DE6EDEEA1117AF6CB82E727F3526153C2296857FC6C63867F1`.
- Android generado como `1.0.25` / `versionCode 28`, con firma existente verificada. APK SHA-256 `989614C1FFA5E3C2C0BD0B16E01F8256C60EB0261E0E3C102B9A2CE229675284`; AAB SHA-256 `9FE79DDB8FB0979A6668C7847109F04E3BDE3A4A0C8E6219DED87046135E8251`.
- Play Console: AAB cargado en Prueba cerrada Alpha, notas de versión añadidas y **1 cambio enviado a revisión**. La revisión está pendiente; Producción no iniciada.
- Git: commit `b96d01a fix: correct historical weight progression` subido a `main`; este registro documenta la publicación completa.

### Incidencia de inicio de sesión y sincronización en Android — 18 de septiembre de 2026

- Síntoma observado en el dispositivo con la versión anterior: al entrar con Google aparecía `Invalid stored collections` (referido inicialmente como `Invalid stored conections`), la cuenta no quedaba reconocida y la app continuaba en modo local. La web seguía funcionando correctamente.
- Causa: el estado persistido en AsyncStorage no superaba `validStoredCollections`. `StoreProvider` dejaba el almacenamiento bloqueado al capturar la excepción; posteriormente `AccountProvider` no podía guardar la sesión y omitía la sincronización cuando existía `storageError`.
- Solución aplicada en local: `localRepository.load()` conserva el payload incompatible bajo una clave de recuperación, retira únicamente la ranura primaria y permite hidratar un estado limpio. Así el inicio de sesión puede continuar y la copia cloud se descarga automáticamente; no se borra silenciosamente el payload original.
- Limitación: si había entrenamientos locales que nunca llegaron a la nube, el payload de recuperación se conserva técnicamente pero no se fusiona automáticamente con la copia cloud. Debe validarse si hace falta una herramienta de restauración o una migración parcial.
- Verificación: typecheck correcto, ESLint del repositorio afectado correcto y 156 tests correctos (2 omitidos). La corrección está incluida en la nueva Android `1.0.25` / `versionCode 28`, enviada a revisión Alpha; el dispositivo seguirá afectado hasta instalar esa versión.

### Resolución cloud del error `Invalid stored collections` — 18 de septiembre de 2026

- La misma excepción aparecía también en la Web porque el estado remoto llegaba desde PHP con mapas vacíos serializados como `[]`; el validador del cliente exige objetos (`{}`) para esos diccionarios.
- Solución definitiva: el cliente normaliza mapas vacíos durante la lectura y la API PHP normaliza también `apparatusWeights`, `machineBrands` y `loadModes` antes de devolver o guardar una copia.
- API publicada y verificada en `https://api.akhyles.com/community/health`; Web republicada con el bundle `entry-4068f3e80fbc3ead7c22037fa2d7f5bc.js` y verificada con hash coincidente.
- Verificación manual: tras recargar la Web, la sincronización terminó en **Guardado en el dispositivo y en la nube**. El móvil con la versión anterior también vuelve a acceder y sincronizar, por lo que no se genera otra build ni se modifica el envío de Play.
- La build Android provisional se detuvo antes de completarse; no se instaló ni se publicó ningún cambio Android adicional.

#### Medidas para evitar regresiones

- Todo campo diccionario del estado cloud debe conservar forma de objeto JSON, también cuando esté vacío; en PHP se debe aplicar `normalizeState` a cada mapa nuevo antes de responder o persistir.
- Cada nuevo campo de preferencias o sesión debe añadirse simultáneamente al normalizador PHP, a la reparación del lector cliente y a una prueba de round-trip cliente↔API.
- Antes de publicar una actualización, ejecutar una cuenta con copia cloud existente y verificar: inicio de sesión, descarga de copia, estado **Guardado en el dispositivo y en la nube** y recarga completa de la Web.
- No asumir que una build Android nueva es necesaria hasta comprobar primero la compatibilidad de la API y del estado remoto; una regresión de serialización puede afectar a versiones antiguas ya instaladas.

### Normalización de cargas por lado en poleas — 21 de septiembre de 2026

- Causa confirmada: el modo «Por lado» multiplicaba siempre la carga por dos. En poleas de una sola torre, como Extensión Tríceps, 15 kg se guardaban y puntuaban como 30 kg; además, varios resúmenes mostraban directamente ese total interno.
- Solución: las poleas de una sola carga conservan el valor real indicado por la torre aunque se registren ambos brazos. Los cruces con dos torres independientes y los discos introducidos por lado mantienen la suma bilateral.
- Migración idempotente `loadNormalizationVersion: 2`: corrige preferencias, rutina actual, versiones históricas de rutina, entrenamientos planificados, historial y sesión activa. La marca también viaja con la copia cloud para impedir una segunda división al restaurar o sincronizar.
- Se actualizaron A-Points, progresión, volumen, tendencias, logros, comparaciones, historial, gráficas y datos compartidos para usar la semántica correcta de cada ejercicio.
- Verificación real en Web: Extensión Tríceps pasó de 30 kg a 15 kg por lado; la puntuación y el volumen se recalcularon con la carga corregida y la cuenta terminó en «Copia sincronizada».
- Verificaciones locales: TypeScript correcto; 96 pruebas relevantes correctas. Permanecen 2 fallos heredados y ajenos sobre exclusión/duplicados de puntuación (`1 !== 0`). Web publicada y verificada en `https://app.akhyles.com/`. Google Play continúa pausado.

### Materiales del mapa, pestañas verdes y nuevo oro raíz — 21 de septiembre de 2026

- Se eliminaron del mapa corporal los patrones repetidos de 36×36 px y las líneas horizontales que producían un aspecto de barras y cuadrados.
- Los materiales ahora usan superficies continuas: vetas curvas y luces suaves en piedra y mármoles, reflejos diagonales orgánicos en bronce, plata y oro, y grietas ramificadas doradas exclusivamente en Semidiós.
- La escala de A-Points deja de presentarse como una barra segmentada y utiliza muestras circulares con el mismo material que el cuerpo, siguiendo la referencia visual aprobada.
- `#C39850` pasa a ser el color raíz de todo el dorado de Akhyles. Los brillos (`#EED49C`) y sombras (`#725025`) derivan de esa familia y se aplican a acciones, iconos, bordes, oro Olimpian y kintsugi.
- Las pestañas de «Tu semana» se aproximan a la referencia: selección esmeralda luminosa con brillo interior, borde verde fino y un detalle dorado lateral; los días inactivos permanecen oscuros y discretos.
- Verificación: TypeScript correcto, exportación Web correcta y comprobación visual tanto local como en producción con datos reales y copia cloud sincronizada. Publicado en `https://app.akhyles.com/`. Google Play continúa pausado.
- Ajuste posterior del oro: se retiraron la franja blanca y el contraste excesivo del acabado general. Los controles dorados usan ahora un degradado satinado y suave alrededor de `#C39850`, como en la referencia; el brillo metálico marcado queda reservado al material Oro del mapa.
- Cierre visual aprobado: «Editar mi rutina» pasa a ser una acción primaria dorada compacta con ese mismo acabado satinado. Quedan consolidados como criterio vigente el oro raíz `#C39850`, las selecciones semanales esmeralda luminosas y los materiales orgánicos del mapa sin patrones de barras o cuadrículas. TypeScript y exportación Web correctos; versión publicada y verificada en `https://app.akhyles.com/`.
-
### ActualizaciÃ³n de Google Play con protocolo de pruebas cerradas â€” 21 de septiembre de 2026

- Se generÃ³ el AAB firmado de Android `1.0.28` / `versionCode 31` con la configuraciÃ³n de producciÃ³n y `EXPO_PUBLIC_ACCOUNT_URL=https://api.akhyles.com`.
- ValidaciÃ³n del artefacto correcta: firma esperada, manifest seguro, `versionCode` 31 y sin permisos prohibidos. SHA-256 AAB: `33CB9FEDA7CEF559B15005364BE37051EB19BF9ACD241DBFC556ED2137841F83`.
- Se subiÃ³ a **Prueba cerrada Alpha**, se completaron nombre y notas `es-ES`, y se guardÃ³ la versiÃ³n en el Resumen de publicaciÃ³n.
- Se enviÃ³ 1 cambio a revisiÃ³n de Google Play. Estado visible: **Cambios en revisiÃ³n**. No se iniciÃ³ ProducciÃ³n.
- Comprobaciones locales: `npm run typecheck` correcto; las pruebas mantienen fallos heredados del entorno/repositorio (no bloquean la carga del AAB): transformaciÃ³n React Native de `cloud.test.ts` y tres expectativas antiguas de puntuaciÃ³n/sesiones.
-
### Web deployment: previous-session reference under first set - 2026-09-21

- Exported the production Web bundle with `https://api.akhyles.com` and `https://api.akhyles.com/community`.
- SFTP read-only preflight passed and the bundle was published to `https://app.akhyles.com/`.
- The first set now shows a compact `Anterior sesión` reference with the previous session's load and repetitions. It respects total/per-side input and only appears on Set 1.
- Verified HTTP 200, the remote bundle contains `Anterior sesi` and `api.akhyles.com`.

### Cloud sync API compatibility fix - 2026-09-21

- Cause identified: the Web client includes `loadNormalizationVersion` in the cloud-safe state, but the API `/sync` allowlist did not accept that field and returned HTTP 400: `La copia contiene campos de dispositivo o sesion.`
- Added the field to `server-php/src/Accounts.php`; PHP lint passed.
- Published the API after the mandatory SFTP preflight and verified the production health endpoint.
- Verified from the production Web app: manual sync completes and the account shows `Guardado en el dispositivo y en la nube`.

### Weekly weight reminder and trapezius shrug catalog - 2026-09-21

- The weekly weight notification is now scheduled for Wednesdays at 08:00 (local device time) instead of Mondays at 18:00.
- Updated the notification settings copy to match the new schedule.
- Added three Tier A back exercises: Smith machine shrug, barbell shrug and dumbbell shrug. Each has equipment imagery mapping and a strength reference so it participates consistently in suggestions, progress and scoring.
- Exported and published the Web bundle with these changes at `https://app.akhyles.com/`; production API URL and the new shrug catalog entries were verified in the remote bundle.

### Mobile visual polish for day tiles and gold controls - 2026-09-21

- Fixed responsive SVG surfaces for selected routine-day tiles by adding an explicit non-distorting viewBox, preventing partial fills and clipped-looking corners on mobile.
- Removed the external highlight shadow from primary gold buttons and selected day controls; borders now stay within the component and use the root gold tone for a cleaner finish.

### Larger mobile launch logo - 2026-09-21

- Increased the Expo splash-screen logo width from 180 to 260 so the mark is visibly larger before the mobile app opens.
- The logo asset, app icon and adaptive icon remain unchanged.

### Foundation for incremental cloud sync - 2026-09-21

- Began the safe, additive migration away from a single full-state sync payload. Existing local and cloud copies remain compatible and untouched.
- Added the Sync V2 entity model: a small account document, one atomic entity per completed workout, and one entity per body-weight measurement. Rebuilding those entities preserves the existing AppState and therefore all training and A-Points calculations.
- Added encrypted server-side V2 entity storage, per-user change cursors, and idempotent operation identifiers. A repeated network request cannot write a workout twice.
- Added a separate durable Sync V2 outbox foundation instead of placing pending network work inside the user state.
- Cloud sync no longer stops solely because local browser/device persistence reported an error: for authenticated users it can still store the in-memory completed workout in the cloud, allowing recovery at the next launch.
- Included strength references in the private cloud allowlist and validation; they are now covered by the same backup path as workout history.
- Verification: TypeScript passed and the dedicated Sync V2 entity tests passed. PHP CLI is not installed in this workstation shell, so PHP integration tests must be run in the deployment/CI environment before publishing the API.

### Controlled Sync V2 operations and release protocol - 2026-09-21

- Sync V2 is now disabled by default and can only be enabled or disabled for an individual test account with the server CLI. Its batch endpoint rejects accounts that are not explicitly enabled.
- Added a per-account migration manifest: entity counts plus a deterministic SHA-256 content hash. A migration is not marked verified unless the client and server manifests match.
- Added a privacy-safe operational report for enabled versus verified accounts and retained Sync V2 changes. Its non-zero exit status can feed the hosting alert when an enabled account is not verified.
- Expanded encrypted database backups to include every `account_sync_*` table while retaining restore compatibility with earlier backup format 1.
- Added `docs/PROTOCOLO-RELEASE.md` and linked it from the IONOS and Play documents. It requires backup verification, account-scoped rollout, API-before-Web ordering, Alpha-only Android delivery and documented rollback.

### Continuous release safeguards - 2026-09-21

- Added `npm run release:doctor -- web|android|api`: a release gate that validates TypeScript, aligned app versions/versionCode and target-specific prerequisites before publishing.
- Added `npm run monitor:sync`: a two-session synthetic account canary. With credentials provided only through the scheduled-task secrets, it writes a minimal isolated workout, verifies that a second session receives it, then removes it.
- Added privacy-safe aggregate operational metrics for sync failures, conflicts, local-storage failures and Sync V2 operations. No email, token, workout, load or error text is stored in the metric rows.
- Added the production procedure for daily canary execution, alerting on failure, staging isolation, and the requirement that staging never share production data or encryption keys.
- Validation: typecheck, `release:doctor -- api`, and Sync V2 entity tests passed. The synthetic canary intentionally was not run because production test-account secrets are not available in this workspace.

### User recovery, export and resilience safeguards - 2026-09-21

- Recovery copies now require a second explicit confirmation before they replace the data on the device. The selected snapshot remains visible for review first and the current cloud copy is retained before restoration.
- Added a private personal-data export from Cuenta y copias. It contains training data only and omits cloud ownership metadata, sessions, tokens and device notification identifiers.
- Added dependency security gate `npm run security:dependencies`; it blocks high or critical production dependency vulnerabilities. The release protocol now requires it before publication.
- Added encryption-key rotation and staging guidance to the release protocol: keys are never rotated in place; a tested decrypt/re-encrypt migration plus full restore verification is required.
- Validation: typecheck passed; personal export, Sync V2 entity, idempotent finish and interrupted-session recovery tests passed; production dependency audit found no high or critical findings.

### Full local verification of account safeguards - 2026-09-21

- Repaired the account-test SQLite fixture so it isolates the Accounts schema instead of attempting to parse unrelated MySQL-only Community indexes.
- Executed the bundled PHP runtime tests successfully: 44 account integration assertions, including Sync V2 disabled-by-default, idempotent retry and encrypted V2 payload checks; encrypted backup/restore also passed.
- Re-ran TypeScript, personal export, Sync V2 merge, idempotent finish, interrupted-session recovery, production dependency audit and `release:doctor -- api`; all passed.

### Google Play Alpha: splash logo ampliado - 2026-09-21

- Generado y verificado el AAB firmado de Android `1.0.29` / `versionCode 32` con el logo de inicio ampliado.
- SHA-256 AAB: `B85825E22428A3053EE17C2DB1343A43CA1EAFCE0B7856D9FB4A98C978D7FF40`.
- Subido a **Prueba cerrada Alpha**, con notas `Logo de inicio más grande y mejoras visuales en botones y selección de días.`
- Enviado a revisión de Google Play. Estado visible: **Cambios en revisión**. Producción no iniciada.

### SincronizaciÃ³n: reconciliaciÃ³n segura de conflictos - 2026-09-21

- Los borradores de entrenamientos abiertos, los logros derivados y la versiÃ³n interna de migraciÃ³n dejan de formar parte de la copia cloud. No pueden volver a provocar un conflicto entre dispositivos cuando el progreso duradero es el mismo.
- La comparaciÃ³n normaliza colecciones opcionales vacÃ­as y el orden de colecciones cuyo orden no cambia el resultado. Se evita que una actualizaciÃ³n de la app convierta la misma copia en dos estados distintos.
- Si dos dispositivos aÃ±aden entrenamientos finalizados o mediciones distintas sin tocar la rutina ni el perfil, se unen automÃ¡ticamente y se conservan ambos registros. Una ediciÃ³n del mismo entrenamiento, rutina o preferencias nunca se pisa: se explica el Ã¡rea afectada y se mantienen las copias de recuperaciÃ³n.
- Se publicÃ³ la Web tras preflight SFTP, verificaciÃ³n de salud API, `release:doctor -- web`, TypeScript y auditorÃ­a de dependencias. La cuenta de prueba terminÃ³ en `Guardado en el dispositivo y en la nube` despuÃ©s de resolver la diferencia real de carga con la copia local corregida; la copia cloud previa permanece en el historial de recuperaciÃ³n.

### Pulido de superficies mÃ³viles verde y dorada - 2026-09-21

- Se retiraron la franja dorada lateral, el sombreado de texto y los reflejos angulares que se cortaban dentro de las pestaÃ±as seleccionadas de iOS.
- Las selecciones verdes usan ahora una Ãºnica superficie esmeralda continua; se aplica a los dÃ­as de `Tu semana`, a las pestaÃ±as de Comunidad y al dÃ­a seleccionado del Calendario.
- El oro de botones destacados usa una transiciÃ³n metÃ¡lica cÃ¡lida y continua basada en `#C39850`, sin sombra exterior ni bloques de color. Web publicada tras las validaciones de release y SFTP.

### Selector directo de mes y aÃ±o en Calendario - 2026-09-21

- El mes y el aÃ±o del encabezado ahora son botones accesibles.
- Al pulsarlos aparece un selector compacto con los 12 meses y un rango de 21 aÃ±os; elegir una opciÃ³n actualiza el calendario y centra la fecha seleccionada en ese mes.
- El selector usa las mismas superficies esmeralda y bordes dorados discretos del resto de la app. Web exportada y publicada tras `release:doctor -- web` y preflight SFTP.

### Selector de mes y aÃ±o compacto - 2026-09-21

- Se sustituyÃ³ la cuadrÃ­cula grande por un desplegable vertical con desplazamiento limitado: una lista de meses o una lista de aÃ±os segÃºn el encabezado pulsado.
- El panel ocupa poco espacio en mÃ³vil y se puede recorrer con el dedo o con la rueda/ratÃ³n en ordenador. Al elegir una opciÃ³n se cierra y actualiza el calendario.
- TypeScript y `release:doctor -- web` correctos; Web publicada mediante preflight y despliegue SFTP.

### Selectores de mes y aÃ±o independientes - 2026-09-21

- Mes y aÃ±o se muestran en controles separados, cada uno con su propio estado y desplegable vertical anclado debajo del control correspondiente.
- Se aÃ±adiÃ³ separaciÃ³n visual entre ambos para evitar que parezcan un Ãºnico selector; siguen siendo desplazables con dedo o ratÃ³n.
- TypeScript correcto y Web publicada tras `release:doctor -- web`, exportaciÃ³n, preflight y despliegue SFTP.

### Nuevo logo para materiales de Google Play - 2026-09-21

- Se sustituyÃ³ la fuente de los materiales de Play por `Logo definitivo circular.png`, conservando el original web sin cambios.
- Se regeneraron `assets/play/icon-512.png` y `assets/play/feature-graphic.png` con el nuevo emblema circular.
- Los recursos quedan preparados para actualizar la ficha de Play Console; no se ha generado ni enviado una nueva versiÃ³n Android solo por este cambio de material grÃ¡fico.

### Logo circular actualizado en Google Play Console - 2026-09-21

- Se cargÃ³ `assets/play/icon-512.png` en la ficha predeterminada de Akhyles.
- Se retirÃ³ el icono anterior, se dejÃ³ Ãºnicamente el nuevo icono circular y Play Console confirmÃ³ el guardado sin errores de validaciÃ³n.
- El cambio queda publicado como recurso de la ficha; no se modificÃ³ el binario Android ni la configuraciÃ³n del logo web.
### Release Android 1.0.30 / versionCode 33 preparada en Alpha - 2026-09-21

- Se incrementó la versión de la app a `1.0.30` y `versionCode` `33`.
- Se generaron AAB y APK de producción con backend HTTPS, reutilizando la firma Android existente.
- `verify-android` validó certificado, manifest, versión y permisos permitidos; `release:doctor` y typecheck correctos.
- Dependencias de producción sin vulnerabilidades altas/críticas.
- La subida a Google Play Console quedó preparada en Prueba cerrada > Alpha como `33 (1.0.30)` con notas en `es-ES`, guardada en revisión. Solo aparece la advertencia informativa de desofuscación no asociada (no se usa R8/ProGuard).
- No se pudo realizar la instalación en dispositivo físico porque no había ningún dispositivo Android conectado por ADB.
- La suite tiene 151 pruebas correctas y 5 fallos heredados no relacionados con este bump; quedan documentados para su tratamiento separado.
- Tras la confirmación del propietario, la versión se envió a revisión de Google Play; el Resumen de publicación muestra `1 cambio enviado a revisión`.

### Agenda de seguimiento para entrenadores — 22 de septiembre de 2026

- Se integró una pestaña **Agenda** en el espacio de entrenador. Complementa «Hoy» y concentra planificación sin convertir cada sesión en una notificación.
- La Agenda ofrece **Hoy**, **Ayer**, **Próximos 7 días** y **Calendario**. Cada sesión abre el expediente del deportista y su calendario de lectura; el plan gestionado se abre desde allí. La Agenda no edita ni reprograma sesiones directamente.
- La propuesta inicial de alertas contemplaba excepciones configurables y un resumen diario opcional. Ese sistema de avisos no está implementado; el flujo visible de vídeos técnicos se retiró después.
- En esta primera fase la Agenda usaba calendarios simulados. La integración posterior añadió datos autorizados de clientes a las API Node y PHP y sustituyó las ediciones locales no persistentes; la comprobación funcional de producción sigue pendiente.

### Envío iOS 1.0.36 (1) en cola de Expo — 2026-09-22

- La compilación de producción de iOS quedó preparada y el envío a App Store está en estado `Queued`, dentro de la cola gratuita de Expo.
- La versión asociada es `1.0.36 (1)`, con SDK `57.0.0` y commit `7e2bbb0`.
- El envío todavía no ha comenzado: no hay logs disponibles y aún no se ha enviado a App Store Connect ni está publicado en la App Store.
- Expo indica que para ver los detalles de App Store Connect en futuras subidas hay que conectar la app de App Store Connect en la configuración del proyecto.
