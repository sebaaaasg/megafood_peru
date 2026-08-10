'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Upload, 
  Plus, 
  Loader2, 
  Search,
  Edit,
  FileSpreadsheet,
  X,
  DollarSign,
  Package,      // Abarrotes
  Apple,        // Frutas y Verduras  
  Beef,         // Cárnicos
  FlaskConical, // Químicos
  Trash2,       // Descartables
  Grid3x3       // Todas
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/lib/supabase/insumos'
import * as XLSX from 'xlsx'

type Category = {
  name: string
  count: number
}

interface InsumosClientProps {
  initialInsumos: Insumo[]
  initialCategories: Category[]
}

// Colores para cada categoría
// Colores e iconos para cada categoría
const categoryConfig: Record<string, { 
  bg: string
  hover: string
  active: string
  text: string
  icon: any
}> = {
  'Abarrotes': {
    bg: 'bg-[#8CC63F]/10',
    hover: 'hover:bg-[#8CC63F]/20',
    active: 'bg-[#8CC63F]',
    text: 'text-[#8CC63F]',
    icon: Package
  },
  'Frutas y Verduras': {
    bg: 'bg-[#F37F21]/10',
    hover: 'hover:bg-[#F37F21]/20',
    active: 'bg-[#F37F21]',
    text: 'text-[#F37F21]',
    icon: Apple
  },
  'Cárnicos': {
    bg: 'bg-red-500/10',
    hover: 'hover:bg-red-500/20',
    active: 'bg-red-500',
    text: 'text-red-500',
    icon: Beef
  },
  'Químicos': {
    bg: 'bg-yellow-500/10',
    hover: 'hover:bg-yellow-500/20',
    active: 'bg-yellow-500',
    text: 'text-yellow-500',
    icon: FlaskConical
  },
  'Descartables': {
    bg: 'bg-gray-500/10',
    hover: 'hover:bg-gray-500/20',
    active: 'bg-gray-500',
    text: 'text-gray-500',
    icon: Trash2
  }
}

// Normalizar unidades para importación
const normalizarUnidad = (u: string): string => {
  const map: Record<string, string> = {
    "KILOS": "kg", "KILOGRAMOS": "kg", "KG": "kg",
    "GRAMOS": "gr", "GR": "gr",
    "LITROS": "lt", "LT": "lt", "L": "lt",
    "MILILITROS": "ml", "ML": "ml",
    "GALON": "GLN", "GALONES": "GLN", "GL": "GLN",
    "UNIDADES": "un", "UND": "un", "UNIDAD": "un",
    "PAQUETE": "PQTE", "PAQUETES": "PQTE",
    "ROLLOS": "ROLLO", "ROLLO": "ROLLO",
    "BOLSAS": "BOLSA", "BOLSA": "BOLSA",
    "PARES": "PAR", "PAR": "PAR",
    "SACO": "SACO", "TARRO": "TARRO", "SOBRE": "SOBRE",
    "CAJA": "CAJA", "LATA": "LATA", "PQTE": "PAQUETE"
  }
  const normalized = map[u.toUpperCase().trim()]
  return normalized || u.toLowerCase()
}

// Normalizar categorías para importación
const normalizarCategoria = (cat: string): string => {
  const map: Record<string, string> = {
    "ABARROTES": "Abarrotes", "ABARROTE": "Abarrotes",
    "FRUTAS": "Frutas y Verduras", "VERDURAS": "Frutas y Verduras", 
    "FRUTAS Y VERDURAS": "Frutas y Verduras", "FRUTAS_VERDURAS": "Frutas y Verduras",
    "FRUTA_VEG": "Frutas y Verduras", "FRUIT_VEG": "Frutas y Verduras",
    "CARNICOS": "Cárnicos", "CARNICO": "Cárnicos", "CARNES": "Cárnicos",
    "QUIMICOS": "Químicos", "QUIMICO": "Químicos",
    "DESCARTABLES": "Descartables", "DESCARTABLE": "Descartables"
  }
  return map[cat.toUpperCase().trim()] || cat
}

