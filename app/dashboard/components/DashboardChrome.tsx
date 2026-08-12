// app/dashboard/components/DashboardChrome.tsx
'use client'

import { usePathname } from 'next/navigation'
import SidebarNav from './SidebarNav'
import UserChip from './UserChip'

/**
 * Píldoras flotantes de navegación y sesión.
 *
 * Se ocultan en /dashboard: el panel principal trae su propio rail lateral
 * (con la hamburguesa dentro) y su propia cabecera con el chip de usuario,
 * así que aquí duplicarían ambos controles.
 */
export default function DashboardChrome({
  role,
  displayName,
}: {
  role: string | null
  displayName: string
}) {
  const pathname = usePathname()

  if (pathname === '/dashboard' || pathname === '/dashboard/') return null

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
