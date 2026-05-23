# Migraciones de Base de Datos

## Convención de nombres

```
YYYYMMDD-descripcion-kebab-case.js
```

Ejemplos:
- `20260523-baseline.js`
- `20260601-agregar-telefono-a-usuarios.js`
- `20260615-renombrar-fechaHora-a-fechaCreacion.js`
- `20260620-eliminar-campo-obsoleto.js`

## Crear una nueva migración

```bash
npm run migrate:create -- "descripcion-del-cambio"
```

## Template

```javascript
module.exports = {
  async up(db) {
    // Aplicar el cambio
    // Ejemplo: agregar un campo con valor default
    await db.collection('nombre_coleccion').updateMany(
      { nuevoCampo: { $exists: false } },
      { $set: { nuevoCampo: 'valor_default' } }
    );
  },

  async down(db) {
    // Revertir el cambio
    await db.collection('nombre_coleccion').updateMany(
      {},
      { $unset: { nuevoCampo: '' } }
    );
  },
};
```

## Ejemplos comunes

### Agregar un campo

```javascript
async up(db) {
  await db.collection('usuarios').updateMany(
    { telefono: { $exists: false } },
    { $set: { telefono: '' } }
  );
}
```

### Renombrar un campo

```javascript
async up(db) {
  await db.collection('ordenes').updateMany(
    {},
    { $rename: { 'fechaHora': 'fechaCreacion' } }
  );
}
```

### Cambiar tipo de dato

```javascript
async up(db) {
  const docs = await db.collection('productos').find({ costo: { $type: 'string' } }).toArray();
  for (const doc of docs) {
    await db.collection('productos').updateOne(
      { _id: doc._id },
      { $set: { costo: parseFloat(doc.costo) } }
    );
  }
}
```

### Crear un índice

```javascript
async up(db) {
  await db.collection('ordenes').createIndex(
    { nombreCliente: 1 },
    { background: true }
  );
}
```

## Reglas

1. **Siempre escribir `down()`** — Debe revertir exactamente lo que `up()` hizo
2. **Idempotencia** — Usar `{ $exists: false }` para no afectar documentos ya migrados
3. **Probar en staging** — Nunca ejecutar una migración nueva directamente en producción
4. **Backup antes de migrar** — Especialmente para cambios destructivos (eliminar campos, cambiar tipos)
5. **Una migración por cambio** — No mezclar múltiples cambios no relacionados en una sola migración
