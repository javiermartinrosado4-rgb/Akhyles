# Protocolo de simulaciones locales

Este protocolo define cómo levantar y verificar una simulación de Akhyles antes de revisar una función visual o de Comunidad. Su objetivo es evitar mezclar datos reales, abrir una Web sin estado de entrenamiento o confundir un fallo de onboarding con un fallo de la función que se quiere probar.

## 1. Reglas de aislamiento

- No usar `server/data/akhyles.sqlite` para una demo. Usar una base con nombre propio, por ejemplo `server/data/akhyles-trainer-demo.sqlite`.
- No usar cuentas reales ni la API de producción para sembrar datos ficticios.
- No borrar la base habitual. Si hay que repetir una demo, usar otro nombre de base o mover la base de demo a una carpeta temporal.
- Toda simulación debe indicar en pantalla o en la documentación que es local y ficticia.

## 2. Preparación del backend

Desde la raíz del proyecto:

```powershell
$env:GYM_DATABASE = 'server/data/akhyles-trainer-demo.sqlite'
npm.cmd run demo:community
```

La siembra debe dejar disponible `http://127.0.0.1:8082` y comprobar que el login local del entrenador responde con `trainerEnabled: true`.

Credenciales de la simulación actual:

- Usuario: `marcos_avanza`
- Contraseña: `Akhyles-demo-local-2026`
- Clientes: Lucía, Diego, Sofía, Iván, Clara y Hugo.

## 3. Preparación de la Web

La Web necesita dos cosas independientes:

1. La sesión local de Comunidad (`?demo`).
2. Un estado local de entrenamiento ya completado; de lo contrario la aplicación redirige a bienvenida/onboarding y nunca renderiza las pestañas.

Arrancar Metro así:

```powershell
$env:EXPO_PUBLIC_VISUAL_QA = '1'
npm.cmd run web -- --localhost --port 8081
```

Abrir siempre:

```text
http://localhost:8081/?demo
```

No considerar válida una prueba si la URL termina en la portada, `/onboarding` o no contiene el parámetro `demo`.

## 4. Verificación automática obligatoria

Con la Web y el backend en marcha:

```powershell
npm.cmd run verify:trainer-demo
```

La verificación debe confirmar:

- HTTP 200 de la Web.
- Login local correcto de `marcos_avanza`.
- `trainerEnabled === true`.
- Redirección final a `/today` o a la pantalla solicitada, nunca a onboarding.
- Presencia visible de la pestaña **Entrenador**.
- Ausencia de errores de página de React.

Los avisos de navegador sobre `expo-notifications`, estilos obsoletos o el endpoint externo de versión no sustituyen un error de renderizado; deben quedar registrados, pero no ocultar un fallo real.

## 5. Recorrido visual mínimo

1. Entrar en **Entrenador**.
2. Revisar **Agenda**, **Hoy**, **Clientes** e **Impacto**.
3. Abrir al menos un expediente.
4. Comprobar **Plan**, **Calendario**, **Evolución** y **Revisiones**.
5. Confirmar que aparecen los seis clientes y que hay estados distintos: al día, plan pendiente y necesita atención.
6. Recargar la página y repetir la comprobación de la pestaña.

## 6. Diagnóstico rápido

| Síntoma | Comprobación | Corrección |
| --- | --- | --- |
| No aparece Entrenador | Revisar `?demo` y `trainerEnabled` | Recargar con la URL completa y verificar el login local |
| Aparece la portada | `completed` está a `false` | Arrancar Metro con `EXPO_PUBLIC_VISUAL_QA=1` |
| Error abajo a la izquierda | Mirar logs de Metro y `pageerror` | Corregir el primer componente de la traza antes de seguir |
| Comunidad no conecta | Consultar `http://127.0.0.1:8082/health` | Reiniciar la siembra o revisar `GYM_DATABASE` |
| Clientes vacíos | Revisar la base usada por el backend | No mezclar la base normal con la base de demo |
| Funciona tras una prueba y falla después | Hay estado persistido o sesión antigua | Usar un contexto de navegador limpio o una base de demo nueva |

## 7. Cierre

Al terminar, conservar la Web local solo si se va a continuar la revisión. No publicar la demo ni sus datos. Antes de una release, repetir el recorrido con backend de producción y datos reales de prueba autorizados; la simulación local no sustituye esa validación.
