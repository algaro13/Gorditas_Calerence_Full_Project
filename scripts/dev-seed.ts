/**
 * Semilla de desarrollo: registra el restaurante "demo" con su administrador vía el API público
 * de onboarding (crea la organización y el usuario en Zitadel local) y sugiere el slug para el frontend.
 *
 * Requisitos: `npm run dev:up` y el backend corriendo (`npm run dev:backend`).
 *
 * Uso: npm run dev:seed [-- --slug demo --email demo@kustodela.local --password Demo1234!]
 */
const args = process.argv.slice(2);
const arg = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const API = arg('api', process.env.API_URL ?? 'http://localhost:5000/api');
const slug = arg('slug', 'demo');
const email = arg('email', `${slug}@kustodela.local`);
const password = arg('password', 'Demo1234!');

async function main(): Promise<void> {
  const check = await fetch(`${API}/tenants/check-slug/${slug}`).then((r) => r.json() as Promise<{ data?: { available?: boolean; reason?: string } }>);
  if (check.data?.available === false) {
    console.log(`[dev-seed] El slug "${slug}" ya existe (${check.data.reason ?? 'ocupado'}). Nada que hacer.`);
    console.log(`[dev-seed] En el navegador: localStorage.setItem('devTenantSlug', '${slug}')`);
    return;
  }

  const body = {
    admin: { nombre: 'Demo', apellido: 'Admin', email, password },
    nombre: slug === 'demo' ? 'Gorditas Demo' : `Gorditas ${slug}`,
    slug,
    paleta: 'orange',
    mesas: Array.from({ length: 6 }, (_, i) => ({ nombre: `Mesa ${i + 1}` })),
    platillos: [
      { nombre: 'Gordita de chicharrón', precio: 25 },
      { nombre: 'Gordita de rajas con queso', precio: 30 },
      { nombre: 'Gordita de picadillo', precio: 28 },
      { nombre: 'Quesadilla', precio: 20 },
      { nombre: 'Taco dorado', precio: 15 },
    ],
    guisos: ['Chicharrón prensado', 'Rajas con queso', 'Picadillo', 'Mole verde', 'Frijoles con queso', 'Deshebrada', 'Papas con chorizo'].map((nombre) => ({ nombre })),
  };

  const res = await fetch(`${API}/onboarding/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = (await res.json()) as { success: boolean; message?: string; data?: { tenant: { id: string; slug: string }; url: string } };
  if (!res.ok || !json.success) {
    console.error(`[dev-seed] Falló (${res.status}): ${json.message ?? JSON.stringify(json)}`);
    process.exit(1);
  }
  console.log(`[dev-seed] Restaurante creado: ${json.data!.tenant.slug} (${json.data!.tenant.id})`);
  console.log(`[dev-seed] Admin: ${email} / ${password}`);
  console.log(`[dev-seed] Correo de verificación: http://localhost:8025`);
  console.log(`[dev-seed] En el navegador: localStorage.setItem('devTenantSlug', '${slug}') y entra en ${json.data!.url}`);
}

main().catch((err) => {
  console.error('[dev-seed]', err instanceof Error ? err.message : err);
  process.exit(1);
});
