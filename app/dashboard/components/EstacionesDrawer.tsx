// app/dashboard/components/EstacionesDrawer.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { IconPanel, IconCerrar } from './NucleoIcons'
import { estacionesVisibles, P, TONOS } from './estaciones'

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
        style={{ background: 'rgba(32,30,29,0.45)' }}
      />

      <aside
        id="drawer-estaciones"
        role="dialog"
        aria-modal="true"
        aria-label="Estaciones operativas"
        className={`fixed inset-y-0 left-0 z-[70] flex w-[300px] max-w-[86vw] flex-col shadow-2xl transition-transform duration-300 ease-out ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: P.n100, borderRadius: '0 32px 32px 0' }}
      >
        {/* Cabecera */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ background: P.a900, borderRadius: '0 32px 0 0' }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                `repeating-linear-gradient(135deg, ${P.a800} 0 22px, transparent 22px 44px), repeating-linear-gradient(45deg, ${P.a800} 0 22px, transparent 22px 44px)`,
              backgroundSize: '62px 62px',
            }}
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-3 px-5 pb-6 pt-5">
            <div>
              <div className="flex items-center gap-2.5">
                <Image
                  src="/megafood.png"
                  alt=""
                  width={34}
                  height={34}
                  className="object-contain"
                  style={{ width: 34, height: 34 }}
                />
                <span className="text-xl leading-none" style={{ fontFamily: 'var(--font-caprasimo)', color: P.n100 }}>
                  Megafood <span style={{ color: P.a400 }}>Perú</span>
                </span>
              </div>
              <p
                className="mt-3 text-[10px] font-extrabold uppercase"
                style={{ letterSpacing: '0.16em', color: P.a300 }}
              >
                Estaciones operativas
              </p>
              <p className="mt-1 text-xs" style={{ color: P.n300 }}>
                👋 {displayName}
              </p>
            </div>

            <button
              onClick={onCerrar}
              aria-label="Cerrar menú"
              className="shrink-0 rounded-lg p-1.5 transition hover:bg-white/10 focus:outline-none focus:ring-2"
              style={{ color: P.n300 }}
            >
              <IconCerrar style={{ width: 18, height: 18 }} />
            </button>
          </div>
        </div>

        {/* Estaciones */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibles.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm" style={{ color: P.n600 }}>
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
                      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 transition-all duration-200 hover:translate-x-0.5 focus:outline-none focus:ring-2"
                      style={{ background: activa ? t.pill : 'transparent' }}
                    >
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full transition-all duration-200"
                        style={{ width: 3, height: activa ? 26 : 0, background: t.chip }}
                        aria-hidden="true"
                      />

                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                        style={{
                          background: activa ? t.chip : t.halo,
                          color: activa ? t.onChip : t.onPill,
                        }}
                      >
                        <Icon filled={activa} style={{ width: 20, height: 20 }} />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-[15px] font-bold leading-tight"
                          style={{ color: activa ? t.onPill : P.text }}
                        >
                          {est.label}
                        </span>
                        <span className="block truncate text-[11px] leading-tight" style={{ color: P.n600 }}>
                          {est.hint}
                        </span>
                      </span>

                      <span
                        className="shrink-0 text-[10px] font-extrabold"
                        style={{ letterSpacing: '0.14em', color: activa ? t.link : P.n400 }}
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
        <div className="shrink-0 px-3 py-3" style={{ borderTop: `1px solid ${P.n300}` }}>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors focus:outline-none focus:ring-2"
            style={{ color: P.n700 }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: P.n200 }}
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
