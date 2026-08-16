// app/dashboard/components/UserChip.tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { P } from './estaciones'

/** Icono de persona, el mismo del chip de sesión del diseño "Orgánico". */
function IconPersona({ size = 18 }: { size?: number }) {
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
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </svg>
  )
}

/**
 * Píldora flotante de sesión: persona + nombre + salir.
 * Vive en la barra de chrome del layout del dashboard.
 */
export default function UserChip({ displayName }: { displayName: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div
      className="flex items-center gap-2 py-1.5 pl-1.5 pr-1.5 shadow-[0_4px_20px_-2px_rgba(107,107,101,0.22)] backdrop-blur-md sm:pr-2"
      style={{
        background: 'rgba(255,255,255,0.78)',
        border: '1px solid rgba(222,216,207,0.9)',
        borderRadius: 9999,
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: P.naranja }}
        aria-hidden="true"
      >
        <IconPersona size={18} />
      </span>

      <span
        className="hidden max-w-[160px] truncate text-[13px] font-bold sm:block"
        style={{ color: P.tintaMedia }}
      >
        {displayName}
      </span>

      <span className="hidden h-5 w-px sm:block" style={{ background: P.borde }} aria-hidden="true" />

      <button
        onClick={handleLogout}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        style={{ color: P.tintaSuave }}
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}
