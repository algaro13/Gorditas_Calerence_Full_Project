## 1. El servicio

- [ ] 1.1 Imagen sobre `restic/restic` con lo que el guion necesita (bash, curl, git, tzdata)
- [ ] 1.2 Servicio en `docker-compose.behind-proxy.yaml` y en `docker-compose.yaml`
- [ ] 1.3 Montajes de solo lectura: raíz del despliegue, `uploads`, `backups`; volumen propio para caché y candado
- [ ] 1.4 Sin socket de Docker
- [ ] 1.5 Horario dentro del servicio, desfasado del de `pg-backup`

## 2. El guion

- [ ] 2.1 Quitar `docker run restic`, `docker run alpine` y `docker compose exec pg-backup`
- [ ] 2.2 Comprobar que el volcado más reciente es fresco; fallar y no hacer ping si no
- [ ] 2.3 El nombre del servidor llega por variable, no de `hostname` del contenedor
- [ ] 2.4 Candado en volumen propio, para que una corrida a mano no se pise con la programada
- [ ] 2.5 Tope de tiempo a restic sin depender de `docker kill`
- [ ] 2.6 Correrlo a mano sigue siendo posible y documentado

## 3. Documentación

- [ ] 3.1 `.env.respaldo.example`: variables nuevas, quitar las que ya no aplican
- [ ] 3.2 `docs/recuperacion.md`: ya no hay cron; cómo correrlo a mano; el desfase de horarios
- [ ] 3.3 `infra/README.md`: el servicio nuevo
- [ ] 3.4 Dejar escrito el orden de migración y que el cron viejo se quita al final

## 4. Pruebas

- [ ] 4.1 `docker compose config` valida en ambos compose
- [ ] 4.2 La imagen construye y trae las herramientas
- [ ] 4.3 Con un volcado viejo: falla, no hace ping
- [ ] 4.4 Con un volcado fresco: instantánea con los dos volcados, logos, secretos y manifiesto
- [ ] 4.5 El manifiesto trae el commit del despliegue, leído desde el montaje
- [ ] 4.6 Dos corridas simultáneas: la segunda se rinde por el candado
- [ ] 4.7 En el VPS, contra R2: instantánea real y vigilante respondiendo
- [ ] 4.8 Restaurar desde una instantánea hecha por el servicio nuevo

## 5. Cierre

- [ ] 5.1 Quitar la línea del crontab del VPS, ya con el servicio probado
- [ ] 5.2 Commit y `openspec archive`
