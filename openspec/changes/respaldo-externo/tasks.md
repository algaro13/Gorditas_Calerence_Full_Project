## 1. Preparación fuera del código

- [x] 1.1 Subir la rama de trabajo a `origin` (hoy sin upstream; sin esto el manifiesto apunta a un commit inexistente)
- [x] 1.2 Crear el bucket R2 `kustodela-respaldo` y un token de API con acceso solo a ese bucket
- [x] 1.3 Crear el vigilante en healthchecks.io con periodo 6 h y margen 2 h
- [ ] 1.4 Guardar el sobre de arranque en el gestor de contraseñas (repositorio y contraseña restic, credenciales R2, `ZITADEL_MASTERKEY`, URL del repositorio)

## 2. Respaldo

- [x] 2.1 `infra/respaldo/.env.respaldo.example` con `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `HEALTHCHECK_URL`, `COMPOSE_FILE`
- [x] 2.2 `infra/respaldo/respaldar.sh`: disparar `pg-backup`, escribir `MANIFIESTO.txt`, `restic backup`, `restic forget --prune`, ping al vigilante; salir distinto de cero ante cualquier fallo
- [x] 2.3 `restic init` contra R2 y primera corrida manual
- [x] 2.4 Instalar el cron del host cada 6 h (no se toca `BACKUP_SCHEDULE`: respaldar.sh vuelca por su cuenta)

## 3. Restauración y verificación

- [x] 3.1 `infra/respaldo/restaurar.sh`: clonar al commit del manifiesto, `restic restore`, levantar postgres, `pg_restore` de ambas bases, `REASSIGN OWNED`, repoblar `uploads`, levantar el resto; confirmación antes de cada paso destructivo y aviso de no re-ejecutar `prod:bootstrap`
- [x] 3.2 `infra/respaldo/verificar.sh`: restaurar en base desechable, contar filas, comprobar los cinco archivos de secretos y la huella de la masterkey
- [x] 3.3 `prod:respaldo` y `prod:verificar-respaldo` en el `package.json` raíz

## 4. Documentación

- [x] 4.1 `docs/recuperacion.md`: sobre de arranque, contenido del respaldo, procedimiento paso a paso, tiempo real medido
- [x] 4.2 `infra/README.md` §8 reescrito apuntando al documento nuevo, conservando el aviso de que los `.sql.gz` no son gzip
- [x] 4.3 `.env.example`: `BACKUP_SCHEDULE` documentado y las variables de la variante behind-proxy que hoy faltan

## 5. Verificación

- [x] 5.1 `restic snapshots` y `restic ls latest` muestran los dos volcados, los logos, los cinco secretos y el manifiesto
- [x] 5.2 Un objeto crudo del bucket no revela texto legible (comprobado con control positivo)
- [x] 5.3 `verificar.sh` restaura y las cuentas de `tenants`, `ordenes` y `platillos` coinciden con producción
- [x] 5.4 La huella de la `ZITADEL_MASTERKEY` restaurada coincide con la del gestor de contraseñas
- [x] 5.5 Comprobado el aviso del vigilante provocando un fallo real (credencial de R2 invalida): detectado y notificado en 48 s, sin contenedores huerfanos
- [x] 5.6 Tras varias corridas, la retención poda y el uso en R2 no crece linealmente (1.985 MiB de datos en 486 KiB, ratio 3.14x)
- [x] 5.7 El commit del manifiesto existe en `origin` y corresponde a lo desplegado
- [ ] 5.8 Ensayo completo en VPS desechable: flujo de orden extremo a extremo con `hosts` local, tiempo anotado, VPS destruido
