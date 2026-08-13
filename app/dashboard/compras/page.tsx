'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Building,
  Users,
  Calendar,
  Package,
  Calculator,
  FileSpreadsheet,
  Download,
  Loader2,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  X,
  Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
// Eliminar: import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface Sede {
  id: string
  nombre: string
}

interface ProgramacionItem {
  id: number
  /** Columna `fecha` (date) de planificacion_detalles: yyyy-mm-dd. */
  fecha: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface InsumoRequerido {
  insumo_id: string
  insumo_nombre: string
  unidad: string
  categoria: string
  cantidad_total: number
  cantidad_porcion: number
  precio_unitario?: number
  costo_total?: number
}

interface Receta {
  id: number
  plato_id: string
  insumo_id: string
  cantidad: number
}

type RolUsuario = "gerencia" | "compras"

const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE", icon: "📋" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF", icon: "🥗" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED", icon: "🎯" },
]

const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  "ENTRADA":       { color: "#2d5a1e", bg: "#eaf3de" },
  "CÁRNICO":       { color: "#991b1b", bg: "#fef2f2" },
  "GUARNICIÓN 01": { color: "#c2410c", bg: "#fff7ed" },
  "GUARNICIÓN 02": { color: "#c2410c", bg: "#fff7ed" },
  "GUARNICIÓN 03": { color: "#c2410c", bg: "#fff7ed" },
  "POSTRE":        { color: "#6d28d9", bg: "#f5f3ff" },
  "BEBIBLE":       { color: "#1e40af", bg: "#eff6ff" },
  "SALSA":         { color: "#b45309", bg: "#fffbeb" },
}

// ─── Paleta de colores por categoría de INSUMOS (usada en el Excel) ───
const CATEGORIA_COLORS_EXCEL: Record<string, { header: string; subheader: string; altA: string; altB: string }> = {
  "Frutas y Verduras": { header: 'FF1E5631', subheader: 'FF2D7A4F', altA: 'FFFFFFFF', altB: 'FFF2F2F2' },
  "Cárnicos":           { header: 'FF7B1A1A', subheader: 'FFC0392B', altA: 'FFFFFFFF', altB: 'FFF5C6C6' },
  "Abarrotes":          { header: 'FF1A3E6B', subheader: 'FF2E6DA4', altA: 'FFFFFFFF', altB: 'FFDCE8F5' },
  "Descartables":       { header: 'FF4A3B6B', subheader: 'FF7A5FB0', altA: 'FFFFFFFF', altB: 'FFE6E0F0' },
  "Químicos":           { header: 'FF1B4F4F', subheader: 'FF2E7D7D', altA: 'FFFFFFFF', altB: 'FFD9EDED' },
}
const CATEGORIA_COLOR_DEFAULT = { header: 'FF555555', subheader: 'FF888888', altA: 'FFFFFFFF', altB: 'FFEDEDED' }

const formatearCantidad = (cantidad: number, unidad: string): { cantidad: number; unidad: string } => {
  const unidadUpper = unidad.toUpperCase()
  if (unidadUpper === 'GR' && cantidad >= 1000) return { cantidad: cantidad / 1000, unidad: 'KG' }
  if (unidadUpper === 'ML' && cantidad >= 1000) return { cantidad: cantidad / 1000, unidad: 'LT' }
  if (unidadUpper === 'KG' && cantidad < 1 && cantidad > 0) return { cantidad: cantidad * 1000, unidad: 'gr' }
  if (unidadUpper === 'LT' && cantidad < 1 && cantidad > 0) return { cantidad: cantidad * 1000, unidad: 'ML' }
  return { cantidad, unidad }
}

const redondearCantidad = (cantidad: number): number => {
  if (cantidad === 0) return 0
  if (cantidad < 0.01) return Number(cantidad.toFixed(4))
  if (cantidad < 1) return Number(cantidad.toFixed(3))
  if (cantidad < 100) return Number(cantidad.toFixed(2))
  return Number(cantidad.toFixed(1))
}

// ─── Detectar si la unidad es contable ───
const esUnidadContable = (unidad: string): boolean => {
  const unidadesContables = ['UN', 'UNIDAD', 'UNIDADES', 'SACO', 'SACOS', 'TARRO', 'TARROS',
    'BOLSA', 'BOLSAS', 'PAR', 'PARES', 'CAJA', 'CAJAS', 'LATA', 'LATAS',
    'SOBRE', 'SOBRES', 'PAQUETE', 'PAQUETES', 'ROLLO', 'ROLLOS']
  return unidadesContables.includes(unidad.toUpperCase().trim())
}

// ─── Formatear cantidad según unidad ───
const formatearCantidadConUnidad = (cantidad: number, unidad: string): { cantidad: number | string; unidad: string; display: string } => {
  const unidadUpper = unidad.toUpperCase().trim()
  const esContable = esUnidadContable(unidad)

  if (esContable) {
    const cantidadRedondeada = Math.round(cantidad)
    return {
      cantidad: cantidadRedondeada,
      unidad: unidad,
      display: `${cantidadRedondeada} ${unidad}`
    }
  }

  const formateado = formatearCantidad(cantidad, unidad)
  const redondeada = redondearCantidad(formateado.cantidad)
  return {
    cantidad: redondeada,
    unidad: formateado.unidad,
    display: `${redondeada} ${formateado.unidad}`
  }
}

const formatearMoneda = (valor: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(valor)
}