export default function InsumosClient({ initialInsumos, initialCategories }: InsumosClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [insumos, setInsumos] = useState<Insumo[]>(initialInsumos)
  const [filteredInsumos, setFilteredInsumos] = useState<Insumo[]>(initialInsumos)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null)
  const [importing, setImporting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    unidad: '',
    categoria: 'Abarrotes',
    precio: ''
  })

  // Verificar si el usuario es admin
  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          
          if (profile?.role === 'admin') {
            setIsAdmin(true)
          } else {
            // Si no es admin, redirigir al dashboard
            router.push('/dashboard')
            return
          }
        } else {
          router.push('/login')
          return
        }
      } catch (error) {
        console.error('Error al verificar rol:', error)
        router.push('/dashboard')
      } finally {
        setIsCheckingRole(false)
      }
    }
    
    checkRole()
  }, [supabase, router])

  // Filtrar insumos por categoría y búsqueda
  useEffect(() => {
    let filtered = insumos
    
    if (selectedCategory !== 'Todas') {
      filtered = filtered.filter(i => i.categoria === selectedCategory)
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(i => 
        i.nombre.toLowerCase().includes(term)
      )
    }
    
    setFilteredInsumos(filtered)
  }, [insumos, selectedCategory, searchTerm])

  // Resetear formulario
  const resetForm = () => {
    setFormData({ nombre: '', unidad: '', categoria: 'Abarrotes', precio: '' })
    setEditingInsumo(null)
    setShowForm(false)
  }

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nombre.trim()) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No autenticado')

      const precioNum = parseFloat(formData.precio) || 0

      if (editingInsumo) {
        const { data, error } = await supabase
          .from('insumos')
          .update({
            nombre: formData.nombre.trim().toUpperCase(),
            unidad: formData.unidad,
            categoria: formData.categoria,
            precio: precioNum
          })
          .eq('id', editingInsumo.id)
          .select()
          .single()

        if (error) throw error

        setInsumos(insumos.map(i => i.id === editingInsumo.id ? data : i))
      } else {
        const { data, error } = await supabase
          .from('insumos')
          .insert({
            nombre: formData.nombre.trim().toUpperCase(),
            unidad: formData.unidad,
            categoria: formData.categoria,
            precio: precioNum,
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error

        setInsumos([...insumos, data])
      }

      // Actualizar categorías
      const { data: newCategories } = await supabase
        .from('insumos')
        .select('categoria')
      
      if (newCategories) {
        const counts: Record<string, number> = {}
        newCategories.forEach(item => {
          counts[item.categoria] = (counts[item.categoria] || 0) + 1
        })
        setCategories(Object.entries(counts).map(([name, count]) => ({ name, count })))
      }

      resetForm()
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar el insumo')
    } finally {
      setLoading(false)
    }
  }

  // Eliminar insumo
  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este insumo?')) return
    
    setLoading(true)
    try {
      const { error } = await supabase
        .from('insumos')
        .delete()
        .eq('id', id)

      if (error) throw error

      setInsumos(insumos.filter(i => i.id !== id))
      router.refresh()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar el insumo')
    } finally {
      setLoading(false)
    }
  }

  // Editar insumo
  const handleEdit = (insumo: Insumo) => {
    setFormData({
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      categoria: insumo.categoria,
      precio: insumo.precio.toString()
    })
    setEditingInsumo(insumo)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Importación Excel
  const importarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setLoading(true)

    try {
      const { data: existentes } = await supabase
        .from('insumos')
        .select('nombre')
      
      const existentesSet = new Set(existentes?.map(i => i.nombre.toUpperCase().trim()) || [])

      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const datos = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]) as any[]
          
          const nuevos: any[] = []
          const duplicados: string[] = []
          const errores: string[] = []

          for (const fila of datos) {
            const nombreRaw = fila["NOMBRE"] || fila["INSUMO"] || fila["nombre"] || fila["Nombre"]
            const unidadRaw = fila["UNIDAD"] || fila["unidad"] || fila["Unidad"]
            const categoriaRaw = fila["CATEGORIA"] || fila["categoria"] || fila["Categoria"]
            const precioRaw = fila["PRECIO"] || fila["precio"] || fila["Precio"]

            if (!nombreRaw) {
              errores.push('Fila sin nombre: ' + JSON.stringify(fila))
              continue
            }
            
            const nombre = nombreRaw.toString().toUpperCase().trim()
            
            if (existentesSet.has(nombre)) {
              duplicados.push(nombre)
              continue
            }
            
            const unidad = normalizarUnidad(unidadRaw?.toString() || "kg")
            const categoria = normalizarCategoria(categoriaRaw?.toString() || "Abarrotes")
            const precio = parseFloat(precioRaw?.toString().replace(',', '.') || "0") || 0
            
            nuevos.push({
              nombre,
              unidad,
              categoria,
              precio
            })
            existentesSet.add(nombre)
          }

          let mensaje = ''
          if (duplicados.length > 0) {
            mensaje += `⚠️ Omitidos (duplicados): ${duplicados.length}\n${duplicados.slice(0, 10).join('\n')}${duplicados.length > 10 ? `\n... y ${duplicados.length - 10} más` : ''}\n\n`
          }
          if (errores.length > 0) {
            mensaje += `❌ Errores: ${errores.length}\n${errores.slice(0, 5).join('\n')}\n\n`
          }
          
          if (nuevos.length === 0) {
            alert(`📋 No se encontraron insumos nuevos para importar.\n\n${mensaje || 'Todos los insumos ya existen en la base de datos.'}`)
            setImporting(false)
            setLoading(false)
            e.target.value = ''
            return
          }

          mensaje += `📊 ${nuevos.length} insumos nuevos listos para importar.`
          
          if (confirm(`${mensaje}\n\n¿Deseas importarlos?`)) {
            const { error } = await supabase
              .from('insumos')
              .insert(nuevos)

            if (error) {
              alert('❌ Error al importar: ' + error.message)
            } else {
              alert(`✅ ${nuevos.length} insumos importados exitosamente!`)
              const { data: refreshed } = await supabase
                .from('insumos')
                .select('*')
                .order('nombre', { ascending: true })
              
              if (refreshed) {
                setInsumos(refreshed)
                
                const counts: Record<string, number> = {}
                refreshed.forEach(item => {
                  counts[item.categoria] = (counts[item.categoria] || 0) + 1
                })
                setCategories(Object.entries(counts).map(([name, count]) => ({ name, count })))
              }
              router.refresh()
            }
          }
        } catch (error) {
          console.error('Error al procesar Excel:', error)
          alert('❌ Error al procesar el archivo Excel. Verifica que el formato sea correcto.')
        } finally {
          setImporting(false)
          setLoading(false)
          e.target.value = ''
        }
      }
      
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Error al leer archivo:', error)
      alert('❌ Error al leer el archivo')
      setImporting(false)
      setLoading(false)
      e.target.value = ''
    }
  }

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      'Abarrotes': 'bg-[#8CC63F]/10 text-[#8CC63F] border-[#8CC63F]/20',
      'Frutas y Verduras': 'bg-[#F37F21]/10 text-[#F37F21] border-[#F37F21]/20',
      'Cárnicos': 'bg-red-500/10 text-red-600 border-red-500/20',
      'Químicos': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'Descartables': 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
    return colors[categoria] || 'bg-gray-100 text-gray-700'
  }

  const formatPrice = (precio: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(precio)
  }

  const totalInsumos = categories.reduce((sum, cat) => sum + cat.count, 0)

  // Mostrar loading mientras se verifica el rol
  if (isCheckingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
          <p className="text-[#6B6B65]">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Si no es admin, no mostrar nada (ya redirige)
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#FFFFFF' }}>
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#8CC63F]" />
            <span className="text-gray-700">
              {importing ? 'Importando insumos...' : 'Procesando...'}
            </span>
          </div>
        </div>
      )}

     {/* Header estilo MegaFood - VERSIÓN RESPONSIVE */}
