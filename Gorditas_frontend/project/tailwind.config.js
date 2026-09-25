/** @type {import('tailwindcss').Config} */

/**
 * Estándar de tamaños de Kustodela.
 *
 * Los nombres describen la FUNCIÓN, no la medida: `control` y no `h-12`. Si mañana el mínimo
 * táctil cambia, se cambia aquí y no en cada pantalla.
 *
 * Los números no son de gusto. 44px es el mínimo de Apple HIG y de WCAG 2.5.5, y con un dedo de
 * 1.6–2cm por debajo de eso los fallos de puntería dejan de ser anecdóticos. 16px es lo mínimo
 * legible a la distancia a la que se sostiene un teléfono, y además el umbral por debajo del
 * cual iOS acerca la pantalla al enfocar un campo.
 *
 * Ver docs/estandar-ui.md.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Alturas de control. Ninguna por debajo de 44.
      height: {
        'control-min': '44px', // el suelo; solo cuando no cabe otra cosa
        control: '48px',       // el normal
        'control-lg': '56px',  // la acción principal del servicio
      },
      minHeight: {
        'control-min': '44px',
        control: '48px',
        'control-lg': '56px',
      },
      minWidth: {
        control: '44px', // el ancho cuenta tanto como el alto: un icono solo también se toca
      },
      // Espaciado. Se acaban los huecos de 2 y 4px entre cosas que se tocan.
      spacing: {
        'sp-1': '8px',
        'sp-2': '12px',
        'sp-3': '16px',
        'sp-4': '24px',
        'sp-5': '32px',
        'sp-6': '48px',
      },
      // Tipografía por función. Ninguna por debajo de 14.
      fontSize: {
        meta: ['14px', { lineHeight: '1.5' }],   // etiquetas, apoyo; nunca texto corrido
        cuerpo: ['16px', { lineHeight: '1.5' }], // lo normal
        titulo: ['20px', { lineHeight: '1.4' }],
        pantalla: ['28px', { lineHeight: '1.3' }],
      },
    },
  },
  plugins: [],
};
