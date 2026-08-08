import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPlatos, getInsumos, getSedes } from '@/lib/supabase/platos'
import PlatosClient from '@/components/platos/PlatosClient'

export default async function PlatosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener datos
  const platos = await getPlatos()
  const insumos = await getInsumos()
  const sedes = await getSedes()

  // Verificar si el usuario es admin (para mostrar acciones)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  return (
    <PlatosClient
      initialPlatos={platos}
      initialInsumos={insumos}
      initialSedes={sedes}
      isAdmin={isAdmin}
    />
  )
}