# Google Play: declaración de Seguridad de datos

La declaración debe corresponder al AAB concreto que se suba. El primer AAB previsto se compila solo con `-AccountUrl https://api.akhyles.com`; por tanto, su declaración base es la de **cuenta privada**. Solo añadir la sección de Comunidad si ese mismo AAB se compila con una URL pública de Comunidad y dicha función queda operativa.

La URL pública de borrado que debe introducirse es `https://akhyles.com/eliminar-cuenta-de-comunidad/`, pero no debe guardarse en Play hasta que su HTTPS responda correctamente.

## Respuestas generales

- La app recopila datos: **sí**.
- Datos cifrados en tránsito: **sí**. La API pública de cuentas exige HTTPS.
- La persona usuaria puede solicitar eliminación: **sí**, desde la aplicación y mediante la URL pública de eliminación.
- Compartición con terceros: **no**.

## Cuenta privada: tipos que se deben marcar en el primer AAB

| Categoría de Play | Tipo de dato | Uso | ¿Opcional? | Compartido |
| --- | --- | --- | --- | --- |
| Información personal | Nombre | Gestión de cuenta y funcionalidad de la app | Sí | No |
| Información personal | Dirección de correo | Gestión de cuenta, recuperación y funcionalidad de la app | Sí | No |
| Información personal | ID de usuario | Gestión de cuenta y funcionalidad de la app | Sí | No |
| Salud y actividad física | Información de fitness: rutinas, ejercicios, cargas, repeticiones, historial y peso corporal | Funcionalidad de la app | Sí | No |

Para cada fila, seleccionar **Recopilado**, **no compartido**, **cifrado en tránsito** y la finalidad indicada. Marcar **opcional** porque la app local funciona sin crear una cuenta. El acceso mediante Google es un método de autenticación opcional; no añade un tipo de dato distinto a nombre, correo e ID de usuario.

No marcar fotos, vídeo, micrófono, ubicación, contactos, mensajes, información financiera, identificadores publicitarios, diagnósticos, estadísticas de uso ni navegación para ese AAB: no se recopilan fuera del dispositivo por la cuenta privada auditada.

## Añadir si Comunidad queda operativa en el AAB

| Categoría de Play | Tipo de dato | Uso | ¿Opcional? | Compartido |
| --- | --- | --- | --- | --- |
| Información personal | Otros datos personales: alias y biografía | Funcionalidad de la app | Sí | No |
| Fotos y vídeos | Fotos | Funcionalidad de Comunidad; se envían únicamente cuando el usuario publica | Sí | No |
| Actividad en aplicaciones | Contenido generado por el usuario: publicaciones, pies de foto, reacciones, denuncias y datos que se elijan compartir | Funcionalidad de la app | Sí | No |

El contenido que una persona decide publicar en Comunidad se muestra a otros usuarios dentro de Akhyles; no se transfiere a empresas u organizaciones ajenas al responsable. Aun así, debe declararse como recopilado si Comunidad transmite o conserva esos datos fuera del dispositivo.

## Revisión final antes de enviar

1. Confirmar que `https://akhyles.com/eliminar-cuenta-de-comunidad/` responde sin error TLS y contiene el procedimiento descrito en `ELIMINAR-CUENTA.md`.
2. Publicar la versión revisada de `PRIVACIDAD.md` en la URL de política de privacidad ya registrada en Play.
3. Si se elimina o se añade una función antes de subir el AAB, contrastar de nuevo este documento con el código y editar la declaración.

