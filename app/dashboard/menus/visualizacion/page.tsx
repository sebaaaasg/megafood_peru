'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar,
  Loader2,
  UtensilsCrossed,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TablaProgramacionMenu, { DiaProgramado } from '@/components/TablaProgramacionMenus'
import CalendarioProgramacion from '@/components/CalendarioProgramacion'
import MenusNav from '@/app/dashboard/menus/components/MenusNav'

// Tipos
interface Sede {
  id: string
  nombre: string
}

interface ProgramacionItem {
  id: number
  fecha: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface ComensalesItem {
  fecha: string
  sede_id: string
  tipo: string
  comensales: number
}

const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE", icon: "📋" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF", icon: "🥗" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED", icon: "🎯" },
]

const formatearFechaLegible = (fechaISO: string): string => {
  const fecha = new Date(fechaISO + 'T00:00:00')
  return fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

export default function VisualizarProgramacion() {
  const router = useRouter()
  const supabase = createClient()

  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([])
  const [comensales, setComensales] = useState<ComensalesItem[]>([])
  const [cargando, setCargando] = useState(false)
  const [mostrarFiltros, setMostrarFiltros] = useState(true)

  useEffect(() => {
    cargarSedes()
  }, [])

  const cargarSedes = async () => {
    const { data } = await supabase.from("sedes").select("id, nombre").order("nombre")
    if (data) setSedes(data)
  }

  useEffect(() => {
    if (sedeSeleccionada && fechaDesde && fechaHasta) {
      cargarProgramacionRango()
    } else {
      setProgramacion([])
      setComensales([])
    }
  }, [sedeSeleccionada, fechaDesde, fechaHasta])

  const cargarProgramacionRango = async () => {
    if (!sedeSeleccionada || !fechaDesde || !fechaHasta) return

    setCargando(true)
    try {
      const { data: progData, error: progError } = await supabase
        .from("planificacion_detalles")
        .select(`
          id,
          fecha,
          tipo,
          categoria,
          plato_id,
          platos (id, nombre)
        `)
        .eq("sede_id", sedeSeleccionada)
        .gte("fecha", fechaDesde)
        .lte("fecha", fechaHasta)
        .order("fecha", { ascending: true })

      if (progError) throw progError

      if (progData && progData.length > 0) {
        const programacionConNombre = progData.map((p: any) => ({
          ...p,
          plato_nombre: p.platos?.nombre || "Desconocido"
        }))

        setProgramacion(programacionConNombre)

        const { data: comensalesData, error: comError } = await supabase
          .from("planificacion_comensales")
          .select("fecha, sede_id, tipo, comensales")
          .eq("sede_id", sedeSeleccionada)
          .gte("fecha", fechaDesde)
          .lte("fecha", fechaHasta)

        if (comError) throw comError
        setComensales(comensalesData || [])
      } else {
        setProgramacion([])
        setComensales([])
      }
    } catch (error: any) {
      console.error("Error al cargar programación:", error)
      alert("Error: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  const platosProgramados: DiaProgramado[] = useMemo(() => {
    if (programacion.length === 0) return []

    const porFechaISO = programacion.reduce((acc, item) => {
      if (!acc[item.fecha]) {
        acc[item.fecha] = {
          fecha: formatearFechaLegible(item.fecha),
          platos: [],
          comensalesPorTipo: {}
        }
      }
      acc[item.fecha].platos.push({
        tipo: item.tipo,
        categoria_general: item.categoria.includes("GUARNICIÓN") ? "GUARNICIÓN" : item.categoria,
        categoria_especifica: item.categoria,
        nombre: item.plato_nombre
      })
      return acc
    }, {} as Record<string, DiaProgramado>)

    comensales.forEach(c => {
      if (porFechaISO[c.fecha]) {
        porFechaISO[c.fecha].comensalesPorTipo![c.tipo] = c.comensales
      }
    })

    return Object.entries(porFechaISO)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, valor]) => valor)
  }, [programacion, comensales])

  const totalDias = platosProgramados.length
  const totalPlatos = programacion.length
  const tiposPresentes = [...new Set(programacion.map(p => p.tipo))]
  const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)

  return (
    <div className="min-h-screen w-full" style={{ background: '#FFFFFF' }}>
      <header className="relative overflow-hidden" style={{ background: '#2B2B2B' }}>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, #FFFFFF 0px, #FFFFFF 1px, transparent 1px, transparent 14px)",
          }}
          aria-hidden="true"
        />
        <div className="absolute left-0 top-0 bottom-0" style={{ width: '6px', background: '#F37F21' }} aria-hidden="true" />
        <div className="absolute left-[6px] top-0 bottom-0" style={{ width: '6px', background: '#8CC63F' }} aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-6 sm:pt-24 sm:pb-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 sm:mb-2">
                <span
                  className="uppercase font-mono text-[10px] sm:text-xs"
                  style={{ fontWeight: 700, letterSpacing: '0.18em', color: '#8CC63F' }}
                >
                  Módulo de gestión
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
                <span style={{ color: '#FFFFFF' }}>Visualizar</span>
                <span style={{ color: '#F37F21' }}> Programación</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
                Consulta los menús programados por sede y rango de fechas.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                href="/dashboard/menus"
                className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition text-sm sm:text-base w-full sm:w-auto"
              >
                <ArrowLeft size={18} />
                Volver
              </Link>
            </div>
          </div>

          <MenusNav />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        
        {/* ═══ PANEL DE FILTROS ═══ */}
        {/* overflow-visible en lugar de overflow-hidden para que el calendario no se corte */}
        <div className="mb-6 rounded-lg border border-[#E7E7E2] bg-white shadow-sm overflow-visible">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-[#F5F5F0] transition rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#F37F21]" />
              <span className="font-bold text-[#2B2B2B] text-sm">Filtros de búsqueda</span>
              {(fechaDesde || fechaHasta || sedeSeleccionada) && (
                <span className="text-xs bg-[#8CC63F]/10 text-[#8CC63F] px-2 py-0.5 rounded-full font-medium">
                  Activos
                </span>
              )}
            </div>
            {mostrarFiltros ? <ChevronUp size={18} className="text-[#6B6B65]" /> : <ChevronDown size={18} className="text-[#6B6B65]" />}
          </button>

          {mostrarFiltros && (
            <div className="px-4 sm:px-6 py-4 border-t border-[#E7E7E2]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                    <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
                    Sede
                  </label>
                  <select
                    value={sedeSeleccionada}
                    onChange={(e) => {
                      setSedeSeleccionada(e.target.value)
                      setFechaDesde("")
                      setFechaHasta("")
                      setProgramacion([])
                      setComensales([])
                    }}
                    className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                    <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
                    Desde
                  </label>
                  {sedeSeleccionada ? (
                    <CalendarioProgramacion
                      sedeId={sedeSeleccionada}
                      onFechaSeleccionada={(fechaISO) => {
                        setFechaDesde(fechaISO)
                        if (fechaHasta && fechaISO > fechaHasta) {
                          setFechaHasta("")
                        }
                      }}
                      fechaSeleccionada={fechaDesde}
                    />
                  ) : (
                    <div className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#9A9A93] bg-gray-50">
                      Selecciona una sede primero
                    </div>
                  )}
                  {fechaDesde && (
                    <p className="text-xs text-[#8CC63F] mt-1">
                      ✓ Desde: {formatearFechaLegible(fechaDesde)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                    <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
                    Hasta
                  </label>
                  {sedeSeleccionada && fechaDesde ? (
                    <CalendarioProgramacion
                      sedeId={sedeSeleccionada}
                      onFechaSeleccionada={(fechaISO) => {
                        if (fechaISO && fechaISO < fechaDesde) {
                          alert("La fecha 'hasta' no puede ser anterior a la fecha 'desde'")
                          return
                        }
                        setFechaHasta(fechaISO)
                      }}
                      fechaSeleccionada={fechaHasta}
                    />
                  ) : (
                    <div className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#9A9A93] bg-gray-50">
                      {!sedeSeleccionada ? "Selecciona una sede primero" : "Selecciona fecha 'desde' primero"}
                    </div>
                  )}
                  {fechaHasta && (
                    <p className="text-xs text-[#8CC63F] mt-1">
                      ✓ Hasta: {formatearFechaLegible(fechaHasta)}
                    </p>
                  )}
                </div>
              </div>

              {sedeSeleccionada && fechaDesde && fechaHasta && (
                <div className="mt-4 p-3 bg-[#F5FBF0] rounded-lg border border-[#8CC63F]/20 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#8CC63F]" />
                  <p className="text-sm text-[#2B2B2B]">
                    <span className="font-semibold">{sedeInfo?.nombre}</span>
                    <span className="text-[#6B6B65]"> · Del </span>
                    <span className="font-semibold">{formatearFechaLegible(fechaDesde)}</span>
                    <span className="text-[#6B6B65]"> al </span>
                    <span className="font-semibold">{formatearFechaLegible(fechaHasta)}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {!sedeSeleccionada && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Building className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">Selecciona una sede para comenzar</p>
          </div>
        )}

        {sedeSeleccionada && (!fechaDesde || !fechaHasta) && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">
              {!fechaDesde ? "Selecciona la fecha 'desde' en el calendario" : "Selecciona la fecha 'hasta' en el calendario"}
            </p>
          </div>
        )}

        {cargando && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
          </div>
        )}

        {!cargando && sedeSeleccionada && fechaDesde && fechaHasta && programacion.length === 0 && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <UtensilsCrossed className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">No hay programación para este rango de fechas</p>
            <p className="text-xs text-[#9A9A93] mt-1">Intenta con otro rango o sede</p>
          </div>
        )}

        {!cargando && platosProgramados.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#2B2B2B] flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#8CC63F]" />
                  Resultados
                </h2>
                <p className="text-sm text-[#6B6B65] mt-0.5">
                  {totalDias} {totalDias === 1 ? 'día' : 'días'} · {totalPlatos} platos · {tiposPresentes.length} tipos de menú
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {tiposPresentes.map((tipo) => {
                  const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                  return (
                    <span
                      key={tipo}
                      className="text-xs font-bold rounded-full px-3 py-1"
                      style={{ background: tipoInfo?.bg || '#f5f5f5', color: tipoInfo?.color || '#555' }}
                    >
                      {tipoInfo?.icon} {tipoInfo?.label}
                    </span>
                  )
                })}
              </div>
            </div>

            <TablaProgramacionMenu
              platosProgramados={platosProgramados}
              mostrarComensales={true}
              titulo=""
            />

            <div className="rounded-lg border border-[#E7E7E2] bg-white p-4 flex flex-wrap justify-between items-center gap-2">
              <p className="text-xs text-[#6B6B65] flex items-center gap-2">
                <UtensilsCrossed className="w-3 h-3" />
                Total: <strong className="text-[#2B2B2B]">{totalPlatos} platos</strong> en {totalDias} {totalDias === 1 ? 'día' : 'días'}
              </p>
              <div className="flex items-center gap-2 text-xs text-[#6B6B65]">
                <span>Tipos: </span>
                <div className="flex gap-1">
                  {tiposPresentes.map((tipo) => {
                    const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                    return (
                      <span
                        key={tipo}
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ background: tipoInfo?.color || '#ccc' }}
                        title={tipoInfo?.label || tipo}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Visualizar programación
          </p>
          <div className="flex items-center gap-2">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8CC63F', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', color: '#9A9A93', fontWeight: 600 }}>v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}