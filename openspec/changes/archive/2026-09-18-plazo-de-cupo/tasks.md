## 1. Esquema

- [x] 1.1 `tenants.sobre_cupo_desde` en el esquema de Prisma y su migración

## 2. Backend

- [x] 2.1 Caso de uso que evalúa el cupo de un restaurante: inicia, limpia o ejecuta el plazo
- [x] 2.2 Elección por mayor tiempo sin entrar, con los que nunca entraron primero
- [x] 2.3 Nunca el último administrador activo; si no cabe, se deja una plaza de más y se reporta
- [x] 2.4 Desactivar también en el proveedor de identidad, como una desactivación manual
- [x] 2.5 Trabajo diario que lo recorre para todos los restaurantes
- [x] 2.6 El estado del restaurante expone la fecha límite y a quién le tocaría

## 3. Frontend

- [x] 3.1 El aviso pasa a cuenta atrás, con fecha y nombres
- [x] 3.2 Decir qué desactivó el sistema, cuando ya ocurrió

## 4. Pruebas

- [x] 4.1 Se cancela si el restaurante vuelve a caber antes del plazo
- [x] 4.2 Al vencer, desactiva a quien lleva más sin entrar hasta que quepa
- [x] 4.3 Nunca deja al restaurante sin administrador activo
- [x] 4.4 Un usuario desactivado así se puede reactivar sujeto al cupo
- [x] 4.5 En el navegador: cuenta atrás y estado posterior
- [x] 4.6 Lo desactivado por el sistema se distingue de una baja a mano, y reactivar lo limpia

## 5. Cierre

- [x] 5.1 Commit y `openspec archive`
