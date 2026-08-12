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

export type Tone = 'terracota' | 'oliva'

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
  { id: 'usuarios', n: '01', label: 'Usuarios', hint: 'Roles y accesos por local', href: '/dashboard/usuarios', icon: IconUsuarios, tone: 'oliva'     },
  { id: 'insumos',  n: '02', label: 'Insumos',  hint: 'Catálogo e inventario',     href: '/dashboard/insumos',  icon: IconInsumos,  tone: 'terracota' },
  { id: 'platos',   n: '03', label: 'Platos',   hint: 'Recetas y componentes',     href: '/dashboard/platos',   icon: IconPlatos,   tone: 'oliva'     },
  { id: 'menus',    n: '04', label: 'Menús',    hint: 'Programación por semana',   href: '/dashboard/menus',    icon: IconMenus,    tone: 'terracota' },
  { id: 'cocina',   n: '05', label: 'Cocina',   hint: 'Requerimiento diario',      href: '/dashboard/cocina',   icon: IconCocina,   tone: 'oliva'     },
  { id: 'compra',   n: '06', label: 'Compras',  hint: 'Órdenes a proveedores',     href: '/dashboard/compras',  icon: IconCompras,  tone: 'terracota' },
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
// Paleta "organic": crema, terracota y oliva.
// Tomada de los valores del diseño aprobado del panel.
// ─────────────────────────────────────────────
export const P = {
  bg: '#f5ead8',
  surface: '#ebddc5',
  text: '#201e1d',

  // Terracota
  a100: '#fff2eb', a200: '#ffe1d0', a300: '#ffc6a5', a400: '#f6a06b',
  a500: '#d67f48', a: '#c67139', a600: '#b2622d', a700: '#8c491a',
  a800: '#643312', a900: '#402310',

  // Oliva
  b100: '#f0fae1', b200: '#e1eecc', b300: '#ccdbb2', b400: '#aebf92',
  b500: '#8fa073', b: '#7a8a5e', b600: '#728157', b700: '#56633f',
  b800: '#3d472b', b900: '#272e1b',

  // Neutros
  n100: '#f9f4ed', n200: '#eee7db', n300: '#dcd3c4', n400: '#c0b6a5',
  n500: '#a19786', n600: '#82796a', n700: '#645c50', n800: '#474238',
  n900: '#2e2b25',
} as const

/** Colores por tono, para las tarjetas y el rail. */
export const TONOS: Record<Tone, { chip: string; onChip: string; halo: string; pill: string; onPill: string; link: string }> = {
  terracota: { chip: P.a,    onChip: P.n100, halo: P.a200, pill: P.a200, onPill: P.a800, link: P.a700 },
  oliva:     { chip: P.b600, onChip: P.n100, halo: P.b200, pill: P.b200, onPill: P.b800, link: P.b700 },
}
