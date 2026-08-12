import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardChrome from '@/app/dashboard/components/DashboardChrome'

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

  // 🔥 Obtener el full_name y el rol de la tabla profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Si tiene full_name, usarlo. Si no, usar el email como fallback
  let displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario'
  // Capitalizar la primera letra si es un nombre simple
  displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1)

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/*
        Chrome flotante: no pinta barra propia, solo dos píldoras que quedan
        suspendidas sobre el contenido de cada página. El contenedor es sticky
        y sin fondo; `pointer-events-none` deja pasar los clics al contenido de
        debajo, y cada píldora los vuelve a capturar.
      */}
      <DashboardChrome role={profile?.role ?? null} displayName={displayName} />

      {/*
        Sin contenedor propio: cada página del dashboard trae su `min-h-screen`
        y su `max-w-7xl`, así que constreñirlas aquí solo las encogía.
      */}
      <main className="flex-1 w-full">{children}</main>
    </div>
  )
}