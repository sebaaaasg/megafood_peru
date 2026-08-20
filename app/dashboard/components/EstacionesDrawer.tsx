// app/dashboard/components/EstacionesDrawer.tsx
'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { IconPanel, IconCerrar } from './NucleoIcons'
import { estacionesVisibles, P, TONOS } from './estaciones'

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'
const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'

/**
 * Panel lateral de estaciones. Es controlado: quien lo usa decide cuándo
 * está abierto, de modo que el disparador puede vivir en el chrome flotante
 * (SidebarNav) o dentro del rail del panel principal.
 */
export default function EstacionesDrawer({
  abierto,
  onCerrar,
  role,
  displayName,
}: {
  abierto: boolean
  onCerrar: () => void
  role: string | null
  displayName: string
}) {
  const pathname = usePathname()

  // Cierra al navegar a otra ruta. Se usa un layout effect (no un cambio de
  // estado durante el render) porque el disparador y el drawer pueden vivir
  // en componentes distintos (SidebarNav vs. el rail del panel principal), y
  // React no permite actualizar el estado de otro componente en render. El
  // layout effect corre antes del pintado del navegador, así que el drawer
  // no llega a pintarse abierto sobre la página nueva; cubre también la
  // navegación con atrás/adelante del navegador.
  const pathnameRef = useRef(pathname)
  useLayoutEffect(() => {
    if (pathname !== pathnameRef.current) {
      pathnameRef.current = pathname
      if (abierto) onCerrar()
    }
  }, [pathname, abierto, onCerrar])

  // Escape para cerrar + bloqueo del scroll de fondo.
  useEffect(() => {
    if (!abierto) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKey)

    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflowPrevio
    }
  }, [abierto, onCerrar])

  const visibles = estacionesVisibles(role)
  const esActiva = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCerrar}
        aria-hidden="true"
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ background: 'rgba(32,30,29,0.55)' }}
      />

      <aside
        id="drawer-estaciones"
        role="dialog"
        aria-modal="true"
        aria-label="Estaciones operativas"
        className={`fixed inset-y-0 left-0 z-[70] flex w-[300px] max-w-[86vw] flex-col shadow-2xl transition-transform duration-300 ease-out ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: FONDO, fontFamily: ARCHIVO }}
      >
        {/* Cabecera */}
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 py-5" style={{ background: OSCURO, color: '#fff' }}>
          <div>
            <Link
              href="/dashboard"
              aria-label="Ir al panel principal"
              className="flex items-center gap-2.5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{ background: P.verde }}
              >
                <Image
                  src="/megafood3.png"
                  alt=""
                  width={26}
                  height={26}
                  className="object-contain"
                  style={{ width: 26, height: 26 }}
                />
              </span>
              <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' }}>
                Megafood <span style={{ color: P.verde }}>Perú</span>
              </span>
            </Link>
            <p
              className="mt-3 text-[10px] font-extrabold"
              style={{ letterSpacing: '0.16em', color: P.verde }}
            >
              ESTACIONES OPERATIVAS
            </p>
            <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {displayName}
            </p>
          </div>

          <button
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="flex h-8 w-8 shrink-0 items-center justify-center border transition-colors hover:border-transparent"
            style={{ borderColor: 'rgba(255,255,255,0.35)', color: '#fff' }}
          >
            <IconCerrar style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Estaciones */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {visibles.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm" style={{ color: P.tintaSuave }}>
              No tienes estaciones asignadas.
              <br />
              Contacta a un administrador.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visibles.map((est, i) => {
                const activa = esActiva(est.href)
                const acento = TONOS[est.tone].solido
                const Icon = est.icon

                return (
                  <li
                    key={est.id}
                    // Solo propiedades longhand: mezclar la abreviada `animation`
                    // con `animationDelay` hace que React avise de conflicto al
                    // alternar la abreviada entre valor y undefined en el rerender.
                    style={{
                      animationName: abierto ? 'mfSlideIn' : 'none',
                      animationDuration: '320ms',
                      animationTimingFunction: 'ease-out',
                      animationFillMode: 'both',
                      animationDelay: `${60 + i * 45}ms`,
                    }}
                  >
                    <Link
                      href={est.href}
                      aria-current={activa ? 'page' : undefined}
                      className="flex items-center gap-3 px-3 py-2.5 transition-colors duration-150"
                      style={{
                        background: activa ? OSCURO : '#fff',
                        color: activa ? '#fff' : OSCURO,
                        borderLeft: `4px solid ${acento}`,
                      }}
                    >
                      <span className="w-6 shrink-0 text-[11px] font-extrabold" style={{ letterSpacing: '0.1em', color: activa ? acento : P.piedra }}>
                        {est.n}
                      </span>

                      <Icon filled={activa} style={{ width: 18, height: 18, flexShrink: 0 }} strokeWidth={2} />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-extrabold leading-tight">
                          {est.label}
                        </span>
                        <span className="block truncate text-[11px] leading-tight" style={{ opacity: 0.65 }}>
                          {est.hint}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        {/* Pie */}
        <div className="shrink-0 px-3 py-3" style={{ borderTop: `2px solid ${OSCURO}` }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-black/5"
            style={{ color: OSCURO }}
          >
            <IconPanel style={{ width: 18, height: 18 }} />
            <span className="text-sm font-extrabold">Panel principal</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
