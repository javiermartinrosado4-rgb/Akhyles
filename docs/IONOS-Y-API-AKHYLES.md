# Web de Akhyles, DNS y API

## Estado vigente: 11 de septiembre de 2026

Actualizado: la gestión con IONOS ya está hecha.

- Se migraron el dominio `akhyles.com` y la licencia de correo de `javi@akhyles.com`
  al contrato **Hosting Premium 47175101**.
- El sitio principal `akhyles.com` sigue operativo desde IONOS con la web actual.
- El subdominio `api.akhyles.com` ya puede vincularse desde el panel de ese
  Hosting Premium a la ruta de proyecto correspondiente (pendiente de ejecutar en
  el panel cuando confirmes la carpeta destino).
- Tras esta fase de configuración, **el dominio y el correo permanecen activos**.

## Estado actual de despliegue de web

La portada pública de la web está preparada y publicada. El bloque de descarga temporal
se enlaza con la APK de referencia más reciente de esta rama (1.0.6).

La activación de la nube de cuentas/entrenamientos y comunidad sigue pendiente de
QA:

1. Validar conectividad HTTPS real en `https://api.akhyles.com`.
2. Validar OAuth web/Android, SMTP (`javi@akhyles.com`) y entrega.
3. Confirmar copia de seguridad, restauración y política de borrado.
4. Generar y publicar la APK conectada (`-AccountUrl https://api.akhyles.com`).

## Pasos pendientes en IONOS (cuando abra panel)

1. Entrar en IONOS:
   `Dominios y SSL` → `akhyles.com` → `Subdominios` / `Rutas`.
2. Configurar `api.akhyles.com` a la carpeta pública del backend (evitar tocar MX,
   dominio principal ni redirecciones por ahora).
3. Activar HTTPS en esa ruta/subdominio.
4. Comprobar `https://api.akhyles.com/health` y revisar logs.

## Notas operativas

- Mantener usuario/credenciales fuera del chat. El acceso SFTP/SSH debe ir en sesión
  privada y preferiblemente con acceso limitado.
- No compartir secretos en Git ni en variables `EXPO_PUBLIC_*`.
- Al cambiar rutinas y registros en pasado, respetar la regla de no reescribir meses
  históricos del usuario sin confirmación de sesión (esto está resuelto en la lógica de app).

## Tabla de responsabilidades

| Dirección | Servicio |
| --- | --- |
| `https://akhyles.com` | Web pública, privacidad, soporte y landing |
| `https://www.akhyles.com` | redirección del dominio principal |
| `https://api.akhyles.com` | API de cuentas / comunidad / progreso compartido |

Referencias: `docs/CUENTAS-Y-SINCRONIZACION.md`, `server-php/README.md`,
`docs/DESPLIEGUE-COMUNIDAD.md` y `docs/WEB-AKHYLES-1.0.6.md`.
