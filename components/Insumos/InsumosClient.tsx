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
  Package,
  Edit,
  Trash2,
  X,
  Apple,
  Beef,
  FlaskConical,
  Grid3x3,
  Pencil,
  DollarSign
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/lib/supabase/insumos'

type Category = {
  name: string
  count: number
}

interface InsumosClientProps {
  initialInsumos: Insumo[]
  initialCategories: Category[]
}

// Configuración visual por categoría
const CATEGORY_STYLES: Record<string, { icon: any; light: string; text: string; border: string }> = {
  'Abarrotes': { icon: Package, light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  'Frutas y Verduras': { icon: Apple, light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  'Cárnicos': { icon: Beef, light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  'Químicos': { icon: FlaskConical, light: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
  'Descartables': { icon: Trash2, light: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

const DEFAULT_STYLE = { icon: Package, light: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }

// Formatear precio en Soles Peruanos
const formatPrice = (precio: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(precio)
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
  const [showForm, setShowForm] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    unidad: '',
    categoria: 'Abarrotes',
    precio: ''  // 🔥 NUEVO: campo precio
  })

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setIsAdmin(profile?.role === 'admin')
      }
    }
    checkRole()
  }, [supabase])

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

  const resetForm = () => {
    setFormData({ 
      nombre: '', 
      unidad: '', 
      categoria: selectedCategory !== 'Todas' ? selectedCategory : 'Abarrotes',
      precio: ''
    })
    setEditingInsumo(null)
    setShowForm(false)
  }

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
            precio: precioNum  // 🔥 Incluir precio en actualización
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
            precio: precioNum,  // 🔥 Incluir precio en creación
            created_by: user.id
          })
          .select()
          .single()

        if (error) throw error

        setInsumos([...insumos, data])
      }

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

  const handleEdit = (insumo: Insumo) => {
    setFormData({
      nombre: insumo.nombre,
      unidad: insumo.unidad,
      categoria: insumo.categoria,
      precio: insumo.precio?.toString() || ''  // 🔥 Cargar precio existente
    })
    setEditingInsumo(insumo)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getCategoryStyle = (categoria: string) => CATEGORY_STYLES[categoria] || DEFAULT_STYLE

  const totalInsumos = categories.reduce((sum, cat) => sum + cat.count, 0)

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'linear-gradient(135deg, #EEF6EC 0%, #FBF6EC 55%, #FDF1E6 100%)' }}
    >
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span className="text-gray-700">Procesando...</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8 sm:mb-10">
          <div className="text-xl font-black tracking-tight">
            <span className="text-slate-900">MEGA</span>
            <span className="text-orange-500">FOOD</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && (
              <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-emerald-200 text-emerald-700 rounded-full text-xs sm:text-sm font-semibold hover:bg-emerald-50 transition shadow-sm">
                <Upload size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">Importar Excel</span>
              </button>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-xs sm:text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Panel</span>
            </Link>
          </div>
        </div>

        {/* Título */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Inventario de <span className="text-orange-500">insumos</span>
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-500">
            Selecciona una categoría para gestionar sus insumos.
          </p>
        </div>

        {/* Pestañas de categoría */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center transition border ${
              selectedCategory === 'Todas'
                ? 'bg-emerald-800 border-emerald-800 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Grid3x3 className="mx-auto mb-1" size={18} />
            <div className="text-[10px] sm:text-xs font-bold tracking-wide uppercase">Todas</div>
            <div className={`text-[10px] sm:text-xs mt-0.5 ${selectedCategory === 'Todas' ? 'text-emerald-100' : 'text-slate-400'}`}>
              {totalInsumos} insumos
            </div>
          </button>

          {categories.map((cat) => {
            const style = getCategoryStyle(cat.name)
            const Icon = style.icon
            const isActive = selectedCategory === cat.name
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`rounded-xl sm:rounded-2xl px-3 sm:px-4 py-3 sm:py-4 text-center transition border ${
                  isActive
                    ? 'bg-emerald-800 border-emerald-800 text-white shadow-md'
                    : `${style.light} ${style.border} ${style.text} hover:brightness-95`
                }`}
              >
                <Icon className="mx-auto mb-1" size={18} />
                <div className="text-[10px] sm:text-xs font-bold tracking-wide uppercase">{cat.name}</div>
                <div className={`text-[10px] sm:text-xs mt-0.5 ${isActive ? 'text-emerald-100' : 'opacity-70'}`}>
                  {cat.count} insumos
                </div>
              </button>
            )
          })}
        </div>

        {/* Formulario */}
        {isAdmin && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white shadow-sm mb-6 sm:mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4 sm:mb-5">
              <div className="flex items-center gap-2">
                <Pencil size={18} className="text-slate-400 hidden sm:inline" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}
                </h2>
                {formData.categoria && (
                  <span className="px-2 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] sm:text-xs font-semibold">
                    {formData.categoria}
                  </span>
                )}
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-800 text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-emerald-900 transition"
                >
                  <Plus size={14} className="sm:w-4 sm:h-4" />
                  Nuevo insumo
                </button>
              )}
              {showForm && (
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
              )}
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-[10px] sm:text-xs font-bold tracking-wide uppercase text-slate-500 mb-1 sm:mb-2">
                    Nombre del insumo
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Ej: PECHUGA DE POLLO"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-bold tracking-wide uppercase text-slate-500 mb-1 sm:mb-2">
                    Categoría
                  </label>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {Object.keys(CATEGORY_STYLES).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, categoria: cat })}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-sm font-medium border transition ${
                          formData.categoria === cat
                            ? 'bg-emerald-800 border-emerald-800 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] sm:text-xs font-bold tracking-wide uppercase text-slate-500 mb-1 sm:mb-2">
                      Unidad
                    </label>
                    <input
                      type="text"
                      value={formData.unidad}
                      onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="kg, l, gln..."
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] sm:text-xs font-bold tracking-wide uppercase text-slate-500 mb-1 sm:mb-2">
                      <DollarSign className="inline w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Precio (S/.)
                    </label>
                    <input
                      type="number"
                      value={formData.precio}
                      onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-emerald-800 text-white rounded-xl font-semibold hover:bg-emerald-900 transition"
                >
                  {editingInsumo ? 'Actualizar insumo' : 'Crear insumo'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Búsqueda */}
        <div className="flex justify-end mb-3 sm:mb-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 border border-slate-200 rounded-full bg-white/80 focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              placeholder="Buscar insumo..."
            />
          </div>
        </div>

        {/* Encabezado de lista */}
        <div className="mb-3 sm:mb-4">
          <p className="text-[10px] sm:text-xs font-bold tracking-wide uppercase text-slate-500">
            {selectedCategory === 'Todas' ? 'Todos los insumos' : selectedCategory} — {filteredInsumos.length} {filteredInsumos.length === 1 ? 'insumo' : 'insumos'}
          </p>
        </div>

        {/* Grid de insumos */}
        {filteredInsumos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredInsumos.map((insumo) => {
              const style = getCategoryStyle(insumo.categoria)
              return (
                <div
                  key={insumo.id}
                  className="bg-white/90 rounded-xl sm:rounded-2xl border border-white p-4 sm:p-5 hover:shadow-md transition-shadow shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-tight break-words">
                        {insumo.nombre}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                        <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${style.light} ${style.text} ${style.border}`}>
                          {insumo.categoria}
                        </span>
                        <span className="text-xs sm:text-sm text-slate-500 bg-slate-100 px-2 sm:px-2.5 py-0.5 rounded-full">
                          {insumo.unidad}
                        </span>
                        {insumo.precio !== undefined && insumo.precio > 0 && (
                          <span className="text-xs sm:text-sm font-semibold text-orange-600 bg-orange-50 px-2 sm:px-2.5 py-0.5 rounded-full">
                            {formatPrice(insumo.precio)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(insumo)}
                          className="p-1.5 sm:p-2 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition"
                          aria-label="Editar insumo"
                        >
                          <Edit size={14} className="sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(insumo.id)}
                          className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                          aria-label="Eliminar insumo"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-10 sm:py-14 bg-white/70 border border-white rounded-xl sm:rounded-2xl">
            <Package className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2 sm:mb-3" />
            <p className="text-sm sm:text-base text-slate-500 font-medium">
              {searchTerm ? 'No se encontraron insumos con ese nombre' : 'Sin insumos en esta categoría'}
            </p>
            {isAdmin && !searchTerm && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-2 sm:mt-3 text-emerald-700 font-medium hover:underline text-sm sm:text-base"
              >
                + Agregar primer insumo
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 sm:mt-10 pt-3 sm:pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] sm:text-xs text-slate-400">© 2026 MegaFood · Inventario de insumos</p>
          <div className="flex items-center gap-2">
            <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-emerald-600 inline-block" />
            <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}