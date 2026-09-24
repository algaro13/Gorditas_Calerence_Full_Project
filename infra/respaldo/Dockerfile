# Imagen del servicio de respaldo.
#
# Parte de restic porque el contenedor *es* el que hace la instantánea. Antes el guion corría
# en el host y lanzaba `docker run restic/restic`; eso obligaba a tener Docker a mano, y por
# tanto a montar el socket si se quería meter dentro del compose. Montar el socket le habría
# dado a este contenedor control equivalente a root sobre el host, para un trabajo que sólo
# necesita leer archivos.
#
# Lo que se añade sobre la imagen base:
#   bash     el guion lo usa (arrays, flock, trap con código de salida)
#   curl     avisar al vigilante externo
#   git      leer el commit desplegado para el manifiesto
#   tzdata   que las horas del registro y del horario sean las del restaurante
#   coreutils  `timeout`, `stat -c` y `date -d @…`, que los de busybox no cubren igual
#   findutils  `find -printf`, que el find de busybox NO trae: sin esto el listado del
#              manifiesto sale vacío y nadie se entera hasta que hace falta
#   util-linux `flock`
FROM restic/restic:0.18.1

RUN apk add --no-cache bash curl git tzdata coreutils findutils util-linux

# `git` se niega a leer un repositorio cuyo dueño no es el usuario actual. Aquí el repositorio
# llega montado desde el host, así que el dueño casi nunca coincide; sin esto el manifiesto
# diría "commit desconocido" en cada respaldo, en silencio.
RUN git config --global --add safe.directory '*'

COPY respaldar.sh /usr/local/bin/respaldar.sh
COPY bucle.sh     /usr/local/bin/bucle.sh
RUN chmod +x /usr/local/bin/respaldar.sh /usr/local/bin/bucle.sh

# La imagen base fija `restic` como entrypoint; aquí el que manda es el guion.
ENTRYPOINT []
CMD ["/usr/local/bin/bucle.sh"]
