# Akhyles

Android: consulta [ANDROID.md](ANDROID.md) para generar la APK instalable, conservar la firma y configurar Comunidad.

Cuentas y copias privadas: [diseño y estado](docs/CUENTAS-Y-SINCRONIZACION.md),
[servicio PHP para IONOS](server-php/README.md). Implementadas y probadas
localmente; pendientes de activación real. Consultar primero [DIARIO.md](DIARIO.md)
antes de retomar el proyecto.

Antes de publicar: [materiales de Google Play](docs/GOOGLE-PLAY.md), [borrador de privacidad](docs/PRIVACIDAD.md) y [despliegue de Comunidad](docs/DESPLIEGUE-COMUNIDAD.md).

Aplicación local de gimnasio en español, construida con React Native, Expo SDK 57, Expo Router y TypeScript.

## Abrir

Abre **Abrir Akhyles.cmd** desde esta carpeta. La app está en http://localhost:8081. Para detenerla puedes usar **Detener Akhyles.cmd**.

La rutina y el historial se guardan en este navegador y dirección. Comunidad tiene cuentas independientes con contraseña, fotos y seguidores en un servidor compartido. El lanzador inicia ese servidor en el puerto 8082, accesible desde este equipo. Cerrar la sesión local conserva los entrenamientos y cierra también el acceso social; la sesión local no es un bloqueo con contraseña.

## Funciones actuales

- Fotos del equipamiento a la derecha del nombre durante la sesión, con ampliación, tonos salvia y adaptación al tema claro/oscuro. Los 83 ejercicios del catálogo comparten 40 imágenes locales según el material utilizado; los equipos personalizados sin correspondencia se identifican como tales. [Fuentes y retoques](assets/equipment/README.md).
- Acceso web con Google, pendiente de activar el cliente OAuth: [configuración](server/GOOGLE-SETUP.md). La cuenta social no sincroniza el historial local.
- Seis avatares prediseñados y selección de foto propia para el perfil local y social.
- Inicio y continuación desde Hoy, respetando las series programadas y conservando registros. Una sesión terminada hoy no se reinicia.
- Estimación de calorías según el peso corporal y los ejercicios realizados, visible al terminar y en el historial.
- Tiers orientativos S/A/B por grupo muscular, basados en las prioridades existentes del catálogo; contenido definitivo pendiente de revisión.

- Perfil editable: nombre, @ local, datos corporales, nivel, días, prioridad/mesociclo, glúteos, equipamiento y especialización avanzada.
- Calendario semanal editable: se eligen los días concretos disponibles y cada sesión aparece asignada a uno. Hoy muestra la sesión exacta, descanso, sesión en curso o sesión terminada.
- Descansos estimados de 4 minutos en ejercicios pesados y 3 minutos en los demás, con 30 segundos por serie efectiva. El generador usa hasta 2 ejercicios pesados por sesión en planes de 4–5 días; el usuario puede añadir más. Por defecto, bíceps se concentra en Torso A y tríceps en Torso B; si el usuario aumenta sus series directas, pueden repartirse entre ambos torsos.
- Volumen semanal visible por grupo muscular: 4 series en grupos definidos como pequeños en los requisitos, 6/8 en grandes, y 16 en la especialización avanzada seleccionada.
- Orden editable, alternancia de músculos y distribución de remos/jalones; duración realista estimada sin garantizar menos de 60 minutos.
- Ejercicios sustituibles y personalizados, cargas, repeticiones, series e incrementos disponibles configurables.
- Sesiones persistentes: guardar y salir, continuar después de recargar, moverse entre ejercicios con flechas sin perder borradores, corregir registros y omitir un ejercicio solo durante la sesión actual.
- Progresión automática para la siguiente sesión cuando todas las series alcanzan el máximo con la misma carga. Incremento disponible más cercano al 4 % dentro del 3–5 %. El ejemplo de 35 kg prepara 36,25 kg. Si el material no permite ese rango, se mantiene el peso y se explica. El peso se puede editar directamente dentro de cada serie.
- Gráficas de líneas con peso corporal siempre visible y ejercicios activables por grupo muscular. Se pueden superponer varios ejercicios, elegir 28/90 días o todo el historial y consultar fechas, cargas y repeticiones. Registro directo del peso corporal desde Progreso.
- Calendario de rutina en vista semanal o mensual, con navegación por meses. Permite corregir pesos y repeticiones de sesiones registradas y reservar pesos específicos para una fecha futura sin cambiar el plan semanal.
- Al elegir un músculo prioritario se inicia su mesociclo de especialización; el volumen objetivo se ajusta automáticamente a los días disponibles y desde cuatro días se aproxima a 16 series en nivel intermedio o avanzado.
- Comparación del ritmo de progreso con otros participantes del mismo nivel: en la media, más rápido o más lento. Usa ejercicios homologados comunes, al menos 7 días de registros dentro de los últimos 28 días y un mínimo de 5 personas comparables. Sin datos suficientes se indica explícitamente. El nivel se guarda al iniciar las sesiones nuevas.
- Tras completar la sesión, Hoy muestra estadísticas del entrenamiento y acumuladas, además de una tendencia frente a la sesión anterior equivalente.
- Cuando el rendimiento baja, Hoy muestra consejos concretos: dormir 8 horas con horarios constantes, 1,8 g de proteína por kilo de peso corporal al día, energía e hidratación suficientes. El día de descanso también recuerda el objetivo de sueño.
- Puntuación experimental de carga relativa, restringida a ejercicios homologados. No representa aún un nivel real.
- Comunidad con registro e inicio de sesión, @ único en el servidor, nombre y biografía, cuadrícula de fotos, publicación con vista previa, muro, búsqueda por @, seguimiento, me gusta, eliminación propia y denuncia/ocultación. Las fotos se procesan y guardan en el servidor solo al publicarlas.
- Carpeta `referencias-visuales` para las imágenes y capturas que aporte Javier.

