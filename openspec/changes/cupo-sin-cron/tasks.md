## 1. Backend

- [ ] 1.1 Programador en `src` que corre la evaluación al arrancar y cada 24 h
- [ ] 1.2 No se solapa consigo mismo; si la anterior sigue, se salta y se registra
- [ ] 1.3 Se apaga con el proceso, sin dejar temporizadores colgando
- [ ] 1.4 No corre en pruebas
- [ ] 1.5 Se conecta al arranque del servidor, no al crear la app

## 2. Documentación

- [ ] 2.1 `docs/recuperacion.md`: decir que no hay cron que reinstalar
- [ ] 2.2 Dejar dicho cómo dispararlo a mano en un incidente

## 3. Pruebas

- [ ] 3.1 Corre al arrancar y vuelve a correr pasado el intervalo
- [ ] 3.2 Se salta la corrida si la anterior sigue en marcha
- [ ] 3.3 Un fallo no mata el programador: la siguiente corrida ocurre igual
- [ ] 3.4 Al detenerlo no quedan temporizadores ni corridas pendientes
- [ ] 3.5 Regresión: la suite completa sigue verde y no queda colgada por un temporizador

## 4. Cierre

- [ ] 4.1 Commit y `openspec archive`
