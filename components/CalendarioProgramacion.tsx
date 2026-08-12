'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'

interface CalendarioProgramacionProps {
  sedeId: string
  onFechaSeleccionada: (fecha: string) => void // Emite YYYY-MM-DD
  fechaSeleccionada?: string // Recibe YYYY-MM-DD
}

export default function CalendarioProgramacion({
  sedeId,
  onFechaSeleccionada,
  fechaSeleccionada
}: CalendarioProgramacionProps) {
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [mesActual, setMesActual] = useState(new Date())
  const [fechasProgramadas, setFechasProgramadas] = useState<Set<string>>(new Set())
  const [cargando, setCargando] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

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

  // Cargar fechas programadas usando la nueva columna "fecha" (tipo date)
  useEffect(() => {
    if (!sedeId) return
    
    const cargarFechas = async () => {
      setCargando(true)
      try {
        const { data } = await supabase
          .from("planificacion_detalles")
          .select("fecha") // <-- CAMBIO AQUÍ: antes era fecha_texto
          .eq("sede_id", sedeId)
        
        if (data) {
          // Guardamos las fechas directamente (vienen en formato YYYY-MM-DD)
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

  // Helper para convertir objeto Date de JS a "YYYY-MM-DD" local
  const obtenerISO = (fecha: Date): string => {
    const y = fecha.getFullYear()
    const m = String(fecha.getMonth() + 1).padStart(2, '0')
    const d = String(fecha.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Helper para mostrar un texto bonito en el input (solo visual)
  const convertirAtexto = (fecha: Date): string => {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
  }

  // Verificar si hay programación (ahora comparamos YYYY-MM-DD contra YYYY-MM-DD)
  const tieneProgramacion = (fecha: Date): boolean => {
    return fechasProgramadas.has(obtenerISO(fecha))
  }

  // Formatear fecha para mostrar en el input (decodificando el YYYY-MM-DD)
  const obtenerTextoMostrado = () => {
    if (!fechaSeleccionada) return "Seleccionar fecha"
    const [y, m, d] = fechaSeleccionada.split('-')
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    return convertirAtexto(date)
  }
  const fechaMostrada = obtenerTextoMostrado()

  // Obtener días del mes para pintar la cuadrícula
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

  // Verificar si una fecha de la cuadrícula es hoy
  const esHoy = (fecha: Date): boolean => {
    const hoy = new Date()
    return fecha.getDate() === hoy.getDate() &&
           fecha.getMonth() === hoy.getMonth() &&
           fecha.getFullYear() === hoy.getFullYear()
  }

  return (
    <div ref={calendarRef} className="relative w-full">
      {/* Input que abre el calendario */}
      <div
        onClick={() => setAbierto(!abierto)}
        className={`
          w-full rounded-lg border px-4 py-2.5 text-sm cursor-pointer 
          flex justify-between items-center transition-all
          ${fechaSeleccionada 
            ? 'border-[#8CC63F] bg-[#F5FBF0] text-[#2B2B2B]' 
            : 'border-[#E7E7E2] bg-white text-[#6B6B65] hover:border-[#8CC63F]/50'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${fechaSeleccionada ? 'text-[#8CC63F]' : 'text-[#9A9A93]'}`} />
          <span className={fechaSeleccionada ? "text-[#2B2B2B]" : "text-[#6B6B65]"}>
            {fechaMostrada}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {fechaSeleccionada && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onFechaSeleccionada("") // Limpiamos selección
                setAbierto(false)
              }}
              className="p-0.5 text-[#6B6B65] hover:text-red-500 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronRight 
            className={`w-4 h-4 text-[#6B6B65] transition-transform duration-200 ${abierto ? 'rotate-90' : ''}`} 
          />
        </div>
      </div>

      {/* Calendario desplegable */}
      {abierto && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg border border-[#E7E7E2] shadow-xl z-50 w-72 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E7E2]" style={{ background: '#2B2B2B' }}>
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
              const esSeleccionada = esValida && fechaSeleccionada === fechaISO
              const hoy = esValida && esHoy(fecha)
              
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (esValida && tieneProg) {
                      onFechaSeleccionada(fechaISO) // Emitimos el YYYY-MM-DD final
                      setAbierto(false)
                    }
                  }}
                  disabled={!esValida || !tieneProg}
                  className={`
                    h-9 text-sm rounded-lg transition-all relative
                    ${!esValida ? 'invisible' : ''}
                    ${tieneProg && !esSeleccionada 
                      ? 'hover:bg-[#8CC63F]/10 text-[#2B2B2B] hover:scale-[1.05]' 
                      : ''
                    }
                    ${esSeleccionada 
                      ? 'bg-[#8CC63F] text-white shadow-md hover:bg-[#7AB835]' 
                      : ''
                    }
                    ${!tieneProg && esValida 
                      ? 'text-[#D1D5DB] cursor-not-allowed' 
                      : ''
                    }
                    ${hoy && !esSeleccionada && tieneProg 
                      ? 'ring-2 ring-[#8CC63F]/50' 
                      : ''
                    }
                  `}
                >
                  {esValida ? fecha.getDate() : ''}
                  {tieneProg && !esSeleccionada && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#8CC63F]" />
                  )}
                  {esSeleccionada && (
                    <Check className="absolute -top-1 -right-1 w-3 h-3 text-white bg-[#F37F21] rounded-full p-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="border-t border-[#E7E7E2] px-3 py-2 flex justify-between items-center text-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#8CC63F]" />
                <span className="text-[#6B6B65]">Programado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#D1D5DB]" />
                <span className="text-[#6B6B65]">Sin menú</span>
              </div>
            </div>
            <button 
              onClick={() => setMesActual(new Date())} 
              className="text-[#8CC63F] font-medium hover:underline"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}