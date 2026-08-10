'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar,
  Loader2,
  UtensilsCrossed,
  Eye
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CalendarioProgramacion from '@/components/CalendarioProgramacion'

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

interface Plato {
  id: string
  nombre: string
  categoria: string
}

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

// Función para formatear fecha para BD
const formatearFechaParaBD = (fecha: Date): string => {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
}

export default function VisualizarProgramacionSimple() {
  const router = useRouter()
  const supabase = createClient()
  
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([])
  const [cargando, setCargando] = useState(false)
  const [cargandoFechas, setCargandoFechas] = useState(false)

  useEffect(() => {
    cargarSedes()
  }, [])

  useEffect(() => {
    if (sedeSeleccionada && fechaSeleccionada) {
      cargarProgramacion()
    }
  }, [sedeSeleccionada, fechaSeleccionada])

  const cargarSedes = async () => {
    const { data } = await supabase.from("sedes").select("id, nombre").order("nombre")
    if (data) setSedes(data)
  }

  const cargarProgramacion = async () => {
    if (!sedeSeleccionada || !fechaSeleccionada) return
    
    setCargando(true)
    try {
      const { data } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha_texto, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .eq("fecha_texto", fechaSeleccionada)

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
      } else {
        setProgramacion([])
      }
    } catch (error) {
      console.error("Error al cargar programación:", error)
    } finally {
      setCargando(false)
    }
  }

  const programacionPorTipo = programacion.reduce((acc, item) => {
    if (!acc[item.tipo]) acc[item.tipo] = []
    acc[item.tipo].push(item)
    return acc
  }, {} as Record<string, ProgramacionItem[]>)

  const totalPlatos = programacion.length

  // Obtener el nombre de la sede seleccionada
  const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)

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
                <span style={{ color: '#FFFFFF' }}>Visualizar</span>
                <span style={{ color: '#F37F21' }}> Programación</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
                Consulta los menús programados por sede y fecha.
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
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Selector de Sede */}
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
              Sede
            </label>
            <select
              value={sedeSeleccionada}
              onChange={(e) => {
                setSedeSeleccionada(e.target.value)
                setFechaSeleccionada("")
                setProgramacion([])
              }}
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
            >
              <option value="">Seleccionar sede</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Fecha con Calendario */}
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
              Fecha de programación
            </label>
            {sedeSeleccionada ? (
              <CalendarioProgramacion
                sedeId={sedeSeleccionada}
                onFechaSeleccionada={(fecha) => {
                  setFechaSeleccionada(fecha)
                  setProgramacion([])
                }}
                fechaSeleccionada={fechaSeleccionada}
              />
            ) : (
              <div className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#9A9A93] bg-gray-50">
                Selecciona una sede primero
              </div>
            )}
            {fechaSeleccionada && (
              <p className="text-xs text-[#8CC63F] mt-1">
                ✓ Fecha seleccionada: {fechaSeleccionada}
              </p>
            )}
          </div>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
          </div>
        )}

        {/* Mensaje sin fecha seleccionada */}
        {!cargando && sedeSeleccionada && !fechaSeleccionada && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">Selecciona una fecha en el calendario para ver el menú</p>
          </div>
        )}

        {/* Sin programación para la fecha */}
        {!cargando && fechaSeleccionada && programacion.length === 0 && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <UtensilsCrossed className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">No hay programación para esta fecha</p>
            <p className="text-xs text-[#9A9A93] mt-1">Selecciona otra fecha en el calendario</p>
          </div>
        )}

        {/* Vista del menú */}
        {!cargando && programacion.length > 0 && (
          <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
            {/* Header del día */}
            <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" style={{ background: '#2B2B2B' }}>
              <div>
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  Menú del {fechaSeleccionada}
                </h2>
                <p className="text-white/60 text-xs mt-0.5">
                  {sedeInfo?.nombre || 'Sede'} · {totalPlatos} platos en total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-white/60" />
                <span className="text-white/60 text-xs">
                  {Object.keys(programacionPorTipo).length} tipos de menú
                </span>
              </div>
            </div>

            {/* Contenido del menú */}
            <div className="p-4 sm:p-6">
              {Object.entries(programacionPorTipo).map(([tipo, items]) => {
                const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                if (!tipoInfo) return null
                
                return (
                  <div key={tipo} className="mb-6 last:mb-0">
                    {/* Título del tipo */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs font-bold rounded-full px-3 py-1"
                        style={{ background: tipoInfo.bg, color: tipoInfo.color }}
                      >
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                      <span className="text-xs text-[#9A9A93]">{items.length} platos</span>
                    </div>

                    {/* Grid de platos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {items.map((item) => {
                        const catColor = CAT_COLORS[item.categoria] || { color: "#555", bg: "#f5f5f5" }
                        return (
                          <div
                            key={item.id}
                            className="p-3 rounded-lg border transition hover:shadow-md"
                            style={{ 
                              background: catColor.bg, 
                              borderColor: `${catColor.color}30`
                            }}
                          >
                            <span 
                              className="text-[10px] font-bold uppercase block"
                              style={{ color: catColor.color }}
                            >
                              {item.categoria}
                            </span>
                            <p className="text-sm font-bold text-[#2B2B2B] mt-1">
                              {item.plato_nombre}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Footer con resumen */}
              <div className="mt-6 pt-4 border-t border-[#E7E7E2] flex flex-wrap justify-between items-center gap-2">
                <p className="text-xs text-[#6B6B65] flex items-center gap-2">
                  <UtensilsCrossed className="w-3 h-3" />
                  Total: <strong className="text-[#2B2B2B]">{totalPlatos} platos</strong>
                </p>
                <div className="flex items-center gap-2 text-xs text-[#6B6B65]">
                  <span>Tipos: </span>
                  <div className="flex gap-1">
                    {Object.keys(programacionPorTipo).map((tipo) => {
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Visualizar programación
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