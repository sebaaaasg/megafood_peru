'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Save, 
  Building, 
  Calendar,
  AlertCircle,
  Loader2,
  Eye,
  RefreshCw,
  X,
  CheckCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Plato {
  id: string
  nombre: string
  categoria: string
}

interface Sede {
  id: string
  nombre: string
}

interface ProgramacionExistente {
  id: number
  fecha_texto: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface SeleccionPorTipo {
  [tipo: string]: Record<string, string>
}

const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE", icon: "📋" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF", icon: "🥗" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED", icon: "🎯" },
]

const CATS_BASE    = ["ENTRADA", "CÁRNICO"]
const CATS_GUARNIC = ["GUARNICIÓN 01", "GUARNICIÓN 02", "GUARNICIÓN 03"]
const CATS_EXTRA   = ["POSTRE", "BEBIBLE", "SALSA"]
const TODAS_CATS   = [...CATS_BASE, ...CATS_GUARNIC, ...CATS_EXTRA]

const EMPTY_SEL = () =>
  Object.fromEntries(TODAS_CATS.map(c => [c, ""])) as Record<string, string>

const EMPTY_SEL_POR_TIPO = () => {
  const obj: SeleccionPorTipo = {}
  TIPOS_MENU.forEach(tipo => {
    obj[tipo.value] = EMPTY_SEL()
  })
  return obj
}

