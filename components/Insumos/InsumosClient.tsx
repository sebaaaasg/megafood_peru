'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/lib/supabase/insumos'
import EstacionesDrawer from '@/app/dashboard/components/EstacionesDrawer'
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
// Paleta del diseño "Orgánico"
// ─────────────────────────────────────────────
const C = {
  bg: '#FDFCF8',
  card: '#FEFEFA',
  tinta: '#2C2C24',
  tintaSuave: '#78786C',
  tintaMedia: '#4A4A40',
  borde: '#DED8CF',
  verde: '#8CC63F',
  naranja: '#F37F21',
  piedra: '#6B6B65',
} as const

/** Radios orgánicos que se van alternando para que nada quede simétrico. */
const RADIOS = [
  '2rem 2rem 2rem 4rem',
  '4rem 2rem 2rem 2rem',
  '2rem 4rem 2rem 2rem',
  '2rem 2rem 4rem 2rem',
  '4rem 2rem 4rem 2rem',
] as const

/** Formas de blob para los chips de icono. */
const BLOBS = [
  '60% 40% 30% 70% / 60% 30% 70% 40%',
  '30% 70% 70% 30% / 30% 30% 70% 70%',
  '70% 30% 50% 50% / 40% 60% 40% 60%',
  '50% 50% 30% 70% / 60% 40% 60% 40%',
  '40% 60% 60% 40% / 50% 50% 50% 50%',
  '60% 40% 70% 30% / 40% 60% 40% 60%',
] as const

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
/** Icono de persona para el chip de sesión. */
const IconPersona = ({ size = 18 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
  </svg>
)
const IconHamburguesa = ({ size = 20 }: SvgProps) => (
  <svg {...svgBase(size)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
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
      className="mf-grain relative min-h-screen overflow-x-hidden"
      style={{ background: C.bg, color: C.tinta, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}
    >
      {/* Blobs de fondo */}
      <span className="pointer-events-none absolute" style={{ left: -160, top: -120, width: 520, height: 520, background: 'rgba(140,198,63,0.28)', filter: 'blur(90px)', borderRadius: BLOBS[0] }} aria-hidden="true" />
      <span className="pointer-events-none absolute" style={{ right: -180, top: 220, width: 480, height: 480, background: 'rgba(243,127,33,0.22)', filter: 'blur(90px)', borderRadius: BLOBS[1] }} aria-hidden="true" />
      <span className="pointer-events-none absolute" style={{ left: '30%', bottom: -200, width: 560, height: 460, background: 'rgba(107,107,101,0.18)', filter: 'blur(100px)', borderRadius: BLOBS[2] }} aria-hidden="true" />

      <EstacionesDrawer
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
        role={userRole}
        displayName={displayName}
      />

      <div className="relative mx-auto max-w-[1200px] px-4 pb-20 pt-5 sm:px-7">

        {/* ─── Barra superior ─── */}
        <nav
          className="sticky top-4 z-20 flex flex-wrap items-center gap-3 sm:gap-[18px]"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(222,216,207,0.6)',
            borderRadius: 9999,
            padding: '10px 14px 10px 12px',
            boxShadow: '0 4px 20px -2px rgba(107,107,101,0.18)',
          }}
        >
          {/* Menú desplegable de estaciones */}
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú de estaciones"
            aria-controls="drawer-estaciones"
            aria-expanded={menuAbierto}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
              background: '#F4823A',
              // @ts-expect-error -- variables CSS del anillo de foco
              '--tw-ring-color': C.naranja,
              '--tw-ring-offset-color': C.bg,
            }}
          >
            <IconHamburguesa size={22} />
          </button>

          {/* Logo de la empresa */}
          <Link
            href="/dashboard"
            aria-label="Ir al panel"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full transition-transform hover:scale-105"
            style={{ background: C.verde }}
          >
            <Image
              src="/megafood3.png"
              alt="MegaFood"
              width={34}
              height={34}
              className="object-contain"
              style={{ width: 34, height: 34 }}
              priority
            />
          </Link>

          <span style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 18 }}>
            Megafood <span style={{ color: C.piedra }}>Perú</span>
          </span>

          {/* Chip de sesión */}
          <span
            className="ml-auto flex items-center gap-2.5"
            style={{ padding: '5px 18px 5px 5px', borderRadius: 9999, border: '1px solid rgba(222,216,207,0.9)' }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-white"
              style={{ background: C.naranja }}
              aria-hidden="true"
            >
              <IconPersona size={18} />
            </span>
            <span className="hidden text-[13px] font-bold sm:inline" style={{ color: C.tintaMedia }}>
              {displayName}
            </span>
          </span>
        </nav>

        {/* ─── Encabezado ─── */}
        <header className="pb-10 pt-12 sm:pb-14 sm:pt-16">
          <span
            className="inline-flex items-center gap-2.5 text-[13px] font-extrabold"
            style={{ background: 'rgba(140,198,63,0.18)', color: '#4A5F2A', borderRadius: 9999, padding: '9px 20px' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: C.verde }} />
            Módulo de gestión
          </span>

          <h1
            className="text-[38px] sm:text-[52px] lg:text-[62px]"
            style={{
              fontFamily: 'var(--font-fraunces), serif',
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: '-0.02em',
              margin: '22px 0 16px',
            }}
          >
            Inventario de <span style={{ color: C.naranja }}>insumos</span>
          </h1>

          <div className="flex flex-wrap gap-3.5">
            <button
              type="button"
              onClick={() => { resetForm(); setShowForm(true) }}
              className="cursor-pointer border-0 transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                borderRadius: 9999,
                padding: '16px 34px',
                background: C.verde,
                color: '#24310F',
                fontSize: 16,
                fontWeight: 800,
                boxShadow: '0 4px 20px -2px rgba(140,198,63,0.45)',
              }}
            >
              + Nuevo insumo
            </button>
            <Link
              href="/dashboard"
              className="inline-block transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                border: `2px solid ${C.naranja}`,
                borderRadius: 9999,
                padding: '16px 34px',
                background: 'transparent',
                color: '#C25E0E',
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              ← Volver al panel
            </Link>
          </div>
        </header>

        {/* ─── Importar Excel ─── */}
        <section
          className="flex flex-wrap items-center gap-6"
          style={{
            background: 'rgba(240,235,229,0.7)',
            border: '1px solid rgba(222,216,207,0.6)',
            borderRadius: RADIOS[2],
            padding: '30px 34px',
          }}
        >
          <span
            className="flex items-center justify-center"
            style={{ width: 60, height: 60, flex: '0 0 60px', borderRadius: BLOBS[0], background: 'rgba(140,198,63,0.2)', color: '#5D7052' }}
            aria-hidden="true"
          >
            <IconExcel size={26} />
          </span>
          <div className="min-w-0 flex-[1_1_260px]">
            <h3 style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 22, margin: '0 0 4px' }}>
              Importar desde Excel
            </h3>
            <p className="text-sm" style={{ margin: 0, color: C.tintaSuave }}>
              Columnas: nombre · unidad · categoría · precio (S/)
            </p>
          </div>
          <label
            className="cursor-pointer transition-all duration-300 hover:scale-[1.04] active:scale-95"
            style={{
              border: `2px dashed ${C.verde}`,
              borderRadius: 9999,
              padding: '15px 32px',
              background: 'rgba(140,198,63,0.08)',
              color: '#4A5F2A',
              fontSize: 15,
              fontWeight: 800,
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
        <section className="mt-14">
          <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 32, margin: '0 0 24px' }}>
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
                  className="flex w-[180px] shrink-0 cursor-pointer snap-start flex-col gap-4 text-left transition-all duration-300 hover:-translate-y-1 sm:w-auto"
                  style={{
                    border: `1px solid ${activa ? t.solido : 'rgba(222,216,207,0.7)'}`,
                    borderRadius: RADIOS[i % RADIOS.length],
                    padding: 24,
                    background: activa ? t.solido : t.suave,
                    color: activa ? '#FDFCF8' : t.tinta,
                    boxShadow: activa ? `0 20px 40px -10px ${t.suave}` : 'none',
                  }}
                >
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: BLOBS[i % BLOBS.length],
                      background: activa ? 'rgba(253,252,248,0.2)' : t.solido,
                      color: '#fff',
                    }}
                    aria-hidden="true"
                  >
                    <Icon size={24} />
                  </span>
                  <span>
                    <span className="block" style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 20 }}>
                      {cat.name}
                    </span>
                    <span
                      className="mt-1 block text-[13px]"
                      style={{ color: activa ? 'rgba(253,252,248,0.85)' : t.tintaSuave }}
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
        <section className="mt-12 flex flex-wrap items-center gap-4">
          <label
            className="flex flex-[1_1_320px] items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.6)', border: `1px solid ${C.borde}`, borderRadius: 9999, padding: '14px 26px' }}
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

          <div className="flex gap-1.5" style={{ background: 'rgba(240,235,229,0.8)', borderRadius: 9999, padding: 6 }}>
            {(['cuadricula', 'lista'] as const).map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setVista(v)}
                aria-pressed={vista === v}
                className="cursor-pointer border-0 text-sm font-extrabold transition-colors"
                style={{
                  borderRadius: 9999,
                  padding: '11px 22px',
                  background: vista === v ? C.piedra : 'transparent',
                  color: vista === v ? C.bg : C.tintaSuave,
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
            style={{ background: C.card, border: '1px solid rgba(222,216,207,0.6)', borderRadius: RADIOS[0], color: C.tintaSuave }}
          >
            No hay insumos que coincidan con la búsqueda.
          </div>
        ) : (
          <section
            className={vista === 'cuadricula' ? 'grid gap-6' : 'flex flex-col gap-3'}
            style={vista === 'cuadricula' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' } : undefined}
          >
            {mostrados.map((insumo, i) => {
              const t = tonoDe(insumo.categoria)

              return (
                <article
                  key={insumo.id}
                  className={`transition-all duration-300 hover:-translate-y-1 ${vista === 'cuadricula' ? 'flex flex-col gap-4.5' : 'flex flex-wrap items-center gap-4'}`}
                  style={{
                    background: C.card,
                    border: '1px solid rgba(222,216,207,0.6)',
                    borderRadius: vista === 'cuadricula' ? RADIOS[i % RADIOS.length] : '9999px',
                    padding: vista === 'cuadricula' ? 26 : '16px 26px',
                    boxShadow: '0 4px 20px -2px rgba(107,107,101,0.15)',
                  }}
                >
                  <div className="flex flex-1 items-start gap-3.5">
                    <span
                      className="flex items-center justify-center"
                      style={{
                        width: 46,
                        height: 46,
                        flex: '0 0 46px',
                        borderRadius: BLOBS[i % BLOBS.length],
                        background: t.suave,
                        color: t.tinta,
                        fontFamily: 'var(--font-fraunces), serif',
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                      aria-hidden="true"
                    >
                      {insumo.nombre.charAt(0).toUpperCase()}
                    </span>

                    <h3
                      className="min-w-0 flex-1"
                      style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 20, margin: 0 }}
                    >
                      {insumo.nombre}
                    </h3>

                    <span className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        title="Editar"
                        aria-label={`Editar ${insumo.nombre}`}
                        onClick={() => handleEdit(insumo)}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center border-0 transition-all duration-300 hover:brightness-95"
                        style={{ borderRadius: 9999, background: 'rgba(140,198,63,0.16)', color: '#4A5F2A' }}
                      >
                        <IconEditar size={16} />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        aria-label={`Eliminar ${insumo.nombre}`}
                        onClick={() => handleDelete(insumo.id)}
                        disabled={loading}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center border-0 transition-all duration-300 hover:brightness-95 disabled:opacity-50"
                        style={{ borderRadius: 9999, background: 'rgba(168,84,72,0.14)', color: '#A85448' }}
                      >
                        <IconDescartables size={16} />
                      </button>
                    </span>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-2.5"
                    style={
                      vista === 'cuadricula'
                        ? { borderTop: '1px solid rgba(222,216,207,0.8)', paddingTop: 16, marginTop: 'auto' }
                        : undefined
                    }
                  >
                    <span
                      className="text-xs font-extrabold"
                      style={{ borderRadius: 9999, padding: '6px 14px', background: t.suave, color: t.tinta }}
                    >
                      {insumo.categoria}
                    </span>
                    <span
                      className="text-xs font-extrabold"
                      style={{ borderRadius: 9999, padding: '6px 14px', background: 'rgba(107,107,101,0.12)', color: C.piedra }}
                    >
                      {insumo.unidad}
                    </span>
                    <span
                      className="ml-auto"
                      style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 19, color: C.naranja }}
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
              className="cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                border: `2px solid ${C.piedra}`,
                borderRadius: 9999,
                padding: '15px 36px',
                background: 'transparent',
                color: C.tintaMedia,
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              Cargar más insumos ({filteredInsumos.length - visibles} restantes)
            </button>
          </div>
        )}
        </div>

        {/* ─── Pie ─── */}
        <footer
          className="mt-16 flex flex-wrap items-center justify-between gap-5 pt-6"
          style={{ borderTop: '1px solid rgba(222,216,207,0.8)' }}
        >
          <span className="text-sm" style={{ color: C.tintaSuave }}>
            Megafood Perú · Inventario · v2.0
          </span>
          <span className="flex gap-2" aria-hidden="true">
            <span style={{ width: 26, height: 10, borderRadius: 9999, background: C.piedra }} />
            <span style={{ width: 26, height: 10, borderRadius: 9999, background: C.verde }} />
            <span style={{ width: 26, height: 10, borderRadius: 9999, background: C.naranja }} />
          </span>
        </footer>
      </div>

      {/* ─── Modal de alta / edición ─── */}
      {showForm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,44,36,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={resetForm}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
            style={{
              background: C.card,
              borderRadius: RADIOS[0],
              padding: 30,
              boxShadow: '0 20px 40px -10px rgba(107,107,101,0.35)',
            }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 style={{ fontFamily: 'var(--font-fraunces), serif', fontWeight: 700, fontSize: 26, margin: 0 }}>
                {editingInsumo ? 'Editar insumo' : 'Nuevo insumo'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                aria-label="Cerrar"
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center border-0"
                style={{ borderRadius: 9999, background: 'rgba(107,107,101,0.12)', color: C.piedra }}
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
                  style={{ border: `1px solid ${C.borde}`, borderRadius: 9999, padding: '13px 20px', background: 'rgba(255,255,255,0.7)', color: C.tinta }}
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
                  style={{ border: `1px solid ${C.borde}`, borderRadius: 9999, padding: '13px 20px', background: 'rgba(255,255,255,0.7)', color: C.tinta }}
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
                    style={{ border: `1px solid ${C.borde}`, borderRadius: 9999, padding: '13px 20px', background: 'rgba(255,255,255,0.7)', color: C.tinta }}
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
                    style={{ border: `1px solid ${C.borde}`, borderRadius: 9999, padding: '13px 20px', background: 'rgba(255,255,255,0.7)', color: C.tinta }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 cursor-pointer text-[15px] font-extrabold transition-all hover:scale-[1.03]"
                style={{ border: `2px solid ${C.piedra}`, borderRadius: 9999, padding: '14px 20px', background: 'transparent', color: C.tintaMedia }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 border-0 text-[15px] font-extrabold transition-all hover:scale-[1.03] disabled:opacity-60"
                style={{ borderRadius: 9999, padding: '14px 20px', background: C.verde, color: '#24310F' }}
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
