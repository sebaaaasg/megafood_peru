// app/dashboard/components/EstacionesDrawer.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { IconPanel, IconCerrar } from './NucleoIcons'
import { estacionesVisibles, P, TONOS, BLOBS } from './estaciones'

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

  // Cierra al navegar a otra ruta. Se ajusta durante el render (y no en un
  // efecto) para que el drawer no llegue a pintarse abierto sobre la página
  // nueva; cubre también la navegación con atrás/adelante del navegador.
  const [pathnamePrevio, setPathnamePrevio] = useState(pathname)
  if (pathname !== pathnamePrevio) {
    setPathnamePrevio(pathname)
    if (abierto) onCerrar()
  }

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
        className={`fixed inset-0 z-[60] backdrop-blur-[2px] transition-opacity duration-300 ${
          abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        style={{ background: 'rgba(44,44,36,0.42)' }}
      />

      <aside
        id="drawer-estaciones"
        role="dialog"
        aria-modal="true"
        aria-label="Estaciones operativas"
        className={`fixed inset-y-0 left-0 z-[70] flex w-[300px] max-w-[86vw] flex-col shadow-2xl transition-transform duration-300 ease-out ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: P.bg,
          borderRadius: '0 2.5rem 2.5rem 0',
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
        }}
      >
        {/* Cabecera */}
        <div className="relative shrink-0 overflow-hidden" style={{ borderRadius: '0 2.5rem 0 0' }}>
          {/* Halos orgánicos, en lugar del tramado del diseño anterior */}
          <span
            className="pointer-events-none absolute"
            style={{ left: -80, top: -90, width: 260, height: 260, background: 'rgba(140,198,63,0.35)', filter: 'blur(50px)', borderRadius: BLOBS[0] }}
            aria-hidden="true"
          />
          <span
            className="pointer-events-none absolute"
            style={{ right: -70, top: -40, width: 200, height: 200, background: 'rgba(243,127,33,0.28)', filter: 'blur(50px)', borderRadius: BLOBS[1] }}
            aria-hidden="true"
          />

          <div className="relative flex items-start justify-between gap-3 px-5 pb-6 pt-5">
            <div>
              <Link
                href="/dashboard"
                aria-label="Ir al panel principal"
                className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2"
              >
                <span
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{ background: P.verde }}
                >
                  <Image
                    src="/megafood3.png"
                    alt=""
                    width={34}
                    height={34}
                    className="object-contain"
                    style={{ width: 34, height: 34 }}
                  />
                </span>
                <span style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 18, color: P.tinta }}>
                  Megafood <span style={{ color: P.piedra }}>Perú</span>
                </span>
              </Link>
              <p
                className="mt-3 text-[10px] font-extrabold uppercase"
                style={{ letterSpacing: '0.16em', color: '#4A5F2A' }}
              >
                Estaciones operativas
              </p>
              <p className="mt-1 text-xs" style={{ color: P.tintaSuave }}>
                👋 {displayName}
              </p>
            </div>

            <button
              onClick={onCerrar}
              aria-label="Cerrar menú"
              className="shrink-0 rounded-full p-1.5 transition hover:bg-black/5 focus:outline-none focus:ring-2"
              style={{ color: P.tintaSuave }}
            >
              <IconCerrar style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Estaciones */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibles.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm" style={{ color: P.tintaSuave }}>
              No tienes estaciones asignadas.
              <br />
              Contacta a un administrador.
            </p>
          ) : (
            <ul className="space-y-1">
              {visibles.map((est, i) => {
                const activa = esActiva(est.href)
                const t = TONOS[est.tone]
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
                      className="group relative flex items-center gap-3 overflow-hidden px-3 py-2.5 transition-all duration-200 hover:translate-x-0.5 focus:outline-none focus:ring-2"
                      style={{ background: activa ? t.suave : 'transparent', borderRadius: 9999 }}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-110"
                        style={{
                          // Cada estación toma una forma de blob distinta.
                          borderRadius: BLOBS[i % BLOBS.length],
                          background: activa ? t.solido : t.suave,
                          color: activa ? t.sobreSolido : t.tinta,
                        }}
                      >
                        <Icon filled={activa} style={{ width: 20, height: 20 }} strokeWidth={2} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-[15px] leading-tight"
                          style={{
                            fontFamily: 'var(--font-fraunces), serif',
                            fontWeight: 700,
                            color: activa ? t.tinta : P.tinta,
                          }}
                        >
                          {est.label}
                        </span>
                        <span className="block truncate text-[11px] leading-tight" style={{ color: P.tintaSuave }}>
                          {est.hint}
                        </span>
                      </span>

                      <span
                        className="shrink-0 text-[10px] font-extrabold"
                        style={{ letterSpacing: '0.14em', color: activa ? t.tinta : P.tintaSuave }}
                      >
                        {est.n}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        {/* Pie */}
        <div className="shrink-0 px-3 py-3" style={{ borderTop: `1px solid ${P.borde}` }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-black/[0.03] focus:outline-none focus:ring-2"
            style={{ color: P.tintaMedia, borderRadius: 9999 }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center"
              style={{ background: 'rgba(107,107,101,0.14)', borderRadius: BLOBS[3] }}
            >
              <IconPanel style={{ width: 18, height: 18 }} />
            </span>
            <span className="text-sm font-bold">Panel principal</span>
          </Link>
        </div>
      </aside>
    </>
  )
}
