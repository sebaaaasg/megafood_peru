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
        className="group relative flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_4px_20px_-2px_rgba(107,107,101,0.35)] transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: P.naranjaBoton,
          // @ts-expect-error -- variables CSS del anillo de foco
          '--tw-ring-color': P.naranja,
          '--tw-ring-offset-color': P.bg,
        }}
      >
        <IconMenuBurger style={{ width: 22, height: 22 }} strokeWidth={2} />
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 scale-50 rounded-full opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100"
          style={{ background: P.verde }}
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
