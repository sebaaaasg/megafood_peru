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
import * as XLSX from 'xlsx'

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

const formatearMoneda = (valor: number) => {
  return new Intl.NumberFormat('es-PE', { 
    style: 'currency', 
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(valor)
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
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
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
                  if (fechaInicio && fecha < fechaInicio) {
                    alert("La fecha de fin debe ser posterior a la fecha de inicio")
                    return
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
  const [insumosRequeridos, setInsumosRequeridos] = useState<InsumoRequerido[]>([])
  const [calculando, setCalculando] = useState(false)
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [insumos, setInsumos] = useState<any[]>([])
  const [exportando, setExportando] = useState(false)

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
      const { data, error } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha_texto, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .gte("fecha_texto", fechaInicio)
        .lte("fecha_texto", fechaFin)
        .order("fecha_texto")

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

        setProgramacion(programacionConNombre)
        setInsumosRequeridos([])
      } else {
        setProgramacion([])
        setInsumosRequeridos([])
        alert("No hay programación en el rango de fechas seleccionado")
      }
    } catch (error: any) {
      console.error("Error cargando programación:", error)
      alert("Error al cargar la programación: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  const calcularRequerimientoRango = async () => {
    if (programacion.length === 0) {
      alert("Primero cargue una programación válida")
      return
    }
    
    if (cantidadPersonas <= 0) {
      alert("Ingrese un número válido de personas")
      return
    }

    setCalculando(true)
    const mapaInsumos = new Map<string, InsumoRequerido>()
    
    try {
      for (const item of programacion) {
        const recetaPlato = recetas.filter(r => r.plato_id === item.plato_id)
        
        for (const receta of recetaPlato) {
          const cantidadTotal = receta.cantidad * cantidadPersonas
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
      
      const datosExport = insumosRequeridos.map(insumo => {
        const { cantidad, unidad } = formatearCantidad(insumo.cantidad_total, insumo.unidad)
        const cantidadRedondeada = redondearCantidad(cantidad)
        
        const fila: any = {
          'Insumo': insumo.insumo_nombre,
          'Cantidad por Porción': `${insumo.cantidad_porcion.toFixed(3)} ${insumo.unidad}`,
          'Cantidad Total': `${cantidadRedondeada} ${unidad}`,
          'Unidad': unidad,
        }
        
        if (rol === "gerencia") {
          fila['Precio Unitario'] = formatearMoneda(insumo.precio_unitario || 0)
          fila['Costo Total'] = formatearMoneda(insumo.costo_total || 0)
        }
        
        return fila
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datosExport)
      ws['!cols'] = [
        { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
        ...(rol === "gerencia" ? [{ wch: 15 }, { wch: 15 }] : [])
      ]
      
      XLSX.utils.book_append_sheet(wb, ws, 'Requerimiento')
      
      const resumen = [
        { 'Concepto': 'Sede', 'Valor': sedeInfo?.nombre || 'No especificada' },
        { 'Concepto': 'Rango', 'Valor': `${fechaInicio} al ${fechaFin}` },
        { 'Concepto': 'Días', 'Valor': programacion.length > 0 ? [...new Set(programacion.map(p => p.fecha_texto))].length : 0 },
        { 'Concepto': 'Comensales/día', 'Valor': cantidadPersonas },
        ...(rol === "gerencia" ? [
          { 'Concepto': 'Costo Total', 'Valor': formatearMoneda(insumosRequeridos.reduce((acc, curr) => acc + (curr.costo_total || 0), 0)) }
        ] : [])
      ]
      
      const wsResumen = XLSX.utils.json_to_sheet(resumen)
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')
      
      XLSX.writeFile(wb, `requerimiento_compras_${sedeInfo?.nombre}_${fechaInicio}_al_${fechaFin}.xlsx`)
    } catch (error) {
      console.error("Error al exportar:", error)
      alert("Error al exportar el archivo")
    } finally {
      setExportando(false)
    }
  }

  const programacionPorFecha = programacion.reduce((acc, item) => {
    if (!acc[item.fecha_texto]) acc[item.fecha_texto] = []
    acc[item.fecha_texto].push(item)
    return acc
  }, {} as Record<string, ProgramacionItem[]>)

  const totalDias = Object.keys(programacionPorFecha).length
  const totalPlatos = programacion.length
  const costoTotalGeneral = insumosRequeridos.reduce((acc, curr) => acc + (curr.costo_total || 0), 0)
  const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)

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

        <div className="relative max-w-7xl mx-auto px-8 py-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="uppercase font-mono text-xs"
                  style={{
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: '#8CC63F',
                  }}
                >
                  Módulo de gestión
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                <span style={{ color: '#FFFFFF' }}>Módulo de</span>
                <span style={{ color: '#F37F21' }} className="capitalize">
                  {rol === "gerencia" ? " Gerencia" : " Compras"}
                </span>
              </h1>
              <p className="mt-2" style={{ color: '#C9C9C3', fontSize: '1rem' }}>
                {rol === "gerencia" 
                  ? "📊 Gestión completa con costos y análisis financiero"
                  : "🛒 Lista de compras sin información de precios"}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
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
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
              Comensales por día
            </label>
            <input
              type="number"
              value={cantidadPersonas}
              onChange={(e) => setCantidadPersonas(parseInt(e.target.value) || 0)}
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
            <div className="px-6 py-4 flex justify-between items-center" style={{ background: '#2B2B2B' }}>
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
                {Object.entries(programacionPorFecha).map(([fecha, items]) => (
                  <div key={fecha} className="min-w-[240px] max-w-[280px] flex-shrink-0 border-r border-[#E7E7E2] pr-6 last:border-r-0 last:pr-0">
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
                ))}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#E7E7E2] bg-[#F5F5F0] flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#6B6B65] flex items-center gap-2">
                <Users className="w-3 h-3" />
                {totalDias} días · {totalPlatos} platos · {cantidadPersonas} comensales/día
              </p>
              <button
                onClick={calcularRequerimientoRango}
                disabled={calculando}
                className="px-5 py-2 rounded-lg bg-[#F37F21] text-white font-medium hover:bg-[#C4600F] transition disabled:opacity-50 flex items-center gap-2"
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

        {/* Requerimiento de insumos */}
        {insumosRequeridos.length > 0 && (
          <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
            <div className="px-6 py-4 flex justify-between items-center" style={{ background: '#2B2B2B' }}>
              <div>
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {rol === "gerencia" ? "Requerimiento de Insumos y Costos" : "Requerimiento de Insumos"}
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  {totalDias} días ({fechaInicio} al {fechaFin})
                </p>
              </div>
              <div className="flex items-center gap-4">
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-medium hover:bg-[#7AB835] transition disabled:opacity-50"
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
                    <th className="px-6 py-3 text-left font-bold">Insumo</th>
                    <th className="px-6 py-3 text-left font-bold">Cantidad por Porción</th>
                    <th className="px-6 py-3 text-left font-bold">Cantidad Total</th>
                    <th className="px-6 py-3 text-left font-bold">Unidad</th>
                    {rol === "gerencia" && (
                      <>
                        <th className="px-6 py-3 text-left font-bold">Precio Unitario</th>
                        <th className="px-6 py-3 text-left font-bold">Subtotal</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F0]">
                  {insumosRequeridos.map((insumo) => {
                    const { cantidad, unidad } = formatearCantidad(insumo.cantidad_total, insumo.unidad)
                    const cantidadRedondeada = redondearCantidad(cantidad)
                    
                    return (
                      <tr key={insumo.insumo_id} className="hover:bg-[#F5FBF0] transition">
                        <td className="px-6 py-3 font-medium text-[#2B2B2B]">{insumo.insumo_nombre}</td>
                        <td className="px-6 py-3 text-[#6B6B65]">
                          {insumo.cantidad_porcion.toFixed(3)} {insumo.unidad}
                        </td>
                        <td className="px-6 py-3 font-bold text-[#F37F21]">
                          {cantidadRedondeada} {unidad}
                        </td>
                        <td className="px-6 py-3 text-[#6B6B65]">{unidad}</td>
                        {rol === "gerencia" && (
                          <>
                            <td className="px-6 py-3">{formatearMoneda(insumo.precio_unitario || 0)}</td>
                            <td className="px-6 py-3 font-semibold text-[#2B2B2B]">
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

            <div className="px-6 py-3 bg-[#F5FBF0] border-t border-[#E7E7E2]">
              <p className="text-xs text-[#6B6B65]">
                Total de insumos: <strong className="text-[#2B2B2B]">{insumosRequeridos.length} items</strong>
                {rol === "gerencia" && (
                  <>
                    <span className="ml-4">
                      · Costo por día: <strong className="text-[#2B2B2B]">{formatearMoneda(costoTotalGeneral / totalDias)}</strong>
                    </span>
                    <span className="ml-4">
                      · Costo por persona/día: <strong className="text-[#2B2B2B]">{formatearMoneda((costoTotalGeneral / totalDias) / cantidadPersonas)}</strong>
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
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
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