// app/dashboard/components/NucleoIcons.tsx
//
// Set de iconos propio, dibujado al estilo "Nucleo": trazo de 1.75,
// remates y uniones redondeadas, y una figura de acento rellena
// (duotono) que se enciende cuando el item está activo o en hover.
//
// No son assets de Nucleo (set propietario de pago): son paths originales
// que siguen la misma retícula de 24x24 y el mismo peso de trazo.

import type { SVGProps } from 'react'

export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Enciende la figura de acento rellena (duotono). */
  filled?: boolean
}

// Cada icono consume su prop `filled` y pasa el resto aquí, de modo que
// `filled` nunca llega al <svg> del DOM.
function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Opacidad de la figura de acento según estado. */
const accent = (filled?: boolean) => ({
  fill: 'currentColor',
  stroke: 'none',
  opacity: filled ? 0.28 : 0,
  style: { transition: 'opacity 200ms ease' },
})

// ─────────────────────────────────────────────
// Estaciones del dashboard
// ─────────────────────────────────────────────

/** Usuarios — grupo de personas */
export function IconUsuarios({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="9.5" cy="7.75" r="3.25" {...accent(filled)} />
      <circle cx="9.5" cy="7.75" r="3.25" />
      <path d="M3.75 19.25a5.75 5.75 0 0 1 11.5 0" />
      <circle cx="17.25" cy="9.5" r="2.25" />
      <path d="M16.75 14.4a4.6 4.6 0 0 1 3.5 4.85" />
    </Icon>
  )
}

/** Insumos — caja de inventario */
export function IconInsumos({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 3.25 3.75 7.4v9.2L12 20.75l8.25-4.15V7.4z" {...accent(filled)} />
      <path d="M12 3.25 3.75 7.4v9.2L12 20.75l8.25-4.15V7.4z" />
      <path d="M3.75 7.4 12 11.55l8.25-4.15" />
      <path d="M12 11.55v9.2" />
    </Icon>
  )
}

/** Platos — plato con campana de servicio */
export function IconPlatos({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4.5 16.5a7.5 7.5 0 0 1 15 0z" {...accent(filled)} />
      <path d="M4.5 16.5a7.5 7.5 0 0 1 15 0" />
      <path d="M2.75 16.5h18.5" />
      <path d="M12 6.25V5" />
      <circle cx="12" cy="3.75" r="1.15" />
    </Icon>
  )
}

/** Menús — calendario */
export function IconMenus({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3.25" y="5" width="17.5" height="15.75" rx="3" {...accent(filled)} />
      <rect x="3.25" y="5" width="17.5" height="15.75" rx="3" />
      <path d="M3.25 10h17.5" />
      <path d="M8.25 3.25v3.5M15.75 3.25v3.5" />
      <path d="M7.75 14h3M7.75 17.25h6.5" />
    </Icon>
  )
}

/** Cocina — olla con vapor */
export function IconCocina({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 9.75h16v4.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" {...accent(filled)} />
      <path d="M4 9.75h16v4.5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" />
      <path d="M4 11.5H2.25M20 11.5h1.75" />
      <path d="M9.25 6.5c0-1.4 1.5-1.6 1.5-3M14 6.5c0-1.4 1.5-1.6 1.5-3" />
    </Icon>
  )
}

/** Compras — carrito */
export function IconCompras({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6.15 7.75H20.5l-1.6 7.05a1.75 1.75 0 0 1-1.7 1.35H9.2a1.75 1.75 0 0 1-1.71-1.38z" {...accent(filled)} />
      <path d="M2.75 3.75h2.1l2.64 11.02a1.75 1.75 0 0 0 1.71 1.38h7.99a1.75 1.75 0 0 0 1.7-1.35L20.5 7.75H6.15" />
      <circle cx="9.75" cy="19.75" r="1.5" />
      <circle cx="17.25" cy="19.75" r="1.5" />
    </Icon>
  )
}

/** Panel — retícula de estaciones */
export function IconPanel({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3.25" y="3.25" width="7.5" height="7.5" rx="2.25" {...accent(filled)} />
      <rect x="3.25" y="3.25" width="7.5" height="7.5" rx="2.25" />
      <rect x="13.25" y="3.25" width="7.5" height="7.5" rx="2.25" />
      <rect x="3.25" y="13.25" width="7.5" height="7.5" rx="2.25" />
      <rect x="13.25" y="13.25" width="7.5" height="7.5" rx="2.25" />
    </Icon>
  )
}

// ─────────────────────────────────────────────
// Sub-navegación de Menús
// ─────────────────────────────────────────────

/** Importar — archivo entrando a la bandeja */
export function IconImportar({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3.75 14.5v3.25a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V14.5z" {...accent(filled)} />
      <path d="M12 3.25v10.5" />
      <path d="M8.25 10.25 12 14l3.75-3.75" />
      <path d="M3.75 14.5v3.25a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V14.5" />
    </Icon>
  )
}

/** Manual — calendario con nueva entrada */
export function IconManual({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3.25" y="5" width="17.5" height="15.75" rx="3" {...accent(filled)} />
      <rect x="3.25" y="5" width="17.5" height="15.75" rx="3" />
      <path d="M3.25 10h17.5" />
      <path d="M8.25 3.25v3.5M15.75 3.25v3.5" />
      <path d="M12 12.75v5.25M9.375 15.375h5.25" />
    </Icon>
  )
}

/** Editar — lápiz */
export function IconEditar({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16z" {...accent(filled)} />
      <path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16z" />
      <path d="M14.25 5.75 18.25 9.75" />
    </Icon>
  )
}

/** Visualización — ojo */
export function IconVisualizacion({ filled, ...p }: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3.25" {...accent(filled)} />
      <path d="M2.5 12S6.25 5.5 12 5.5 21.5 12 21.5 12 17.75 18.5 12 18.5 2.5 12 2.5 12" />
      <circle cx="12" cy="12" r="3.25" />
    </Icon>
  )
}

// ─────────────────────────────────────────────
// Chrome de navegación
// ─────────────────────────────────────────────

/** Hamburguesa — las tres barras */
export function IconMenuBurger(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      {...p}
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

export function IconCerrar(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      {...p}
    >
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  )
}