// Date -> "yyyy-mm-dd" local, que es el formato de la columna `fecha` (date).
// Se construye a mano en vez de con toISOString() para no cruzar husos horarios.
const aISO = (fecha: Date): string => {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "yyyy-mm-dd" -> "miércoles, 12 de agosto de 2026" (solo para mostrar).
const formatearFechaLegible = (fechaISO: string): string => {
  if (!fechaISO) return ""
  return new Date(fechaISO + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ─── COMPARACIÓN DE FECHAS ───
// Con "yyyy-mm-dd" el orden lexicográfico coincide con el cronológico, así que
// ya no hace falta parsear el texto largo en español que usaba fecha_texto.
const compararFechasCronologico = (fechaA: string, fechaB: string): number =>
  fechaA.localeCompare(fechaB)

// ─── Componente DateRangeSelector ──────────────────
const DateRangeSelector = ({
  sedeId,
  onRangeChange,
  fechaInicio,
  fechaFin
}: {
  sedeId: string
  onRangeChange: (inicio: string, fin: string) => void
  fechaInicio: string
  fechaFin: string
}) => {
  const supabase = createClient()
  const [mostrarCalendarioInicio, setMostrarCalendarioInicio] = useState(false)
  const [mostrarCalendarioFin, setMostrarCalendarioFin] = useState(false)
  const [fechasProgramadas, setFechasProgramadas] = useState<Set<string>>(new Set())
  const [mesActualInicio, setMesActualInicio] = useState(new Date())
  const [mesActualFin, setMesActualFin] = useState(new Date())

  useEffect(() => {
    if (!sedeId) return
    const cargarFechas = async () => {
      const { data } = await supabase
        .from("planificacion_detalles")
        .select("fecha")
        .eq("sede_id", sedeId)
      if (data) {
        setFechasProgramadas(new Set(data.map((f: { fecha: string }) => f.fecha)))
      }
    }
    cargarFechas()
  }, [sedeId])

  const convertirISOaBD = (fecha: Date): string => aISO(fecha)

  const obtenerDias = (mes: Date) => {
    const año = mes.getFullYear()
    const mesNum = mes.getMonth()
    const primerDia = new Date(año, mesNum, 1)
    const ultimoDia = new Date(año, mesNum + 1, 0)
    const diaInicio = primerDia.getDay()
    const dias: (Date | null)[] = []

    for (let i = 0; i < diaInicio; i++) dias.push(null)
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(new Date(año, mesNum, i))
    return dias
  }

  const diasSemana = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

  const CalendarioMini = ({
    mes,
    setMes,
    onSelect,
    seleccionada
  }: {
    mes: Date
    setMes: (date: Date) => void
    onSelect: (fecha: string) => void
    seleccionada: string
  }) => {
    const dias = obtenerDias(mes)
    const nombreMes = mes.toLocaleString('es-ES', { month: 'long' })
    const año = mes.getFullYear()

    return (
      <div className="w-full">
        <div className="flex items-center justify-between px-2 py-2 border-b border-[#E7E7E2]">
          <button
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            className="p-1 text-[#6B6B65] hover:text-[#2B2B2B] transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-[#2B2B2B] capitalize">
            {nombreMes} {año}
          </span>
          <button
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            className="p-1 text-[#6B6B65] hover:text-[#2B2B2B] transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 p-1">
          {diasSemana.map(dia => (
            <div key={dia} className="text-center text-[10px] font-bold text-[#9A9A93] py-1">
              {dia}
            </div>
          ))}
          {dias.map((fecha, idx) => {
            const esValida = fecha !== null
            const tieneProg = esValida && fechasProgramadas.has(convertirISOaBD(fecha))
            const esSeleccionada = esValida && seleccionada === convertirISOaBD(fecha)

            return (
              <button
                key={idx}
                onClick={() => {
                  if (esValida && tieneProg) {
                    onSelect(convertirISOaBD(fecha))
                  }
                }}
                disabled={!esValida || !tieneProg}
                className={`
                  h-7 text-xs rounded transition-all
                  ${!esValida ? 'invisible' : ''}
                  ${tieneProg && !esSeleccionada ? 'hover:bg-[#8CC63F]/10 text-[#2B2B2B]' : ''}
                  ${esSeleccionada ? 'bg-[#8CC63F] text-white' : ''}
                  ${!tieneProg && esValida ? 'text-[#D1D5DB] cursor-not-allowed' : ''}
                `}
              >
                {esValida ? fecha.getDate() : ''}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-[#6B6B65] mb-1">
          📅 Fecha Inicio
        </label>
        <div className="relative">
          <button
            onClick={() => {
              setMostrarCalendarioInicio(!mostrarCalendarioInicio)
              setMostrarCalendarioFin(false)
            }}
            className={`
              w-full rounded-lg border px-4 py-2.5 text-sm text-left transition-all
              ${fechaInicio
                ? 'border-[#8CC63F] bg-[#F5FBF0] text-[#2B2B2B]'
                : 'border-[#E7E7E2] bg-white text-[#6B6B65] hover:border-[#8CC63F]/50'
              }
            `}
          >
            <span className="capitalize">{formatearFechaLegible(fechaInicio) || "Seleccionar inicio"}</span>
          </button>
          {mostrarCalendarioInicio && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[#E7E7E2] shadow-xl z-50 w-64">
              <CalendarioMini
                mes={mesActualInicio}
                setMes={setMesActualInicio}
                onSelect={(fecha) => {
                  onRangeChange(fecha, fechaFin)
                  setMostrarCalendarioInicio(false)
                }}
                seleccionada={fechaInicio}
              />
              <div className="border-t border-[#E7E7E2] p-2 flex justify-end">
                <button
                  onClick={() => setMostrarCalendarioInicio(false)}
                  className="text-xs text-[#6B6B65] hover:text-[#2B2B2B] transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#6B6B65] mb-1">
          📅 Fecha Fin
        </label>
        <div className="relative">
          <button
            onClick={() => {
              setMostrarCalendarioFin(!mostrarCalendarioFin)
              setMostrarCalendarioInicio(false)
            }}
            className={`
              w-full rounded-lg border px-4 py-2.5 text-sm text-left transition-all
              ${fechaFin
                ? 'border-[#8CC63F] bg-[#F5FBF0] text-[#2B2B2B]'
                : 'border-[#E7E7E2] bg-white text-[#6B6B65] hover:border-[#8CC63F]/50'
              }
            `}
          >
            <span className="capitalize">{formatearFechaLegible(fechaFin) || "Seleccionar fin"}</span>
          </button>
          {mostrarCalendarioFin && (
            <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[#E7E7E2] shadow-xl z-50 w-64">
              <CalendarioMini
                mes={mesActualFin}
                setMes={setMesActualFin}
                onSelect={(fecha) => {
                  if (fechaInicio) {
                    const regex = /(\d+) de (\w+) de (\d+)/
                    const matchInicio = fechaInicio.match(regex)
                    const matchFin = fecha.match(regex)
                    if (matchInicio && matchFin) {
                      const meses: Record<string, number> = {
                        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
                        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
                        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
                      }
                      const diaInicio = parseInt(matchInicio[1])
                      const mesInicio = meses[matchInicio[2].toLowerCase()]
                      const añoInicio = parseInt(matchInicio[3])
                      const fechaInicioDate = new Date(añoInicio, mesInicio, diaInicio)

                      const diaFin = parseInt(matchFin[1])
                      const mesFin = meses[matchFin[2].toLowerCase()]
                      const añoFin = parseInt(matchFin[3])
                      const fechaFinDate = new Date(añoFin, mesFin, diaFin)

                      if (fechaFinDate < fechaInicioDate) {
                        alert("La fecha de fin debe ser posterior a la fecha de inicio")
                        return
                      }
                    }
                  }
                  onRangeChange(fechaInicio, fecha)
                  setMostrarCalendarioFin(false)
                }}
                seleccionada={fechaFin}
              />
              <div className="border-t border-[#E7E7E2] p-2 flex justify-end">
                <button
                  onClick={() => setMostrarCalendarioFin(false)}
                  className="text-xs text-[#6B6B65] hover:text-[#2B2B2B] transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ──────────────────────────
export default function ModuloCompras() {
  const router = useRouter()
  const supabase = createClient()

  const [rol, setRol] = useState<RolUsuario>("compras")
  const [verificandoAcceso, setVerificandoAcceso] = useState(true)
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [fechaInicio, setFechaInicio] = useState("")
  const [fechaFin, setFechaFin] = useState("")
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([])
  const [cargando, setCargando] = useState(false)

  // Comensales reales por fecha y tipo, leídos de planificacion_comensales.
  // La clave es `${fecha}|${tipo}`. Sustituyen a los antiguos campos manuales.
  const [comensalesPorFechaTipo, setComensalesPorFechaTipo] = useState<Record<string, number>>({})

  const [insumosRequeridos, setInsumosRequeridos] = useState<InsumoRequerido[]>([])
  const [calculando, setCalculando] = useState(false)
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [insumos, setInsumos] = useState<any[]>([])
  const [exportando, setExportando] = useState(false)
  const [todasFechasProgramadas, setTodasFechasProgramadas] = useState<string[]>([])

  const cargarDatosIniciales = async () => {
    setCargando(true)

    try {
      const [{ data: sedesData }, { data: recetasData }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").order("nombre"),
        supabase.from("recetas").select("*"),
      ])

      if (sedesData) setSedes(sedesData)
      if (recetasData) setRecetas(recetasData)

      const { data, error } = await supabase
        .from("insumos")
        .select("id, nombre, unidad, precio, categoria")

      if (!error && data) {
        const insumosValidos = data.filter(item =>
          item && typeof item === 'object' && 'id' in item && 'nombre' in item
        )
        setInsumos(insumosValidos)
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    const verificarAcceso = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      const rolUsuarioDB = perfil?.role?.toLowerCase() || ""

      if (rolUsuarioDB === "admin" || rolUsuarioDB === "gerencia") {
        setRol("gerencia")
      } else if (rolUsuarioDB === "compras") {
        setRol("compras")
      } else {
        router.push("/dashboard")
        return
      }

      setVerificandoAcceso(false)
      cargarDatosIniciales()
    }

    verificarAcceso()
  }, [router])

  const cargarProgramacionRango = async () => {
    if (!sedeSeleccionada || !fechaInicio || !fechaFin) {
      alert("Seleccione una sede y un rango de fechas")
      return
    }

    setCargando(true)

    try {
      // Con `fecha` de tipo date el rango se filtra en la propia consulta,
      // sin traer todas las fechas de la sede para compararlas en el cliente.
      const { data, error } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)

      if (error) throw error

      if (!data || data.length === 0) {
        setProgramacion([])
        setInsumosRequeridos([])
        setComensalesPorFechaTipo({})
        alert("No hay programación en el rango de fechas seleccionado")
        setCargando(false)
        return
      }

      // Comensales reales del rango, por fecha y tipo de menú.
      const { data: comData, error: comError } = await supabase
        .from("planificacion_comensales")
        .select("fecha, tipo, comensales")
        .eq("sede_id", sedeSeleccionada)
        .gte("fecha", fechaInicio)
        .lte("fecha", fechaFin)

      if (comError) throw comError

      const mapaComensales: Record<string, number> = {}
      comData?.forEach((c: { fecha: string; tipo: string; comensales: number }) => {
        mapaComensales[`${c.fecha}|${c.tipo}`] = c.comensales
      })
      setComensalesPorFechaTipo(mapaComensales)

      {
        const platoIds = [...new Set(data.map(p => p.plato_id))]
        const { data: platosData } = await supabase
          .from("platos")
          .select("id, nombre")
          .in("id", platoIds)

        const mapaPlatos = new Map()
        platosData?.forEach(p => mapaPlatos.set(p.id, p.nombre))

        const programacionConNombre = data.map(p => ({
          ...p,
          plato_nombre: mapaPlatos.get(p.plato_id) || "Desconocido"
        }))

        // ─── ORDENAR POR FECHA CRONOLÓGICA ───
        const programacionOrdenada = programacionConNombre.sort((a, b) => {
          return compararFechasCronologico(a.fecha, b.fecha)
        })

        setProgramacion(programacionOrdenada)
        setInsumosRequeridos([])
      }
    } catch (error: any) {
      console.error("Error cargando programación:", error)
      alert("Error al cargar la programación: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  /** Comensales registrados para una fecha y tipo (0 si no hay registro). */
  const comensalesDe = (fecha: string, tipo: string): number =>
    comensalesPorFechaTipo[`${fecha}|${tipo}`] ?? 0

  const calcularRequerimientoRango = async () => {
    if (programacion.length === 0) {
      alert("Primero cargue una programación válida")
      return
    }

    if (totalComensalesRango <= 0) {
      alert(
        "No hay comensales registrados en este rango.\n\n" +
        "Regístralos en Menús › Editar programación antes de calcular el requerimiento."
      )
      return
    }

    setCalculando(true)
    const mapaInsumos = new Map<string, InsumoRequerido>()

    try {
      for (const item of programacion) {
        const personasDia = comensalesDe(item.fecha, item.tipo)
        if (personasDia <= 0) continue

        const recetaPlato = recetas.filter(r => r.plato_id === item.plato_id)

        for (const receta of recetaPlato) {
          const cantidadTotal = receta.cantidad * personasDia
          const insumo = insumos.find(i => i.id === receta.insumo_id)

          if (!insumo) continue

          if (mapaInsumos.has(receta.insumo_id)) {
            const existente = mapaInsumos.get(receta.insumo_id)!
            existente.cantidad_total += cantidadTotal
            if (rol === "gerencia" && existente.precio_unitario) {
              existente.costo_total = existente.cantidad_total * existente.precio_unitario
            }
          } else {
            const nuevoInsumo: InsumoRequerido = {
              insumo_id: receta.insumo_id,
              insumo_nombre: insumo.nombre,
              unidad: insumo.unidad,
              categoria: insumo.categoria || "Sin categoría",
              cantidad_total: cantidadTotal,
              cantidad_porcion: receta.cantidad
            }

            if (rol === "gerencia" && insumo.precio !== undefined && insumo.precio !== null) {
              nuevoInsumo.precio_unitario = insumo.precio
              nuevoInsumo.costo_total = cantidadTotal * insumo.precio
            }

            mapaInsumos.set(receta.insumo_id, nuevoInsumo)
          }
        }
      }

      const resultado = Array.from(mapaInsumos.values()).sort((a, b) =>
        a.insumo_nombre.localeCompare(b.insumo_nombre)
      )

      setInsumosRequeridos(resultado)
    } catch (error) {
      console.error("Error al calcular:", error)
      alert("Error al calcular el requerimiento")
    } finally {
      setCalculando(false)
    }
  }

const exportarAExcel = async () => {
    if (insumosRequeridos.length === 0) return

    setExportando(true)
    try {
      const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)
      
      // 1. Crear el libro de Excel
      const wb = new ExcelJS.Workbook()
      wb.creator = 'MegaFood'
      wb.created = new Date()

      // --- PALETA DE COLORES DE LA APP (Formato ARGB) ---
      const COLOR_OSCURO = 'FF2B2B2B'  // Header principal
      const COLOR_NARANJA = 'FFF37F21' // Cabeceras de tabla / Textos resaltados
      const COLOR_VERDE = 'FF8CC63F'   // Totales
      const COLOR_FONDO_VERDE = 'FFF5FBF0'
      const COLOR_FONDO_GRIS = 'FFF5F5F0'

      // ==========================================
      // HOJA 1: REQUERIMIENTO DE INSUMOS (por categoría)
      // ==========================================
      const wsRequerimiento = wb.addWorksheet('Requerimiento')

      const numColumnas = rol === "gerencia" ? 8 : 6
      const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
      const ultimaColumnaReq = LETRAS[numColumnas - 1]

      // Título Principal
      wsRequerimiento.mergeCells(`A1:${ultimaColumnaReq}2`)
      const cellTitle = wsRequerimiento.getCell('A1')
      cellTitle.value = `REQUERIMIENTO DE INSUMOS - ${sedeInfo?.nombre?.toUpperCase() || 'SEDE'}`
      cellTitle.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
      cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
      cellTitle.alignment = { vertical: 'middle', horizontal: 'center' }

      // Subtítulo (Fechas)
      wsRequerimiento.mergeCells(`A3:${ultimaColumnaReq}3`)
      const cellSubtitle = wsRequerimiento.getCell('A3')
      cellSubtitle.value = `Periodo programado: ${formatearFechaLegible(fechaInicio)} al ${formatearFechaLegible(fechaFin)}`
      cellSubtitle.font = { name: 'Arial', size: 11, italic: true, color: { argb: COLOR_OSCURO } }
      cellSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FONDO_GRIS } }
      cellSubtitle.alignment = { vertical: 'middle', horizontal: 'center' }

      wsRequerimiento.addRow([]) // Espacio vacío

      // ─── Agrupar insumos por categoría (orden alfabético) ───
      const insumosPorCategoria = insumosRequeridos.reduce((acc, item) => {
        const cat = item.categoria || "Sin categoría"
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
      }, {} as Record<string, InsumoRequerido[]>)

      const categoriasOrdenadas = Object.keys(insumosPorCategoria).sort((a, b) => a.localeCompare(b))

      const headersReq = ['N°', 'Insumo', 'Cant. por Porción', 'Cantidad Total', 'Unidad', 'Proveedor']
      if (rol === "gerencia") {
        headersReq.push('Precio Unit. (S/)', 'Precio Total (S/)')
      }

      let contadorGlobal = 0

      categoriasOrdenadas.forEach((categoria) => {
        const paleta = CATEGORIA_COLORS_EXCEL[categoria] || CATEGORIA_COLOR_DEFAULT
        const itemsCategoria = insumosPorCategoria[categoria]

        // Fila de categoría (fusionada)
        const rowCategoria = wsRequerimiento.addRow([categoria.toUpperCase()])
        wsRequerimiento.mergeCells(`A${rowCategoria.number}:${ultimaColumnaReq}${rowCategoria.number}`)
        const cellCategoria = wsRequerimiento.getCell(`A${rowCategoria.number}`)
        cellCategoria.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
        cellCategoria.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header } }
        cellCategoria.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

        // Fila de sub-cabecera (nombres de columna)
        const rowHeader = wsRequerimiento.addRow(headersReq)
        rowHeader.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.subheader } }
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { vertical: 'middle', horizontal: 'center' }
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        })

        // Filas de insumos (alternando color)
        itemsCategoria.forEach((insumo, idx) => {
          contadorGlobal++
          const formateadoTotal = formatearCantidadConUnidad(insumo.cantidad_total, insumo.unidad)
          const formateadoPorcion = formatearCantidadConUnidad(insumo.cantidad_porcion, insumo.unidad)

          const rowData: any[] = [
            contadorGlobal,
            insumo.insumo_nombre,
            formateadoPorcion.display,
            formateadoTotal.display,
            formateadoTotal.unidad,
            '' // Proveedor (vacío por ahora)
          ]

          if (rol === "gerencia") {
            rowData.push(insumo.precio_unitario || 0, insumo.costo_total || 0)
          }

          const row = wsRequerimiento.addRow(rowData)
          const colorFondo = idx % 2 === 0 ? paleta.altA : paleta.altB

          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 10 }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondo } }
            cell.border = {
              top: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              left: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              right: { style: 'hair', color: { argb: 'FFDDDDDD' } }
            }
            cell.alignment = {
              vertical: 'middle',
              horizontal: colNumber === 1 ? 'center' : colNumber === 2 ? 'left' : 'center'
            }

            // Cantidad Total en negrita (columna 4)
            if (colNumber === 4) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_OSCURO } }
            }

            // Formato moneda si es gerencia (columnas 7 y 8)
            if (rol === 'gerencia' && (colNumber === 7 || colNumber === 8)) {
              cell.numFmt = '"S/"#,##0.00'
              cell.alignment = { vertical: 'middle', horizontal: 'right' }
              if (colNumber === 8) {
                cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F3A0A' } }
              }
            }
          })
        })
      })

      // Fila de Total General (Solo Gerencia)
      if (rol === "gerencia") {
        wsRequerimiento.addRow([])
        const filaTotal = new Array(numColumnas).fill('')
        filaTotal[numColumnas - 2] = 'COSTO TOTAL:'
        filaTotal[numColumnas - 1] = costoTotalGeneral
        const totalRow = wsRequerimiento.addRow(filaTotal)

        const labelCell = totalRow.getCell(numColumnas - 1)
        labelCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLOR_OSCURO } }
        labelCell.alignment = { horizontal: 'right' }

        const valueCell = totalRow.getCell(numColumnas)
        valueCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
        valueCell.numFmt = '"S/"#,##0.00'
        valueCell.alignment = { horizontal: 'right' }
      }

      // Ajustar anchos de columna
      wsRequerimiento.columns = [
        { width: 6 },  // N°
        { width: 38 }, // Insumo
        { width: 20 }, // Cantidad por porción
        { width: 20 }, // Cantidad Total
        { width: 12 }, // Unidad
        { width: 20 }, // Proveedor
        ...(rol === "gerencia" ? [{ width: 18 }, { width: 18 }] : [])
      ]

      // ==========================================
      // HOJA 2: RESUMEN DE OPERACIÓN
      // ==========================================
      const wsResumen = wb.addWorksheet('Resumen')
      
      wsResumen.mergeCells('A1:B2')
      const cellTitleRes = wsResumen.getCell('A1')
      cellTitleRes.value = 'RESUMEN OPERATIVO'
      cellTitleRes.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
      cellTitleRes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
      cellTitleRes.alignment = { vertical: 'middle', horizontal: 'center' }

      wsResumen.addRow([])

      const resumenDatos = [
        ['Sede Asignada', sedeInfo?.nombre || 'No especificada'],
        ['Rango de Fechas', `${formatearFechaLegible(fechaInicio)} al ${formatearFechaLegible(fechaFin)}`],
        ['Días de Operación', totalDias],
        ['Promedio de Comensales por día', promedioComensalesDia],
        ['Total Comensales (Periodo)', totalComensalesRango],
        ...(rol === "gerencia" ? [
          ['Costo Total Estimado', costoTotalGeneral],
          ['Costo Promedio por Día', totalDias > 0 ? costoTotalGeneral / totalDias : 0],
          ['Costo Promedio por Comensal', totalComensalesRango > 0 ? costoTotalGeneral / totalComensalesRango : 0]
        ] : [])
      ]

      resumenDatos.forEach(dato => {
        const row = wsResumen.addRow(dato)
        row.getCell(1).font = { bold: true, color: { argb: COLOR_OSCURO } }
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FONDO_GRIS } }
        
        // Dar formato moneda si corresponde a un costo (últimos 3 items de gerencia)
        if (typeof dato[1] === 'number' && String(dato[0]).includes('Costo')) {
           row.getCell(2).numFmt = '"S/"#,##0.00'
           row.getCell(2).font = { bold: true, color: { argb: COLOR_VERDE } }
        }
      })

      // ─── Desglose de costo por categoría (solo gerencia) ───
      if (rol === "gerencia") {
        wsResumen.addRow([]) // espacio

        const rowSubtitulo = wsResumen.addRow(['COSTO POR CATEGORÍA'])
        wsResumen.mergeCells(`A${rowSubtitulo.number}:C${rowSubtitulo.number}`)
        const cellSubtitulo = wsResumen.getCell(`A${rowSubtitulo.number}`)
        cellSubtitulo.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
        cellSubtitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
        cellSubtitulo.alignment = { vertical: 'middle', horizontal: 'center' }

        const rowHeaderCat = wsResumen.addRow(['Categoría', 'Costo Total (S/)', '% del Total'])
        rowHeaderCat.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NARANJA } }
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'center' }
        })

        // Agrupar costo total por categoría
        const costoPorCategoria = insumosRequeridos.reduce((acc, item) => {
          const cat = item.categoria || "Sin categoría"
          acc[cat] = (acc[cat] || 0) + (item.costo_total || 0)
          return acc
        }, {} as Record<string, number>)

        // Ordenar de mayor a menor costo
        const categoriasPorCosto = Object.keys(costoPorCategoria).sort(
          (a, b) => costoPorCategoria[b] - costoPorCategoria[a]
        )

        categoriasPorCosto.forEach((categoria) => {
          const paleta = CATEGORIA_COLORS_EXCEL[categoria] || CATEGORIA_COLOR_DEFAULT
          const porcentaje = costoTotalGeneral > 0 ? costoPorCategoria[categoria] / costoTotalGeneral : 0

          const row = wsResumen.addRow([categoria, costoPorCategoria[categoria], porcentaje])

          row.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: paleta.header } }

          row.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_OSCURO } }
          row.getCell(2).numFmt = '"S/"#,##0.00'
          row.getCell(2).alignment = { horizontal: 'right' }

          row.getCell(3).font = { name: 'Arial', size: 10, color: { argb: 'FF6B6B65' } }
          row.getCell(3).numFmt = '0.0%'
          row.getCell(3).alignment = { horizontal: 'right' }
        })

        // Fila de total (verificación)
        const rowTotalCat = wsResumen.addRow(['TOTAL', costoTotalGeneral, 1])
        rowTotalCat.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        rowTotalCat.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
        rowTotalCat.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        rowTotalCat.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
        rowTotalCat.getCell(2).numFmt = '"S/"#,##0.00'
        rowTotalCat.getCell(2).alignment = { horizontal: 'right' }
        rowTotalCat.getCell(3).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        rowTotalCat.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
        rowTotalCat.getCell(3).numFmt = '0.0%'
        rowTotalCat.getCell(3).alignment = { horizontal: 'right' }
      }

      wsResumen.columns = [{ width: 35 }, { width: 22 }, { width: 15 }]

      // ==========================================
      // HOJA 3: COMENSALES POR DÍA (Opcional)
      // ==========================================
      if (fechasOrdenadas.length > 0) {
        const wsComensales = wb.addWorksheet('Comensales por día')

        const rowHeaderCom = wsComensales.addRow(['Fecha de Servicio', 'Tipo de Menú', 'Comensales'])
        rowHeaderCom.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'center' }
        })

        // Una fila por fecha y tipo, que es como se registran los comensales.
        fechasOrdenadas.forEach((fecha) => {
          const tiposDelDia = [...new Set((programacionPorFecha[fecha] || []).map(p => p.tipo))].sort()

          tiposDelDia.forEach((tipo) => {
            const row = wsComensales.addRow([
              formatearFechaLegible(fecha),
              tipo,
              comensalesPorFechaTipo[`${fecha}|${tipo}`] ?? 0,
            ])
            row.getCell(3).alignment = { horizontal: 'center' }
            row.getCell(3).font = { bold: true, color: { argb: COLOR_NARANJA } }
          })
        })

        wsComensales.columns = [{ width: 32 }, { width: 18 }, { width: 16 }]
      }

      // 4. Generar y descargar el archivo
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `Requerimiento_MegaFood_${sedeInfo?.nombre}_${fechaInicio}.xlsx`)
      
    } catch (error) {
      console.error("Error al exportar:", error)
      alert("Error al exportar el archivo Excel")
    } finally {
      setExportando(false)
    }
  }

  // ─── AGRUPAR Y ORDENAR FECHAS ───
  const programacionPorFecha = programacion.reduce((acc, item) => {
    if (!acc[item.fecha]) acc[item.fecha] = []
    acc[item.fecha].push(item)
    return acc
  }, {} as Record<string, ProgramacionItem[]>)

  const fechasOrdenadas = Object.keys(programacionPorFecha).sort((a, b) =>
    compararFechasCronologico(a, b)
  )

  const totalDias = Object.keys(programacionPorFecha).length
  const totalPlatos = programacion.length
  const costoTotalGeneral = insumosRequeridos.reduce((acc, curr) => acc + (curr.costo_total || 0), 0)
  const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)

  // Pares fecha+tipo realmente programados: sobre esos se leen los comensales.
  const paresFechaTipo = [...new Set(programacion.map(p => `${p.fecha}|${p.tipo}`))]

  const totalComensalesRango = paresFechaTipo.reduce(
    (acc, clave) => acc + (comensalesPorFechaTipo[clave] ?? 0),
    0
  )

  const paresSinComensales = paresFechaTipo.filter(
    clave => (comensalesPorFechaTipo[clave] ?? 0) <= 0
  )

  /** Comensales sumados de un día (todos sus tipos). */
  const comensalesDelDia = (fecha: string): number =>
    [...new Set((programacionPorFecha[fecha] || []).map(p => p.tipo))].reduce(
      (acc, tipo) => acc + (comensalesPorFechaTipo[`${fecha}|${tipo}`] ?? 0),
      0
    )

  const promedioComensalesDia = totalDias > 0 ? Math.round(totalComensalesRango / totalDias) : 0

  if (verificandoAcceso) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <p className="text-[#6B6B65] font-medium">Verificando accesos de seguridad...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#FFFFFF' }}>
      {/* Header estilo MegaFood */}
      <header className="relative overflow-hidden" style={{ background: '#1E5631' }}>
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-6 sm:pt-24 sm:pb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
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
                <span style={{ color: '#FFFFFF' }}>Módulo de</span>
                <span style={{ color: '#F37F21' }} className="capitalize">
                  {rol === "gerencia" ? " Gerencia" : " Compras"}
                </span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
                {rol === "gerencia"
                  ? "📊 Gestión completa con costos y análisis financiero"
                  : "🛒 Lista de compras sin información de precios"}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
              Sede
            </label>
            <select
              value={sedeSeleccionada}
              onChange={(e) => {
                setSedeSeleccionada(e.target.value)
                setFechaInicio("")
                setFechaFin("")
                setProgramacion([])
                setInsumosRequeridos([])
                setComensalesPorFechaTipo({})
              }}
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
            >
              <option value="">Seleccionar sede</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Users className="inline w-4 h-4 mr-2 text-[#F37F21]" />
              Comensales del rango
            </label>
            <div className="w-full rounded-lg border border-[#E7E7E2] bg-[#FAFAF7] px-4 py-2.5">
              {totalDias === 0 ? (
                <span className="text-sm text-[#9A9A93]">Carga una programación</span>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#2B2B2B]">
                    {totalComensalesRango} en total
                  </p>
                  <p className="text-xs text-[#6B6B65]">
                    {promedioComensalesDia} en promedio por día
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={cargarProgramacionRango}
              disabled={cargando || !sedeSeleccionada || !fechaInicio || !fechaFin}
              className="w-full py-2.5 rounded-lg bg-[#2B2B2B] text-white font-medium hover:bg-[#3B3B3B] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {cargando ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
              {cargando ? "Cargando..." : "Cargar programación"}
            </button>
          </div>
        </div>

        {/* Aviso cuando falta registrar comensales en el rango */}
        {paresSinComensales.length > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#F37F21]/30 bg-[#FFF7ED] p-4">
            <Users className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#F37F21]" />
            <div className="text-sm">
              <p className="font-bold text-[#2B2B2B]">
                {paresSinComensales.length}{' '}
                {paresSinComensales.length === 1
                  ? 'combinación de día y tipo no tiene comensales'
                  : 'combinaciones de día y tipo no tienen comensales'}
              </p>
              <p className="mt-0.5 text-[#6B6B65]">
                No sumarán al requerimiento. Regístralos en{' '}
                <Link
                  href="/dashboard/menus/editar"
                  className="font-semibold text-[#F37F21] underline"
                >
                  Menús › Editar programación
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* Selector de rango */}
        {sedeSeleccionada && (
          <div className="mb-6 p-4 rounded-lg border border-[#E7E7E2] bg-white shadow-sm">
            <label className="block text-sm font-medium text-[#2B2B2B] mb-3">
              <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
              Rango de fechas
            </label>
            <DateRangeSelector
              sedeId={sedeSeleccionada}
              onRangeChange={(inicio, fin) => {
                setFechaInicio(inicio)
                setFechaFin(fin)
                setProgramacion([])
                setInsumosRequeridos([])
                setComensalesPorFechaTipo({})
              }}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
            />
            {fechaInicio && fechaFin && (
              <div className="mt-3 p-2 rounded-lg bg-[#8CC63F]/10 border border-[#8CC63F]/20">
                <p className="text-sm text-[#8CC63F]">
                  ✓ Rango seleccionado: <strong className="capitalize">{formatearFechaLegible(fechaInicio)}</strong> al <strong className="capitalize">{formatearFechaLegible(fechaFin)}</strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Programación cargada */}
        {programacion.length > 0 && (
          <div className="mb-6 rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" style={{ background: '#2B2B2B' }}>
              <h2 className="text-white font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="capitalize">Programación del {formatearFechaLegible(fechaInicio)} al {formatearFechaLegible(fechaFin)}</span>
              </h2>
              <span className="text-white/70 text-xs">
                {totalDias} días · {totalPlatos} platos
              </span>
            </div>

            <div className="p-4 overflow-x-auto">
              <div className="flex gap-6 min-w-max pb-2">
                {fechasOrdenadas.map((fecha) => {
                  const items = programacionPorFecha[fecha]
                  return (
                    <div key={fecha} className="min-w-[220px] max-w-[280px] flex-shrink-0 border-r border-[#E7E7E2] pr-6 last:border-r-0 last:pr-0">
                      <h3 className="text-sm font-bold text-[#F37F21] mb-3 sticky left-0 bg-white py-1 capitalize">
                        {formatearFechaLegible(fecha)}
                      </h3>
                      {Object.entries(
                        items.reduce((acc, item) => {
                          if (!acc[item.tipo]) acc[item.tipo] = []
                          acc[item.tipo].push(item)
                          return acc
                        }, {} as Record<string, ProgramacionItem[]>)
                      ).map(([tipo, itemsPorTipo]) => {
                        const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                        return (
                          <div key={tipo} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-[10px] font-bold rounded-full px-2 py-0.5"
                                style={{ background: tipoInfo?.bg, color: tipoInfo?.color }}
                              >
                                {tipoInfo?.icon} {tipoInfo?.label}
                              </span>
                              <span className="text-[10px] text-[#9A9A93]">{itemsPorTipo.length}</span>
                            </div>
                            <div className="space-y-1">
                              {itemsPorTipo.map((item) => {
                                const catColor = CAT_COLORS[item.categoria] || { color: "#555", bg: "#f5f5f5" }
                                return (
                                  <div key={item.id} className="p-1.5 rounded" style={{ background: catColor.bg }}>
                                    <span className="text-[9px] font-bold uppercase block" style={{ color: catColor.color }}>
                                      {item.categoria}
                                    </span>
                                    <span className="text-xs font-medium text-[#2B2B2B]">{item.plato_nombre}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3 border-t border-[#E7E7E2] bg-[#F5F5F0] flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#6B6B65] flex items-center gap-2">
                <Users className="w-3 h-3" />
                {totalDias} días · {totalPlatos} platos · {totalComensalesRango} comensales en total
              </p>
              <button
                onClick={calcularRequerimientoRango}
                disabled={calculando}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-[#F37F21] text-white font-medium hover:bg-[#C4600F] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {calculando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calculator className="w-4 h-4" />
                )}
                {calculando ? "Calculando..." : `Calcular requerimiento (${totalDias} días)`}
              </button>
            </div>
          </div>
        )}

        {/* ─── Comensales por día (solo lectura: vienen de la programación) ─── */}
        {programacion.length > 0 && (
          <div className="mb-6 rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-3 border-b border-[#E7E7E2]" style={{ background: '#F5F5F0' }}>
              <h3 className="text-sm font-bold text-[#2B2B2B] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F37F21]" />
                Comensales por día
              </h3>
              <p className="text-xs text-[#9A9A93] mt-0.5">
                Registrados junto con la programación. Para cambiarlos, edita la programación.
              </p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fechasOrdenadas.map((fecha) => {
                const total = comensalesDelDia(fecha)
                const tiposDelDia = [...new Set((programacionPorFecha[fecha] || []).map(p => p.tipo))]

                return (
                  <div
                    key={fecha}
                    className="rounded-lg border border-[#E7E7E2] px-3 py-2"
                    style={{ background: total > 0 ? '#FFFFFF' : '#FFF7ED' }}
                  >
                    <p className="text-xs font-medium text-[#6B6B65] capitalize truncate" title={formatearFechaLegible(fecha)}>
                      {formatearFechaLegible(fecha)}
                    </p>
                    <p className="text-lg font-bold text-[#2B2B2B]">{total}</p>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {tiposDelDia.map(tipo => {
                        const n = comensalesPorFechaTipo[`${fecha}|${tipo}`] ?? 0
                        return (
                          <span
                            key={tipo}
                            className="text-[10px]"
                            style={{ color: n > 0 ? '#6B6B65' : '#C4554D' }}
                          >
                            {tipo}: <strong>{n}</strong>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-4 sm:px-6 py-2 border-t border-[#E7E7E2] bg-[#F5FBF0]">
              <p className="text-xs text-[#6B6B65]">
                Total: <strong className="text-[#2B2B2B]">{totalComensalesRango} comensales</strong>
                <span className="ml-3">Promedio/día: <strong className="text-[#2B2B2B]">{promedioComensalesDia}</strong></span>
              </p>
            </div>
          </div>
        )}

        {/* Requerimiento de insumos */}
        {insumosRequeridos.length > 0 && (
          <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" style={{ background: '#2B2B2B' }}>
              <div>
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {rol === "gerencia" ? "Requerimiento de Insumos y Costos" : "Requerimiento de Insumos"}
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  <span className="capitalize">{totalDias} días ({formatearFechaLegible(fechaInicio)} al {formatearFechaLegible(fechaFin)})</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {rol === "gerencia" && (
                  <div className="text-right">
                    <p className="text-[#9A9A93] text-[10px] uppercase tracking-wide">Costo Total Estimado</p>
                    <p className="text-lg font-extrabold text-[#8CC63F]">{formatearMoneda(costoTotalGeneral)}</p>
                    <p className="text-[#9A9A93] text-[9px]">Promedio diario: {formatearMoneda(costoTotalGeneral / totalDias)}</p>
                  </div>
                )}
                <button
                  onClick={exportarAExcel}
                  disabled={exportando}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-medium hover:bg-[#7AB835] transition disabled:opacity-50 text-sm"
                >
                  {exportando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {exportando ? "Exportando..." : "Exportar Excel"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F5F5F0] text-xs uppercase text-[#6B6B65]">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left font-bold">Insumo</th>
                    <th className="px-4 sm:px-6 py-3 text-left font-bold">Cantidad por Porción</th>
                    <th className="px-4 sm:px-6 py-3 text-left font-bold">Cantidad Total</th>
                    <th className="px-4 sm:px-6 py-3 text-left font-bold">Unidad</th>
                    {rol === "gerencia" && (
                      <>
                        <th className="px-4 sm:px-6 py-3 text-left font-bold">Precio Unitario</th>
                        <th className="px-4 sm:px-6 py-3 text-left font-bold">Subtotal</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F0]">
                  {insumosRequeridos.map((insumo) => {
                    const formateadoTotal = formatearCantidadConUnidad(insumo.cantidad_total, insumo.unidad)
                    const formateadoPorcion = formatearCantidadConUnidad(insumo.cantidad_porcion, insumo.unidad)

                    return (
                      <tr key={insumo.insumo_id} className="hover:bg-[#F5FBF0] transition">
                        <td className="px-4 sm:px-6 py-3 font-medium text-[#2B2B2B]">{insumo.insumo_nombre}</td>
                        <td className="px-4 sm:px-6 py-3 text-[#6B6B65]">
                          {formateadoPorcion.display}
                        </td>
                        <td className="px-4 sm:px-6 py-3 font-bold text-[#F37F21]">
                          {formateadoTotal.display}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-[#6B6B65]">{formateadoTotal.unidad}</td>
                        {rol === "gerencia" && (
                          <>
                            <td className="px-4 sm:px-6 py-3">{formatearMoneda(insumo.precio_unitario || 0)}</td>
                            <td className="px-4 sm:px-6 py-3 font-semibold text-[#2B2B2B]">
                              {formatearMoneda(insumo.costo_total || 0)}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 sm:px-6 py-3 bg-[#F5FBF0] border-t border-[#E7E7E2]">
              <p className="text-xs text-[#6B6B65]">
                Total de insumos: <strong className="text-[#2B2B2B]">{insumosRequeridos.length} items</strong>
                {rol === "gerencia" && (
                  <>
                    <span className="ml-4">
                      · Costo por día: <strong className="text-[#2B2B2B]">{formatearMoneda(costoTotalGeneral / totalDias)}</strong>
                    </span>
                    <span className="ml-4">
                      · Costo por comensal: <strong className="text-[#2B2B2B]">{formatearMoneda(totalComensalesRango > 0 ? costoTotalGeneral / totalComensalesRango : 0)}</strong>
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Estados vacíos */}
        {programacion.length === 0 && fechaInicio && fechaFin && !cargando && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">No hay programación en el rango seleccionado</p>
          </div>
        )}

        {!sedeSeleccionada && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Building className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">Seleccione una sede para comenzar</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Módulo de {rol === "gerencia" ? "Gerencia" : "Compras"}
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