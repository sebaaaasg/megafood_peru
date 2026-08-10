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
  Edit,
  Trash2,
  Plus,
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

interface ProgramacionItem {
  id: number
  fecha_texto: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface AgrupadoPorTipo {
  [tipo: string]: ProgramacionItem[]
}

const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE", icon: "📋" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF", icon: "🥗" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED", icon: "🎯" },
]

const CATS_BASE = ["ENTRADA", "CÁRNICO"]
const CATS_GUARNIC = ["GUARNICIÓN 01", "GUARNICIÓN 02", "GUARNICIÓN 03"]
const CATS_EXTRA = ["POSTRE", "BEBIBLE", "SALSA"]
const TODAS_CATS = [...CATS_BASE, ...CATS_GUARNIC, ...CATS_EXTRA]

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

export default function EditarProgramacion() {
  const router = useRouter()
  const supabase = createClient()
  
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [platos, setPlatos] = useState<Plato[]>([])
  const [cargando, setCargando] = useState(false)
  const [fechasDisponibles, setFechasDisponibles] = useState<string[]>([])
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")
  const [programacionActual, setProgramacionActual] = useState<ProgramacionItem[]>([])
  const [programacionEditada, setProgramacionEditada] = useState<ProgramacionItem[]>([])
  const [tipoEditando, setTipoEditando] = useState<string | null>(null)
  const [mostrandoModal, setMostrandoModal] = useState(false)
  const [editandoCategoria, setEditandoCategoria] = useState<ProgramacionItem | null>(null)
  const [platoSeleccionado, setPlatoSeleccionado] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [mostrandoModalAgregar, setMostrandoModalAgregar] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState("")
  const [nuevoPlato, setNuevoPlato] = useState("")

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (sedeSeleccionada) {
      cargarFechas()
    }
  }, [sedeSeleccionada])

  useEffect(() => {
    if (sedeSeleccionada && fechaSeleccionada) {
      cargarProgramacion()
    }
  }, [sedeSeleccionada, fechaSeleccionada])

  const cargarDatos = async () => {
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

  const cargarFechas = async () => {
    const { data } = await supabase
      .from("planificacion_detalles")
      .select("fecha_texto")
      .eq("sede_id", sedeSeleccionada)
      .order("fecha_texto")

    if (data) {
      const fechasUnicas = [...new Set(data.map(f => f.fecha_texto))]
      setFechasDisponibles(fechasUnicas)
    }
  }

  const cargarProgramacion = async () => {
    setCargando(true)
    try {
      const { data } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha_texto, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .eq("fecha_texto", fechaSeleccionada)

      if (data) {
        const conNombres = data.map((item: any) => ({
          ...item,
          plato_nombre: platos.find(p => p.id === item.plato_id)?.nombre || "Desconocido",
        }))
        setProgramacionActual(conNombres)
        setProgramacionEditada([...conNombres])
      }
    } catch (error) {
      console.error("Error al cargar programación:", error)
    } finally {
      setCargando(false)
    }
  }

  const getPlatosPorCategoria = (categoria: string) => {
    const catDB = categoria.startsWith("GUARNICIÓN") ? "GUARNICIÓN" : categoria
    return platos.filter(p => p.categoria === catDB)
  }

  const abrirEditor = (item: ProgramacionItem) => {
    setEditandoCategoria(item)
    setPlatoSeleccionado(item.plato_id)
    setMostrandoModal(true)
  }

  const guardarCambio = () => {
    if (!editandoCategoria || !platoSeleccionado) return
    
    const nuevosPlatos = programacionEditada.map(item => 
      item.id === editandoCategoria.id 
        ? { ...item, plato_id: platoSeleccionado, plato_nombre: platos.find(p => p.id === platoSeleccionado)?.nombre || "" }
        : item
    )
    setProgramacionEditada(nuevosPlatos)
    setMostrandoModal(false)
    setEditandoCategoria(null)
    setPlatoSeleccionado("")
  }

  const eliminarPlato = async (id: number) => {
    if (!confirm("¿Eliminar este plato de la programación?")) return
    
    setGuardando(true)
    try {
      const { error } = await supabase
        .from("planificacion_detalles")
        .delete()
        .eq("id", id)
      
      if (error) throw error
      
      alert("✅ Plato eliminado")
      cargarProgramacion()
      router.refresh()
    } catch (error: any) {
      alert("Error al eliminar: " + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const abrirModalAgregar = () => {
    setNuevaCategoria("")
    setNuevoPlato("")
    setMostrandoModalAgregar(true)
  }

  const guardarNuevoPlato = () => {
    if (!tipoEditando || !nuevaCategoria || !nuevoPlato) return
    
    const plato = platos.find(p => p.id === nuevoPlato)
    if (!plato) return
    
    const nuevoItem: ProgramacionItem = {
      id: 0,
      fecha_texto: fechaSeleccionada,
      tipo: tipoEditando,
      categoria: nuevaCategoria,
      plato_id: plato.id,
      plato_nombre: plato.nombre,
    }
    
    setProgramacionEditada([...programacionEditada, nuevoItem])
    setMostrandoModalAgregar(false)
    setNuevaCategoria("")
    setNuevoPlato("")
  }

  const guardarTodosCambios = async () => {
    if (!confirm("¿Guardar todos los cambios realizados?")) return
    
    setGuardando(true)
    try {
      const idsOriginales = new Set(programacionActual.map(p => p.id))
      const idsEditados = new Set(programacionEditada.filter(p => p.id !== 0).map(p => p.id))
      
      const idsEliminar = [...idsOriginales].filter(id => !idsEditados.has(id))
      for (const id of idsEliminar) {
        await supabase.from("planificacion_detalles").delete().eq("id", id)
      }
      
      for (const item of programacionEditada) {
        if (item.id !== 0) {
          const original = programacionActual.find(p => p.id === item.id)
          if (original && original.plato_id !== item.plato_id) {
            await supabase
              .from("planificacion_detalles")
              .update({ plato_id: item.plato_id })
              .eq("id", item.id)
          }
        } else {
          await supabase.from("planificacion_detalles").insert({
            fecha_texto: item.fecha_texto,
            sede_id: sedeSeleccionada,
            tipo: item.tipo,
            categoria: item.categoria,
            plato_id: item.plato_id,
          })
        }
      }
      
      alert("✅ Cambios guardados exitosamente")
      cargarProgramacion()
      router.refresh()
    } catch (error: any) {
      alert("Error al guardar: " + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const cancelarCambios = () => {
    if (confirm("¿Cancelar cambios? Se perderán todas las modificaciones.")) {
      setProgramacionEditada([...programacionActual])
      setTipoEditando(null)
    }
  }

  const programacionPorTipo = programacionEditada.reduce((acc, item) => {
    if (!acc[item.tipo]) acc[item.tipo] = []
    acc[item.tipo].push(item)
    return acc
  }, {} as AgrupadoPorTipo)

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
                <span style={{ color: '#FFFFFF' }}>Editar</span>
                <span style={{ color: '#F37F21' }}> Programación</span>
              </h1>
              <p className="mt-2" style={{ color: '#C9C9C3', fontSize: '1rem' }}>
                Modifica los menús programados por día y sede.
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
      <main className="max-w-6xl mx-auto px-8 py-8">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
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
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
              Fecha
            </label>
            <select
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
              disabled={!sedeSeleccionada}
            >
              <option value="">Seleccionar fecha</option>
              {fechasDisponibles.map(fecha => (
                <option key={fecha} value={fecha}>{fecha}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {cargando && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
          </div>
        )}

        {/* Contenido principal */}
        {!cargando && fechaSeleccionada && (
          <>
            {/* Selector de tipo a editar */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#2B2B2B] mb-2">
                Tipo de menú a editar
              </label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_MENU.map(tipo => {
                  const tieneItems = programacionPorTipo[tipo.value]?.length > 0
                  const isEditing = tipoEditando === tipo.value
                  return (
                    <button
                      key={tipo.value}
                      onClick={() => setTipoEditando(isEditing ? null : tipo.value)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                        ${isEditing 
                          ? 'shadow-md ring-2 ring-offset-1 text-white' 
                          : 'opacity-80 hover:opacity-100 hover:scale-[1.02]'
                        }
                        ${!tieneItems ? 'opacity-40 cursor-not-allowed' : ''}
                      `}
                      style={{
                        background: isEditing ? tipo.color : tipo.bg,
                        color: isEditing ? "white" : tipo.color,
                        border: `1px solid ${tipo.color}40`,
                      }}
                      disabled={!tieneItems}
                    >
                      <span>{tipo.icon}</span>
                      <span className="uppercase tracking-wide">{tipo.label}</span>
                      {tieneItems && (
                        <span className="text-xs opacity-70">({programacionPorTipo[tipo.value].length})</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Vista del menú por tipo */}
            {tipoEditando && programacionPorTipo[tipoEditando] && (
              <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm mb-6">
                <div className="px-6 py-4 flex justify-between items-center" style={{ background: '#2B2B2B' }}>
                  <h2 className="text-white font-bold text-sm">
                    Editando: {TIPOS_MENU.find(t => t.value === tipoEditando)?.label}
                  </h2>
                  <button
                    onClick={abrirModalAgregar}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/20 hover:bg-white/30 text-white transition"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar plato
                  </button>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {programacionPorTipo[tipoEditando].map((item) => {
                      const catColor = CAT_COLORS[item.categoria] || { color: "#555", bg: "#f5f5f5" }
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition"
                          style={{ borderColor: `${catColor.color}30` }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span 
                              className="text-xs font-bold uppercase px-2 py-0.5 rounded-full"
                              style={{ background: catColor.bg, color: catColor.color }}
                            >
                              {item.categoria}
                            </span>
                            <button
                              onClick={() => eliminarPlato(item.id)}
                              className="text-[#6B6B65] hover:text-red-500 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-[#2B2B2B] mb-3">{item.plato_nombre}</p>
                          <button
                            onClick={() => abrirEditor(item)}
                            className="w-full text-xs py-1.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] hover:bg-gray-50 transition flex items-center justify-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Cambiar plato
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Vista previa completa */}
            {Object.keys(programacionPorTipo).length > 0 && (
              <div className="rounded-lg border border-[#E7E7E2] bg-white p-5 shadow-sm mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-[#6B6B65]" />
                  <p className="text-sm font-bold text-[#2B2B2B]">
                    Vista previa completa - Todos los tipos
                  </p>
                </div>
                <div className="space-y-4">
                  {Object.entries(programacionPorTipo).map(([tipo, items]) => {
                    const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                    return (
                      <div key={tipo}>
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="text-xs font-bold rounded-full px-3 py-1"
                            style={{ background: tipoInfo?.bg, color: tipoInfo?.color }}
                          >
                            {tipoInfo?.icon} {tipoInfo?.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item) => {
                            const catColor = CAT_COLORS[item.categoria] || { color: "#555", bg: "#f5f5f5" }
                            return (
                              <div 
                                key={item.id} 
                                className="rounded-lg border p-2 min-w-[100px]"
                                style={{ background: catColor.bg, borderColor: `${catColor.color}30` }}
                              >
                                <p className="text-[10px] font-bold uppercase" style={{ color: catColor.color }}>
                                  {item.categoria}
                                </p>
                                <p className="text-xs font-bold text-[#2B2B2B]">{item.plato_nombre}</p>
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

            {/* Botones de acción */}
            {Object.keys(programacionPorTipo).length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={cancelarCambios}
                  className="flex-1 py-3 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
                >
                  Cancelar cambios
                </button>
                <button
                  onClick={guardarTodosCambios}
                  disabled={guardando}
                  className="flex-1 py-3 rounded-lg bg-[#2B2B2B] text-white font-medium hover:bg-[#3B3B3B] transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {guardando ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {guardando ? "Guardando..." : "Guardar todos los cambios"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Estado vacío */}
        {!cargando && fechaSeleccionada && Object.keys(programacionPorTipo).length === 0 && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">No hay programación para esta fecha</p>
            <Link 
              href="/dashboard/menus/manual"
              className="inline-block mt-3 text-[#8CC63F] font-medium hover:underline"
            >
              + Programar manualmente
            </Link>
          </div>
        )}

        {/* Mensaje sin sede/fecha */}
        {!cargando && !fechaSeleccionada && sedeSeleccionada && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">Selecciona una fecha para editar</p>
          </div>
        )}
      </main>

      {/* Modal para editar plato */}
      {mostrandoModal && editandoCategoria && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#2B2B2B]">Cambiar plato</h3>
              <button onClick={() => setMostrandoModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-sm text-[#6B6B65] mb-1">
              Categoría: <span className="font-bold text-[#2B2B2B]">{editandoCategoria.categoria}</span>
            </p>
            <p className="text-sm text-[#6B6B65] mb-4">
              Actual: <span className="font-bold text-[#2B2B2B]">{editandoCategoria.plato_nombre}</span>
            </p>
            
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              Nuevo plato
            </label>
            <select
              value={platoSeleccionado}
              onChange={(e) => setPlatoSeleccionado(e.target.value)}
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent mb-4"
            >
              <option value="">Seleccionar plato</option>
              {getPlatosPorCategoria(editandoCategoria.categoria).map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setMostrandoModal(false)} 
                className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarCambio} 
                disabled={!platoSeleccionado} 
                className="flex-1 py-2.5 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-bold hover:bg-[#7AB835] transition disabled:opacity-50"
              >
                Cambiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar plato */}
      {mostrandoModalAgregar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#2B2B2B]">Agregar plato</h3>
              <button onClick={() => setMostrandoModalAgregar(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                Categoría
              </label>
              <select
                value={nuevaCategoria}
                onChange={(e) => {
                  setNuevaCategoria(e.target.value)
                  setNuevoPlato("")
                }}
                className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
              >
                <option value="">Seleccionar categoría</option>
                {TODAS_CATS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {nuevaCategoria && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                  Plato
                </label>
                <select
                  value={nuevoPlato}
                  onChange={(e) => setNuevoPlato(e.target.value)}
                  className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                >
                  <option value="">Seleccionar plato</option>
                  {getPlatosPorCategoria(nuevaCategoria).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => setMostrandoModalAgregar(false)} 
                className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarNuevoPlato} 
                disabled={!nuevaCategoria || !nuevoPlato} 
                className="flex-1 py-2.5 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-bold hover:bg-[#7AB835] transition disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Editar programación
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