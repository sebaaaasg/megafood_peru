// app/dashboard/components/DashboardChrome.tsx
'use client'

import { usePathname } from 'next/navigation'
import SidebarNav from './SidebarNav'
import UserChip from './UserChip'

/**
 * Píldoras flotantes de navegación y sesión.
 *
 * Se ocultan en las rutas que ya traen su propia barra con hamburguesa y
 * usuario (el panel principal y su rail lateral, o la píldora superior del
 * diseño de Insumos); ahí duplicarían ambos controles.
 */
const RUTAS_CON_CHROME_PROPIO = ['/dashboard', '/dashboard/insumos']
export default function DashboardChrome({
  role,
  displayName,
}: {
  role: string | null
  displayName: string
}) {
  const pathname = usePathname()

  const normalizada = pathname.replace(/\/$/, '')
  if (RUTAS_CON_CHROME_PROPIO.includes(normalizada)) return null

  return (
    <div className="pointer-events-none sticky top-0 z-50 h-0">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-3 sm:px-5">
        <div className="pointer-events-auto">
          <SidebarNav role={role} displayName={displayName} />
        </div>
        <div className="pointer-events-auto">
          <UserChip displayName={displayName} />
        </div>
      </div>
    </div>
  )
}
