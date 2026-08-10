'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CalendarioProgramacionProps {
  sedeId: string
  onFechaSeleccionada: (fecha: string) => void
  /** ISO string (yyyy-mm-dd) */
  fechaSeleccionada?: string
}

/**
 * Variante de CalendarioCompacto para /menus/manual.
 * A diferencia de CalendarioCompacto, aquí TODOS los días son seleccionables:
 * los días con programación existente NO se bloquean, solo se marcan con una
 * "×" roja como aviso visual. La verificación real (y el aviso completo al
 * usuario) la hace la página padre a través de verificarFecha() / fechaBloqueada.
 *
 * Emite la fecha seleccionada como ISO string (yyyy-mm-dd), ya que la página
 * padre hace `new Date(fechaISO)` para formatearla.
 */
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

  // Cargar fechas programadas (solo para el aviso visual, no bloquean selección)
  useEffect(() => {
    if (!sedeId) {
      setFechasProgramadas(new Set())
      return
    }

    const cargarFechas = async () => {
      setCargando(true)
      try {
        const { data } = await supabase
          .from("planificacion_detalles")
          .select("fecha_texto")
          .eq("sede_id", sedeId)

        if (data) {
          setFechasProgramadas(new Set(data.map((f: any) => f.fecha_texto)))
        }
      } catch (error) {
        console.error("Error al cargar fechas programadas:", error)
      } finally {
        setCargando(false)
      }
    }
    cargarFechas()
  }, [sedeId])

  // Fecha -> ISO string local (yyyy-mm-dd), evitando desfases de timezone
  const aISO = (fecha: Date): string => {
    const y = fecha.getFullYear()
    const m = String(fecha.getMonth() + 1).padStart(2, '0')
    const d = String(fecha.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  // Fecha -> texto largo en español, mismo formato que fecha_texto en BD
  const aTextoBD = (fecha: Date): string => {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    return `${dias[fecha.getDay()]}, ${fecha.getDate()} de ${meses[fecha.getMonth()]} de ${fecha.getFullYear()}`
  }

  // Verificar si una fecha ya tiene programación (solo para el aviso ×)
  const tieneProgramacion = (fecha: Date): boolean => {
    return fechasProgramadas.has(aTextoBD(fecha))
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

  // Texto mostrado en el input (formato español, legible)
  const fechaMostrada = fechaSeleccionada
    ? new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : "Seleccionar fecha"

  // Verificar si una fecha es hoy
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
          flex justify-between items-center transition-all capitalize
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
                onFechaSeleccionada("")
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
          {/* Cabecera */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E7E7E2]" style={{ background: '#2B2B2B' }}>
            <button 
              type="button"
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))}
              className="p-1 text-white/60 hover:text-white transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-white font-medium text-sm capitalize">
              {nombreMes} {año}
            </span>
            <button 
              type="button"
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))}
              className="p-1 text-white/60 hover:text-white transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Loading */}
          {cargando && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-[#8CC63F] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Días de semana */}
          <div className="grid grid-cols-7 gap-1 px-2 pt-2">
            {diasSemana.map(dia => (
              <div key={dia} className="text-center text-xs font-bold text-[#9A9A93] py-1">
                {dia}
              </div>
            ))}
          </div>

          {/* Días del mes — todos seleccionables */}
          <div className="grid grid-cols-7 gap-1 p-2">
            {dias.map((fecha, idx) => {
              const esValida = fecha !== null
              const isoFecha = esValida ? aISO(fecha as Date) : ""
              const esSeleccionada = esValida && fechaSeleccionada === isoFecha
              const hoy = esValida && esHoy(fecha as Date)
              const tieneProg = esValida && tieneProgramacion(fecha as Date)

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (!esValida) return
                    onFechaSeleccionada(isoFecha)
                    setAbierto(false)
                  }}
                  disabled={!esValida}
                  className={`
                    h-9 text-sm rounded-lg transition-all relative
                    ${!esValida ? 'invisible' : ''}
                    ${esValida && !esSeleccionada && !tieneProg 
                      ? 'hover:bg-[#8CC63F]/10 text-[#2B2B2B] hover:scale-[1.05]' 
                      : ''
                    }
                    ${esValida && !esSeleccionada && tieneProg
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 hover:scale-[1.05]'
                      : ''
                    }
                    ${esSeleccionada 
                      ? 'bg-[#8CC63F] text-white shadow-md hover:bg-[#7AB835]' 
                      : ''
                    }
                    ${hoy && !esSeleccionada && !tieneProg
                      ? 'ring-2 ring-[#8CC63F]/50' 
                      : ''
                    }
                    ${hoy && !esSeleccionada && tieneProg
                      ? 'ring-2 ring-red-400/50'
                      : ''
                    }
                  `}
                >
                  {esValida ? (fecha as Date).getDate() : ''}
                  {esSeleccionada && (
                    <Check className="absolute -top-1 -right-1 w-3 h-3 text-white bg-[#F37F21] rounded-full p-0.5" />
                  )}
                  {tieneProg && (
                    <X
                      strokeWidth={3}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 text-white bg-red-500 rounded-full p-0.5"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer con leyenda */}
          <div className="border-t border-[#E7E7E2] px-3 py-2 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex items-center justify-center">
                  <X strokeWidth={4} className="w-1.5 h-1.5 text-white" />
                </span>
                <span className="text-[#6B6B65]">Ocupado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8CC63F] flex items-center justify-center">
                  <Check strokeWidth={4} className="w-1.5 h-1.5 text-white" />
                </span>
                <span className="text-[#6B6B65]">Seleccionado</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[#8CC63F]/50 flex items-center justify-center" />
                <span className="text-[#6B6B65]">Hoy</span>
              </div>
            </div>
            <button 
              type="button"
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