# Checklist de lanzamiento: cuentas y copias privadas

## Antes de compilar el primer AAB conectado

- [ ] `https://api.akhyles.com/health` responde por HTTPS con `ok: true`.
- [ ] `config.local.php` existe fuera de la carpeta pública, con base de datos, clave de cifrado, SMTP y el Client ID web de Google.
- [ ] Migración de base ejecutada y trabajador de correo programado.
- [ ] Backup cifrado diario configurado, restauración comprobada y retención máxima de 30 días aplicada.
- [ ] Registro, verificación de correo, inicio de sesión, recuperación, cierre de sesión, borrado y sincronización probados en un dispositivo real.
- [ ] Google probada con el cliente Android y el cliente web, incluido cierre de sesión y acceso posterior.
- [ ] Política y página de eliminación publicadas por HTTPS; la URL de eliminación se ha introducido en Play.

## Compilación conectada

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-android.ps1 -Format both -AccountUrl https://api.akhyles.com
```

- [ ] Conservar APK y AAB resultantes; no subir el AAB de vista previa sin cuentas.
- [ ] Ejecutar `npm run check` antes de entregar el AAB.
- [ ] Tras la primera subida a Play, copiar la huella SHA-1 de firma de Google Play al cliente OAuth Android y probar de nuevo el acceso con Google desde la compilación distribuida.

## Prueba cerrada de Play

- [ ] Subir el AAB conectado al canal de prueba cerrada.
- [ ] Añadir la URL de inscripción y verificar que al menos 12 personas se han unido.
- [ ] Mantener la prueba cerrada durante 14 días con la versión distribuida.
- [ ] Recoger incidencias de acceso, sincronización, restauración, borrado de cuenta y actualización.

