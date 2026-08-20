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
  CheckCircle,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CalendarioProgramacion from '@/components/CalendarioMenus'
import MenusNav from '@/app/dashboard/menus/components/MenusNav'

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'
const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'
const PIEDRA = '#6B6B65'
const AZUL = '#3B82F6'

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
  fecha: string
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

const CATS_BASE    = ["ENTRADA", "FONDO"]
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
  // Comensales por tipo de menú, en texto mientras se edita el input.
  const [comensalesPorTipo, setComensalesPorTipo] = useState<Record<string, string>>({})

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
    setComensalesPorTipo({})

    // `fecha` es una columna date: se consulta con el ISO tal cual lo emite el
    // calendario (yyyy-mm-dd), no con el texto largo en español.
    const { data } = await supabase
      .from("planificacion_detalles")
      .select("id, fecha, tipo, categoria, plato_id")
      .eq("fecha", fechaSeleccionada)
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

      // Comensales ya registrados para esa fecha (solo lectura: la fecha
      // queda bloqueada y se edita desde /menus/editar).
      const { data: comData } = await supabase
        .from("planificacion_comensales")
        .select("tipo, comensales")
        .eq("fecha", fechaSeleccionada)
        .eq("sede_id", sedeSeleccionada)

      if (comData) {
        const mapa: Record<string, string> = {}
        comData.forEach((c: { tipo: string; comensales: number }) => {
          mapa[c.tipo] = String(c.comensales)
        })
        setComensalesPorTipo(mapa)
      }
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
      return selecciones["ENTRADA"] && selecciones["FONDO"] && selecciones["GUARNICIÓN 01"]
    })

    if (!tieneAlgunaSeleccion) {
      alert("Debes configurar al menos un tipo de menú completo (ENTRADA, FONDO y GUARNICIÓN 01)")
      return
    }

    setMostrandoConfirmacion(true)
  }

  const guardarProgramacion = async () => {
    setCargando(true)
    try {
      const registros: any[] = []
      // Tipos que realmente se van a guardar: solo esos llevan comensales.
      const tiposGuardados = new Set<string>()

      for (const [tipo, selecciones] of Object.entries(seleccionesPorTipo)) {
        for (const [categoria, platoId] of Object.entries(selecciones)) {
          if (!platoId) continue
          registros.push({
            fecha: fechaSeleccionada,
            sede_id:     sedeSeleccionada,
            tipo,
            categoria,
            plato_id:    platoId,
          })
          tiposGuardados.add(tipo)
        }
      }

      if (registros.length === 0) {
        alert("No hay datos para guardar")
        return
      }

      const { error } = await supabase.from("planificacion_detalles").insert(registros)
      if (error) throw error

      // Comensales por tipo. Cocina y Compras calculan el requerimiento a
      // partir de esta tabla, así que se guarda junto con la programación.
      const registrosComensales = [...tiposGuardados]
        .map(tipo => ({
          fecha: fechaSeleccionada,
          sede_id: sedeSeleccionada,
          tipo,
          comensales: parseInt(comensalesPorTipo[tipo] || "0", 10) || 0,
        }))
        .filter(r => r.comensales > 0)

      if (registrosComensales.length > 0) {
        const { error: errorComensales } = await supabase
          .from("planificacion_comensales")
          .upsert(registrosComensales, { onConflict: "fecha,sede_id,tipo" })
        if (errorComensales) throw errorComensales
      }

      alert(`✅ Programación guardada exitosamente (${registros.length} platos)`)
      setFechaSeleccionada("")
      setTipoMenu("estandar")
      setSeleccionesPorTipo(EMPTY_SEL_POR_TIPO())
      setComensalesPorTipo({})
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
    "FONDO":         { color: "#991b1b", bg: "#fef2f2" },
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
    <div className="min-h-screen w-full" style={{ background: FONDO, color: OSCURO, fontFamily: ARCHIVO }}>
      {/* ─── Encabezado ─── */}
      <div className="flex border-b-2" style={{ borderColor: PIEDRA }}>
        <div className="w-2 shrink-0" style={{ background: AZUL }} aria-hidden="true" />
        <div className="flex-1 px-5 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-4 text-[10px] font-extrabold" style={{ letterSpacing: '0.2em', color: PIEDRA }}>
                PANEL DE LOGÍSTICA · MÓDULO DE GESTIÓN
              </div>
              <h1
                className="text-[36px] sm:text-[48px]"
                style={{ margin: 0, lineHeight: 0.95, letterSpacing: '-0.035em', fontWeight: 800 }}
              >
                Programación <span style={{ color: AZUL }}>manual</span>
              </h1>
              <p className="mt-3 max-w-xl text-[15px]" style={{ color: PIEDRA }}>
                Configura todos los tipos de menú para la misma fecha.
              </p>
            </div>
            <Link
              href="/dashboard/menus"
              className="flex min-h-[52px] items-center gap-2 px-4 py-2.5 text-[13px] font-extrabold uppercase transition-colors"
              style={{ letterSpacing: '0.06em', border: `2px solid ${OSCURO}`, color: OSCURO }}
            >
              <ArrowLeft size={18} />
              Volver
            </Link>
          </div>

          <MenusNav />
        </div>
      </div>

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
                className="w-full  border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
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


              <CalendarioProgramacion
  sedeId={sedeSeleccionada}
  onFechaSeleccionada={(fecha) => {
    setFechaSeleccionada(fecha)
    setProgramacionExistente([])
    setFechaBloqueada(false)
    setSeleccionesPorTipo(EMPTY_SEL_POR_TIPO())
  }}
  fechaSeleccionada={fechaSeleccionada}
/>


            </div>
          </div>

          {/* Estado de verificación */}
          {verificando && (
            <div className="flex items-center gap-3 p-4  bg-[#F5F5F0]">
              <Loader2 className="w-5 h-5 animate-spin text-[#8CC63F]" />
              <span className="text-sm text-[#6B6B65]">Verificando disponibilidad...</span>
            </div>
          )}

          {/* Fecha bloqueada */}
          {fechaBloqueada && !verificando && (
            <div className="p-4  border border-red-200 bg-red-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold text-red-700">Esta fecha ya tiene programación</p>
              </div>
              <p className="text-sm text-red-600">
                Para modificarla, ve a <strong>Editar Planificación</strong> y edita desde ahí.
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
                          flex items-center justify-center gap-2  py-3 px-2 text-sm font-bold transition-all
                          ${isActive 
                            ? ' ring-2 ring-offset-1 text-white' 
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
              <div className=" border border-[#E7E7E2] bg-white p-6 ">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-bold text-[#2B2B2B]">
                    Configurando: <span style={{ color: tipoActual.color }}>{tipoActual.label}</span>
                  </span>
                </div>

                {/* Comensales del tipo. Cocina y Compras calculan el
                    requerimiento de insumos a partir de este número. */}
                <div className="mb-5  border border-[#E7E7E2] bg-[#FAFAF7] p-4">
                  <label
                    htmlFor={`comensales-${tipoMenu}`}
                    className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[#2B2B2B]"
                  >
                    <Users className="h-4 w-4" style={{ color: tipoActual.color }} />
                    Comensales de {tipoActual.label}
                  </label>
                  <input
                    id={`comensales-${tipoMenu}`}
                    type="number"
                    min="0"
                    inputMode="numeric"
                    disabled={fechaBloqueada}
                    value={comensalesPorTipo[tipoMenu] ?? ""}
                    onChange={e =>
                      setComensalesPorTipo(prev => ({ ...prev, [tipoMenu]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full  border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none transition focus:border-transparent focus:ring-2 focus:ring-[#8CC63F] disabled:bg-gray-100 disabled:text-[#9A9A93]"
                  />
                  <p className="mt-1.5 text-xs text-[#6B6B65]">
                    Si lo dejas en 0, este tipo se guarda sin comensales y no sumará
                    al requerimiento de Cocina ni de Compras.
                  </p>
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
                            className={`w-8 h-8  text-sm font-bold transition-all border
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
                <div className=" border border-[#E7E7E2] bg-white p-6 ">
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
                              className="text-xs font-bold  px-3 py-1"
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
                                  className=" border p-3 min-w-[120px]"
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
                  className="flex-1 py-3  border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
                >
                  <RefreshCw className="inline w-4 h-4 mr-2" />
                  Limpiar todo
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex-1 py-3  bg-[#2B2B2B] text-white font-medium hover:bg-[#3B3B3B] transition disabled:opacity-50 flex items-center justify-center gap-2"
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
          <div className="bg-white  max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto ">
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
                        className="text-xs font-bold  px-3 py-1"
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
                            className=" border p-2"
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
                className="flex-1 py-2.5  border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarProgramacion} 
                disabled={cargando} 
                className="flex-1 py-2.5  bg-[#8CC63F] text-[#1F3A0A] font-bold hover:bg-[#7AB835] transition disabled:opacity-50"
              >
                {cargando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8" style={{ borderTop: `2px solid ${OSCURO}` }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 px-8 py-4">
          <p className="text-[13px]" style={{ color: PIEDRA }}>
            Megafood Perú · Programación manual · v1.0
          </p>
          <span className="flex gap-2" aria-hidden="true">
            <span style={{ width: 26, height: 6, background: PIEDRA }} />
            <span style={{ width: 26, height: 6, background: '#8CC63F' }} />
            <span style={{ width: 26, height: 6, background: AZUL }} />
          </span>
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
        className="w-full  border px-4 py-2.5 text-sm font-medium text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent transition"
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