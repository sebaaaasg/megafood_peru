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
  fecha_texto: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface InsumoRequerido {
  insumo_id: string
  insumo_nombre: string
  unidad: string
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

const formatearFechaParaBD = (fecha: Date): string => {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

const compararFechas = (fechaStr: string, fechaInicio: string, fechaFin: string): boolean => {
  const regex = /(\d+) de (\w+) de (\d+)/
  const match = fechaStr.match(regex)
  if (!match) return false

  const dia = parseInt(match[1])
  const mesTexto = match[2].toLowerCase()
  const año = parseInt(match[3])

  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  }
  const mesNum = meses[mesTexto]
  if (mesNum === undefined) return false

  const fechaActual = new Date(año, mesNum, dia)

  const matchInicio = fechaInicio.match(regex)
  if (!matchInicio) return false
  const diaInicio = parseInt(matchInicio[1])
  const mesInicio = meses[matchInicio[2].toLowerCase()]
  const añoInicio = parseInt(matchInicio[3])
  const fechaInicioDate = new Date(añoInicio, mesInicio, diaInicio)

  const matchFin = fechaFin.match(regex)
  if (!matchFin) return false
  const diaFin = parseInt(matchFin[1])
  const mesFin = meses[matchFin[2].toLowerCase()]
  const añoFin = parseInt(matchFin[3])
  const fechaFinDate = new Date(añoFin, mesFin, diaFin)

  return fechaActual >= fechaInicioDate && fechaActual <= fechaFinDate
}

// ─── FUNCIÓN PARA COMPARAR FECHAS CRONOLÓGICAMENTE ───
const compararFechasCronologico = (fechaA: string, fechaB: string): number => {
  const regex = /(\d+) de (\w+) de (\d+)/
  const matchA = fechaA.match(regex)
  const matchB = fechaB.match(regex)
  
  if (!matchA || !matchB) return 0
  
  const meses: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
  }
  
  const diaA = parseInt(matchA[1])
  const mesA = meses[matchA[2].toLowerCase()]
  const añoA = parseInt(matchA[3])
  const fechaADate = new Date(añoA, mesA, diaA)
  
  const diaB = parseInt(matchB[1])
  const mesB = meses[matchB[2].toLowerCase()]
  const añoB = parseInt(matchB[3])
  const fechaBDate = new Date(añoB, mesB, diaB)
  
  return fechaADate.getTime() - fechaBDate.getTime()
}

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
        .select("fecha_texto")
        .eq("sede_id", sedeId)
      if (data) {
        setFechasProgramadas(new Set(data.map(f => f.fecha_texto)))
      }
    }
    cargarFechas()
  }, [sedeId])

  const convertirISOaBD = (fecha: Date): string => {
    return formatearFechaParaBD(fecha)
  }

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
            {fechaInicio || "Seleccionar inicio"}
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
            {fechaFin || "Seleccionar fin"}
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
  const [cantidadPersonas, setCantidadPersonas] = useState<number>(100)

  const [usarMismaCantidad, setUsarMismaCantidad] = useState<boolean>(true)
  const [comensalesPorFecha, setComensalesPorFecha] = useState<Record<string, number>>({})

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
        .select("id, nombre, unidad, precio")

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
      const { data: todasFechas } = await supabase
        .from("planificacion_detalles")
        .select("fecha_texto")
        .eq("sede_id", sedeSeleccionada)
        .order("fecha_texto")

      const fechasUnicas = todasFechas ? [...new Set(todasFechas.map(f => f.fecha_texto))] : []

      const fechasEnRango = fechasUnicas.filter(fecha =>
        compararFechas(fecha, fechaInicio, fechaFin)
      )

      if (fechasEnRango.length === 0) {
        setProgramacion([])
        setInsumosRequeridos([])
        setComensalesPorFecha({})
        alert("No hay programación en el rango de fechas seleccionado")
        setCargando(false)
        return
      }

      const { data, error } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha_texto, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .in("fecha_texto", fechasEnRango)

      if (error) throw error

      if (data && data.length > 0) {
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
          return compararFechasCronologico(a.fecha_texto, b.fecha_texto)
        })

        setProgramacion(programacionOrdenada)
        setInsumosRequeridos([])

        const fechasUnicasProgramadas = [...new Set(programacionOrdenada.map(p => p.fecha_texto))]
        const inicial: Record<string, number> = {}
        fechasUnicasProgramadas.forEach(fecha => {
          inicial[fecha] = cantidadPersonas
        })
        setComensalesPorFecha(inicial)
      } else {
        setProgramacion([])
        setInsumosRequeridos([])
        setComensalesPorFecha({})
      }
    } catch (error: any) {
      console.error("Error cargando programación:", error)
      alert("Error al cargar la programación: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  const actualizarComensalesFecha = (fecha: string, valor: number) => {
    setComensalesPorFecha(prev => ({ ...prev, [fecha]: valor }))
    setInsumosRequeridos([])
  }

  const calcularRequerimientoRango = async () => {
    if (programacion.length === 0) {
      alert("Primero cargue una programación válida")
      return
    }

    if (usarMismaCantidad) {
      if (cantidadPersonas <= 0) {
        alert("Ingrese un número válido de personas")
        return
      }
    } else {
      const fechasProgramacion = [...new Set(programacion.map(p => p.fecha_texto))]
      const fechaInvalida = fechasProgramacion.find(
        fecha => !comensalesPorFecha[fecha] || comensalesPorFecha[fecha] <= 0
      )
      if (fechaInvalida) {
        alert(`Ingrese un número válido de comensales para: ${fechaInvalida}`)
        return
      }
    }

    setCalculando(true)
    const mapaInsumos = new Map<string, InsumoRequerido>()

    try {
      for (const item of programacion) {
        const personasDia = usarMismaCantidad
          ? cantidadPersonas
          : (comensalesPorFecha[item.fecha_texto] ?? cantidadPersonas)

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
      // HOJA 1: REQUERIMIENTO DE INSUMOS
      // ==========================================
      const wsRequerimiento = wb.addWorksheet('Requerimiento')

      // Título Principal
      const ultimaColumnaReq = rol === "gerencia" ? 'F' : 'D'
      wsRequerimiento.mergeCells(`A1:${ultimaColumnaReq}2`)
      const cellTitle = wsRequerimiento.getCell('A1')
      cellTitle.value = `REQUERIMIENTO DE INSUMOS - ${sedeInfo?.nombre?.toUpperCase() || 'SEDE'}`
      cellTitle.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
      cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
      cellTitle.alignment = { vertical: 'middle', horizontal: 'center' }

      // Subtítulo (Fechas)
      wsRequerimiento.mergeCells(`A3:${ultimaColumnaReq}3`)
      const cellSubtitle = wsRequerimiento.getCell('A3')
      cellSubtitle.value = `Periodo programado: ${fechaInicio} al ${fechaFin}`
      cellSubtitle.font = { name: 'Arial', size: 11, italic: true, color: { argb: COLOR_OSCURO } }
      cellSubtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FONDO_GRIS } }
      cellSubtitle.alignment = { vertical: 'middle', horizontal: 'center' }

      wsRequerimiento.addRow([]) // Espacio vacío

      // Cabeceras de la tabla
      const headersReq = ['Insumo', 'Cant. por Porción', 'Cantidad Total', 'Unidad']
      if (rol === "gerencia") {
        headersReq.push('Precio Unit. (S/)', 'Subtotal (S/)')
      }
      
      const rowHeader = wsRequerimiento.addRow(headersReq)
      rowHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NARANJA } }
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      })

      // Datos de la tabla
      insumosRequeridos.forEach((insumo) => {
        const formateadoTotal = formatearCantidadConUnidad(insumo.cantidad_total, insumo.unidad)
        const formateadoPorcion = formatearCantidadConUnidad(insumo.cantidad_porcion, insumo.unidad)

        const rowData: any[] = [
          insumo.insumo_nombre,
          formateadoPorcion.display,
          formateadoTotal.display,
          formateadoTotal.unidad
        ]

        if (rol === "gerencia") {
          rowData.push(insumo.precio_unitario || 0, insumo.costo_total || 0)
        }

        const row = wsRequerimiento.addRow(rowData)

        // Estilizar celdas de datos
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Arial', size: 10 }
          cell.border = {
            top: { style: 'hair', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
            left: { style: 'hair', color: { argb: 'FFDDDDDD' } },
            right: { style: 'hair', color: { argb: 'FFDDDDDD' } }
          }
          
          // Alinear Insumo a la izq, lo demás centrado
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'center' }

          // Resaltar la Cantidad Total en Naranja
          if (colNumber === 3) {
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_NARANJA } }
          }

          // Formatear Moneda si es gerencia
          if (rol === 'gerencia' && (colNumber === 5 || colNumber === 6)) {
            cell.numFmt = '"S/"#,##0.00'
            cell.alignment = { vertical: 'middle', horizontal: 'right' }
            // Fondo ligerísimo verde para el subtotal
            if (colNumber === 6) {
               cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FONDO_VERDE } }
               cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F3A0A' } }
            }
          }
        })
      })

      // Fila de Total General (Solo Gerencia)
      if (rol === "gerencia") {
        wsRequerimiento.addRow([]) // Espacio
        const totalRow = wsRequerimiento.addRow(['', '', '', '', 'COSTO TOTAL:', costoTotalGeneral])
        
        const labelCell = totalRow.getCell(5)
        labelCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: COLOR_OSCURO } }
        labelCell.alignment = { horizontal: 'right' }

        const valueCell = totalRow.getCell(6)
        valueCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
        valueCell.numFmt = '"S/"#,##0.00'
        valueCell.alignment = { horizontal: 'right' }
      }

      // Ajustar anchos de columna
      wsRequerimiento.columns = [
        { width: 40 }, // Insumo
        { width: 22 }, // Cantidad por porción
        { width: 22 }, // Cantidad Total
        { width: 15 }, // Unidad
        ...(rol === "gerencia" ? [{ width: 18 }, { width: 20 }] : [])
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
        ['Rango de Fechas', `${fechaInicio} al ${fechaFin}`],
        ['Días de Operación', programacion.length > 0 ? [...new Set(programacion.map(p => p.fecha_texto))].length : 0],
        ['Comensales por día', usarMismaCantidad ? cantidadPersonas : 'Variable (ver detalle)'],
        ['Total Comensales (Periodo)', totalComensalesDias],
        ...(rol === "gerencia" ? [
          ['Costo Total Estimado', costoTotalGeneral],
          ['Costo Promedio por Día', totalDias > 0 ? costoTotalGeneral / totalDias : 0],
          ['Costo Promedio por Comensal', totalComensalesDias > 0 ? costoTotalGeneral / totalComensalesDias : 0]
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

      wsResumen.columns = [{ width: 35 }, { width: 30 }]

      // ==========================================
      // HOJA 3: COMENSALES POR DÍA (Opcional)
      // ==========================================
      if (!usarMismaCantidad) {
        const wsComensales = wb.addWorksheet('Comensales por día')
        
        const rowHeaderCom = wsComensales.addRow(['Fecha de Servicio', 'Cantidad de Comensales'])
        rowHeaderCom.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.alignment = { horizontal: 'center' }
        })

        const fechasOrdenadasExcel = Object.keys(comensalesPorFecha).sort((a, b) => compararFechasCronologico(a, b))
        
        fechasOrdenadasExcel.forEach((fecha) => {
          const row = wsComensales.addRow([fecha, comensalesPorFecha[fecha] || 0])
          row.getCell(2).alignment = { horizontal: 'center' }
          row.getCell(2).font = { bold: true, color: { argb: COLOR_NARANJA } }
        })
        
        wsComensales.columns = [{ width: 25 }, { width: 25 }]
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
    if (!acc[item.fecha_texto]) acc[item.fecha_texto] = []
    acc[item.fecha_texto].push(item)
    return acc
  }, {} as Record<string, ProgramacionItem[]>)

  const fechasOrdenadas = Object.keys(programacionPorFecha).sort((a, b) => 
    compararFechasCronologico(a, b)
  )

  const fechasComensalesOrdenadas = Object.keys(comensalesPorFecha).sort((a, b) =>
    compararFechasCronologico(a, b)
  )

  const totalDias = Object.keys(programacionPorFecha).length
  const totalPlatos = programacion.length
  const costoTotalGeneral = insumosRequeridos.reduce((acc, curr) => acc + (curr.costo_total || 0), 0)
  const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)

  const totalComensalesDias = usarMismaCantidad
    ? cantidadPersonas * totalDias
    : Object.keys(programacionPorFecha).reduce(
        (acc, fecha) => acc + (comensalesPorFecha[fecha] ?? 0), 0
      )

  const promedioComensalesDia = totalDias > 0 ? Math.round(totalComensalesDias / totalDias) : 0

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
                setComensalesPorFecha({})
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
              Comensales por día {!usarMismaCantidad && <span className="text-[10px] text-[#9A9A93] font-normal">(valor por defecto)</span>}
            </label>
            <input
              type="number"
              value={cantidadPersonas}
              onChange={(e) => {
                const valor = parseInt(e.target.value) || 0
                setCantidadPersonas(valor)
                setInsumosRequeridos([])
              }}
              min="1"
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
            />
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

        {/* ─── Checkbox de comensales variables ─── */}
        <div className="mb-6">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={usarMismaCantidad}
              onChange={(e) => {
                const checked = e.target.checked
                setUsarMismaCantidad(checked)
                setInsumosRequeridos([])
                if (!checked) {
                  const fechasUnicasProgramadas = [...new Set(programacion.map(p => p.fecha_texto))]
                  setComensalesPorFecha(prev => {
                    const actualizado = { ...prev }
                    fechasUnicasProgramadas.forEach(fecha => {
                      if (!actualizado[fecha]) actualizado[fecha] = cantidadPersonas
                    })
                    return actualizado
                  })
                }
              }}
              className="w-4 h-4 rounded border-[#E7E7E2] text-[#8CC63F] focus:ring-[#8CC63F]"
            />
            <span className="text-sm text-[#2B2B2B]">
              Usar la misma cantidad de comensales todos los días
            </span>
          </label>
          {!usarMismaCantidad && (
            <p className="text-xs text-[#9A9A93] mt-1 ml-6">
              Desactivado: podrás definir la cantidad de comensales para cada fecha una vez cargada la programación.
            </p>
          )}
        </div>

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
                setComensalesPorFecha({})
              }}
              fechaInicio={fechaInicio}
              fechaFin={fechaFin}
            />
            {fechaInicio && fechaFin && (
              <div className="mt-3 p-2 rounded-lg bg-[#8CC63F]/10 border border-[#8CC63F]/20">
                <p className="text-sm text-[#8CC63F]">
                  ✓ Rango seleccionado: <strong>{fechaInicio}</strong> al <strong>{fechaFin}</strong>
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
                Programación del {fechaInicio} al {fechaFin}
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
                      <h3 className="text-sm font-bold text-[#F37F21] mb-3 sticky left-0 bg-white py-1">
                        {fecha}
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
                {totalDias} días · {totalPlatos} platos · {usarMismaCantidad ? `${cantidadPersonas} comensales/día` : `${totalComensalesDias} comensales en total (variable por día)`}
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

        {/* ─── Panel de comensales por día ─── */}
        {!usarMismaCantidad && programacion.length > 0 && (
          <div className="mb-6 rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
            <div className="px-4 sm:px-6 py-3 border-b border-[#E7E7E2]" style={{ background: '#F5F5F0' }}>
              <h3 className="text-sm font-bold text-[#2B2B2B] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F37F21]" />
                Comensales por día
              </h3>
              <p className="text-xs text-[#9A9A93] mt-0.5">
                Define cuántos comensales hubo (o habrá) cada día antes de calcular el requerimiento.
              </p>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {fechasComensalesOrdenadas.map((fecha) => (
                <div key={fecha} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6B6B65] truncate" title={fecha}>
                    {fecha}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={comensalesPorFecha[fecha] ?? cantidadPersonas}
                    onChange={(e) => actualizarComensalesFecha(fecha, parseInt(e.target.value) || 0)}
                    className="w-full rounded-lg border border-[#E7E7E2] px-3 py-2 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <div className="px-4 sm:px-6 py-2 border-t border-[#E7E7E2] bg-[#F5FBF0]">
              <p className="text-xs text-[#6B6B65]">
                Total: <strong className="text-[#2B2B2B]">{totalComensalesDias} comensales</strong>
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
                  {totalDias} días ({fechaInicio} al {fechaFin})
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
                      · Costo por comensal: <strong className="text-[#2B2B2B]">{formatearMoneda(totalComensalesDias > 0 ? costoTotalGeneral / totalComensalesDias : 0)}</strong>
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