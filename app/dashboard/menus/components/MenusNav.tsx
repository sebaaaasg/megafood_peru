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

const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'

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
 * Va dentro del hero brutalista de cada página del módulo (fondo claro).
 */
export default function MenusNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Herramientas de menús" className="mt-6">
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
                className="group flex items-center gap-2 border-2 px-3 py-2 text-[12px] font-extrabold uppercase transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  letterSpacing: '0.06em',
                  background: activa ? op.accent : '#fff',
                  borderColor: activa ? op.accent : OSCURO,
                  color: activa ? op.ink : OSCURO,
                  // @ts-expect-error -- variables CSS del anillo de foco
                  '--tw-ring-color': op.accent,
                  '--tw-ring-offset-color': FONDO,
                }}
              >
                <Icon
                  filled={activa}
                  style={{ width: 16, height: 16 }}
                  className="shrink-0"
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
