
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UsuariosClient from '@/components/usuarios/UsuariosClient'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verificar que el usuario sea admin o gerencia
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'gerencia'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // Obtener lista de usuarios con sus perfiles y sedes
  const { data: usuarios } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      sede_id,
      created_at,
      sedes (
        id,
        nombre
      )
    `)
    .order('created_at', { ascending: false })

  // Obtener lista de sedes para el formulario
  const { data: sedes } = await supabase
    .from('sedes')
    .select('id, nombre')
    .order('nombre')

  return (
    <UsuariosClient 
      initialUsuarios={usuarios || []} 
      initialSedes={sedes || []}
      currentUserRole={profile.role}
    />
  )
}