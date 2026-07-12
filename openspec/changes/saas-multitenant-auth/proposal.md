## Why

El sistema actual es single-tenant con autenticación JWT manual. Para ofrecer el sistema como SaaS con renta mensual a múltiples restaurantes, se necesita:
1. Un sistema de autenticación robusto (login, registro, recuperación de cuenta) delegado a Microsoft Entra External ID
2. Una arquitectura multi-tenant donde cada restaurante tiene sus datos aislados
3. Resolución automática de tenants por subdominio (`pos-{nombre}.kustodela.com`)

Esta fase establece la base sobre la que se construyen las fases posteriores (Stripe, onboarding, multisucursal).

## What Changes

- Reemplazar la autenticación JWT manual por Microsoft Entra External ID (MSAL)
- Crear una Master Database que almacene: tenants, planes, configuraciones globales
- Implementar middleware de resolución de tenant por subdominio
- Crear sistema de provisioning automático de base de datos por tenant
- Implementar registro de nuevos tenants (elegir subdominio, crear DB, primer usuario admin)
- Configurar Nginx para rutear subdominios `pos-*` al sistema de restaurantes
- Migrar el tenant existente "Gorditas Calerence" como primer cliente

## Capabilities

### New Capabilities
- `entra-authentication`: Autenticación mediante Microsoft Entra External ID (login, registro, recuperación de contraseña, tokens)
- `tenant-management`: Sistema multi-tenant con master DB, resolución por subdominio, provisioning automático de databases
- `tenant-onboarding`: Flujo de registro de nuevos restaurantes (elegir nombre/subdominio, crear tenant, asignar admin)

### Modified Capabilities

## Impact

- **Autenticación**: Se reemplaza completamente el sistema JWT manual. El frontend usa MSAL React, el backend valida tokens de Entra
- **Base de datos**: Se agrega una Master DB (`kustodela_master`) junto a las DBs por tenant
- **Infraestructura**: Se configura Nginx con wildcard para subdominios `pos-*`
- **Dependencias nuevas**: `@azure/msal-react`, `@azure/msal-browser` (frontend), `passport-azure-ad` o validación manual JWT (backend)
- **Frontend**: Se reemplaza el AuthContext para usar MSAL en lugar del login manual
- **Datos existentes**: La DB actual (`mi_tienda_gorditas`) se convierte en la DB del primer tenant
- **Dominio**: `pos.kustodela.com` (landing), `posapi.kustodela.com` (API), `pos-{nombre}.kustodela.com` (clientes)
