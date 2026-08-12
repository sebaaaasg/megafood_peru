// app/dashboard/components/SidebarNav.tsx
'use client'

import { useCallback, useState } from 'react'
import { IconMenuBurger } from './NucleoIcons'
import { P } from './estaciones'
import EstacionesDrawer from './EstacionesDrawer'

/**
 * Disparador flotante del menú de estaciones, para las páginas que no
 * tienen el rail del panel principal. El panel en sí vive en
 * EstacionesDrawer, que también usa el rail de /dashboard.
 */
export default function SidebarNav({
  role,
  displayName,
}: {
  role: string | null
  displayName: string
}) {
  const [abierto, setAbierto] = useState(false)
  const cerrar = useCallback(() => setAbierto(false), [])

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        aria-label="Abrir menú de estaciones"
        aria-expanded={abierto}
        aria-controls="drawer-estaciones"
        className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border shadow-[0_6px_20px_-10px_rgba(46,43,37,0.45)] backdrop-blur-md transition-all hover:brightness-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: 'rgba(249,244,237,0.9)',
          borderColor: P.n300,
          color: P.a900,
          // @ts-expect-error -- variables CSS del anillo de foco
          '--tw-ring-color': P.a,
          '--tw-ring-offset-color': P.bg,
        }}
      >
        <IconMenuBurger style={{ width: 22, height: 22 }} />
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 scale-50 rounded-full opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100"
          style={{ background: P.b600 }}
          aria-hidden="true"
        />
      </button>

      <EstacionesDrawer
        abierto={abierto}
        onCerrar={cerrar}
        role={role}
        displayName={displayName}
      />
    </>
  )
}
