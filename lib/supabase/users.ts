import { createClient } from './client'

export async function getEmailByUsername(username: string): Promise<string | null> {
  const supabase = createClient()
  
  // Si es un email directo, devolverlo
  if (username.includes('@')) {
    return username
  }


  try {
    // Buscar en la tabla de aliases
    const { data, error } = await supabase
      .from('user_aliases')
      .select('email')
      .ilike('username', username)
      .maybeSingle() // Usamos maybeSingle en lugar de single para evitar el error 406

    if (error) {
      console.error('Error al buscar username:', error)
      return null
    }

    return data?.email || null
  } catch (error) {
    console.error('Error en getEmailByUsername:', error)
    return null
  }
}