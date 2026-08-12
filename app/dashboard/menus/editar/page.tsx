// app/dashboard/menus/editar/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Users,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CalendarioProgramacionRango from '@/app/dashboard/menus/editar/components/CalendarioProgramacionRango'
import TablaProgramacionMenu, { DiaProgramado } from '@/app/dashboard/menus/editar/components/TablaProgramacionMenus'
import ModalEditarPlato from '@/app/dashboard/menus/editar/components/ModalEditarPlato'
import MenusNav from '@/app/dashboard/menus/components/MenusNav'

// ─────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────
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
  fecha: string
  tipo: string
  categoria: string
  plato_id: string
  plato_nombre: string
}

interface ComensalesItem {
  id?: number
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

const formatearFechaLegible = (fechaISO: string): string => {
  const fecha = new Date(fechaISO + 'T00:00:00')
  return fecha.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function EditarProgramacion() {
  const router = useRouter()
  const supabase = createClient()
  
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [platos, setPlatos] = useState<Plato[]>([])
  const [cargando, setCargando] = useState(false)
  const [rangoFechas, setRangoFechas] = useState<{ inicio: string; fin: string }>({ inicio: '', fin: '' })
  const [programacionActual, setProgramacionActual] = useState<ProgramacionItem[]>([])
  const [programacionEditada, setProgramacionEditada] = useState<ProgramacionItem[]>([])
  const [comensalesActual, setComensalesActual] = useState<ComensalesItem[]>([])
  const [comensalesEditados, setComensalesEditados] = useState<ComensalesItem[]>([])
  
  // ═══ ESTADO PARA EL TIPO QUE SE ESTÁ EDITANDO ═══
  const [tipoEditando, setTipoEditando] = useState<string | null>(null)
  
  const [mostrandoModal, setMostrandoModal] = useState(false)
  const [editandoCategoria, setEditandoCategoria] = useState<ProgramacionItem | null>(null)
  const [platoSeleccionado, setPlatoSeleccionado] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [mostrandoModalAgregar, setMostrandoModalAgregar] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState("")
  const [nuevoPlato, setNuevoPlato] = useState("")
  
  const [mostrandoModalComensales, setMostrandoModalComensales] = useState(false)
  const [comensalEditando, setComensalEditando] = useState<ComensalesItem | null>(null)
  const [nuevoValorComensales, setNuevoValorComensales] = useState("")

  const [mostrandoModalRepeticion, setMostrandoModalRepeticion] = useState(false)
  const [platoRepetidoInfo, setPlatoRepetidoInfo] = useState<{
    platoId: string
    platoNombre: string
    categoria: string
    tipo: string
    fechasRepetidas: string[]
    itemOriginal?: ProgramacionItem
  } | null>(null)

  const [mostrarFiltros, setMostrarFiltros] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (sedeSeleccionada && rangoFechas.inicio && rangoFechas.fin) {
      cargarProgramacionRango()
    }
  }, [sedeSeleccionada, rangoFechas])

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

