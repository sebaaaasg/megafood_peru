import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 🔥 Usar el cliente creado en lib/supabase/server.ts
  const supabase = await createClient()
  
  // 🔥 Usar getUser() en lugar de getSession() para mayor seguridad
  const { data: { user }, error } = await supabase.auth.getUser()

  // Si no hay usuario autenticado o hay error, redirigir al login
  if (error || !user) {
    redirect('/login')
  }

  // Obtener el email del usuario autenticado
  const userEmail = user.email ?? 'Usuario'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header Superior Fijo */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[#8CC63F] rounded-lg p-1">
            {/* 🔥 IMAGEN PERSONALIZADA */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/megafood.png"
                alt="MegaFood Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-bold text-lg text-slate-800 tracking-tight">
              Megafood <span className="text-[#8CC63F]">Perú</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-slate-500">Conectado como</span>
              <span className="text-sm font-medium text-slate-700">{userEmail}</span>
            </div>

            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}