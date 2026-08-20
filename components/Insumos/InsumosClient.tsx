'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/lib/supabase/insumos'
import EstacionesDrawer from '@/app/dashboard/components/EstacionesDrawer'
import BarraSuperior from '@/app/dashboard/components/BarraSuperior'
import * as XLSX from 'xlsx'

type Category = {
  name: string
  count: number
}

interface InsumosClientProps {
  initialInsumos: Insumo[]
  initialCategories: Category[]
}

// ─────────────────────────────────────────────
// Paleta del diseño "Panel de logística" (brutalista)
// ─────────────────────────────────────────────
const C = {
  bg: '#E7E7E2',
  card: '#FFFFFF',
  tinta: '#201E1D',
  tintaSuave: '#6B6B65',
  tintaMedia: '#4A4A40',
  borde: '#6B6B65',
  verde: '#8CC63F',
  naranja: '#F37F21',
  piedra: '#6B6B65',
} as const

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'

/** Acento alternado verde/naranja para bordes de tarjeta, sin radios ni blobs. */
const ACENTOS = [C.naranja, C.verde] as const
const acentoDe = (i: number) => ACENTOS[i % ACENTOS.length]

interface TonoCategoria {
  solido: string
  suave: string
  tinta: string
  tintaSuave: string
}

const TONOS: Record<string, TonoCategoria> = {
  'Todas':             { solido: C.piedra, suave: 'rgba(107,107,101,0.16)', tinta: '#4A4A40', tintaSuave: '#6B6B65' },
  'Abarrotes':         { solido: C.verde,  suave: 'rgba(140,198,63,0.18)',  tinta: '#4A5F2A', tintaSuave: '#5F7A38' },
  'Frutas y Verduras': { solido: C.naranja,suave: 'rgba(243,127,33,0.16)',  tinta: '#A85F17', tintaSuave: '#A85F17' },
  'Químicos':          { solido: '#6E7B8B',suave: 'rgba(110,123,139,0.16)', tinta: '#3F4A57', tintaSuave: '#5A6675' },
  'Cárnicos':          { solido: '#A85448',suave: 'rgba(168,84,72,0.16)',   tinta: '#7A3229', tintaSuave: '#8E4237' },
  'Descartables':      { solido: '#C18C5D',suave: 'rgba(193,140,93,0.18)',  tinta: '#7A522C', tintaSuave: '#96683E' },
}

const tonoDe = (categoria: string): TonoCategoria => TONOS[categoria] || TONOS['Todas']

const ORDEN_CATEGORIAS = ['Abarrotes', 'Frutas y Verduras', 'Cárnicos', 'Químicos', 'Descartables']

// ─────────────────────────────────────────────
// Iconos (trazo 2, remates redondeados)
// ─────────────────────────────────────────────
type SvgProps = { size?: number }
const svgBase = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

