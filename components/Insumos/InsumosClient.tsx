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
  Pencil
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

// Configuración visual por categoría: ícono + color base (mismo lenguaje que la pestaña de Platos)
const CATEGORY_STYLES: Record<string, { icon: any; light: string; text: string; border: string }> = {
  'Abarrotes': { icon: Package, light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  'Frutas y Verduras': { icon: Apple, light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
  'Cárnicos': { icon: Beef, light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
  'Químicos': { icon: FlaskConical, light: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' },
  'Descartables': { icon: Trash2, light: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
}

const DEFAULT_STYLE = { icon: Package, light: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }

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
    categoria: 'Abarrotes'
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
    setFormData({ nombre: '', unidad: '', categoria: selectedCategory !== 'Todas' ? selectedCategory : 'Abarrotes' })
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

      if (editingInsumo) {
        const { data, error } = await supabase
          .from('insumos')
          .update({
            nombre: formData.nombre.trim().toUpperCase(),
            unidad: formData.unidad,
            categoria: formData.categoria
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
      categoria: insumo.categoria
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

      <div className="max-w-6xl mx-auto px-6 md:px-8 py-8">
        {/* Barra superior: logo + acciones */}
        <div className="flex items-center justify-between mb-10 flex-wrap gap-3">
          <div className="text-xl font-black tracking-tight">
            <span className="text-slate-900">MEGA</span>
            <span className="text-orange-500">FOOD</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-full text-sm font-semibold hover:bg-emerald-50 transition shadow-sm">
                <Upload size={16} />
                Importar Excel
              </button>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-semibold hover:bg-slate-50 transition shadow-sm"
            >
              <ArrowLeft size={16} />
              Panel
            </Link>
          </div>
        </div>

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Inventario de <span className="text-orange-500">insumos</span>
          </h1>
          <p className="mt-2 text-slate-500">
            Selecciona una categoría para gestionar sus insumos.
          </p>
        </div>

        {/* Pestañas de categoría */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`rounded-2xl px-4 py-4 text-center transition border ${
              selectedCategory === 'Todas'
                ? 'bg-emerald-800 border-emerald-800 text-white shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Grid3x3 className="mx-auto mb-1.5" size={20} />
            <div className="text-xs font-bold tracking-wide uppercase">Todas</div>
            <div className={`text-xs mt-0.5 ${selectedCategory === 'Todas' ? 'text-emerald-100' : 'text-slate-400'}`}>
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
                className={`rounded-2xl px-4 py-4 text-center transition border ${
                  isActive
                    ? 'bg-emerald-800 border-emerald-800 text-white shadow-md'
                    : `${style.light} ${style.border} ${style.text} hover:brightness-95`
                }`}
              >
                <Icon className="mx-auto mb-1.5" size={20} />
                <div className="text-xs font-bold tracking-wide uppercase">{cat.name}</div>
                <div className={`text-xs mt-0.5 ${isActive ? 'text-emerald-100' : 'opacity-70'}`}>
                  {cat.count} insumos
                </div>
              </button>
            )
          })}
        </div>

        {/* Formulario de nuevo/editar insumo */}
        {isAdmin && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white shadow-sm mb-8">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <Pencil size={18} className="text-slate-400" />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}
                </h2>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                  {formData.categoria}
                </span>
              </div>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-800 text-white rounded-full text-sm font-semibold hover:bg-emerald-900 transition"
                >
                  <Plus size={16} />
                  Nuevo insumo
                </button>
              )}
              {showForm && (
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              )}
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold tracking-wide uppercase text-slate-500 mb-2">
                    Nombre del insumo
                  </label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ej: PECHUGA DE POLLO"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold tracking-wide uppercase text-slate-500 mb-2">
                    Categoría
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(CATEGORY_STYLES).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, categoria: cat })}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition ${
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

                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold tracking-wide uppercase text-slate-500 mb-2">
                      Unidad
                    </label>
                    <input
                      type="text"
                      value={formData.unidad}
                      onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="kg, l, gln..."
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-800 text-white rounded-xl font-semibold hover:bg-emerald-900 transition whitespace-nowrap"
                  >
                    {editingInsumo ? 'Actualizar insumo' : 'Crear insumo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Búsqueda */}
        <div className="flex justify-end mb-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-full bg-white/80 focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full"
              placeholder="Buscar insumo..."
            />
          </div>
        </div>

        {/* Encabezado de lista */}
        <div className="mb-4">
          <p className="text-xs font-bold tracking-wide uppercase text-slate-500">
            {selectedCategory === 'Todas' ? 'Todos los insumos' : selectedCategory} — {filteredInsumos.length} {filteredInsumos.length === 1 ? 'insumo' : 'insumos'}
          </p>
        </div>

        {/* Grid de insumos */}
        {filteredInsumos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInsumos.map((insumo) => {
              const style = getCategoryStyle(insumo.categoria)
              return (
                <div
                  key={insumo.id}
                  className="bg-white/90 rounded-2xl border border-white p-5 hover:shadow-md transition-shadow group shadow-sm"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight">
                        {insumo.nombre}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.light} ${style.text} ${style.border}`}>
                          {insumo.categoria}
                        </span>
                        <span className="text-sm text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {insumo.unidad}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(insumo)}
                          className="p-1.5 text-slate-400 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(insumo.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-14 bg-white/70 border border-white rounded-2xl">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">
              {searchTerm ? 'No se encontraron insumos con ese nombre' : 'Sin insumos en esta categoría'}
            </p>
            {isAdmin && !searchTerm && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 text-emerald-700 font-medium hover:underline"
              >
                + Agregar primer insumo
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-slate-400">© 2026 MegaFood · Inventario de insumos</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
            <span className="text-xs text-slate-400 font-semibold">v1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}