# Releer el restaurante sin tirar la pantalla

## Por qué

Guardar en Configuración no muestra ninguna confirmación. Ni de éxito, ni de error. El dato se
guarda —hay una prueba que lo comprueba tras recargar—, pero desde la pantalla parece que no
pasó nada, que es exactamente el fallo que motivó el componente de avisos.

La causa no es el aviso: es que la pantalla que iba a mostrarlo deja de existir.

`handleSave` termina llamando a `refreshTenant()`. Eso ejecuta `loadTenant`, que empieza por
`setTenantState('loading')`, y de ahí sale `loading: true` en el contexto. Tanto
`BasicProtectedRoute` como `AuthenticatedApp` hacen lo mismo con eso:

```tsx
if (loading) return <Spinner />;
```

Así que la aplicación entera se desmonta —el armazón, la ruta y la pantalla— y vuelve a
montarse desde cero. El `success` que acababa de fijarse muere ahí, antes de llegar a pintarse.
Se ve en el navegador: durante el guardado aparece la pantalla de carga y luego el armazón otra
vez.

No es solo Configuración. `VerificarCorreo` hace lo mismo en su botón «ya verifiqué»: llama a
`refreshTenant()` y después fija el mensaje que explica qué hacer si sigues viendo esa
pantalla. Ese mensaje tampoco se ve nunca.

Y el coste no se limita a los avisos: un remontaje se lleva por delante el scroll, cualquier
diálogo abierto y lo que estuvieras escribiendo.

## Qué cambia

La pantalla de carga a página completa es correcta cuando **todavía no sabemos** de qué
restaurante se trata: no hay nada que enseñar. Es incorrecta cuando ya lo sabemos y solo lo
estamos releyendo.

`loadTenant` deja de anunciar `loading` cuando ya hay un restaurante cargado. El árbol se queda
en pie con los datos que ya tenía y se actualiza cuando llega la respuesta.

Con eso, el aviso de Configuración sobrevive sin tocar Configuración, y el de VerificarCorreo
también.

## Lo que hay que cuidar

- **La primera carga no cambia**: sin restaurante todavía, sigue mostrándose la pantalla de
  carga hasta saber quién es.
- **Un refresco que devuelve 401 o 404 sí debe cambiar la pantalla.** Son respuestas con
  significado —se acabó la sesión, ya no hay restaurante— y tienen que seguir llevando a donde
  llevaban.
- **Un error pasajero de red durante un refresco no debería echar a nadie.** Hoy deja el estado
  en `error`, y de ahí se sale a la pantalla de entrar. Si ya teníamos los datos, lo correcto es
  conservarlos.

## Qué no cambia

- Lo que se guarda y cuándo se guarda.
- Las rutas, los permisos y la pantalla de «sin restaurante».
