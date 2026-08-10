'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
      aria-label="Cerrar sesión"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">Salir</span>
    </button>
  )
}