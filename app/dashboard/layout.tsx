import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import LogoutButton from '@/app/dashboard/components/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // 🔥 Obtener el full_name de la tabla profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Si tiene full_name, usarlo. Si no, usar el email como fallback
  let displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario'
  // Capitalizar la primera letra si es un nombre simple
  displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header Superior Fijo */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-[#8CC63F] rounded-lg p-1">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/megafood.png"
                alt="MegaFood Logo"
                width={40}
                height={40}
                className="object-contain"
                style={{ width: '40px', height: '40px' }}
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
              {/* 🔥 Mostrar el full_name de la tabla profiles */}
              <span className="text-sm font-medium text-slate-700">{displayName}</span>
            </div>

            <LogoutButton />
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