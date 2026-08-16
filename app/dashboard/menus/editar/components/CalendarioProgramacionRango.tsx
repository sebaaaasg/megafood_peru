// components/CalendarioProgramacionRango.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, ChevronLeft, ChevronRight, X, Check, CalendarRange } from 'lucide-react'

interface CalendarioProgramacionRangoProps {
  sedeId: string
  onFechaSeleccionada: (fechas: { inicio: string; fin: string }) => void
  fechaSeleccionada?: { inicio: string; fin: string }
}

export default function CalendarioProgramacionRango({
  sedeId,
  onFechaSeleccionada,
  fechaSeleccionada
}: CalendarioProgramacionRangoProps) {
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [mesActual, setMesActual] = useState(new Date())
  const [fechasProgramadas, setFechasProgramadas] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(false)
  const [fechaInicioSeleccionada, setFechaInicioSeleccionada] = useState<string | null>(null)
  const [fechaFinSeleccionada, setFechaFinSeleccionada] = useState<string | null>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Mantener la selección interna sincronizada si el padre limpia o cambia el rango
  useEffect(() => {
    setFechaInicioSeleccionada(fechaSeleccionada?.inicio || null)
    setFechaFinSeleccionada(fechaSeleccionada?.fin || null)
  }, [fechaSeleccionada?.inicio, fechaSeleccionada?.fin])

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar fechas programadas
  useEffect(() => {
    if (!sedeId) return
    
    const cargarFechas = async () => {
      setCargando(true)
      try {
        const { data } = await supabase
          .from("planificacion_detalles")
          .select("fecha")
          .eq("sede_id", sedeId)
        
        if (data) {
          setFechasProgramadas(new Set(data.map(f => f.fecha)))
        }
      } catch (error) {
        console.error("Error al cargar fechas:", error)
      } finally {
        setCargando(false)
      }
    }
    cargarFechas()
  }, [sedeId])

  // Helper para obtener YYYY-MM-DD
  const obtenerISO = (fecha: Date): string => {
    const y = fecha.getFullYear()
    const m = String(fecha.getMonth() + 1).padStart(2, '0')
    const d = String(fecha.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Helper para mostrar texto bonito en el input
  const convertirAtexto = (fecha: string): string => {
    if (!fecha) return "Seleccionar fecha"
    const [y, m, d] = fecha.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${dias[date.getDay()]}, ${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`
  }

  // Verificar si hay programación
  const tieneProgramacion = (fecha: Date): boolean => {
    return fechasProgramadas.has(obtenerISO(fecha))
  }

  // Obtener texto mostrado en el input
  const obtenerTextoMostrado = () => {
    if (!fechaSeleccionada?.inicio && !fechaSeleccionada?.fin) {
      return "Seleccionar rango de fechas"
    }
    if (fechaSeleccionada?.inicio && fechaSeleccionada?.fin) {
      return `${convertirAtexto(fechaSeleccionada.inicio)} - ${convertirAtexto(fechaSeleccionada.fin)}`
    }
    if (fechaSeleccionada?.inicio) {
      return `${convertirAtexto(fechaSeleccionada.inicio)} - ...`
    }
    return "Seleccionar rango de fechas"
  }

  // Obtener días del mes
  const obtenerDias = () => {
    const año = mesActual.getFullYear()
    const mes = mesActual.getMonth()
    const primerDia = new Date(año, mes, 1)
    const ultimoDia = new Date(año, mes + 1, 0)
    const diaInicio = primerDia.getDay()
    const dias: (Date | null)[] = []
    
    for (let i = 0; i < diaInicio; i++) dias.push(null)
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(new Date(año, mes, i))
    return dias
  }

  const diasSemana = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  const dias = obtenerDias()
  const nombreMes = mesActual.toLocaleString('es-ES', { month: 'long' })
  const año = mesActual.getFullYear()

  // Verificar si una fecha está en el rango seleccionado
  const estaEnRango = (fecha: string): boolean => {
    if (!fechaInicioSeleccionada || !fechaFinSeleccionada) return false
    return fecha >= fechaInicioSeleccionada && fecha <= fechaFinSeleccionada
  }

  // Manejar click en una fecha
  const manejarClickFecha = (fecha: Date) => {
    if (!tieneProgramacion(fecha)) return
    
    const fechaISO = obtenerISO(fecha)
    
    if (!fechaInicioSeleccionada || fechaFinSeleccionada) {
      // Primera selección de un rango nuevo (o reinicio si ya había uno completo)
      setFechaInicioSeleccionada(fechaISO)
      setFechaFinSeleccionada(null)
      return
    }

    // Segunda selección - asegurar que inicio <= fin y aplicar de inmediato
    const inicio = fechaISO < fechaInicioSeleccionada ? fechaISO : fechaInicioSeleccionada
    const fin = fechaISO < fechaInicioSeleccionada ? fechaInicioSeleccionada : fechaISO

    setFechaInicioSeleccionada(inicio)
    setFechaFinSeleccionada(fin)
    onFechaSeleccionada({ inicio, fin })

    // Cerrar el calendario poco después para que se vea el rango marcado
    setTimeout(() => {
      setAbierto(false)
    }, 300)
  }

  // Limpiar selección
  const limpiarSeleccion = () => {
    setFechaInicioSeleccionada(null)
    setFechaFinSeleccionada(null)
    onFechaSeleccionada({ inicio: '', fin: '' })
    setAbierto(false)
  }

  return (
    <div ref={calendarRef} className="relative w-full">
      {/* Input que abre el calendario */}
      <div
        onClick={() => setAbierto(!abierto)}
        className={`
          w-full rounded-full border px-4 py-2.5 text-sm cursor-pointer
          flex justify-between items-center transition-all
          ${fechaSeleccionada?.inicio && fechaSeleccionada?.fin
            ? 'border-[#8CC63F] bg-[#F5FBF0] text-[#2C2C24]' 
            : 'border-[#DED8CF] bg-[#FEFEFA] text-[#78786C] hover:border-[#8CC63F]/50'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <CalendarRange className={`w-4 h-4 ${fechaSeleccionada?.inicio && fechaSeleccionada?.fin ? 'text-[#8CC63F]' : 'text-[#9A9A93]'}`} />
          <span className={fechaSeleccionada?.inicio && fechaSeleccionada?.fin ? "text-[#2C2C24]" : "text-[#78786C]"}>
            {obtenerTextoMostrado()}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {fechaSeleccionada?.inicio && fechaSeleccionada?.fin && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                limpiarSeleccion()
              }}
              className="p-0.5 text-[#78786C] hover:text-red-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronRight 
            className={`w-4 h-4 text-[#78786C] transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`} 
          />
        </div>
      </div>

      {/* Calendario desplegable */}
      {abierto && (
        <div
          className="absolute top-full left-0 mt-2 bg-[#FEFEFA] border border-[#DED8CF] shadow-xl z-50 w-72 overflow-hidden"
          style={{ borderRadius: '1.5rem 1.5rem 1.5rem 2.5rem' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#DED8CF]" style={{ background: '#2C2C24' }}>
            <button 
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))}
              className="p-1 text-white/60 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-medium text-sm capitalize">
              {nombreMes} {año}
            </span>
            <button 
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))}
              className="p-1 text-white/60 hover:text-white transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {cargando && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-[#8CC63F] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <div className="grid grid-cols-7 gap-1 px-2 pt-2">
            {diasSemana.map(dia => (
              <div key={dia} className="text-center text-xs font-bold text-[#9A9A93] py-1">
                {dia}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 p-2">
            {dias.map((fecha, idx) => {
              const esValida = fecha !== null
              const tieneProg = esValida && tieneProgramacion(fecha)
              const fechaISO = esValida ? obtenerISO(fecha) : ""
              const estaEnRangoSeleccionado = esValida && estaEnRango(fechaISO)
              const esInicioRango = esValida && fechaISO === fechaInicioSeleccionada
              const esFinRango = esValida && fechaISO === fechaFinSeleccionada
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (esValida && tieneProg) {
                      manejarClickFecha(fecha)
                    }
                  }}
                  disabled={!esValida || !tieneProg}
                  className={`
                    h-9 text-sm rounded-lg transition-all relative
                    ${!esValida ? 'invisible' : ''}
                    ${tieneProg && !estaEnRangoSeleccionado && !esInicioRango && !esFinRango
                      ? 'hover:bg-[#8CC63F]/10 text-[#2C2C24] hover:scale-[1.05]' 
                      : ''
                    }
                    ${estaEnRangoSeleccionado ? 'bg-[#8CC63F]/20 text-[#2C2C24]' : ''}
                    ${esInicioRango || esFinRango ? 'bg-[#8CC63F] text-white shadow-md' : ''}
                    ${!tieneProg && esValida ? 'text-[#D1D5DB] cursor-not-allowed' : ''}
                  `}
                >
                  {esValida ? fecha.getDate() : ''}
                  {tieneProg && !estaEnRangoSeleccionado && !esInicioRango && !esFinRango && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8CC63F]" />
                  )}
                  {esInicioRango && <span className="absolute -top-1 -left-1 text-[8px] font-bold text-white">I</span>}
                  {esFinRango && <span className="absolute -top-1 -right-1 text-[8px] font-bold text-white">F</span>}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[#DED8CF] px-3 py-2 flex justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#8CC63F]" />
                <span className="text-[#78786C]">Programado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#8CC63F]/20" />
                <span className="text-[#78786C]">Rango</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!fechaInicioSeleccionada && (
                <span className="text-[#9A9A93]">Toca dos días para aplicar el rango</span>
              )}
              {fechaInicioSeleccionada && !fechaFinSeleccionada && (
                <span className="text-[#9A9A93]">Elige el día final</span>
              )}
              <button
                onClick={() => setMesActual(new Date())}
                className="text-[#8CC63F] font-medium hover:underline"
              >
                Hoy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}