// app/dashboard/components/UserChip.tsx
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

/** Iniciales para el avatar: "Juan Pérez" -> "JP", "Administrador" -> "A". */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase()
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase()
}

/**
 * Píldora flotante de sesión: avatar + nombre + salir.
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
    <div className="flex items-center gap-1 rounded-2xl border border-black/5 bg-white/85 py-1.5 pl-1.5 pr-1.5 shadow-[0_6px_20px_-10px_rgba(43,43,43,0.35)] backdrop-blur-md sm:gap-2 sm:pl-2 sm:pr-2">
      {/* Avatar */}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black"
        style={{ background: '#EAF5DE', color: '#4A7A1E' }}
        aria-hidden="true"
      >
        {iniciales(displayName)}
      </span>

      <span className="hidden max-w-[160px] truncate text-sm font-semibold text-[#2B2B2B] sm:block">
        {displayName}
      </span>

      <span className="hidden h-5 w-px bg-black/10 sm:block" aria-hidden="true" />

      <button
        onClick={handleLogout}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#6B6B65] transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  )
}