const IconTodas = ({ size = 24 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
)
const IconAbarrotes = ({ size = 24 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="m21 8-9-5-9 5v8l9 5 9-5Z" />
    <path d="m3 8 9 5 9-5" />
  </svg>
)
const IconFrutas = ({ size = 24 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M12 8c-3-3-8-1-8 4 0 4 3 9 5.5 9 1 0 1.5-.7 2.5-.7s1.5.7 2.5.7C17 21 20 16 20 12c0-5-5-7-8-4Z" />
    <path d="M12 8V4" />
  </svg>
)
const IconQuimicos = ({ size = 24 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3" />
    <path d="M9 3h6" />
  </svg>
)
const IconCarnicos = ({ size = 24 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M4 14c0-5 4-9 9-9 4 0 7 3 7 6 0 5-4 8-9 8-4 0-7-2-7-5Z" />
    <circle cx="10" cy="12" r="2" />
  </svg>
)
const IconDescartables = ({ size = 24 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M4 7h16M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
)
const IconEditar = ({ size = 16 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M4 20h4l10-10-4-4L4 16Z" />
    <path d="m14 6 4 4" />
  </svg>
)
const IconBuscar = ({ size = 18 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)
const IconExcel = ({ size = 26 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <path d="m9 12 6 6M15 12l-6 6" />
  </svg>
)
const IconCerrar = ({ size = 20 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
)

const ICONO_CATEGORIA: Record<string, ({ size }: SvgProps) => React.ReactElement> = {
  'Todas': IconTodas,
  'Abarrotes': IconAbarrotes,
  'Frutas y Verduras': IconFrutas,
  'Químicos': IconQuimicos,
  'Cárnicos': IconCarnicos,
  'Descartables': IconDescartables,
}

// ─────────────────────────────────────────────
// Normalización para la importación desde Excel
// ─────────────────────────────────────────────
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

/** Fila lista para insertar en la tabla `insumos`. */
type NuevoInsumo = {
  nombre: string
  unidad: string
  categoria: string
  precio: number
}

const PAGINA = 24

// ─────────────────────────────────────────────

export default function InsumosClient({ initialInsumos, initialCategories }: InsumosClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [insumos, setInsumos] = useState<Insumo[]>(initialInsumos)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [vista, setVista] = useState<'cuadricula' | 'lista'>('cuadricula')
  const [visibles, setVisibles] = useState(PAGINA)

  const [loading, setLoading] = useState(false)
  const [isCheckingRole, setIsCheckingRole] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInsumo, setEditingInsumo] = useState<Insumo | null>(null)
  const [importing, setImporting] = useState(false)

  // Sesión, para el drawer de estaciones y el chip de usuario.
  const [userRole, setUserRole] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('Usuario')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const cerrarMenu = useCallback(() => setMenuAbierto(false), [])

  const [formData, setFormData] = useState({
    nombre: '',
    unidad: '',
    categoria: 'Abarrotes',
    precio: ''
  })

  // Solo admin. Se aprovecha la misma consulta para el nombre del usuario.
  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single()

        if (profile?.role !== 'admin') {
          router.push('/dashboard')
          return
        }

        setUserRole(profile.role)
        const nombre = profile?.full_name || user.email?.split('@')[0] || 'Usuario'
        setDisplayName(nombre.charAt(0).toUpperCase() + nombre.slice(1))
      } catch (error) {
        console.error('Error al verificar rol:', error)
        router.push('/dashboard')
      } finally {
        setIsCheckingRole(false)
      }
    }

    checkRole()
  }, [supabase, router])

  // Filtrado derivado del estado: no hace falta duplicarlo en otro useState.
  const termino = searchTerm.trim().toLowerCase()
  const filteredInsumos = insumos.filter(i => {
    if (selectedCategory !== 'Todas' && i.categoria !== selectedCategory) return false
    if (termino && !i.nombre.toLowerCase().includes(termino)) return false
    return true
  })

  // Al cambiar el filtro se vuelve a la primera página.
  const [filtroPrevio, setFiltroPrevio] = useState(`${selectedCategory}|${termino}`)
  const filtroActual = `${selectedCategory}|${termino}`
  if (filtroActual !== filtroPrevio) {
    setFiltroPrevio(filtroActual)
    setVisibles(PAGINA)
  }

  const mostrados = filteredInsumos.slice(0, visibles)

  const recargarCategorias = async () => {
    const { data } = await supabase.from('insumos').select('categoria')
    if (!data) return
    const counts: Record<string, number> = {}
    data.forEach(item => {
      counts[item.categoria] = (counts[item.categoria] || 0) + 1
    })
    setCategories(Object.entries(counts).map(([name, count]) => ({ name, count })))
  }

  const resetForm = () => {
    setFormData({ nombre: '', unidad: '', categoria: 'Abarrotes', precio: '' })
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
            precio: precioNum
          })
          .eq('id', editingInsumo.id)
          .select()
          .single()

        if (error) throw error
        setInsumos(insumos.map(i => (i.id === editingInsumo.id ? data : i)))
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

      await recargarCategorias()
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
      const { error } = await supabase.from('insumos').delete().eq('id', id)
      if (error) throw error

      setInsumos(insumos.filter(i => i.id !== id))
      await recargarCategorias()
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
      precio: insumo.precio.toString()
    })
    setEditingInsumo(insumo)
    setShowForm(true)
  }

  const importarExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setLoading(true)

    try {
      const { data: existentes } = await supabase.from('insumos').select('nombre')
      const existentesSet = new Set(existentes?.map(i => i.nombre.toUpperCase().trim()) || [])

      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const datos = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[workbook.SheetNames[0]]
          )

          // Las celdas llegan como number, string o Date según el Excel.
          const texto = (v: unknown): string =>
            v === undefined || v === null ? '' : String(v)

          const nuevos: NuevoInsumo[] = []
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

            const nombre = texto(nombreRaw).toUpperCase().trim()

            if (existentesSet.has(nombre)) {
              duplicados.push(nombre)
              continue
            }

            nuevos.push({
              nombre,
              unidad: normalizarUnidad(texto(unidadRaw) || "kg"),
              categoria: normalizarCategoria(texto(categoriaRaw) || "Abarrotes"),
              precio: parseFloat(texto(precioRaw).replace(',', '.') || "0") || 0
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
            const { error } = await supabase.from('insumos').insert(nuevos)

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

  const formatPrice = (precio: number) =>
    new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(precio)

  const totalInsumos = insumos.length

  const categoriasOrdenadas = [...categories].sort(
    (a, b) => ORDEN_CATEGORIAS.indexOf(a.name) - ORDEN_CATEGORIAS.indexOf(b.name)
  )

  if (isCheckingRole) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: C.bg }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: C.verde }} />
          <p style={{ color: C.tintaSuave }}>Verificando permisos...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative min-h-screen"
      style={{ background: C.bg, color: C.tinta, fontFamily: ARCHIVO }}
    >
      <EstacionesDrawer
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
        role={userRole}
        displayName={displayName}
      />

      <BarraSuperior
        displayName={displayName}
        menuAbierto={menuAbierto}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-20 sm:px-7">

        {/* ─── Encabezado ─── */}
        <div className="flex border-b-2" style={{ borderColor: C.piedra, marginTop: 0 }}>
          <div className="w-2 shrink-0" style={{ background: C.naranja }} aria-hidden="true" />
          <header className="flex-1 pb-10 pt-10 sm:pb-14 sm:pt-14 pl-5 sm:pl-7">
            <div
              className="text-[10px] font-extrabold"
              style={{ letterSpacing: '0.2em', color: C.piedra }}
            >
              MÓDULO DE GESTIÓN
            </div>

            <h1
              className="text-[38px] sm:text-[52px] lg:text-[62px]"
              style={{
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: '-0.03em',
                margin: '14px 0 20px',
              }}
            >
              Inventario de <span style={{ color: C.naranja }}>insumos</span>
            </h1>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => { resetForm(); setShowForm(true) }}
                className="cursor-pointer border-0 text-[13px] font-extrabold uppercase transition-colors"
                style={{
                  padding: '15px 30px',
                  letterSpacing: '0.08em',
                  background: C.verde,
                  color: C.tinta,
                }}
              >
                + Nuevo insumo
              </button>
              <Link
                href="/dashboard"
                className="inline-block text-[13px] font-extrabold uppercase transition-colors"
                style={{
                  border: `2px solid ${C.naranja}`,
                  padding: '13px 28px',
                  letterSpacing: '0.08em',
                  background: 'transparent',
                  color: C.naranja,
                }}
              >
                ← Volver al panel
              </Link>
            </div>
          </header>
        </div>

        {/* ─── Importar Excel ─── */}
        <section
          className="mt-8 flex flex-wrap items-center gap-6"
          style={{
            background: C.card,
            borderTop: `6px solid ${C.verde}`,
            padding: '28px 32px',
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{ width: 56, height: 56, flex: '0 0 56px', background: C.bg, color: C.tinta }}
            aria-hidden="true"
          >
            <IconExcel size={26} />
          </span>
          <div className="min-w-0 flex-[1_1_260px]">
            <h3 style={{ fontWeight: 800, fontSize: 20, margin: '0 0 4px' }}>
              Importar desde Excel
            </h3>
            <p className="text-sm" style={{ margin: 0, color: C.tintaSuave }}>
              Columnas: nombre · unidad · categoría · precio (S/)
            </p>
          </div>
          <label
            className="cursor-pointer text-[13px] font-extrabold uppercase transition-colors"
            style={{
              border: `2px solid ${C.tinta}`,
              padding: '14px 30px',
              letterSpacing: '0.08em',
              background: 'transparent',
              color: C.tinta,
            }}
          >
            {importing ? 'Importando…' : 'Subir archivo'}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={importarExcel}
              disabled={importing}
              className="hidden"
            />
          </label>
        </section>

        {/* ─── Categorías ─── */}
        <section className="mt-12">
          <h2 style={{ fontWeight: 800, fontSize: 28, margin: '0 0 20px', letterSpacing: '-0.01em' }}>
            Categorías
          </h2>
          <div
            className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:grid sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 sm:[grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]"
          >
            {[{ name: 'Todas', count: totalInsumos }, ...categoriasOrdenadas].map((cat, i) => {
              const activa = selectedCategory === cat.name
              const t = tonoDe(cat.name)
              const Icon = ICONO_CATEGORIA[cat.name] || IconTodas

              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  aria-pressed={activa}
                  className="flex w-[180px] shrink-0 cursor-pointer snap-start flex-col gap-4 text-left transition-colors duration-150 sm:w-auto"
                  style={{
                    borderTop: `6px solid ${t.solido}`,
                    padding: 20,
                    background: activa ? C.tinta : C.card,
                    color: activa ? '#fff' : C.tinta,
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{ width: 44, height: 44, background: t.solido, color: '#fff' }}
                    aria-hidden="true"
                  >
                    <Icon size={22} />
                  </span>
                  <span>
                    <span className="block" style={{ fontWeight: 800, fontSize: 18 }}>
                      {cat.name}
                    </span>
                    <span
                      className="mt-1 block text-[13px]"
                      style={{ color: activa ? 'rgba(255,255,255,0.7)' : C.tintaSuave }}
                    >
                      {cat.count} {cat.count === 1 ? 'insumo' : 'insumos'}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── Búsqueda y vista ─── */}
        <section className="mt-10 flex flex-wrap items-center gap-4">
          <label
            className="flex flex-[1_1_320px] items-center gap-3"
            style={{ background: C.card, border: `2px solid ${C.tinta}`, padding: '13px 22px' }}
          >
            <span style={{ color: C.tintaSuave }} aria-hidden="true"><IconBuscar size={18} /></span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar insumo por nombre…"
              className="w-full border-0 bg-transparent text-[15px] outline-none"
              style={{ color: C.tinta }}
            />
          </label>

          <div className="flex" style={{ border: `2px solid ${C.tinta}` }}>
            {(['cuadricula', 'lista'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                aria-pressed={vista === v}
                className="cursor-pointer border-0 text-[13px] font-extrabold uppercase transition-colors"
                style={{
                  padding: '11px 22px',
                  letterSpacing: '0.06em',
                  background: vista === v ? C.tinta : 'transparent',
                  color: vista === v ? '#fff' : C.tinta,
                }}
              >
                {v === 'cuadricula' ? 'Cuadrícula' : 'Lista'}
              </button>
            ))}
          </div>

          <span className="text-sm" style={{ color: C.tintaSuave }}>
            {filteredInsumos.length} {filteredInsumos.length === 1 ? 'resultado' : 'resultados'}
          </span>
        </section>

        {/* ─── Insumos ───
            En celular, la lista vive dentro de un panel con scroll propio
            (vertical) para no arrastrar toda la página hacia abajo; desde
            `sm` en adelante vuelve al flujo normal de la página. */}
        <div className="mt-7 max-h-[65vh] overflow-y-auto overscroll-contain pr-1 -mr-1 sm:mt-0 sm:max-h-none sm:overflow-visible sm:overscroll-auto sm:pr-0 sm:mr-0">
        {filteredInsumos.length === 0 ? (
          <div
            className="px-6 py-16 text-center"
            style={{ background: C.card, color: C.tintaSuave }}
          >
            No hay insumos que coincidan con la búsqueda.
          </div>
        ) : (
          <section
            className={vista === 'cuadricula' ? 'grid gap-5' : 'flex flex-col gap-3'}
            style={vista === 'cuadricula' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' } : undefined}
          >
            {mostrados.map((insumo, i) => {
              const t = tonoDe(insumo.categoria)

              return (
                <article
                  key={insumo.id}
                  className={`group transition-colors duration-150 ${vista === 'cuadricula' ? 'flex flex-col gap-4' : 'flex flex-wrap items-center gap-4'}`}
                  style={{
                    background: C.card,
                    borderLeft: `4px solid ${t.solido}`,
                    padding: vista === 'cuadricula' ? 22 : '14px 22px',
                  }}
                >
                  <div className="flex flex-1 items-start gap-3.5">
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 42,
                        height: 42,
                        flex: '0 0 42px',
                        background: t.suave,
                        color: t.tinta,
                        fontWeight: 800,
                        fontSize: 17,
                      }}
                      aria-hidden="true"
                    >
                      {insumo.nombre.charAt(0).toUpperCase()}
                    </span>

                    <h3
                      className="min-w-0 flex-1"
                      style={{ fontWeight: 800, fontSize: 18, margin: 0 }}
                    >
                      {insumo.nombre}
                    </h3>

                    <span className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        title="Editar"
                        aria-label={`Editar ${insumo.nombre}`}
                        onClick={() => handleEdit(insumo)}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center border-0 transition-colors"
                        style={{ background: 'rgba(140,198,63,0.16)', color: '#4A5F2A' }}
                      >
                        <IconEditar size={16} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        aria-label={`Eliminar ${insumo.nombre}`}
                        onClick={() => handleDelete(insumo.id)}
                        disabled={loading}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center border-0 transition-colors disabled:opacity-50"
                        style={{ background: 'rgba(168,84,72,0.14)', color: '#A85448' }}
                      >
                        <IconDescartables size={16} />
                      </button>
                    </span>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2"
                    style={
                      vista === 'cuadricula'
                        ? { borderTop: '1px solid rgba(107,107,101,0.25)', paddingTop: 14, marginTop: 'auto' }
                        : undefined
                    }
                  >
                    <span
                      className="text-[11px] font-extrabold uppercase"
                      style={{ padding: '5px 12px', letterSpacing: '0.04em', background: t.suave, color: t.tinta }}
                    >
                      {insumo.categoria}
                    </span>
                    <span
                      className="text-[11px] font-extrabold uppercase"
                      style={{ padding: '5px 12px', letterSpacing: '0.04em', background: 'rgba(107,107,101,0.12)', color: C.piedra }}
                    >
                      {insumo.unidad}
                    </span>
                    <span
                      className="ml-auto"
                      style={{ fontWeight: 800, fontSize: 18, color: C.naranja }}
                    >
                      {formatPrice(insumo.precio)}
                    </span>
                  </div>
                </article>
              )
            })}
          </section>
        )}

        {visibles < filteredInsumos.length && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibles(v => v + PAGINA)}
              className="cursor-pointer text-[13px] font-extrabold uppercase transition-colors"
              style={{
                border: `2px solid ${C.piedra}`,
                padding: '14px 32px',
                letterSpacing: '0.06em',
                background: 'transparent',
                color: C.tintaMedia,
              }}
            >
              Cargar más insumos ({filteredInsumos.length - visibles} restantes)
            </button>
          </div>
        )}
        </div>

        {/* ─── Pie ─── */}
        <footer
          className="mt-16 flex flex-wrap items-center justify-between gap-5 border-t-2 pt-6"
          style={{ borderColor: C.tinta }}
        >
          <span className="text-sm" style={{ color: C.tintaSuave }}>
            Megafood Perú · Inventario · v2.0
          </span>
          <span className="flex gap-2" aria-hidden="true">
            <span style={{ width: 26, height: 8, background: C.piedra }} />
            <span style={{ width: 26, height: 8, background: C.verde }} />
            <span style={{ width: 26, height: 8, background: C.naranja }} />
          </span>
        </footer>
      </div>

      {/* ─── Modal de alta / edición ─── */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(32,30,29,0.6)' }}
          onClick={resetForm}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
            style={{ background: C.card, borderTop: `6px solid ${C.verde}`, padding: 30 }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 style={{ fontWeight: 800, fontSize: 24, margin: 0 }}>
                {editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border-0"
                style={{ background: 'rgba(107,107,101,0.14)', color: C.piedra }}
              >
                <IconCerrar size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="in-nombre" className="mb-1.5 block text-sm font-bold" style={{ color: C.tintaMedia }}>
                  Nombre
                </label>
                <input
                  id="in-nombre"
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: PECHUGA DE POLLO"
                  className="w-full text-[15px] outline-none"
                  style={{ border: `2px solid ${C.borde}`, padding: '12px 16px', background: '#fff', color: C.tinta }}
                />
              </div>

              <div>
                <label htmlFor="in-categoria" className="mb-1.5 block text-sm font-bold" style={{ color: C.tintaMedia }}>
                  Categoría
                </label>
                <select
                  id="in-categoria"
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full text-[15px] outline-none"
                  style={{ border: `2px solid ${C.borde}`, padding: '12px 16px', background: '#fff', color: C.tinta }}
                >
                  {ORDEN_CATEGORIAS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="in-unidad" className="mb-1.5 block text-sm font-bold" style={{ color: C.tintaMedia }}>
                    Unidad
                  </label>
                  <input
                    id="in-unidad"
                    type="text"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    placeholder="kg, lt, gln…"
                    className="w-full text-[15px] outline-none"
                    style={{ border: `2px solid ${C.borde}`, padding: '12px 16px', background: '#fff', color: C.tinta }}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="in-precio" className="mb-1.5 block text-sm font-bold" style={{ color: C.tintaMedia }}>
                    Precio (S/)
                  </label>
                  <input
                    id="in-precio"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                    placeholder="0.00"
                    className="w-full text-[15px] outline-none"
                    style={{ border: `2px solid ${C.borde}`, padding: '12px 16px', background: '#fff', color: C.tinta }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 cursor-pointer text-[13px] font-extrabold uppercase transition-colors"
                style={{ border: `2px solid ${C.piedra}`, padding: '13px 20px', letterSpacing: '0.06em', background: 'transparent', color: C.tintaMedia }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 border-0 text-[13px] font-extrabold uppercase transition-colors disabled:opacity-60"
                style={{ padding: '13px 20px', letterSpacing: '0.06em', background: C.verde, color: C.tinta }}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingInsumo ? 'Guardar cambios' : 'Crear insumo'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
