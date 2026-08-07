import { createClient } from './client'

export async function getEmailByUsername(username: string): Promise<string | null> {
  const supabase = createClient()
  
  // Buscar en la tabla de aliases
  const { data, error } = await supabase
    .from('user_aliases')
    .select('email')
    .ilike('username', username)
    .single()
  
  if (error || !data) {
    // Si no existe, asumir que es admin@sistema.com
    if (username.toLowerCase() === 'admin') {
      return 'admin@sistema.com'
    }
    return null
  }
  
  return data.email
}