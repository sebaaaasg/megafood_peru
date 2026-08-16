// app/dashboard/components/estaciones.ts
//
// Fuente única de las estaciones y de la paleta del panel.
// El filtro por rol replica ROLE_ACCESS de middleware.ts: si cambia allí,
// hay que cambiarlo aquí para que el menú no ofrezca rutas que el servidor
// va a rechazar.

import type { ReactElement } from 'react'
import {
  IconUsuarios,
  IconInsumos,
  IconPlatos,
  IconMenus,
  IconCocina,
  IconCompras,
  type IconProps,
} from './NucleoIcons'

export type Tone = 'verde' | 'naranja'

export interface Estacion {
  id: string
  n: string
  label: string
  hint: string
  href: string
  icon: (p: IconProps) => ReactElement
  tone: Tone
}

export const ESTACIONES: Estacion[] = [
  { id: 'usuarios', n: '01', label: 'Usuarios', hint: 'Roles y accesos por local', href: '/dashboard/usuarios', icon: IconUsuarios, tone: 'verde'   },
  { id: 'insumos',  n: '02', label: 'Insumos',  hint: 'Catálogo e inventario',     href: '/dashboard/insumos',  icon: IconInsumos,  tone: 'naranja' },
  { id: 'platos',   n: '03', label: 'Platos',   hint: 'Recetas y componentes',     href: '/dashboard/platos',   icon: IconPlatos,   tone: 'verde'   },
  { id: 'menus',    n: '04', label: 'Menús',    hint: 'Programación por semana',   href: '/dashboard/menus',    icon: IconMenus,    tone: 'naranja' },
  { id: 'cocina',   n: '05', label: 'Cocina',   hint: 'Requerimiento diario',      href: '/dashboard/cocina',   icon: IconCocina,   tone: 'verde'   },
  { id: 'compra',   n: '06', label: 'Compras',  hint: 'Órdenes a proveedores',     href: '/dashboard/compras',  icon: IconCompras,  tone: 'naranja' },
]

const ROLE_STATIONS: Record<string, string[] | '*'> = {
  admin: '*',
  gerencia: '*',
  cocinero: ['cocina'],
  compras: ['compra'],
}

export function estacionesVisibles(role: string | null): Estacion[] {
  if (!role) return []
  const allowed = ROLE_STATIONS[role]
  if (!allowed) return []
  if (allowed === '*') return ESTACIONES
  return ESTACIONES.filter((e) => allowed.includes(e.id))
}

// ─────────────────────────────────────────────
// Paleta del diseño "Orgánico", la misma que usa /insumos.
// Crema de fondo, verde y naranja de marca, tintas cálidas.
// ─────────────────────────────────────────────
export const P = {
  bg: '#FDFCF8',
  card: '#FEFEFA',
  tinta: '#2C2C24',
  tintaMedia: '#4A4A40',
  tintaSuave: '#78786C',
  borde: '#DED8CF',
  verde: '#8CC63F',
  naranja: '#F37F21',
  piedra: '#6B6B65',
  /** Naranja del botón de menú, un punto más cálido que el de marca. */
  naranjaBoton: '#F4823A',
} as const

/** Radios orgánicos que se alternan para que nada quede simétrico. */
export const RADIOS = [
  '2rem 2rem 2rem 4rem',
  '4rem 2rem 2rem 2rem',
  '2rem 4rem 2rem 2rem',
  '2rem 2rem 4rem 2rem',
  '4rem 2rem 4rem 2rem',
] as const

/** Formas de blob para los chips de icono y los halos de fondo. */
export const BLOBS = [
  '60% 40% 30% 70% / 60% 30% 70% 40%',
  '30% 70% 70% 30% / 30% 30% 70% 70%',
  '70% 30% 50% 50% / 40% 60% 40% 60%',
  '50% 50% 30% 70% / 60% 40% 60% 40%',
  '40% 60% 60% 40% / 50% 50% 50% 50%',
  '60% 40% 70% 30% / 40% 60% 40% 60%',
] as const

/** Colores por tono, para las tarjetas del panel y el drawer. */
export const TONOS: Record<Tone, { solido: string; suave: string; tinta: string; sobreSolido: string }> = {
  verde:   { solido: '#8CC63F', suave: 'rgba(140,198,63,0.18)', tinta: '#4A5F2A', sobreSolido: '#24310F' },
  naranja: { solido: '#F37F21', suave: 'rgba(243,127,33,0.16)', tinta: '#A85F17', sobreSolido: '#FFFFFF' },
}
