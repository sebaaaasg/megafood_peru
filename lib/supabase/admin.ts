import { createClient } from '@supabase/supabase-js'

// Cliente con service_role para operaciones de administrador
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 🔥 Si no está configurada, mostrar error claro
  if (!supabaseServiceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.local')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada. Agrega la variable en .env.local')
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}