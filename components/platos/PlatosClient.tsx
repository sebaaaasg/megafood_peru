'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Loader2, 
  FileSpreadsheet,
  Edit,
  Trash2,
  X,
  Soup,
  Drumstick,
  Wheat,
  CakeSlice,
  CupSoda,
  Droplets,
  MapPin,
  ChevronDown,
  Search
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Plato, Insumo, Sede, Categoria, RecetaLinea } from '@/lib/supabase/platos'
import * as XLSX from 'xlsx'
import BarraSuperior from '@/app/dashboard/components/BarraSuperior'
import EstacionesDrawer from '@/app/dashboard/components/EstacionesDrawer'

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'
const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'

// ─── Interfaces ────────────────────────────────────────
interface PlatosClientProps {
  initialPlatos: Plato[]
  initialInsumos: Insumo[]
  initialSedes: Sede[]
  isAdmin: boolean
}

// ─── Constantes ────────────────────────────────────────
type CategoriaKey = "ENTRADA" | "FONDO" | "GUARNICIÓN" | "POSTRE" | "BEBIBLE" | "SALSA"

const CATS: { key: CategoriaKey; label: string; color: string; bg: string; icon: any }[] = [
  { key: "ENTRADA",    label: "Entrada",    color: "#2d5a1e", bg: "#eaf3de", icon: Soup },
  { key: "FONDO",      label: "Fondo",      color: "#991b1b", bg: "#fef2f2", icon: Drumstick },
  { key: "GUARNICIÓN", label: "Guarnición", color: "#c2410c", bg: "#fff7ed", icon: Wheat },
  { key: "POSTRE",     label: "Postre",     color: "#6d28d9", bg: "#f5f3ff", icon: CakeSlice },
  { key: "BEBIBLE",    label: "Bebible",    color: "#1e40af", bg: "#eff6ff", icon: CupSoda },
  { key: "SALSA",      label: "Salsa",      color: "#b45309", bg: "#fffbeb", icon: Droplets },
]

const SUBCATS_ENTRADA = [
  { value: "FRIO", label: "Frío" },
  { value: "CALIENTE", label: "Caliente" },
]

const CAT_ALIAS: Record<string, CategoriaKey> = {
  "CARNICO": "FONDO",
  "FONDO": "FONDO",
  "GUARNICION": "GUARNICIÓN",
  "ENTRADA": "ENTRADA",
  "POSTRE": "POSTRE",
  "BEBIBLE": "BEBIBLE",
  "SALSA": "SALSA",
  "GUARNICIÓN": "GUARNICIÓN",
}

const EMPTY_LINEA: RecetaLinea = { insumo_id: "", cantidad: 0 }

function normalizarCat(raw: string): CategoriaKey | null {
  const up = raw.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return CAT_ALIAS[up] ?? null
}