<header className="relative overflow-hidden" style={{ background: '#2B2B2B' }}>
  <div
    className="absolute inset-0 opacity-[0.06]"
    style={{
      backgroundImage:
        "repeating-linear-gradient(135deg, #FFFFFF 0px, #FFFFFF 1px, transparent 1px, transparent 14px)",
    }}
    aria-hidden="true"
  />
  <div
    className="absolute left-0 top-0 bottom-0"
    style={{ width: '6px', background: '#F37F21' }}
    aria-hidden="true"
  />
  <div
    className="absolute left-[6px] top-0 bottom-0"
    style={{ width: '6px', background: '#8CC63F' }}
    aria-hidden="true"
  />

  <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
    {/* Contenedor flexible con dirección column en móvil */}
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
      
      {/* Lado izquierdo - Texto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1 sm:mb-2">
          <span
            className="uppercase font-mono text-[10px] sm:text-xs"
            style={{
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: '#8CC63F',
            }}
          >
            Módulo de gestión
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
          <span style={{ color: '#FFFFFF' }}>Inventario de</span>
          <br className="sm:hidden" />
          <span style={{ color: '#F37F21' }}> Insumos</span>
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
          Registra, edita e importa los ingredientes por categoría.
        </p>
      </div>

      {/* Lado derecho - Botones (apilados en móvil) */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-[#8CC63F] text-[#1F3A0A] rounded-lg font-semibold hover:bg-[#7AB835] transition text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus size={18} />
          Nuevo insumo
        </button>
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition text-sm sm:text-base w-full sm:w-auto"
        >
          <ArrowLeft size={18} />
          Panel
        </Link>
      </div>

    </div>
  </div>
</header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Formulario */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg p-6 border border-[#E7E7E2] border-t-4 border-t-[#8CC63F] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2B2B2B]">
                {editingInsumo ? '✏️ Editar insumo' : '✏️ Nuevo insumo'}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                  Nombre del insumo
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                  placeholder="Ej: PECHUGA DE POLLO"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                  Categoría
                </label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F]"
                >
                  <option value="Abarrotes">Abarrotes</option>
                  <option value="Frutas y Verduras">Frutas y Verduras</option>
                  <option value="Cárnicos">Cárnicos</option>
                  <option value="Químicos">Químicos</option>
                  <option value="Descartables">Descartables</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                  Unidad
                </label>
                <input
                  type="text"
                  value={formData.unidad}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                  placeholder="kg, l, gln..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                  Precio
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                      className="w-full pl-9 pr-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#F37F21] text-white rounded-lg font-semibold hover:bg-[#C4600F] transition whitespace-nowrap"
                  >
                    {editingInsumo ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}


        
        {/* Importar Excel */}
        <div className="mb-8 bg-white rounded-lg p-6 border border-[#E7E7E2] border-t-4 border-t-[#F37F21] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-[#8CC63F]" />
                <div>
                  <p className="font-medium text-[#2B2B2B]">Importar desde Excel</p>
                  <p className="text-sm text-gray-400">Columnas: NOMBRE, UNIDAD, CATEGORIA, PRECIO (S/)</p>
                </div>
              </div>
            </div>
            <label className="flex items-center gap-2 px-5 py-2.5 border-2 border-dashed border-[#8CC63F] text-[#8CC63F] rounded-lg hover:bg-[#8CC63F]/5 transition cursor-pointer">
              <Upload size={18} />
              {importing ? 'Importando...' : 'Subir archivo'}
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                onChange={importarExcel} 
                className="hidden" 
                disabled={importing}
              />
            </label>
          </div>
        </div>

        {/* Filtros */}
{/* Filtros por categoría */}
<div className="mb-7">
  <div className="flex gap-3 overflow-x-auto pb-2">

    {/* TODAS */}
    <button
      onClick={() => setSelectedCategory('Todas')}
      className={`
        flex-shrink-0
        w-[150px] h-[112px]
        rounded-2xl
        flex flex-col items-center justify-center
        gap-1
        border-2
        transition-all duration-200
        ${selectedCategory === 'Todas'
          ? `
            bg-[#2B2B2B]
            border-white
            shadow-[0_4px_12px_rgba(43,43,43,0.20)]
            ring-2 ring-[#2B2B2B]/10
          `
          : `
            bg-[#F7F7F3]
            border-[#E7E7E2]
            hover:bg-[#EFEFEA]
            hover:border-[#D8D8D1]
            hover:-translate-y-0.5
            hover:shadow-sm
          `
        }
      `}
    >
      <div className={`
        flex items-center justify-center
        w-9 h-9
        rounded-xl
        mb-1
        ${selectedCategory === 'Todas'
          ? 'bg-white/10 text-white'
          : 'bg-[#EAEAE5] text-[#6B6B65]'
        }
      `}>
        <Grid3x3 size={20} />
      </div>

      <span className={`
        text-sm font-bold uppercase tracking-wide
        ${selectedCategory === 'Todas'
          ? 'text-white'
          : 'text-[#6B6B65]'
        }
      `}>
        Todas
      </span>

      <span className={`
        text-xs font-medium
        ${selectedCategory === 'Todas'
          ? 'text-white/70'
          : 'text-[#9A9A93]'
        }
      `}>
        {totalInsumos} insumos
      </span>
    </button>


    {/* CATEGORÍAS */}
    {categories.map((cat) => {
      const config =
        categoryConfig[cat.name] ||
        categoryConfig['Descartables']

      const Icon = config.icon
      const isSelected = selectedCategory === cat.name

      return (
        <button
          key={cat.name}
          onClick={() => setSelectedCategory(cat.name)}
          className={`
            flex-shrink-0
            w-[150px] h-[112px]
            rounded-2xl
            flex flex-col items-center justify-center
            gap-1
            border-2
            transition-all duration-200

            ${isSelected
              ? `
                ${config.active}
                border-white
                shadow-[0_4px_12px_rgba(43,43,43,0.15)]
                ring-2 ring-current/10
                -translate-y-0.5
              `
              : `
                ${config.bg}
                border-current/20
                ${config.hover}
                hover:-translate-y-0.5
                hover:shadow-sm
              `
            }
          `}
        >
          <div className={`
            flex items-center justify-center
            w-9 h-9
            rounded-xl
            mb-1

            ${isSelected
              ? 'bg-white/15 text-white'
              : `bg-white/60 ${config.text}`
            }
          `}>
            <Icon size={20} strokeWidth={2} />
          </div>

          <span className={`
            text-sm font-bold uppercase tracking-wide
            text-center
            ${isSelected
              ? 'text-white'
              : config.text
            }
          `}>
            {cat.name}
          </span>

          <span className={`
            text-xs font-medium
            ${isSelected
              ? 'text-white/70'
              : 'text-[#9A9A93]'
            }
          `}>
            {cat.count} insumos
          </span>
        </button>
      )
    })}

  </div>
</div>


{/* Buscador */}
<div className="mb-8">
  <div className="relative max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      placeholder="Buscar insumo por nombre..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-10 pr-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent bg-white"
    />
    {searchTerm && (
      <button
        onClick={() => setSearchTerm('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        <X size={16} />
      </button>
    )}
  </div>
</div>





        {/* Grid de insumos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsumos.map((insumo) => (
            <div
              key={insumo.id}
              className="bg-white rounded-lg border border-[#E7E7E2] p-5 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-[#2B2B2B] text-lg leading-tight">
                    {insumo.nombre}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoriaColor(insumo.categoria)}`}>
                      {insumo.categoria}
                    </span>
                    <span className="text-sm text-[#6B6B65] bg-[#F5F5F0] px-2.5 py-0.5 rounded-full">
                      {insumo.unidad}
                    </span>
                    <span className="text-sm font-semibold text-[#F37F21] bg-[#F37F21]/10 px-2.5 py-0.5 rounded-full">
                      {formatPrice(insumo.precio)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(insumo)}
                    className="p-1.5 text-[#6B6B65] hover:text-[#F37F21] rounded-lg hover:bg-[#F37F21]/10 transition"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(insumo.id)}
                    className="p-1.5 text-[#6B6B65] hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Estado vacío */}
        {filteredInsumos.length === 0 && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg">
            <Package className="w-12 h-12 text-[#6B6B65] mx-auto mb-3" />
            <p className="text-[#6B6B65] font-medium">
              {searchTerm ? 'No se encontraron insumos con ese nombre' : 'No hay insumos en esta categoría'}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-[#8CC63F] font-medium hover:underline"
            >
              + Agregar primer insumo
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Inventario de insumos
          </p>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#8CC63F',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.8rem', color: '#9A9A93', fontWeight: 600 }}>
              v1.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}