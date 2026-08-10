'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────

interface CrearUsuarioInput {
  full_name: string
  email: string
  password: string
  role: string
  sede_id: string | null
}

interface EditarUsuarioInput {
  full_name: string
  email: string
  role: string
  sede_id: string | null
}

// ─────────────────────────────────────────────────────────
// Guard de autorización — corre en TODAS las actions
// ─────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('No autenticado')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('No se pudo verificar el perfil del usuario')
  }

  if (!['admin', 'gerencia'].includes(profile.role)) {
    throw new Error('No tienes permisos para realizar esta acción')
  }

  return user
}

// ─────────────────────────────────────────────────────────
// Crear usuario
// ─────────────────────────────────────────────────────────

export async function crearUsuario(input: CrearUsuarioInput) {
  await requireAdmin()

  if (!input.full_name.trim() || !input.email.trim()) {
    throw new Error('Nombre y email son obligatorios')
  }

  if (input.role === 'cocinero' && !input.sede_id) {
    throw new Error('Debes seleccionar una sede para el rol de cocinero')
  }

  const admin = createAdminClient()

  // 1. Crear usuario en Supabase Auth
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password || '123456',
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name.trim(),
      role: input.role,
      sede_id: input.role === 'cocinero' ? input.sede_id : null,
    },
  })

  if (createError) {
    throw new Error('Error al crear usuario en Auth: ' + createError.message)
  }
  if (!newUser?.user) {
    throw new Error('No se pudo crear el usuario')
  }

  const userId = newUser.user.id

  // 2. Crear/actualizar perfil en la tabla profiles
  //    (si tienes un trigger que ya crea el profile automáticamente al
  //    insertar en auth.users, cambia esto por un UPDATE en vez de INSERT)
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      id: userId,
      email: input.email.trim(),
      full_name: input.full_name.trim(),
      role: input.role,
      sede_id: input.role === 'cocinero' ? input.sede_id : null,
    })

  if (profileError) {
    await admin.auth.admin.deleteUser(userId) // rollback
    throw new Error('Error al crear el perfil: ' + profileError.message)
  }

  // 3. Crear alias
  const username = input.email.trim().split('@')[0]
  const { error: aliasError } = await admin
    .from('user_aliases')
    .insert({ id: userId, username, email: input.email.trim() })

  if (aliasError) {
    // No abortamos el flujo completo por esto: el usuario ya puede
    // loguearse con su email completo. Solo lo registramos.
    console.error('Error al crear alias:', aliasError.message)
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true, userId }
}

// ─────────────────────────────────────────────────────────
// Editar usuario
// ─────────────────────────────────────────────────────────

export async function editarUsuario(id: string, input: EditarUsuarioInput) {
  await requireAdmin()

  if (!input.full_name.trim() || !input.email.trim()) {
    throw new Error('Nombre y email son obligatorios')
  }

  if (input.role === 'cocinero' && !input.sede_id) {
    throw new Error('Debes seleccionar una sede para el rol de cocinero')
  }

  const admin = createAdminClient()

  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: input.full_name.trim(),
      email: input.email.trim(),
      role: input.role,
      sede_id: input.role === 'cocinero' ? input.sede_id : null,
    })
    .eq('id', id)

  if (profileError) {
    throw new Error('Error al actualizar el perfil: ' + profileError.message)
  }

  // Mantener sincronizado el email en Supabase Auth si cambió
  const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, {
    email: input.email.trim(),
  })
  if (authUpdateError) {
    console.error('Error al actualizar email en Auth:', authUpdateError.message)
  }

  const username = input.email.trim().split('@')[0]
  const { error: aliasError } = await admin
    .from('user_aliases')
    .update({ username, email: input.email.trim() })
    .eq('id', id)

  if (aliasError) {
    console.error('Error al actualizar alias:', aliasError.message)
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

// ─────────────────────────────────────────────────────────
// Eliminar usuario
// ─────────────────────────────────────────────────────────

export async function eliminarUsuario(id: string) {
  const currentUser = await requireAdmin()

  if (currentUser.id === id) {
    throw new Error('No puedes eliminar tu propio usuario')
  }

  const admin = createAdminClient()

  // Borra primero las tablas dependientes para evitar registros huérfanos
  const { error: aliasError } = await admin.from('user_aliases').delete().eq('id', id)
  if (aliasError) {
    console.error('Error al eliminar alias:', aliasError.message)
  }

  const { error: profileError } = await admin.from('profiles').delete().eq('id', id)
  if (profileError) {
    console.error('Error al eliminar perfil:', profileError.message)
  }

  // Elimina al final el usuario en Auth (esto es lo irreversible)
  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) {
    throw new Error('Error al eliminar usuario: ' + error.message)
  }

  revalidatePath('/dashboard/usuarios')
  return { success: true }
}

// ─────────────────────────────────────────────────────────
// Crear sede
// ─────────────────────────────────────────────────────────

export async function crearSede(nombre: string) {
  await requireAdmin()

  const nombreLimpio = nombre.trim()
  if (!nombreLimpio) {
    throw new Error('El nombre de la sede es obligatorio')
  }

  // Aquí basta el cliente normal (no admin): la política RLS de "sedes"
  // ya permite INSERT/UPDATE/DELETE a admin, y requireAdmin() ya confirmó el rol.
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sedes')
    .insert({ nombre: nombreLimpio })
    .select('id, nombre')
    .single()

  if (error) {
    throw new Error('Error al crear la sede: ' + error.message)
  }

  revalidatePath('/dashboard/usuarios')
  return data
}