  const cargarProgramacionRango = async () => {
    setCargando(true)
    try {
      const { data } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .gte("fecha", rangoFechas.inicio)
        .lte("fecha", rangoFechas.fin)

      if (data) {
        const conNombres = data.map((item: any) => ({
          ...item,
          plato_nombre: platos.find(p => p.id === item.plato_id)?.nombre || "Desconocido",
        }))
        setProgramacionActual(conNombres)
        setProgramacionEditada([...conNombres])
      } else {
        setProgramacionActual([])
        setProgramacionEditada([])
      }

      const { data: comData } = await supabase
        .from("planificacion_comensales")
        .select("id, fecha, sede_id, tipo, comensales")
        .eq("sede_id", sedeSeleccionada)
        .gte("fecha", rangoFechas.inicio)
        .lte("fecha", rangoFechas.fin)

      if (comData) {
        setComensalesActual(comData)
        setComensalesEditados([...comData])
      } else {
        setComensalesActual([])
        setComensalesEditados([])
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

  const validarRepeticionPlato = (
    platoId: string,
    tipo: string,
    categoria: string,
    fechaActual: string,
    itemActual?: ProgramacionItem
  ): { seRepite: boolean; fechas: string[] } => {
    const itemsSimilares = programacionEditada.filter(item => {
      const mismoTipo = item.tipo === tipo
      const mismaCategoria = item.categoria === categoria
      const mismoPlato = item.plato_id === platoId
      const diferenteFecha = item.fecha !== fechaActual
      const diferenteItem = itemActual ? item.id !== itemActual.id : true
      
      return mismoTipo && mismaCategoria && mismoPlato && diferenteFecha && diferenteItem
    })

    if (itemsSimilares.length > 0) {
      return {
        seRepite: true,
        fechas: itemsSimilares.map(item => item.fecha)
      }
    }
    return { seRepite: false, fechas: [] }
  }

  // ─── Función para editar plato desde la tabla ───
  const handleEditPlatoFromTable = (fecha: string, tipo: string, categoria: string, platoActual: string) => {
    const item = programacionEditada.find(
      p => p.fecha === fecha && p.tipo === tipo && p.categoria === categoria
    )
    if (item) {
      setEditandoCategoria(item)
      setPlatoSeleccionado(item.plato_id)
      setMostrandoModal(true)
    } else {
      console.warn('No se encontró el plato para editar:', { fecha, tipo, categoria })
    }
  }

  // ─── Función para editar comensales desde la tabla ───
  const handleEditComensalesFromTable = (fecha: string, tipo: string, valor: number) => {
    const comensal = comensalesEditados.find(
      c => c.fecha === fecha && c.tipo === tipo
    )
    if (comensal) {
      setComensalEditando(comensal)
      setNuevoValorComensales(comensal.comensales.toString())
      setMostrandoModalComensales(true)
    } else {
      console.warn('No se encontraron comensales para editar:', { fecha, tipo })
    }
  }

  const guardarCambio = () => {
    if (!editandoCategoria || !platoSeleccionado) return
    
    const { seRepite, fechas } = validarRepeticionPlato(
      platoSeleccionado,
      editandoCategoria.tipo,
      editandoCategoria.categoria,
      editandoCategoria.fecha,
      editandoCategoria
    )
    
    if (seRepite) {
      const plato = platos.find(p => p.id === platoSeleccionado)
      setPlatoRepetidoInfo({
        platoId: platoSeleccionado,
        platoNombre: plato?.nombre || '',
        categoria: editandoCategoria.categoria,
        tipo: editandoCategoria.tipo,
        fechasRepetidas: fechas,
        itemOriginal: editandoCategoria
      })
      setMostrandoModalRepeticion(true)
      return
    }
    
    aplicarCambioPlato()
  }

  const aplicarCambioPlato = () => {
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
    setMostrandoModalRepeticion(false)
  }

  const guardarNuevoPlato = () => {
    if (!nuevaCategoria || !nuevoPlato) return
    
    const plato = platos.find(p => p.id === nuevoPlato)
    if (!plato) return
    
    // Usar el tipo que se está editando, o el primero disponible
    const tipo = tipoEditando || "estandar"
    
    const fechasConRepeticion: string[] = []
    programacionEditada.forEach(item => {
      if (item.tipo === tipo && 
          item.categoria === nuevaCategoria && 
          item.plato_id === nuevoPlato) {
        fechasConRepeticion.push(item.fecha)
      }
    })
    
    if (fechasConRepeticion.length > 0) {
      setPlatoRepetidoInfo({
        platoId: nuevoPlato,
        platoNombre: plato.nombre,
        categoria: nuevaCategoria,
        tipo: tipo,
        fechasRepetidas: fechasConRepeticion
      })
      setMostrandoModalRepeticion(true)
      return
    }
    
    aplicarNuevoPlato()
  }

  const aplicarNuevoPlato = () => {
    if (!nuevaCategoria || !nuevoPlato) return
    
    const plato = platos.find(p => p.id === nuevoPlato)
    if (!plato) return
    
    const tipo = tipoEditando || "estandar"
    
    const nuevoItem: ProgramacionItem = {
      id: 0,
      fecha: rangoFechas.inicio,
      tipo: tipo,
      categoria: nuevaCategoria,
      plato_id: plato.id,
      plato_nombre: plato.nombre,
    }
    
    setProgramacionEditada([...programacionEditada, nuevoItem])
    setMostrandoModalAgregar(false)
    setNuevaCategoria("")
    setNuevoPlato("")
    setMostrandoModalRepeticion(false)
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
      cargarProgramacionRango()
      router.refresh()
    } catch (error: any) {
      alert("Error al eliminar: " + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const guardarCambioComensales = () => {
    if (!comensalEditando) return
    
    const valor = parseInt(nuevoValorComensales)
    if (isNaN(valor) || valor < 0) {
      alert("Ingresa un número válido")
      return
    }

    const nuevosComensales = comensalesEditados.map(c => 
      c.id === comensalEditando.id 
        ? { ...c, comensales: valor }
        : c
    )
    setComensalesEditados(nuevosComensales)
    setMostrandoModalComensales(false)
    setComensalEditando(null)
    setNuevoValorComensales("")
  }

  const agregarComensalesTipo = (tipo: string) => {
    const nuevo: ComensalesItem = {
      fecha: rangoFechas.inicio,
      sede_id: sedeSeleccionada,
      tipo,
      comensales: 0
    }
    setComensalesEditados([...comensalesEditados, nuevo])
  }

  const abrirModalAgregar = () => {
    setNuevaCategoria("")
    setNuevoPlato("")
    setMostrandoModalAgregar(true)
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
          const fechas = obtenerFechasRango()
          for (const fecha of fechas) {
            await supabase.from("planificacion_detalles").insert({
              fecha: fecha,
              sede_id: sedeSeleccionada,
              tipo: item.tipo,
              categoria: item.categoria,
              plato_id: item.plato_id,
            })
          }
        }
      }

      const comensalesParaGuardar = comensalesEditados.map(c => ({
        fecha: c.fecha,
        sede_id: c.sede_id,
        tipo: c.tipo,
        comensales: c.comensales
      }))

      if (comensalesParaGuardar.length > 0) {
        const { error: comError } = await supabase
          .from("planificacion_comensales")
          .upsert(comensalesParaGuardar, { onConflict: "fecha,sede_id,tipo" })
        
        if (comError) throw comError
      }
      
      alert("✅ Cambios guardados exitosamente")
      cargarProgramacionRango()
      router.refresh()
    } catch (error: any) {
      alert("Error al guardar: " + error.message)
    } finally {
      setGuardando(false)
    }
  }

  const obtenerFechasRango = (): string[] => {
    const fechas: string[] = []
    const inicio = new Date(rangoFechas.inicio + 'T00:00:00')
    const fin = new Date(rangoFechas.fin + 'T00:00:00')
    
    const fechaActual = new Date(inicio)
    while (fechaActual <= fin) {
      const y = fechaActual.getFullYear()
      const m = String(fechaActual.getMonth() + 1).padStart(2, '0')
      const d = String(fechaActual.getDate()).padStart(2, '0')
      fechas.push(`${y}-${m}-${d}`)
      fechaActual.setDate(fechaActual.getDate() + 1)
    }
    return fechas
  }

  const cancelarCambios = () => {
    if (confirm("¿Cancelar cambios? Se perderán todas las modificaciones.")) {
      setProgramacionEditada([...programacionActual])
      setComensalesEditados([...comensalesActual])
    }
  }

  // ─── Preparar datos para la tabla ───
  const platosProgramados: DiaProgramado[] = useMemo(() => {
    if (programacionEditada.length === 0) return []

    const porFechaISO = programacionEditada.reduce((acc, item) => {
      if (!acc[item.fecha]) {
        acc[item.fecha] = {
          fecha: formatearFechaLegible(item.fecha),
          fechaISO: item.fecha,
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

    comensalesEditados.forEach(c => {
      if (porFechaISO[c.fecha]) {
        porFechaISO[c.fecha].comensalesPorTipo![c.tipo] = c.comensales
      }
    })

    return Object.entries(porFechaISO)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, valor]) => valor)
  }, [programacionEditada, comensalesEditados])

  const totalDias = platosProgramados.length
  const totalPlatos = programacionEditada.length
  const tiposPresentes = [...new Set(programacionEditada.map(p => p.tipo))]
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
                <span style={{ color: '#FFFFFF' }}>Editar</span>
                <span style={{ color: '#F37F21' }}> Programación</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
                Modifica los menús y comensales programados por rango de fechas.
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
        <div className="mb-6 rounded-lg border border-[#E7E7E2] bg-white shadow-sm overflow-visible">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-3 hover:bg-[#F5F5F0] transition rounded-t-lg"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#F37F21]" />
              <span className="font-bold text-[#2B2B2B] text-sm">Filtros de búsqueda</span>
              {(rangoFechas.inicio || rangoFechas.fin || sedeSeleccionada) && (
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
                      setRangoFechas({ inicio: '', fin: '' })
                      setProgramacionActual([])
                      setProgramacionEditada([])
                      setComensalesActual([])
                      setComensalesEditados([])
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
                    Rango de fechas
                  </label>
                  {sedeSeleccionada ? (
                    <CalendarioProgramacionRango
                      sedeId={sedeSeleccionada}
                      onFechaSeleccionada={(fechas) => {
                        setRangoFechas(fechas)
                        setProgramacionActual([])
                        setProgramacionEditada([])
                        setComensalesActual([])
                        setComensalesEditados([])
                      }}
                      fechaSeleccionada={rangoFechas}
                    />
                  ) : (
                    <div className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#9A9A93] bg-gray-50">
                      Selecciona una sede primero
                    </div>
                  )}
                  {rangoFechas.inicio && rangoFechas.fin && (
                    <p className="text-xs text-[#8CC63F] mt-1">
                      ✓ Rango: {formatearFechaLegible(rangoFechas.inicio)} - {formatearFechaLegible(rangoFechas.fin)}
                    </p>
                  )}
                </div>

                <div className="flex items-end gap-2">
                  {sedeSeleccionada && rangoFechas.inicio && rangoFechas.fin && (
                    <div className="w-full p-3 bg-[#F5FBF0] rounded-lg border border-[#8CC63F]/20">
                      <p className="text-sm text-[#2B2B2B]">
                        <span className="font-semibold">{sedeInfo?.nombre}</span>
                        <span className="text-[#6B6B65]"> · {totalDias} días</span>
                      </p>
                      <p className="text-xs text-[#6B6B65]">
                        {totalPlatos} platos · {tiposPresentes.length} tipos
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {!sedeSeleccionada && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Building className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">Selecciona una sede para comenzar</p>
          </div>
        )}

        {sedeSeleccionada && (!rangoFechas.inicio || !rangoFechas.fin) && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">Selecciona un rango de fechas en el calendario</p>
          </div>
        )}

        {cargando && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
          </div>
        )}

        {!cargando && sedeSeleccionada && rangoFechas.inicio && rangoFechas.fin && programacionEditada.length === 0 && (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Calendar className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65]">No hay programación en este rango de fechas</p>
            <p className="text-xs text-[#9A9A93] mt-1">Intenta con otro rango o sede</p>
          </div>
        )}

        {!cargando && platosProgramados.length > 0 && (
          <div className="space-y-6">
            {/* Resultados */}
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

            {/* ═══ TABLA CON EDICIÓN ═══ */}
            <TablaProgramacionMenu
              platosProgramados={platosProgramados}
              mostrarComensales={true}
              titulo=""
              onEditPlato={handleEditPlatoFromTable}
              onEditComensales={handleEditComensalesFromTable}
            />

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3">
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

            {/* Footer de estadísticas */}
            <div className="rounded-lg border border-[#E7E7E2] bg-white p-4 flex flex-wrap justify-between items-center gap-2">
              <p className="text-xs text-[#6B6B65] flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Rango: <strong className="text-[#2B2B2B]">{formatearFechaLegible(rangoFechas.inicio)}</strong>
                <span className="text-[#6B6B65]">al</span>
                <strong className="text-[#2B2B2B]">{formatearFechaLegible(rangoFechas.fin)}</strong>
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

      {/* ─── MODALES ─── */}

      {/* Modal para editar plato - Nuevo diseño */}
      <ModalEditarPlato
        isOpen={mostrandoModal}
        onClose={() => setMostrandoModal(false)}
        platosDisponibles={editandoCategoria ? getPlatosPorCategoria(editandoCategoria.categoria) : []}
        categoria={editandoCategoria?.categoria || ""}
        fechaLegible={editandoCategoria ? formatearFechaLegible(editandoCategoria.fecha) : ""}
        platoActual={editandoCategoria?.plato_id || ""}
        platoActualNombre={editandoCategoria?.plato_nombre || ""}
        platoSeleccionado={platoSeleccionado}
        onPlatoChange={setPlatoSeleccionado}
        onGuardar={guardarCambio}
        isLoading={guardando}
      />

      {/* Modal para comensales */}
      {mostrandoModalComensales && comensalEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#2B2B2B]">Editar comensales</h3>
              <button onClick={() => setMostrandoModalComensales(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-[#6B6B65] mb-1">
                Tipo: <span className="font-bold text-[#2B2B2B]">{comensalEditando.tipo}</span>
              </p>
              <p className="text-sm text-[#6B6B65] mb-3">
                Fecha: <span className="font-bold text-[#2B2B2B]">{formatearFechaLegible(comensalEditando.fecha)}</span>
              </p>
              
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                Cantidad de comensales
              </label>
              <input
                type="number"
                min="0"
                value={nuevoValorComensales}
                onChange={(e) => setNuevoValorComensales(e.target.value)}
                className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                placeholder="0"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setMostrandoModalComensales(false)} 
                className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={guardarCambioComensales} 
                className="flex-1 py-2.5 rounded-lg bg-[#F37F21] text-white font-bold hover:bg-[#C4600F] transition"
              >
                Guardar
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
            
            {/* Selector de tipo */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
                Tipo de menú
              </label>
              <select
                value={tipoEditando || ""}
                onChange={(e) => setTipoEditando(e.target.value)}
                className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
              >
                <option value="">Seleccionar tipo</option>
                {TIPOS_MENU.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.icon} {tipo.label}
                  </option>
                ))}
              </select>
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
                disabled={!tipoEditando || !nuevaCategoria || !nuevoPlato} 
                className="flex-1 py-2.5 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-bold hover:bg-[#7AB835] transition disabled:opacity-50"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de repetición */}
      {mostrandoModalRepeticion && platoRepetidoInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-[#F37F21] flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-[#2B2B2B] mb-1">Plato repetido en el rango</h3>
                <p className="text-sm text-[#6B6B65]">
                  El plato <span className="font-bold text-[#2B2B2B]">{platoRepetidoInfo.platoNombre}</span> 
                   ya está programado en las siguientes fechas:
                </p>
                <ul className="mt-2 space-y-1">
                  {platoRepetidoInfo.fechasRepetidas.map((fecha, idx) => (
                    <li key={idx} className="text-sm text-[#6B6B65] flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F37F21]" />
                      {formatearFechaLegible(fecha)}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-medium text-[#2B2B2B]">
                  ¿Aún así quieres repetir este plato?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setMostrandoModalRepeticion(false)
                  setPlatoRepetidoInfo(null)
                }}
                className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (platoRepetidoInfo.itemOriginal) {
                    aplicarCambioPlato()
                  } else {
                    aplicarNuevoPlato()
                  }
                }}
                className="flex-1 py-2.5 rounded-lg bg-[#F37F21] text-white font-bold hover:bg-[#C4600F] transition"
              >
                Sí, repetir plato
              </button>
            </div>
          </div>
        </div>
      )}

      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Editar programación por rango
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