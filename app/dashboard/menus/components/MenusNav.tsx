// app/dashboard/menus/components/MenusNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconImportar,
  IconManual,
  IconEditar,
  IconVisualizacion,
  type IconProps,
} from '@/app/dashboard/components/NucleoIcons'

interface OpcionMenu {
  href: string
  label: string
  corto: string
  icon: (p: IconProps) => React.ReactElement
  accent: string
  /** Color de texto sobre el acento cuando la opción está activa. */
  ink: string
}

// Los acentos replican VARIANT_STYLES de app/dashboard/menus/page.tsx
// para que la tarjeta y la pestaña de cada opción compartan color.
const OPCIONES: OpcionMenu[] = [
  { href: '/dashboard/menus/importar',      label: 'Importar Excel',  corto: 'Importar',  icon: IconImportar,      accent: '#8CC63F', ink: '#1F3A0A' },
  { href: '/dashboard/menus/manual',        label: 'Programar',       corto: 'Manual',    icon: IconManual,        accent: '#3B82F6', ink: '#FFFFFF' },
  { href: '/dashboard/menus/editar',        label: 'Editar',          corto: 'Editar',    icon: IconEditar,        accent: '#F37F21', ink: '#FFFFFF' },
  { href: '/dashboard/menus/visualizacion', label: 'Visualizar',      corto: 'Ver',       icon: IconVisualizacion, accent: '#8CC63F', ink: '#1F3A0A' },
]

/**
 * Barra de navegación entre las cuatro herramientas de Menús.
 * Va dentro del header oscuro (#2B2B2B) de cada página del módulo.
 */
export default function MenusNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Herramientas de menús" className="mt-5 sm:mt-6">
      <ul className="flex flex-wrap items-center gap-2">
        {OPCIONES.map((op) => {
          const activa = pathname === op.href || pathname.startsWith(op.href + '/')
          const Icon = op.icon

          return (
            <li key={op.href}>
              <Link
                href={op.href}
                aria-current={activa ? 'page' : undefined}
                title={op.label}
                className="group flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: activa ? op.accent : 'rgba(255,255,255,0.08)',
                  borderColor: activa ? op.accent : 'rgba(255,255,255,0.14)',
                  color: activa ? op.ink : '#C9C9C3',
                  boxShadow: activa ? `0 6px 18px -8px ${op.accent}` : 'none',
                  // @ts-expect-error -- variables CSS del anillo de foco
                  '--tw-ring-color': op.accent,
                  '--tw-ring-offset-color': '#2B2B2B',
                }}
              >
                <Icon
                  filled={activa}
                  style={{ width: 17, height: 17 }}
                  className="shrink-0 transition-transform duration-200 group-hover:scale-110"
                />
                <span className="hidden sm:inline">{op.label}</span>
                <span className="sm:hidden">{op.corto}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