Si ya tenías una rutina, entra en Rutina y pulsa **Actualizar rutina a nuevas reglas** para regenerar distribución y series. Se mantienen historial, cargas y preferencias. Los cambios personales desde Perfil conservan el plan; cambiar la programación sí lo regenera.

## Límites actuales y decisiones pendientes

La fórmula definitiva de puntuación, su nombre, los niveles y las máquinas comparables los diseñaremos después. Por ahora se muestra explícitamente como experimental: 100 × media de carga/peso corporal. Las máquinas no aprobadas solo tienen gráfica individual. Los ejercicios personalizados no entran en comparaciones hasta validar su definición.

Comunidad funciona con las cuentas que utilicen el mismo servidor. Para usarla entre dispositivos por Internet falta desplegar ese servidor y configurar su dirección en la app; consulta [server/README.md](server/README.md). Las fotos publicadas son públicas. No hay perfiles privados, mensajes directos, recuperación de contraseña por correo ni moderación automática. Las denuncias quedan almacenadas para revisión del operador y ocultan la publicación al denunciante.

La comparación requiere compartir explícitamente los registros desde Progreso y permite retirarlos. Solo devuelve resultados agregados; no publica cargas individuales. Los entrenamientos anteriores que no guardaban el nivel quedan fuera de esta comparación, aunque permanecen en las gráficas personales. La puntuación total sigue utilizando la fórmula experimental anterior.

La conexión con ChatGPT personal y el asistente IA siguen pendientes. El selector de estimación corporal en el perfil es una **simulación etiquetada** independiente: no analiza ni envía imágenes. El selector de fotos de Comunidad sí permite publicar fotografías reales.

Los objetivos semanales son reglas de producto solicitadas, no se presentan como una recomendación universal. Si no caben en los días y el material disponibles, se muestra cuánto falta. La especialización implementa el objetivo de 16 series, no todavía duración de bloques ni descargas.

Consulta [REQUISITOS-AKHYLES.md](REQUISITOS-AKHYLES.md) para el detalle de lo implementado y pendiente.

## Desarrollo y comprobaciones

En PowerShell, desde esta carpeta:

```powershell
npm.cmd run check
npm.cmd run test:e2e
npx.cmd expo export --platform web
```

Las pruebas de navegador requieren la app en el puerto 8081 y usan contextos aislados. Las pruebas sociales arrancan su propio servidor con una base de datos en memoria, sin usar las cuentas ni las fotos reales. La exportación queda en `dist` y no publica la app. No se han probado Android/iOS en dispositivos. El servidor requiere Node 24 o superior y se puede iniciar también con `npm.cmd run server`.

Node está instalado en `C:\Users\Javier\.local\node\node-v24.20.0-win-x64`. Si una terminal antigua no lo encuentra, abre una nueva.

## Organización

- `brand.json`: nombre visible; slug técnico conservado.
- `src/data`: catálogo, patrones de tirón, cargas y elegibilidad de puntuación.
- `src/logic`: generación, progresión, sesiones y gráficas.
- `src/components`, `src/screens`, `src/app`: interfaz y rutas.
- `src/state`, `src/storage`: persistencia local compatible con los datos anteriores.
- `src/services/community.ts`: conexión con el servidor social.
- `server`: cuentas, fotos, seguimiento y comparación agregada. `server/data` contiene datos privados y está excluida de Git.
- `tests`: motor y recorridos de navegador.
- `referencias-visuales`: referencias de diseño aportadas.
