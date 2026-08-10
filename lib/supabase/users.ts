import { createClient } from './client'

export async function getEmailByUsername(username: string): Promise<string | null> {
  const supabase = createClient()

  // Si es un email directo, devolverlo
  if (username.includes('@')) {
    return username
  }

  try {
    const { data, error } = await supabase.rpc('get_email_by_username', {
      p_username: username,
    })

    if (error) {
      console.error('Error al buscar username:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Error en getEmailByUsername:', error)
    return null
  }
}