function normalizarNombre(s: string) {
  return s.toUpperCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function convertirUnidad(cantidad: number, unidadOrigen: string, unidadDestino: string): number {
  const origen = unidadOrigen.toLowerCase().trim()
  const destino = unidadDestino.toLowerCase().trim()

  const unidadesMap: Record<string, string> = {
    'ml': 'ml', 'mililitro': 'ml', 'mililitros': 'ml',
    'l': 'l', 'litro': 'l', 'litros': 'l', 'lt': 'l',
    'g': 'g', 'gr': 'g', 'gram': 'g', 'gramo': 'g', 'gramos': 'g',
    'kg': 'kg', 'kilogramo': 'kg', 'kilogramos': 'kg', 'kilo': 'kg',
  }

  const orig = unidadesMap[origen] || origen
  const dest = unidadesMap[destino] || destino

  if (orig === dest || !orig || !dest) return cantidad

  if (orig === 'ml' && dest === 'l') return cantidad / 1000
  if (orig === 'l' && dest === 'ml') return cantidad * 1000
  if (orig === 'g' && dest === 'kg') return cantidad / 1000
  if (orig === 'kg' && dest === 'g') return cantidad * 1000

  return cantidad
}

// ─── Componente Principal ──────────────────────────────
export default function PlatosClient({
  initialPlatos,
  initialInsumos,
  initialSedes,
  isAdmin
}: PlatosClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // Estados
  const [platos, setPlatos] = useState<Plato[]>(initialPlatos)
  const [insumos] = useState<Insumo[]>(initialInsumos)
  const [sedes] = useState<Sede[]>(initialSedes)
  const [catActiva, setCatActiva] = useState<CategoriaKey>("ENTRADA")
  const [sedeActiva, setSedeActiva] = useState<string>("")
  const [loading, setLoading] = useState(false)
  
  // 🔍 Buscador
  const [searchTerm, setSearchTerm] = useState("")

  // Estado del formulario
  const [nombre, setNombre] = useState("")
  const [subcategoria, setSubcategoria] = useState("")
  const [lineas, setLineas] = useState<RecetaLinea[]>([{ ...EMPTY_LINEA }])

  // Estado de edición
  const [modalAbierto, setModalAbierto] = useState(false)
  const [platoEditando, setPlatoEditando] = useState<Plato | null>(null)
  const [lineasEdit, setLineasEdit] = useState<RecetaLinea[]>([{ ...EMPTY_LINEA }])
  const [nombreEdit, setNombreEdit] = useState("")
  const [subcategoriaEdit, setSubcategoriaEdit] = useState("")
  const [saving, setSaving] = useState(false)

  // Estado de importación
  const [modalImport, setModalImport] = useState(false)
  const [importStep, setImportStep] = useState<"upload" | "preview" | "importing" | "done">("upload")
  const [platosImport, setPlatosImport] = useState<any[]>([])
  const [erroresImport, setErroresImport] = useState<string[]>([])
  const importInputRef = useRef<HTMLInputElement>(null)

  // Sesión, para el drawer de estaciones y el chip de usuario.
  const [userRole, setUserRole] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('Usuario')
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    const cargarSesion = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()
      setUserRole(profile?.role ?? null)
      const nombreSesion = profile?.full_name || user.email?.split('@')[0] || 'Usuario'
      setDisplayName(nombreSesion.charAt(0).toUpperCase() + nombreSesion.slice(1))
    }
    cargarSesion()
  }, [supabase])

  // Establecer sede activa inicial
  useEffect(() => {
    if (sedes.length > 0 && !sedeActiva) {
      setSedeActiva(sedes[0].id)
    }
  }, [sedes])

  // ── Helpers de líneas ──
  const setLinea = (i: number, field: keyof RecetaLinea, val: string | number) =>
    setLineas(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const addLinea = () => setLineas(prev => [...prev, { ...EMPTY_LINEA }])
  const removeLinea = (i: number) => setLineas(prev => prev.filter((_, idx) => idx !== i))

  const setLineaEdit = (i: number, field: keyof RecetaLinea, val: string | number) =>
    setLineasEdit(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l))

  const addLineaEdit = () => setLineasEdit(prev => [...prev, { ...EMPTY_LINEA }])
  const removeLineaEdit = (i: number) => setLineasEdit(prev => prev.filter((_, idx) => idx !== i))

  // ── Guardar plato nuevo ──
  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    if (!sedeActiva) {
      alert("Selecciona una sede antes de crear el plato")
      return
    }
    const lineasValidas = lineas.filter(l => l.insumo_id && l.cantidad > 0)
    setLoading(true)

    try {
      const { data: platoCreado, error } = await supabase
        .from("platos")
        .insert({
          nombre: nombre.toUpperCase(),
          categoria: catActiva,
          subcategoria: catActiva === "ENTRADA" ? subcategoria || null : null,
        })
        .select("id")
        .single()

      if (error || !platoCreado) {
        alert("Error al guardar: " + error?.message)
        setLoading(false)
        return
      }

      if (lineasValidas.length > 0) {
        const { error: errR } = await supabase.from("recetas").insert(
          lineasValidas.map(l => ({
            plato_id: platoCreado.id,
            insumo_id: l.insumo_id,
            cantidad: l.cantidad,
            sede_id: sedeActiva,
          }))
        )
        if (errR) alert("Plato guardado pero error en receta: " + errR.message)
      }

      setNombre("")
      setSubcategoria("")
      setLineas([{ ...EMPTY_LINEA }])
      
      // Recargar platos
      const { data } = await supabase
        .from("platos")
        .select(`
          id,
          nombre,
          categoria,
          subcategoria,
          recetas!fk_recetas_plato (
            cantidad,
            insumo_id,
            sede_id,
            insumos!fk_recetas_insumo ( nombre, unidad )
          )
        `)
        .order("nombre")
      
      if (data) setPlatos(data as unknown as Plato[])
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  // ── Guardar edición ──
  const guardarEdicion = async () => {
    if (!platoEditando || !sedeActiva) return
    setSaving(true)

    try {
      const { error: errP } = await supabase
        .from("platos")
        .update({
          nombre: nombreEdit.toUpperCase(),
          categoria: platoEditando.categoria,
          subcategoria: platoEditando.categoria === "ENTRADA" ? subcategoriaEdit || null : null,
        })
        .eq("id", platoEditando.id)

      if (errP) {
        alert("Error al actualizar: " + errP.message)
        setSaving(false)
        return
      }

      await supabase
        .from("recetas")
        .delete()
        .eq("plato_id", platoEditando.id)
        .eq("sede_id", sedeActiva)

      const lineasValidas = lineasEdit.filter(l => l.insumo_id && l.cantidad > 0)
      if (lineasValidas.length > 0) {
        await supabase.from("recetas").insert(
          lineasValidas.map(l => ({
            plato_id: platoEditando.id,
            insumo_id: l.insumo_id,
            cantidad: l.cantidad,
            sede_id: sedeActiva,
          }))
        )
      }

      setModalAbierto(false)
      setPlatoEditando(null)
      setLineasEdit([{ ...EMPTY_LINEA }])
      setSubcategoriaEdit("")

      // Recargar platos
      const { data } = await supabase
        .from("platos")
        .select(`
          id,
          nombre,
          categoria,
          subcategoria,
          recetas!fk_recetas_plato (
            cantidad,
            insumo_id,
            sede_id,
            insumos!fk_recetas_insumo ( nombre, unidad )
          )
        `)
        .order("nombre")
      
      if (data) setPlatos(data as unknown as Plato[])
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      alert("Error al guardar cambios")
    } finally {
      setSaving(false)
    }
  }

  // ── Borrar plato ──
  const borrar = async (id: string, nombrePlato: string) => {
    if (!confirm(`¿Eliminar "${nombrePlato}"? Esto borra el plato y sus recetas en TODAS las sedes.`)) return
    const { error } = await supabase.from("platos").delete().eq("id", id)
    if (error) alert("Error: " + error.message)
    else {
      const { data } = await supabase
        .from("platos")
        .select(`
          id,
          nombre,
          categoria,
          subcategoria,
          recetas!fk_recetas_plato (
            cantidad,
            insumo_id,
            sede_id,
            insumos!fk_recetas_insumo ( nombre, unidad )
          )
        `)
        .order("nombre")
      
      if (data) setPlatos(data as unknown as Plato[])
      router.refresh()
    }
  }

  // ── Abrir modal de edición ──
  const abrirModalEdicion = (plato: Plato) => {
    const recetaSede = plato.recetas.filter(r => r.sede_id === sedeActiva)
    setPlatoEditando(plato)
    setNombreEdit(plato.nombre)
    setSubcategoriaEdit(plato.subcategoria ?? "")
    setLineasEdit(
      recetaSede.length > 0
        ? recetaSede.map(r => ({ insumo_id: r.insumo_id, cantidad: r.cantidad }))
        : [{ ...EMPTY_LINEA }]
    )
    setModalAbierto(true)
  }

  // ── Importación Excel ──
  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" })

      const errs: string[] = []
      const platosMap = new Map<string, any>()

      rows.forEach((row, idx) => {
        const fila = idx + 2
        const nombre = String(row["NOMBRE_PLATO"] || row["nombre_plato"] || "").trim()
        const catRaw = String(row["CATEGORIA"] || row["categoria"] || "").trim()
        const subcat = String(row["SUBCATEGORIA"] || row["subcategoria"] || "").trim().toUpperCase()
        const insumoNombre = String(row["INSUMO"] || row["insumo"] || "").trim()
        const cantidadRaw = row["CANTIDAD"] || row["cantidad"] || ""
        const unidadRaw = String(row["UNIDAD"] || row["unidad"] || "").trim()
        const sedeRaw = String(row["SEDE"] || row["sede"] || "").trim()

        if (!nombre) { errs.push(`Fila ${fila}: NOMBRE_PLATO vacío`); return }

        const cat = normalizarCat(catRaw)
        if (!cat) { errs.push(`Fila ${fila}: Categoría "${catRaw}" no válida`); return }

        let sedeIdResuelta = sedeActiva
        let sedeNombreResuelta = sedes.find(s => s.id === sedeActiva)?.nombre || ""
        if (sedeRaw) {
          const sedeMatch = sedes.find(s => normalizarNombre(s.nombre) === normalizarNombre(sedeRaw))
          if (sedeMatch) {
            sedeIdResuelta = sedeMatch.id
            sedeNombreResuelta = sedeMatch.nombre
          } else {
            errs.push(`Fila ${fila}: Sede "${sedeRaw}" no encontrada, se usó la sede activa`)
          }
        }
        if (!sedeIdResuelta) { errs.push(`Fila ${fila}: no hay sede activa ni columna SEDE válida`); return }

        const cantidad = parseFloat(String(cantidadRaw).replace(",", "."))
        const key = `${nombre.toUpperCase()}::${cat}::${sedeIdResuelta}`

        if (!platosMap.has(key)) {
          platosMap.set(key, {
            nombre: nombre.toUpperCase(),
            categoria: cat,
            subcategoria: subcat || undefined,
            sede_id: sedeIdResuelta,
            sede_nombre: sedeNombreResuelta,
            lineas: [],
            decisiones: {},
          })
        }

        const plato = platosMap.get(key)!

        if (insumoNombre) {
          const insumoEncontrado = insumos.find(
            ins => normalizarNombre(ins.nombre) === normalizarNombre(insumoNombre)
          )

          let cantidadFinal = cantidad
          if (insumoEncontrado && unidadRaw && !isNaN(cantidad)) {
            cantidadFinal = convertirUnidad(cantidad, unidadRaw, insumoEncontrado.unidad)
            cantidadFinal = Math.round(cantidadFinal * 1000) / 1000
          }

          const linea = {
            insumo_nombre: insumoNombre,
            cantidad: cantidadFinal,
            insumo_id: insumoEncontrado?.id,
            estado: insumoEncontrado ? "ok" : "no_encontrado",
            unidad_importada: unidadRaw,
          }
          plato.lineas.push(linea)
          if (!insumoEncontrado) {
            plato.decisiones[insumoNombre] = "pendiente"
          }
        }
      })

      setErroresImport(errs)
      setPlatosImport(Array.from(platosMap.values()))
      setImportStep("preview")
    }
    reader.readAsArrayBuffer(file)
  }

  const ejecutarImportacion = async () => {
    setImportStep("importing")

    const platosExistentes = new Map<string, string>()
    platos.forEach(p => platosExistentes.set(`${p.nombre}::${p.categoria}`, p.id))

    for (const plato of platosImport) {
      const claveExistente = `${plato.nombre}::${plato.categoria}`
      let platoId = platosExistentes.get(claveExistente)

      if (!platoId) {
        const { data: platoCreado, error: errPlato } = await supabase
          .from("platos")
          .insert({
            nombre: plato.nombre,
            categoria: plato.categoria,
            subcategoria: plato.categoria === "ENTRADA" ? (plato.subcategoria || null) : null,
          })
          .select("id")
          .single()

        if (errPlato || !platoCreado) {
          console.error("Error importando:", plato.nombre, errPlato?.message)
          continue
        }
        platoId = platoCreado.id
        platosExistentes.set(claveExistente, platoId as string)
      }

      await supabase
        .from("recetas")
        .delete()
        .eq("plato_id", platoId as string)
        .eq("sede_id", plato.sede_id)

      const lineasValidas = plato.lineas.filter(
        (l: any) => l.insumo_id && l.cantidad > 0 && plato.decisiones[l.insumo_nombre] !== "omitir"
      )

      if (lineasValidas.length > 0) {
        await supabase.from("recetas").insert(
          lineasValidas.map((l: any) => ({
            plato_id: platoId,
            insumo_id: l.insumo_id!,
            cantidad: l.cantidad,
            sede_id: plato.sede_id,
          }))
        )
      }
    }

    // Recargar platos
    const { data } = await supabase
      .from("platos")
      .select(`
        id,
        nombre,
        categoria,
        subcategoria,
        recetas!fk_recetas_plato (
          cantidad,
          insumo_id,
          sede_id,
          insumos!fk_recetas_insumo ( nombre, unidad )
        )
      `)
      .order("nombre")
    
    if (data) setPlatos(data as unknown as Plato[])
    router.refresh()
    setImportStep("done")
  }

  const cerrarModalImport = () => {
    setModalImport(false)
    setImportStep("upload")
    setPlatosImport([])
    setErroresImport([])
  }

  const toggleDecisionImport = (platoIdx: number, insumoNombre: string) => {
    setPlatosImport(prev => prev.map((p, i) => {
      if (i !== platoIdx) return p
      const curr = p.decisiones[insumoNombre]
      return { ...p, decisiones: { ...p.decisiones, [insumoNombre]: curr === "omitir" ? "pendiente" : "omitir" } }
    }))
  }

  const omitirTodosImport = () => {
    setPlatosImport(prev => prev.map(p => {
      const nuevas = { ...p.decisiones }
      Object.keys(nuevas).forEach(k => { nuevas[k] = "omitir" })
      return { ...p, decisiones: nuevas }
    }))
  }

  const catActual = CATS.find(c => c.key === catActiva)!
  
  // 🔍 Filtrar platos por categoría activa y búsqueda
  const platosDeCat = platos.filter(p => {
    const matchCategoria = p.categoria === catActiva
    const matchSearch = searchTerm.trim() === "" || 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim())
    return matchCategoria && matchSearch
  })
  
  const sedeActualNombre = sedes.find(s => s.id === sedeActiva)?.nombre || ""
  const hayPendientes = platosImport.some((p: any) => Object.values(p.decisiones).some((d: any) => d === "pendiente"))
  const totalNoEncontrados = platosImport.reduce((acc: number, p: any) => acc + Object.keys(p.decisiones).length, 0)

  // ── Render ──
  return (
 <div className="min-h-screen w-full" style={{ background: FONDO, color: OSCURO, fontFamily: ARCHIVO }}>
      {loading && (
 <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
 <div className="bg-white p-6 flex items-center gap-3">
 <Loader2 className="w-6 h-6 animate-spin text-[#8CC63F]" />
 <span className="text-gray-700">Procesando...</span>
          </div>
        </div>
      )}

      <EstacionesDrawer
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        role={userRole}
        displayName={displayName}
      />

      <BarraSuperior
        displayName={displayName}
        menuAbierto={menuAbierto}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      {/* Encabezado */}
      <div className="flex border-b-2" style={{ borderColor: '#6B6B65' }}>
        <div className="w-2 shrink-0" style={{ background: '#F37F21' }} aria-hidden="true" />
        <div className="flex-1 px-4 py-10 sm:px-8 sm:py-14">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-3 text-[10px] font-extrabold" style={{ letterSpacing: '0.2em', color: '#6B6B65' }}>
                MÓDULO DE GESTIÓN
              </div>
              <h1 className="text-[34px] sm:text-[46px]" style={{ margin: 0, lineHeight: 0.98, letterSpacing: '-0.03em', fontWeight: 800 }}>
                Catálogo de <span style={{ color: '#F37F21' }}>Platos</span>
              </h1>
              <p className="mt-3 text-sm sm:text-base" style={{ color: '#6B6B65' }}>
                Gestiona tus platos y sus recetas por sede.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setModalImport(true)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-extrabold uppercase w-full sm:w-auto"
                style={{ background: '#fff', color: OSCURO, border: `2px solid ${OSCURO}`, letterSpacing: '0.06em' }}
              >
                <FileSpreadsheet size={16} />
                Importar Excel
              </button>
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-extrabold uppercase w-full sm:w-auto"
                style={{ background: OSCURO, color: '#fff', letterSpacing: '0.06em' }}
              >
                <ArrowLeft size={16} />
                Panel
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
 <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Selector de sede */}
 <div className="mb-7 border border-[#E7E7E2] bg-white overflow-hidden" style={{ borderLeft: '4px solid #8CC63F' }}>
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center bg-[#8CC63F]/10 text-[#2d5a1e]"><MapPin size={19} /></div>
              <div>
 <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A93]">Sede activa</p>
 <p className="mt-0.5 text-sm font-bold text-[#201E1D]">Gestionando catálogo y recetas</p>
              </div>
            </div>
 <div className="relative min-w-[230px]">
 <select value={sedeActiva} onChange={e => setSedeActiva(e.target.value)} className="w-full appearance-none border border-[#E7E7E2] bg-[#F8F8F5] px-4 py-2.5 pr-10 text-sm font-semibold text-[#201E1D] outline-none transition focus:border-[#8CC63F] focus:bg-white focus:ring-4 focus:ring-[#8CC63F]/10">
                {sedes.map(s => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
              </select>
 <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8A83]" />
            </div>
          </div>
        </div>

        {/* Categorías */}
 <div className="mb-7">
 <div className="mb-3 flex items-end justify-between gap-3">
            <div>
 <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A93]">Categorías</p>
 <p className="mt-1 text-sm text-[#6B6B65]">Selecciona el tipo de plato que deseas gestionar</p>
            </div>
 <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#8A8A83]"> <span className="h-2 w-2 bg-[#8CC63F]" />{platos.length} platos en total</div>
          </div>
 <div className="flex gap-3 overflow-x-auto pb-2">
            {CATS.map(cat => {
              const isActive = catActiva === cat.key
              const count = platos.filter(p => p.categoria === cat.key).length
              const Icon = cat.icon
              return (
                <button
                  key={cat.key}
                  onClick={() => { setCatActiva(cat.key); setSubcategoria(""); setLineas([{ ...EMPTY_LINEA }]); setSearchTerm("") }}
 className="group relative flex h-[116px] w-[154px] flex-shrink-0 flex-col items-center justify-center gap-1.5 border-2 px-2 transition-colors duration-150"
                  style={{ background: isActive ? cat.color : cat.bg, color: isActive ? '#FFFFFF' : cat.color, borderColor: isActive ? OSCURO : `${cat.color}30` }}
                >
 <span className="flex h-10 w-10 items-center justify-center " style={{ background: isActive ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.68)' }}><Icon size={20} strokeWidth={2} /></span>
 <span className="text-[13px] font-extrabold uppercase tracking-wide">{cat.label}</span>
 <span className={`text-[11px] font-semibold ${isActive ? 'text-white/70' : 'text-[#8A8A83]'}`}>{count} {count === 1 ? 'plato' : 'platos'}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 🔍 Buscador de platos */}
 <div className="mb-6">
 <div className="relative max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar plato por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full pl-10 pr-10 py-2.5 border border-[#E7E7E2] focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent bg-white text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {searchTerm && (
 <p className="mt-2 text-sm text-[#6B6B65]">
              {platosDeCat.length} resultado{platosDeCat.length !== 1 ? 's' : ''} encontrado{platosDeCat.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Formulario nuevo plato */}
        {isAdmin && (
 <form onSubmit={guardar} className="mb-7 overflow-hidden border border-[#E7E7E2] bg-white" style={{ borderTop: `4px solid ${catActual.color}` }}>
 <div className="border-b border-[#EFEFE9] bg-[#FAFAF7] px-6 py-4">
 <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A93]">Crear nuevo</p>
 <div className="mt-1 flex flex-wrap items-center gap-2">
 <p className="text-base font-extrabold text-[#201E1D] flex items-center gap-2">
 <Plus size={17} className="text-[#8CC63F]" /> Nuevo plato
 <span className=" px-2.5 py-0.5 text-xs font-bold" style={{ background: catActual.bg, color: catActual.color }}>
                {catActual.label}
              </span>
 <span className=" px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-600">
                {sedeActualNombre || "Sin sede"}
              </span>
                </p>
              </div>
            </div>

 <div className="p-6">
 <div className="mb-4">
 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nombre del plato</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: AJI DE GALLINA"
 className="w-full border border-[#E7E7E2] px-3 py-2 text-sm font-medium text-[#201E1D] outline-none focus:ring-2 focus:ring-[#8CC63F] uppercase"
                required
              />
            </div>

            {catActiva === "ENTRADA" && (
 <div className="mb-4">
 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Subcategoría</label>
 <div className="flex gap-2">
                  {SUBCATS_ENTRADA.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSubcategoria(subcategoria === s.value ? "" : s.value)}
 className={`px-4 py-1.5 text-xs font-bold border transition-all ${
                        subcategoria === s.value
                          ? "bg-[#2d5a1e] text-white border-[#2d5a1e] "
                          : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

 <div className="mb-4">
 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Insumos de la receta ({sedeActualNombre || "—"})
              </label>
 <div className="space-y-2">
                {lineas.map((linea, i) => {
                  const insumoSel = insumos.find(ins => ins.id === linea.insumo_id)
                  return (
 <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                      <select
                        value={linea.insumo_id}
                        onChange={e => setLinea(i, "insumo_id", e.target.value)}
 className="flex-1 min-w-[120px] border border-[#E7E7E2] px-3 py-2 text-sm text-[#201E1D] outline-none focus:ring-2 focus:ring-[#8CC63F]"
                      >
                        <option value="">— Seleccionar insumo —</option>
                        {insumos.map(ins => (
                          <option key={ins.id} value={ins.id}>{ins.nombre}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={linea.cantidad || ""}
                        onChange={e => setLinea(i, "cantidad", parseFloat(e.target.value) || 0)}
                        placeholder="0"
 className="w-20 border border-[#E7E7E2] px-3 py-2 text-sm text-[#201E1D] outline-none focus:ring-2 focus:ring-[#8CC63F]"
                        step="0.001"
                      />
 <span className="w-16 text-center text-xs font-bold text-gray-500">
                        {insumoSel?.unidad ?? "—"}
                      </span>
                      {lineas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLinea(i)}
 className="text-red-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={addLinea}
 className="mt-2 flex items-center gap-1 text-xs font-bold px-3 py-1.5 border border-[#E7E7E2] text-gray-600 hover:bg-gray-50"
              >
                <Plus size={14} /> Agregar insumo
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !sedeActiva}
 className="px-4 py-2 text-white font-bold disabled:opacity-50"
              style={{ background: catActual.color }}
            >
              {loading ? "Guardando..." : "Crear plato"}
            </button>
            </div>
          </form>
        )}

        {/* Lista de platos */}
 <div className="mb-4 flex items-end justify-between gap-3">
          <div>
 <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A9A93]">Catálogo</p>
 <div className="mt-1 flex flex-wrap items-center gap-2">
 <h2 className="text-lg font-extrabold text-[#201E1D]">{catActual.label}</h2>
 <span className=" px-2.5 py-1 text-[11px] font-bold" style={{ background: catActual.bg, color: catActual.color }}>{platosDeCat.length} {platosDeCat.length === 1 ? "plato" : "platos"}</span>
            </div>
          </div>
 <span className="hidden sm:block text-xs font-semibold text-[#9A9A93]">{sedeActualNombre || "Sin sede"}</span>
        </div>

        {platosDeCat.length === 0 ? (
 <div className=" border border-dashed border-[#DCDCD5] bg-[#FAFAF7] py-12 text-center">
 <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center border border-[#E7E7E2] bg-white text-[#9A9A93]">
              {searchTerm ? <Search size={19} /> : <Plus size={19} />}
            </div>
 <p className="text-sm font-bold text-[#5F5F59]">
              {searchTerm ? "No se encontraron platos con ese nombre" : "Sin platos en esta categoría"}
            </p>
 <p className="mt-1 text-xs text-[#9A9A93]">
              {searchTerm ? "Prueba con otro término de búsqueda" : "Crea el primero usando el formulario superior."}
            </p>
          </div>
        ) : (
          platosDeCat.map(plato => {
            const recetaSede = plato.recetas.filter(r => r.sede_id === sedeActiva)
            return (
              <div
                key={plato.id}
 className="group mb-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border border-[#E7E7E2] bg-white px-4 sm:px-5 py-4 transition-colors duration-150 hover:border-[#DCDCD5]"
                style={{ borderLeft: `4px solid ${catActual.color}` }}
              >
 <div className="flex-1 min-w-0">
 <div className="mb-1 flex items-center gap-2 flex-wrap">
 <span className="h-2 w-2 flex-shrink-0 " style={{ background: catActual.color }} />
 <p className="text-sm font-extrabold text-[#201E1D]">{plato.nombre}</p>
                    {plato.subcategoria && (
 <span className="text-xs font-bold px-2 py-0.5 bg-[#eaf3de] text-[#2d5a1e]">
                        {plato.subcategoria}
                      </span>
                    )}
                  </div>
 <p className="text-xs text-[#7A7A73] truncate mt-1">
                    {recetaSede.length > 0
                      ? recetaSede
                          .map(r => `${r.insumos.nombre} (${r.cantidad} ${r.insumos.unidad})`)
                          .join(" · ")
                      : `Sin receta definida para ${sedeActualNombre || "esta sede"}`}
                  </p>
                </div>
                {isAdmin && (
 <div className="flex gap-1.5 flex-shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => abrirModalEdicion(plato)}
 className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      <Edit size={14} />
                      {recetaSede.length > 0 ? "Editar" : "Definir"}
                    </button>
                    <button
                      onClick={() => borrar(plato.id, plato.nombre)}
 className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </main>

      {/* ─── MODAL IMPORTAR EXCEL ─── */}
      {modalImport && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrarModalImport} />
 <div className="relative w-full max-w-2xl bg-white overflow-hidden max-h-[90vh] flex flex-col" style={{ borderTop: `4px solid ${OSCURO}` }}>
 <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
 <div className="flex items-center gap-2">
 <FileSpreadsheet className="text-xl text-green-700" />
 <h2 className="text-lg font-extrabold text-gray-800">Importar platos desde Excel</h2>
              </div>
 <button onClick={cerrarModalImport} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {importStep === "upload" && (
 <div className="p-8 flex flex-col items-center gap-5 overflow-y-auto">
                <div
 className="w-full border-2 border-dashed border-green-300 p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-green-50 transition-colors"
                  onClick={() => importInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImportFile(f); }}
                >
 <span className="text-4xl">📊</span>
 <p className="text-sm font-bold text-gray-700">Arrastra tu plantilla .xlsx aquí</p>
 <p className="text-xs text-gray-400">o haz clic para seleccionar</p>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls"
 className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                  />
                </div>

 <div className="w-full bg-gray-50 border border-gray-200 p-4">
 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Formato esperado (columnas requeridas)
                  </p>
 <div className="overflow-x-auto">
 <table className="text-xs w-full">
                      <thead>
 <tr className="text-left">
                          {["NOMBRE_PLATO","CATEGORIA","SUBCATEGORIA","SEDE","INSUMO","CANTIDAD","UNIDAD"].map(h => (
 <th key={h} className="pr-3 py-1 font-bold text-gray-600 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
 <tbody className="text-gray-500">
                        <tr>
 <td className="pr-3 py-0.5">AJI DE GALLINA</td>
 <td className="pr-3">FONDO</td>
 <td className="pr-3"></td>
 <td className="pr-3">Lima - Centro</td>
 <td className="pr-3">POLLO ENTERO</td>
                          <td>1.5</td>
 <td className="pr-3">KG</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
 <div className="mt-2 p-2 bg-green-50 border border-green-200">
 <p className="text-[10px] text-green-700 font-semibold">
                      🔄 Conversión automática: ml ↔ L (÷1000 / ×1000), g ↔ kg (÷1000 / ×1000)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {importStep === "preview" && (
              <>
 <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {erroresImport.length > 0 && (
 <div className=" bg-red-50 border border-red-200 p-3">
 <p className="text-xs font-bold text-red-700 mb-1">⚠ {erroresImport.length} filas con avisos</p>
                    </div>
                  )}
 <div className="flex gap-3 flex-wrap">
 <div className="flex-1 bg-green-50 border border-green-200 p-3 text-center">
 <p className="text-2xl font-extrabold text-green-700">{platosImport.length}</p>
 <p className="text-xs text-green-600 font-bold">recetas detectadas</p>
                    </div>
                    {totalNoEncontrados > 0 && (
 <div className="flex-1 bg-amber-50 border border-amber-200 p-3 text-center">
 <p className="text-2xl font-extrabold text-amber-600">{totalNoEncontrados}</p>
 <p className="text-xs text-amber-600 font-bold">insumos no encontrados</p>
                      </div>
                    )}
                  </div>
                  {totalNoEncontrados > 0 && (
 <div className="flex items-center justify-between bg-amber-50 border border-amber-200 px-4 py-2.5">
 <p className="text-xs text-amber-700 font-bold">Decide qué hacer con los insumos marcados</p>
                      <button
                        onClick={omitirTodosImport}
 className="text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-700 hover:bg-amber-200"
                      >
                        Omitir todos
                      </button>
                    </div>
                  )}
                  {platosImport.map((plato, pi) => (
 <div key={pi} className=" border border-gray-200 bg-gray-50 overflow-hidden">
 <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-gray-100 flex-wrap">
 <p className="text-sm font-bold text-gray-800 flex-1">{plato.nombre}</p>
 <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600">{plato.categoria}</span>
 <span className="text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700">{plato.sede_nombre}</span>
                      </div>
 <div className="divide-y divide-gray-100">
                        {plato.lineas.map((l: any, li: number) => {
                          const omitir = plato.decisiones[l.insumo_nombre] === "omitir"
                          return (
 <div key={li} className={`flex items-center gap-2 px-4 py-2 text-xs ${omitir ? "opacity-40" : ""}`}>
                              {l.estado === "ok" ? "✅" : "⚠️"}
 <span className={`flex-1 font-medium ${l.estado === "no_encontrado" ? "text-amber-700" : "text-gray-700"}`}>
                                {l.insumo_nombre}
                              </span>
 <span className="text-gray-500">{l.cantidad} {l.unidad_importada}</span>
                              {l.estado === "no_encontrado" && (
                                <button
                                  onClick={() => toggleDecisionImport(pi, l.insumo_nombre)}
 className={`text-xs font-bold px-2.5 py-1 transition-all ${
                                    omitir ? "bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-700" : "bg-amber-100 text-amber-700 hover:bg-gray-100 hover:text-gray-400"
                                  }`}
                                >
                                  {omitir ? "Restaurar" : "Omitir"}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
 <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 bg-white">
 <button onClick={() => { setImportStep("upload"); setPlatosImport([]); setErroresImport([]) }} className="text-sm font-bold text-gray-500 hover:text-gray-700">
                    ← Volver
                  </button>
                  <button
                    onClick={hayPendientes ? undefined : ejecutarImportacion}
                    disabled={platosImport.length === 0 || hayPendientes}
 className="px-4 py-2 text-white text-sm font-bold disabled:opacity-50"
                    style={{ background: "#2d5a1e" }}
                  >
                    Importar {platosImport.length} recetas
                  </button>
                </div>
              </>
            )}

            {importStep === "importing" && (
 <div className="p-10 flex flex-col items-center gap-5">
 <Loader2 className="w-16 h-16 animate-spin text-green-600" />
 <p className="text-sm font-bold text-gray-600">Importando platos...</p>
              </div>
            )}

            {importStep === "done" && (
 <div className="p-10 flex flex-col items-center gap-4">
 <span className="text-5xl">🎉</span>
 <p className="text-lg font-extrabold text-gray-800">¡Importación completada!</p>
 <button onClick={cerrarModalImport} className="px-6 py-2.5 text-white font-bold " style={{ background: "#2d5a1e" }}>
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL DE EDICIÓN ─── */}
      {modalAbierto && platoEditando && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalAbierto(false)} />
 <div className="relative w-full max-w-lg bg-white overflow-hidden" style={{ borderTop: `4px solid ${catActual.color}` }}>
 <div className="p-6 border-b border-gray-200 flex items-center justify-between">
 <div className="flex items-center gap-2 flex-wrap">
 <h2 className="text-xl font-bold text-gray-800">Editar {catActual.label.toLowerCase()}</h2>
 <span className=" px-2.5 py-0.5 text-xs font-bold" style={{ background: catActual.bg, color: catActual.color }}>
                  {platoEditando.nombre}
                </span>
              </div>
 <button onClick={() => setModalAbierto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
 <div className="p-6">
 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nombre del plato</label>
              <input
                value={nombreEdit}
                onChange={e => setNombreEdit(e.target.value)}
 className="w-full border border-[#E7E7E2] px-3 py-2 text-sm font-medium text-[#201E1D] outline-none focus:ring-2 focus:ring-[#8CC63F] mb-4 uppercase"
              />

              {platoEditando.categoria === "ENTRADA" && (
 <div className="mb-4">
 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Subcategoría</label>
 <div className="flex gap-2">
                    {SUBCATS_ENTRADA.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setSubcategoriaEdit(subcategoriaEdit === s.value ? "" : s.value)}
 className={`px-4 py-1.5 text-xs font-bold border transition-all ${
                          subcategoriaEdit === s.value
                            ? "bg-[#2d5a1e] text-white border-[#2d5a1e] "
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Insumos de la receta ({sedeActualNombre})
              </label>
 <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {lineasEdit.map((linea, i) => {
                  const insumoSel = insumos.find(ins => ins.id === linea.insumo_id)
                  return (
 <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                      <select
                        value={linea.insumo_id}
                        onChange={e => setLineaEdit(i, "insumo_id", e.target.value)}
 className="flex-1 min-w-[120px] border border-[#E7E7E2] px-3 py-2 text-sm text-[#201E1D] outline-none focus:ring-2 focus:ring-[#8CC63F]"
                      >
                        <option value="">— Seleccionar insumo —</option>
                        {insumos.map(ins => (
                          <option key={ins.id} value={ins.id}>{ins.nombre}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={linea.cantidad || ""}
                        onChange={e => setLineaEdit(i, "cantidad", parseFloat(e.target.value) || 0)}
 className="w-20 border border-[#E7E7E2] px-3 py-2 text-sm text-[#201E1D] outline-none focus:ring-2 focus:ring-[#8CC63F]"
                        step="0.001"
                      />
 <span className="w-16 text-center text-xs font-bold text-gray-500">{insumoSel?.unidad ?? "—"}</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (lineasEdit.length <= 1) {
                            setLineaEdit(i, "insumo_id", "")
                            setLineaEdit(i, "cantidad", 0)
                          } else {
                            removeLineaEdit(i)
                          }
                        }}
 className="text-red-400 hover:text-red-600 transition-colors p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={addLineaEdit}
 className="mb-6 flex items-center gap-1 text-xs font-bold px-3 py-1.5 border border-[#E7E7E2] text-gray-600 hover:bg-gray-50"
              >
                <Plus size={14} /> Agregar insumo
              </button>

 <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
 className="px-4 py-2 border border-gray-300 text-gray-600 font-bold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarEdicion}
                  disabled={saving}
 className="px-4 py-2 text-white font-bold disabled:opacity-50"
                  style={{ background: catActual.color }}
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
 <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
 <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Catálogo de platos
          </p>
 <div className="flex items-center gap-2">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8CC63F', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', color: '#9A9A93', fontWeight: 600 }}>v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}