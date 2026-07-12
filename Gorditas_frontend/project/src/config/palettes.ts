export interface Palette {
  id: string;
  name: string;
  primary: string;
  primaryHover: string;
  sidebarBg: string;
  sidebarActive: string;
  accent: string;
}

export const palettes: Palette[] = [
  {
    id: 'orange',
    name: 'Naranja',
    primary: '#ea580c',
    primaryHover: '#c2410c',
    sidebarBg: '#111827',
    sidebarActive: '#ea580c',
    accent: '#fed7aa',
  },
  {
    id: 'red',
    name: 'Rojo',
    primary: '#dc2626',
    primaryHover: '#b91c1c',
    sidebarBg: '#1f2937',
    sidebarActive: '#dc2626',
    accent: '#fecaca',
  },
  {
    id: 'green',
    name: 'Verde',
    primary: '#16a34a',
    primaryHover: '#15803d',
    sidebarBg: '#1a2e1a',
    sidebarActive: '#16a34a',
    accent: '#bbf7d0',
  },
  {
    id: 'blue',
    name: 'Azul',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    sidebarBg: '#1e293b',
    sidebarActive: '#2563eb',
    accent: '#bfdbfe',
  },
  {
    id: 'purple',
    name: 'Morado',
    primary: '#9333ea',
    primaryHover: '#7e22ce',
    sidebarBg: '#1e1b2e',
    sidebarActive: '#9333ea',
    accent: '#e9d5ff',
  },
  {
    id: 'brown',
    name: 'Café',
    primary: '#92400e',
    primaryHover: '#78350f',
    sidebarBg: '#292218',
    sidebarActive: '#92400e',
    accent: '#fde68a',
  },
  {
    id: 'dark',
    name: 'Oscuro',
    primary: '#374151',
    primaryHover: '#1f2937',
    sidebarBg: '#0f0f0f',
    sidebarActive: '#6b7280',
    accent: '#e5e7eb',
  },
];

export function getPalette(id: string): Palette {
  return palettes.find(p => p.id === id) || palettes[0];
}

export function applyPalette(palette: Palette): void {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-primary-hover', palette.primaryHover);
  root.style.setProperty('--color-sidebar-bg', palette.sidebarBg);
  root.style.setProperty('--color-sidebar-active', palette.sidebarActive);
  root.style.setProperty('--color-accent', palette.accent);
}
