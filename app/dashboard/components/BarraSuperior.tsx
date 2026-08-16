// app/dashboard/components/BarraSuperior.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { P } from './estaciones'

function IconHamburguesa({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

/**
 * Cabecera oscura del diseño "Panel de logística": botón de menú, logo,
 * marca y chip de sesión.
 */
export default function BarraSuperior({
  displayName,
  menuAbierto,
  onAbrirMenu,
}: {
  displayName: string
  menuAbierto: boolean
  onAbrirMenu: () => void
}) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-4 px-5 py-3.5 sm:px-8"
      style={{ background: '#201E1D', color: '#fff' }}
    >
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menú de estaciones"
        aria-controls="drawer-estaciones"
        aria-expanded={menuAbierto}
        className="flex h-8 w-8 shrink-0 items-center justify-center text-white transition-colors hover:opacity-90"
        style={{ background: P.naranja }}
      >
        <IconHamburguesa size={18} />
      </button>

      <Link
        href="/dashboard"
        aria-label="Ir al panel"
        className="flex shrink-0 items-center gap-2.5"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ background: P.verde }}
        >
          <Image
            src="/megafood3.png"
            alt="MegaFood"
            width={26}
            height={26}
            className="object-contain"
            style={{ width: 26, height: 26 }}
            priority
          />
        </span>
        <span style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' }}>
          Megafood <span style={{ color: P.verde }}>Perú</span>
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <span
          className="hidden text-[10px] font-extrabold sm:inline"
          style={{ letterSpacing: '0.14em', color: P.verde }}
        >
          EN LÍNEA
        </span>
        <span className="hidden text-[13px] font-extrabold sm:inline">{displayName}</span>
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="flex h-8 w-8 shrink-0 items-center justify-center border transition-colors hover:border-transparent"
          style={{ borderColor: 'rgba(255,255,255,0.35)', color: '#fff' }}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
