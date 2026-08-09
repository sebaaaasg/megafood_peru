'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar,
  Eye,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Sede {
  id: string
  nombre: string
}

interface Programacion {
  id: number
  fecha_texto: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface FechaDisponible {
  fecha: string
  fechaISO: string
  fechaOrden: number
  programaciones: Programacion[]
}

// Tipos de menú con colores (mismo estilo que insumos/platos)
const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED" },
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

export default function VisualizarPlanificacion() {
  const router = useRouter()
  const supabase = createClient()
  
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [cargando, setCargando] = useState(false)
  const [fechasDisponibles, setFechasDisponibles] = useState<FechaDisponible[]>([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState<FechaDisponible | null>(null)
  const [filtroTipo, setFiltroTipo] = useState("todos")
  const [indiceFecha, setIndiceFecha] = useState(0)

  useEffect(() => {
    cargarSedes()
  }, [])

  useEffect(() => {
    if (sedeSeleccionada) {
      cargarFechasDisponibles()
    }
  }, [sedeSeleccionada])

  const cargarSedes = async () => {
    const { data } = await supabase.from("sedes").select("id, nombre").order("nombre")
    if (data) setSedes(data)
  }

  const fechaTextoATimestamp = (fechaTexto: string): number => {
    const meses: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
      'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
      'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    }
    
    try {
      const partes = fechaTexto.match(/(\d+) de (\w+) de (\d{4})/)
      if (partes) {
        const dia = parseInt(partes[1])
        const mes = meses[partes[2].toLowerCase()]
        const año = parseInt(partes[3])
        return new Date(año, mes, dia).getTime()
      }
    } catch (e) {
      console.error("Error parseando fecha:", fechaTexto)
    }
    return 0
  }

  const formatearFechaLegible = (fechaTexto: string): string => {
    const meses: Record<string, string> = {
      'enero': 'Ene', 'febrero': 'Feb', 'marzo': 'Mar', 'abril': 'Abr',
      'mayo': 'May', 'junio': 'Jun', 'julio': 'Jul', 'agosto': 'Ago',
      'septiembre': 'Sep', 'octubre': 'Oct', 'noviembre': 'Nov', 'diciembre': 'Dic'
    }
    
    for (const [mesCompleto, mesCorto] of Object.entries(meses)) {
      if (fechaTexto.toLowerCase().includes(mesCompleto)) {
        const dia = fechaTexto.match(/\d+/)?.[0]
        return `${dia} ${mesCorto}`
      }
    }
    return fechaTexto.split(',')[0] || fechaTexto
  }

  const cargarFechasDisponibles = async () => {
    setCargando(true)
    setFechasDisponibles([])
    setFechaSeleccionada(null)
    setIndiceFecha(0)
    
    try {
      const { data: fechas, error } = await supabase
        .from("planificacion_detalles")
        .select("fecha_texto")
        .eq("sede_id", sedeSeleccionada)

      if (error) throw error

      if (!fechas || fechas.length === 0) {
        setCargando(false)
        return
      }

      const fechasUnicas = [...new Map(fechas.map(f => [f.fecha_texto, f.fecha_texto])).values()]
      
      const fechasConTimestamp = fechasUnicas.map(fecha => ({
        fecha: fecha,
        timestamp: fechaTextoATimestamp(fecha)
      }))
      
      fechasConTimestamp.sort((a, b) => a.timestamp - b.timestamp)
      
      const fechasConProgramacion: FechaDisponible[] = []
      
      for (const { fecha } of fechasConTimestamp) {
        const { data: programaciones } = await supabase
          .from("planificacion_detalles")
          .select(`
            id,
            fecha_texto,
            tipo,
            categoria,
            plato_id
          `)
          .eq("sede_id", sedeSeleccionada)
          .eq("fecha_texto", fecha)

        if (programaciones && programaciones.length > 0) {
          const platoIds = [...new Set(programaciones.map(p => p.plato_id))]
          const { data: platosData } = await supabase
            .from("platos")
            .select("id, nombre")
            .in("id", platoIds)
          
          const mapaPlatos = new Map()
          platosData?.forEach(p => mapaPlatos.set(p.id, p.nombre))

          const programacionesConNombre = programaciones.map(p => ({
            ...p,
            plato_nombre: mapaPlatos.get(p.plato_id) || "Desconocido"
          }))

          fechasConProgramacion.push({
            fecha: formatearFechaLegible(fecha),
            fechaISO: fecha,
            fechaOrden: fechasConTimestamp.findIndex(f => f.fecha === fecha),
            programaciones: programacionesConNombre
          })
        }
      }

      setFechasDisponibles(fechasConProgramacion)
      if (fechasConProgramacion.length > 0) {
        setFechaSeleccionada(fechasConProgramacion[0])
        setIndiceFecha(0)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setCargando(false)
    }
  }

  const navegarFecha = (direccion: number) => {
    const nuevoIndice = indiceFecha + direccion
    if (nuevoIndice >= 0 && nuevoIndice < fechasDisponibles.length) {
      setIndiceFecha(nuevoIndice)
      setFechaSeleccionada(fechasDisponibles[nuevoIndice])
      setFiltroTipo("todos")
    }
  }

  const getBadgeStyle = (tipo: string) => {
    const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
    return {
      bg: tipoInfo?.bg || "bg-gray-100",
      text: tipoInfo?.color || "text-gray-700",
      border: `border-${tipoInfo?.color || "gray-400"}`
    }
  }

  const tiposDisponibles = () => {
    if (!fechaSeleccionada) return []
    return [...new Set(fechaSeleccionada.programaciones.map(p => p.tipo))]
  }

  const programacionesFiltradas = fechaSeleccionada 
    ? filtroTipo === "todos" 
      ? fechaSeleccionada.programaciones 
      : fechaSeleccionada.programaciones.filter(p => p.tipo === filtroTipo)
    : []

  const programacionesPorTipo = programacionesFiltradas.reduce((acc, prog) => {
    if (!acc[prog.tipo]) acc[prog.tipo] = []
    acc[prog.tipo].push(prog)
    return acc
  }, {} as Record<string, Programacion[]>)

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
                <span style={{ color: '#FFFFFF' }}>Visualizar</span>
                <span style={{ color: '#F37F21' }}> Planificación</span>
              </h1>
              <p className="mt-2" style={{ color: '#C9C9C3', fontSize: '1rem' }}>
                Consulta el calendario completo de menús por sede y fecha.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/programacion"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
              >
                <ArrowLeft size={18} />
                Volver
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Selector de sede */}
        <div className="mb-6 max-w-xs">
          <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
            <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
            Sede
          </label>
          <select
            value={sedeSeleccionada}
            onChange={(e) => setSedeSeleccionada(e.target.value)}
            className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
          >
            <option value="">Seleccionar sede</option>
            {sedes.map(sede => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
          </select>
        </div>

        {/* Loading */}
        {cargando && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
          </div>
        )}

        {/* Sin datos */}
        {!cargando && sedeSeleccionada && fechasDisponibles.length === 0 && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">No hay programaciones para esta sede</p>
          </div>
        )}

        {/* Vista con datos */}
        {fechasDisponibles.length > 0 && (
          <>
            {/* Navegación de fechas */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navegarFecha(-1)}
                disabled={indiceFecha === 0}
                className="p-2 rounded-lg border border-[#E7E7E2] text-[#6B6B65] hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-[#2B2B2B]">
                  {fechaSeleccionada?.fechaISO || "Selecciona una fecha"}
                </p>
                <p className="text-xs text-[#6B6B65]">
                  {indiceFecha + 1} de {fechasDisponibles.length} fechas
                </p>
              </div>
              
              <button
                onClick={() => navegarFecha(1)}
                disabled={indiceFecha === fechasDisponibles.length - 1}
                className="p-2 rounded-lg border border-[#E7E7E2] text-[#6B6B65] hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Mini selector de fechas */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
              {fechasDisponibles.map((fecha, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setIndiceFecha(idx)
                    setFechaSeleccionada(fecha)
                    setFiltroTipo("todos")
                  }}
                  className={`
                    flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${idx === indiceFecha 
                      ? 'bg-[#2B2B2B] text-white shadow-md' 
                      : 'bg-[#F5F5F0] text-[#6B6B65] hover:bg-[#E7E7E2]'
                    }
                  `}
                >
                  {fecha.fecha}
                </button>
              ))}
            </div>

            {/* Filtro por tipo de menú */}
            {fechaSeleccionada && tiposDisponibles().length > 1 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="w-4 h-4 text-[#6B6B65]" />
                  <span className="text-sm font-medium text-[#2B2B2B]">Filtrar por tipo</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroTipo("todos")}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${filtroTipo === "todos" 
                        ? "bg-[#2B2B2B] text-white shadow-md" 
                        : "bg-[#F5F5F0] text-[#6B6B65] hover:bg-[#E7E7E2]"
                      }
                    `}
                  >
                    Todos
                  </button>

                  {TIPOS_MENU.filter(t => tiposDisponibles().includes(t.value)).map(tipo => {
                    const isActive = filtroTipo === tipo.value
                    return (
                      <button
                        key={tipo.value}
                        onClick={() => setFiltroTipo(tipo.value)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${isActive 
                            ? 'text-white shadow-md' 
                            : 'opacity-80 hover:opacity-100'
                          }
                        `}
                        style={{
                          background: isActive ? tipo.color : tipo.bg,
                          color: isActive ? "white" : tipo.color,
                          border: `1px solid ${tipo.color}40`,
                        }}
                      >
                        {tipo.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Vista del menú */}
            {fechaSeleccionada && (
              <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
                <div className="px-6 py-4" style={{ background: '#2B2B2B' }}>
                  <h2 className="text-white font-bold text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {fechaSeleccionada.fechaISO}
                  </h2>
                </div>

                <div className="p-5 overflow-x-auto">
                  {Object.keys(programacionesPorTipo).length === 0 ? (
                    <p className="text-center text-[#6B6B65] py-8">
                      No hay platos para este filtro
                    </p>
                  ) : (
                    <div className="flex gap-4 min-w-max">
                      {Object.entries(programacionesPorTipo).map(([tipo, platos]) => {
                        const style = getBadgeStyle(tipo)
                        const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                        return (
                          <div key={tipo} className="w-64 flex-shrink-0">
                            <div 
                              className="rounded-lg p-3 mb-2"
                              style={{ background: style.bg }}
                            >
                              <span className="text-xs font-bold uppercase" style={{ color: style.text }}>
                                {tipoInfo?.label || tipo}
                              </span>
                              <span className="text-xs text-[#6B6B65] ml-2">
                                ({platos.length})
                              </span>
                            </div>
                            <div className="space-y-2">
                              {platos.map((prog, idx) => {
                                const catColor = CAT_COLORS[prog.categoria] || { color: "#555", bg: "#f5f5f5" }
                                return (
                                  <div 
                                    key={idx} 
                                    className="bg-white rounded-lg p-3 border border-[#E7E7E2] shadow-sm hover:shadow-md transition"
                                  >
                                    <span 
                                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                      style={{ background: catColor.bg, color: catColor.color }}
                                    >
                                      {prog.categoria}
                                    </span>
                                    <p className="text-sm font-bold text-[#2B2B2B] mt-1">
                                      {prog.plato_nombre}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Visualizar planificación
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