export default function ProgramacionManual() {
  const router = useRouter()
  const supabase = createClient()
  
  const [sedes, setSedes]                         = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada]   = useState("")
  const [platos, setPlatos]                       = useState<Plato[]>([])
  const [cargando, setCargando]                   = useState(false)
  const [verificando, setVerificando]             = useState(false)
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")
  const [tipoMenu, setTipoMenu]                   = useState("estandar")
  const [seleccionesPorTipo, setSeleccionesPorTipo] = useState<SeleccionPorTipo>(EMPTY_SEL_POR_TIPO())
  const [programacionExistente, setProgramacionExistente] = useState<ProgramacionExistente[]>([])
  const [fechaBloqueada, setFechaBloqueada]       = useState(false)
  const [mostrandoConfirmacion, setMostrandoConfirmacion] = useState(false)
  const [numGuarniciones, setNumGuarniciones]     = useState(1)

  const formatearFechaISO = (fechaISO: string): string => {
    if (!fechaISO) return ""
    return new Date(fechaISO).toLocaleDateString("es-ES", {
      weekday: "long", 
      day: "numeric", 
      month: "long", 
      year: "numeric", 
      timeZone: "UTC",
    })
  }

  useEffect(() => { cargarDatosIniciales() }, [])

  useEffect(() => {
    if (fechaSeleccionada && sedeSeleccionada) {
      verificarFecha()
    } else {
      setProgramacionExistente([])
      setFechaBloqueada(false)
    }
  }, [fechaSeleccionada, sedeSeleccionada])

  const cargarDatosIniciales = async () => {
    setCargando(true)
    try {
      const [{ data: sedesData }, { data: platosData }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").order("nombre"),
        supabase.from("platos").select("id, nombre, categoria").order("nombre"),
      ])
      if (sedesData) setSedes(sedesData)
      if (platosData) setPlatos(platosData)
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setCargando(false)
    }
  }

  const verificarFecha = async () => {
    setVerificando(true)
    setFechaBloqueada(false)
    setProgramacionExistente([])
    setSeleccionesPorTipo(EMPTY_SEL_POR_TIPO())

    const fechaFormateada = formatearFechaISO(fechaSeleccionada)
    const { data } = await supabase
      .from("planificacion_detalles")
      .select("id, fecha_texto, tipo, categoria, plato_id")
      .eq("fecha_texto", fechaFormateada)
      .eq("sede_id", sedeSeleccionada)

    if (data && data.length > 0) {
      const formateada = data.map((item: any) => ({
        ...item,
        plato_nombre: platos.find(p => p.id === item.plato_id)?.nombre || "Desconocido",
      }))
      setProgramacionExistente(formateada)
      setFechaBloqueada(true)
      
      const nuevasSelecciones = EMPTY_SEL_POR_TIPO()
      data.forEach((item: any) => {
        if (nuevasSelecciones[item.tipo] && nuevasSelecciones[item.tipo][item.categoria] !== undefined) {
          nuevasSelecciones[item.tipo][item.categoria] = item.plato_id
        }
      })
      setSeleccionesPorTipo(nuevasSelecciones)
    }
    setVerificando(false)
  }

  const actualizarSeleccion = (categoria: string, platoId: string) => {
    setSeleccionesPorTipo(prev => ({
      ...prev,
      [tipoMenu]: {
        ...prev[tipoMenu],
        [categoria]: platoId
      }
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sedeSeleccionada || !fechaSeleccionada) return
    if (fechaBloqueada) return

    const tieneAlgunaSeleccion = TIPOS_MENU.some(tipo => {
      const selecciones = seleccionesPorTipo[tipo.value]
      return selecciones["ENTRADA"] && selecciones["CÁRNICO"] && selecciones["GUARNICIÓN 01"]
    })

    if (!tieneAlgunaSeleccion) {
      alert("Debes configurar al menos un tipo de menú completo (ENTRADA, CÁRNICO y GUARNICIÓN 01)")
      return
    }

    setMostrandoConfirmacion(true)
  }

  const guardarProgramacion = async () => {
    setCargando(true)
    try {
      const fechaFormateada = formatearFechaISO(fechaSeleccionada)
      const registros: any[] = []

      for (const [tipo, selecciones] of Object.entries(seleccionesPorTipo)) {
        for (const [categoria, platoId] of Object.entries(selecciones)) {
          if (!platoId) continue
          registros.push({
            fecha_texto: fechaFormateada,
            sede_id:     sedeSeleccionada,
            tipo,
            categoria,
            plato_id:    platoId,
          })
        }
      }

      if (registros.length === 0) {
        alert("No hay datos para guardar")
        return
      }

      const { error } = await supabase.from("planificacion_detalles").insert(registros)
      if (error) throw error

      alert(`✅ Programación guardada exitosamente (${registros.length} platos)`)
      setFechaSeleccionada("")
      setTipoMenu("estandar")
      setSeleccionesPorTipo(EMPTY_SEL_POR_TIPO())
      setProgramacionExistente([])
      setFechaBloqueada(false)
      setNumGuarniciones(1)
      setMostrandoConfirmacion(false)
      router.refresh()
    } catch (error: any) {
      alert("Error al guardar: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  const getPlatosPorCategoria = (categoria: string) => {
    const catDB = categoria.startsWith("GUARNICIÓN") ? "GUARNICIÓN" : categoria
    return platos.filter(p => p.categoria === catDB)
  }

  const obtenerResumenCompleto = () => {
    const resumen: { tipo: string; categoria: string; nombre: string; color: any }[] = []
    
    TIPOS_MENU.forEach(tipo => {
      const selecciones = seleccionesPorTipo[tipo.value]
      if (!selecciones) return
      
      const categoriasAMostrar = TODAS_CATS.filter(cat => {
        if (cat === "GUARNICIÓN 02" && numGuarniciones < 2) return false
        if (cat === "GUARNICIÓN 03" && numGuarniciones < 3) return false
        return selecciones[cat]
      })
      
      categoriasAMostrar.forEach(cat => {
        const plato = platos.find(p => p.id === selecciones[cat])
        if (plato) {
          resumen.push({
            tipo: tipo.value,
            categoria: cat,
            nombre: plato.nombre,
            color: TIPOS_MENU.find(t => t.value === tipo.value)
          })
        }
      })
    })
    
    return resumen
  }

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

  const tipoActual = TIPOS_MENU.find(t => t.value === tipoMenu)!
  const resumenCompleto = obtenerResumenCompleto()
  const resumenPorTipo = resumenCompleto.reduce((acc, item) => {
    if (!acc[item.tipo]) acc[item.tipo] = []
    acc[item.tipo].push(item)
    return acc
  }, {} as Record<string, typeof resumenCompleto>)

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
                <span style={{ color: '#FFFFFF' }}>Programación</span>
                <span style={{ color: '#F37F21' }}> Manual</span>
              </h1>
              <p className="mt-2" style={{ color: '#C9C9C3', fontSize: '1rem' }}>
                Configura todos los tipos de menú para la misma fecha.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/menus"
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
      <main className="max-w-5xl mx-auto px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selectores de Sede y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
                Sede
              </label>
              <select
                value={sedeSeleccionada}
                onChange={e => setSedeSeleccionada(e.target.value)}
                className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                required
              >
                <option value="">Seleccionar sede</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
                Fecha
              </label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={e => setFechaSeleccionada(e.target.value)}
                className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Estado de verificación */}
          {verificando && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-[#F5F5F0]">
              <Loader2 className="w-5 h-5 animate-spin text-[#8CC63F]" />
              <span className="text-sm text-[#6B6B65]">Verificando disponibilidad...</span>
            </div>
          )}

          {/* Fecha bloqueada */}
          {fechaBloqueada && !verificando && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold text-red-700">Esta fecha ya tiene programación</p>
              </div>
              <p className="text-sm text-red-600">
                Para modificarla, ve a <strong>Visualizar Planificación</strong> y edita desde ahí.
              </p>
            </div>
          )}

          {/* Formulario principal */}
          {!fechaBloqueada && !verificando && (
            <>
              {/* Selector de tipo de menú */}
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                  Tipo de menú (selecciona para configurar)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {TIPOS_MENU.map(tipo => {
                    const isActive = tipoMenu === tipo.value
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => setTipoMenu(tipo.value)}
                        className={`
                          flex items-center justify-center gap-2 rounded-lg py-3 px-2 text-sm font-bold transition-all
                          ${isActive 
                            ? 'shadow-md ring-2 ring-offset-1 text-white' 
                            : 'opacity-80 hover:opacity-100 hover:scale-[1.02]'
                          }
                        `}
                        style={{
                          background: isActive ? tipo.color : tipo.bg,
                          color: isActive ? "white" : tipo.color,
                          border: `1px solid ${tipo.color}40`,
                        }}
                      >
                        <span>{tipo.icon}</span>
                        <span className="uppercase tracking-wide">{tipo.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Formulario del tipo seleccionado */}
              <div className="rounded-lg border border-[#E7E7E2] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-bold text-[#2B2B2B]">
                    Configurando: <span style={{ color: tipoActual.color }}>{tipoActual.label}</span>
                  </span>
                </div>

                <div className="space-y-4">
                  {CATS_BASE.map(cat => (
                    <SelectorCategoria
                      key={cat}
                      categoria={cat}
                      value={seleccionesPorTipo[tipoMenu]?.[cat] || ""}
                      onChange={val => actualizarSeleccion(cat, val)}
                      platos={getPlatosPorCategoria(cat)}
                      color={CAT_COLORS[cat]}
                    />
                  ))}

                  {/* Guarniciones */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#c2410c]">Guarniciones</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => {
                              setNumGuarniciones(n)
                              const nuevas = { ...seleccionesPorTipo[tipoMenu] }
                              if (n < 3) nuevas["GUARNICIÓN 03"] = ""
                              if (n < 2) nuevas["GUARNICIÓN 02"] = ""
                              setSeleccionesPorTipo(prev => ({
                                ...prev,
                                [tipoMenu]: nuevas
                              }))
                            }}
                            className={`w-8 h-8 rounded-lg text-sm font-bold transition-all border
                              ${numGuarniciones === n
                                ? "bg-[#c2410c] text-white border-[#c2410c]"
                                : "bg-white text-[#6B6B65] border-[#E7E7E2] hover:border-[#c2410c]"
                              }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    {CATS_GUARNIC.slice(0, numGuarniciones).map(cat => (
                      <div key={cat} className="mb-3">
                        <SelectorCategoria
                          categoria={cat}
                          value={seleccionesPorTipo[tipoMenu]?.[cat] || ""}
                          onChange={val => actualizarSeleccion(cat, val)}
                          platos={getPlatosPorCategoria(cat)}
                          color={CAT_COLORS[cat]}
                        />
                      </div>
                    ))}
                  </div>

                  {CATS_EXTRA.map(cat => (
                    <SelectorCategoria
                      key={cat}
                      categoria={cat}
                      value={seleccionesPorTipo[tipoMenu]?.[cat] || ""}
                      onChange={val => actualizarSeleccion(cat, val)}
                      platos={getPlatosPorCategoria(cat)}
                      color={CAT_COLORS[cat]}
                      opcional={cat === "SALSA"}
                    />
                  ))}
                </div>
              </div>

              {/* Vista previa */}
              {resumenCompleto.length > 0 && (
                <div className="rounded-lg border border-[#E7E7E2] bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-[#6B6B65]" />
                    <p className="text-sm font-bold text-[#2B2B2B]">
                      Vista previa completa - Todos los tipos configurados
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(resumenPorTipo).map(([tipo, items]) => {
                      const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                      if (!tipoInfo || items.length === 0) return null
                      
                      return (
                        <div key={tipo}>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className="text-xs font-bold rounded-full px-3 py-1"
                              style={{ background: tipoInfo.bg, color: tipoInfo.color }}
                            >
                              {tipoInfo.icon} {tipoInfo.label}
                            </span>
                            <span className="text-xs text-[#9A9A93]">
                              {items.length} platos
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {items.map(({ categoria, nombre }) => {
                              const catColor = CAT_COLORS[categoria] || { color: "#555", bg: "#f5f5f5" }
                              return (
                                <div
                                  key={categoria}
                                  className="rounded-lg border p-3 min-w-[120px]"
                                  style={{ background: catColor.bg, borderColor: `${catColor.color}30` }}
                                >
                                  <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: catColor.color }}>
                                    {categoria}
                                  </p>
                                  <p className="text-sm font-bold text-[#2B2B2B]">{nombre}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFechaSeleccionada("")
                    setTipoMenu("estandar")
                    setSeleccionesPorTipo(EMPTY_SEL_POR_TIPO())
                    setProgramacionExistente([])
                    setFechaBloqueada(false)
                    setNumGuarniciones(1)
                  }}
                  className="flex-1 py-3 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
                >
                  <RefreshCw className="inline w-4 h-4 mr-2" />
                  Limpiar todo
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 py-3 rounded-lg bg-[#2B2B2B] text-white font-medium hover:bg-[#3B3B3B] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cargando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {cargando ? "Guardando..." : "Guardar todo"}
                </button>
              </div>
            </>
          )}
        </form>
      </main>

      {/* Modal de confirmación */}
      {mostrandoConfirmacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#2B2B2B]">Confirmar guardado</h3>
              <button onClick={() => setMostrandoConfirmacion(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm text-[#6B6B65] mb-1">
              <span className="font-bold text-[#2B2B2B]">{formatearFechaISO(fechaSeleccionada)}</span>
            </p>
            <p className="text-sm text-[#6B6B65] mb-4">
              Sede: <span className="font-bold text-[#2B2B2B]">{sedes.find(s => s.id === sedeSeleccionada)?.nombre}</span>
            </p>
            
            <div className="space-y-4 mb-4">
              {Object.entries(resumenPorTipo).map(([tipo, items]) => {
                const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                if (!tipoInfo || items.length === 0) return null
                
                return (
                  <div key={tipo}>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-bold rounded-full px-3 py-1"
                        style={{ background: tipoInfo.bg, color: tipoInfo.color }}
                      >
                        {tipoInfo.icon} {tipoInfo.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(({ categoria, nombre }) => {
                        const catColor = CAT_COLORS[categoria] || { color: "#555", bg: "#f5f5f5" }
                        return (
                          <div
                            key={categoria}
                            className="rounded-lg border p-2"
                            style={{ background: catColor.bg, borderColor: `${catColor.color}30` }}
                          >
                            <p className="text-[10px] font-bold uppercase" style={{ color: catColor.color }}>{categoria}</p>
                            <p className="text-sm font-bold text-[#2B2B2B]">{nombre}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setMostrandoConfirmacion(false)} 
                className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarProgramacion} 
                disabled={cargando} 
                className="flex-1 py-2.5 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-bold hover:bg-[#7AB835] transition disabled:opacity-50"
              >
                {cargando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Programación manual
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

// ─── Componente SelectorCategoria ──────────────────
function SelectorCategoria({
  categoria,
  value,
  onChange,
  platos,
  color,
  opcional = false,
}: {
  categoria: string
  value: string
  onChange: (v: string) => void
  platos: Plato[]
  color: { color: string; bg: string }
  opcional?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: color.color }}>
          {categoria}
        </span>
        {opcional && (
          <span className="text-[10px] text-[#9A9A93] font-medium">(opcional)</span>
        )}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border px-4 py-2.5 text-sm font-medium text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent transition"
        style={{ 
          borderColor: value ? `${color.color}60` : "#E7E7E2",
          background: value ? `${color.bg}` : "#FFFFFF"
        }}
      >
        <option value="">— Seleccionar plato —</option>
        {platos.map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
    </div>
  )
}