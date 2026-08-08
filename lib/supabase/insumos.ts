import { createClient } from './server'

export type Insumo = {
  id: string
  nombre: string
  unidad: string
  categoria: string
  precio: number
  created_by?: string
  created_at?: string
  updated_at?: string
}

export type InsumoInput = Omit<Insumo, 'id' | 'created_at' | 'updated_at' | 'created_by'>

// Obtener todos los insumos
export async function getInsumos(): Promise<Insumo[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error al obtener insumos:', error)
    return []
  }

  return data || []
}

// Obtener insumos por categoría
export async function getInsumosByCategoria(categoria: string): Promise<Insumo[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('categoria', categoria)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error al obtener insumos por categoría:', error)
    return []
  }

  return data || []
}

// Crear un nuevo insumo
export async function createInsumo(insumo: InsumoInput): Promise<Insumo | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Usuario no autenticado')
  }

  const { data, error } = await supabase
    .from('insumos')
    .insert({
      ...insumo,
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Error al crear insumo:', error)
    throw new Error(error.message)
  }

  return data
}

// Actualizar un insumo
export async function updateInsumo(id: string, insumo: Partial<InsumoInput>): Promise<Insumo | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('insumos')
    .update(insumo)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error al actualizar insumo:', error)
    throw new Error(error.message)
  }

  return data
}

// Eliminar un insumo
export async function deleteInsumo(id: string): Promise<void> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('insumos')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error al eliminar insumo:', error)
    throw new Error(error.message)
  }
}

// Obtener categorías únicas con conteo
export async function getCategoriasWithCount(): Promise<{ name: string; count: number }[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('insumos')
    .select('categoria')

  if (error) {
    console.error('Error al obtener categorías:', error)
    return []
  }

  // Contar insumos por categoría
  const counts: Record<string, number> = {}
  data?.forEach(item => {
    counts[item.categoria] = (counts[item.categoria] || 0) + 1
  })

  return Object.entries(counts).map(([name, count]) => ({
    name,
    count
  }))
}

// Buscar insumos por término
export async function searchInsumos(searchTerm: string): Promise<Insumo[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .ilike('nombre', `%${searchTerm}%`)
    .order('nombre', { ascending: true })

  if (error) {
    console.error('Error al buscar insumos:', error)
    return []
  }

  return data || []
}