import { createClient } from './server'

export type Categoria = "ENTRADA" | "CÁRNICO" | "GUARNICIÓN" | "POSTRE" | "BEBIBLE" | "SALSA"

export interface Insumo {
  id: string
  nombre: string
  unidad: string
}

export interface Sede {
  id: string
  nombre: string
}

export interface RecetaLinea {
  insumo_id: string
  cantidad: number
}

export interface RecetaDB {
  cantidad: number
  insumo_id: string
  sede_id: string
  insumos: { nombre: string; unidad: string }
}

export interface Plato {
  id: string
  nombre: string
  categoria: Categoria
  subcategoria: string | null
  recetas: RecetaDB[]
}

// Obtener todos los platos
export async function getPlatos(): Promise<Plato[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("platos")
    .select(`
      id,
      nombre,
      categoria,
      subcategoria,
      recetas:recetas_plato_id_fkey (
        cantidad,
        insumo_id,
        sede_id,
        insumos:recetas_insumo_id_fkey ( nombre, unidad )
      )
    `)
    .order("nombre")

  if (error) {
    console.error("Error al cargar platos:", error.message)
    return []
  }
  
  return data as unknown as Plato[]
}

// Obtener todos los insumos
export async function getInsumos(): Promise<Insumo[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("insumos")
    .select("id, nombre, unidad")
    .order("nombre")

  if (error) {
    console.error("Error al cargar insumos:", error.message)
    return []
  }
  
  return data || []
}

// Obtener todas las sedes
export async function getSedes(): Promise<Sede[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("sedes")
    .select("id, nombre")
    .order("nombre")

  if (error) {
    console.error("Error al cargar sedes:", error.message)
    return []
  }
  
  return data || []
}

// Crear un nuevo plato con su receta
export async function createPlato(
  nombre: string,
  categoria: Categoria,
  subcategoria: string | null,
  sedeId: string,
  lineas: RecetaLinea[]
): Promise<Plato | null> {
  const supabase = await createClient()
  
  const { data: platoCreado, error } = await supabase
    .from("platos")
    .insert({
      nombre: nombre.toUpperCase(),
      categoria,
      subcategoria: categoria === "ENTRADA" ? subcategoria || null : null,
    })
    .select("id")
    .single()

  if (error || !platoCreado) {
    console.error("Error al crear plato:", error?.message)
    return null
  }

  const lineasValidas = lineas.filter(l => l.insumo_id && l.cantidad > 0)
  if (lineasValidas.length > 0) {
    const { error: errR } = await supabase.from("recetas").insert(
      lineasValidas.map(l => ({
        plato_id: platoCreado.id,
        insumo_id: l.insumo_id,
        cantidad: l.cantidad,
        sede_id: sedeId,
      }))
    )
    if (errR) {
      console.error("Error al crear recetas:", errR.message)
    }
  }

  return getPlatoById(platoCreado.id)
}

// Obtener un plato por ID
export async function getPlatoById(id: string): Promise<Plato | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("platos")
    .select(`
      id,
      nombre,
      categoria,
      subcategoria,
      recetas!fk_recetas_plato (
        cantidad,
        insumo_id,
        sede_id,
        insumos!fk_recetas_insumo ( nombre, unidad )
      )
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error al obtener plato:", error.message)
    return null
  }
  
  return data as unknown as Plato
}

// Actualizar un plato y sus recetas para una sede específica
export async function updatePlato(
  platoId: string,
  nombre: string,
  categoria: Categoria,
  subcategoria: string | null,
  sedeId: string,
  lineas: RecetaLinea[]
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error: errP } = await supabase
    .from("platos")
    .update({
      nombre: nombre.toUpperCase(),
      categoria,
      subcategoria: categoria === "ENTRADA" ? subcategoria || null : null,
    })
    .eq("id", platoId)

  if (errP) {
    console.error("Error al actualizar plato:", errP.message)
    return false
  }

  // Eliminar recetas existentes para esta sede
  await supabase
    .from("recetas")
    .delete()
    .eq("plato_id", platoId)
    .eq("sede_id", sedeId)

  // Insertar nuevas recetas
  const lineasValidas = lineas.filter(l => l.insumo_id && l.cantidad > 0)
  if (lineasValidas.length > 0) {
    const { error: errR } = await supabase.from("recetas").insert(
      lineasValidas.map(l => ({
        plato_id: platoId,
        insumo_id: l.insumo_id,
        cantidad: l.cantidad,
        sede_id: sedeId,
      }))
    )
    if (errR) {
      console.error("Error al actualizar recetas:", errR.message)
      return false
    }
  }

  return true
}

// Eliminar un plato
export async function deletePlato(id: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("platos")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error al eliminar plato:", error.message)
    return false
  }
  
  return true
}

// Obtener recetas de un plato para una sede específica
export async function getRecetasByPlatoAndSede(
  platoId: string,
  sedeId: string
): Promise<RecetaLinea[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("recetas")
    .select("insumo_id, cantidad")
    .eq("plato_id", platoId)
    .eq("sede_id", sedeId)

  if (error) {
    console.error("Error al obtener recetas:", error.message)
    return []
  }
  
  return data || []
}export interface Sede {
  id: string
  nombre: string
  // Elimina direccion y telefono si estaban
}