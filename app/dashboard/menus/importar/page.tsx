'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Upload, 
  Save, 
  Building, 
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
  FileSpreadsheet,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import TablaProgramacionMenu, { DiaProgramado } from '@/components/TablaProgramacionMenus'
import MenusNav from '@/app/dashboard/menus/components/MenusNav'

// ─────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────
const CATEGORIAS_ORDEN = ["ENTRADA", "CÁRNICO", "GUARNICIÓN 01", "GUARNICIÓN 02", "GUARNICIÓN 03", "POSTRE", "BEBIBLE", "SALSA"]
const TIPOS_ORDEN = ["estandar", "dieta", "especial", "evento"]

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function ImportarProgramacion() {
  const router = useRouter()
  const supabase = createClient()
  
  const [platosProgramados, setPlatosProgramados] = useState<any[]>([])
  const [cargando, setCargando] = useState(false)
  const [platosFaltantes, setPlatosFaltantes] = useState<any[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [sedes, setSedes] = useState<any[]>([])
  const [mostrandoModalFaltantes, setMostrandoModalFaltantes] = useState(false)
  const [puedeImportar, setPuedeImportar] = useState(false)
  const [rolUsuario, setRolUsuario] = useState("")
  const [fileName, setFileName] = useState("")
  const [importando, setImportando] = useState(false)
  const [cargandoSedes, setCargandoSedes] = useState(true)

  // Verificar permisos y cargar sedes
  useEffect(() => {
    const verificarPermisos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: perfil } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (perfil) {
        setRolUsuario(perfil.role)
        setPuedeImportar(perfil.role === "admin" || perfil.role === "gerencia")
      }

      const { data: sedesData } = await supabase
        .from("sedes")
        .select("id, nombre")
        .order("nombre")
      
      if (sedesData) {
        setSedes(sedesData)
        if (sedesData.length > 0) {
          setSedeSeleccionada(sedesData[0].id)
        }
      }
      setCargandoSedes(false)
    }
    verificarPermisos()
  }, [supabase])

  // Formatear fecha como en importación
const formatearFechaExcel = (valor: any): string => {
  let fechaJS: Date
  
  if (typeof valor === 'number') {
    // Número serial de Excel → Date UTC
    fechaJS = new Date(Math.round((valor - 25569) * 86400 * 1000))
  } else if (valor instanceof Date) {
    fechaJS = valor
  } else {
    fechaJS = new Date(valor)
  }
  
  // Extraer YYYY-MM-DD directamente sin conversiones de zona horaria
  const year = fechaJS.getUTCFullYear()
  const month = String(fechaJS.getUTCMonth() + 1).padStart(2, '0')
  const day = String(fechaJS.getUTCDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}` // "2026-08-10"
}

  // Parsear un valor de celda de comensales a entero seguro
  const parsearComensales = (valor: any): number | null => {
    if (valor === undefined || valor === null) return null
    const texto = valor.toString().trim()
    if (texto === "" || texto === "-") return null
    const numero = Number(texto.replace(/[^\d.-]/g, ""))
    return Number.isFinite(numero) ? Math.round(numero) : null
  }

  // Importar Excel
  const importarPlanificacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!puedeImportar) {
      alert("No tienes permisos para importar planificaciones.")
      return
    }

    if (!sedeSeleccionada) {
      alert("⚠️ Primero selecciona una sede antes de importar.")
      return
    }

    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setImportando(true)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const hoja = workbook.Sheets[workbook.SheetNames[0]]
        const matriz = XLSX.utils.sheet_to_json(hoja, { header: 1 }) as any[][]

        const categorias = CATEGORIAS_ORDEN
        const mapaDias = new Map()
        let tipoActual = "estandar"

        for (let i = 0; i < matriz.length; i++) {
          const celdaA = matriz[i]?.[0]?.toString().toUpperCase().trim()
          if (!celdaA) continue

          if (celdaA.includes("ESTANDAR")) tipoActual = "estandar"
          else if (celdaA.includes("DIETA")) tipoActual = "dieta"
          else if (celdaA.includes("ESPECIAL")) tipoActual = "especial"
          else if (celdaA.includes("EVENTO")) tipoActual = "evento"

          if (celdaA === "FECHA") {
            const filaFechas = matriz[i]
            // La fila COMENSALES va justo después del bloque de categorías
            // (FECHA, 8 categorías, luego COMENSALES) => offset = categorias.length + 1
            const filaComensales = matriz[i + 1 + categorias.length]
            const esFilaComensalesValida =
              filaComensales?.[0]?.toString().toUpperCase().trim() === "COMENSALES"

            for (let col = 1; col <= 14; col++) {
              const valorCelda = filaFechas[col]
              if (!valorCelda) continue

              const fechaLegible = formatearFechaExcel(valorCelda)
              if (!mapaDias.has(fechaLegible)) {
                mapaDias.set(fechaLegible, { fecha: fechaLegible, platos: [], comensalesPorTipo: {} })
              }
              const diaObj = mapaDias.get(fechaLegible)

              categorias.forEach((cat, idx) => {
                const filaActual = matriz[i + 1 + idx]
                const nombrePlato = filaActual ? filaActual[col] : null
                if (nombrePlato && nombrePlato.toString().trim() !== "-") {
                  diaObj.platos.push({
                    tipo: tipoActual,
                    categoria_general: cat.includes("GUARNICIÓN") ? "GUARNICIÓN" : cat,
                    categoria_especifica: cat,
                    nombre: nombrePlato.toString().toUpperCase().trim()
                  })
                }
              })

              // Comensales del bloque actual (tipoActual) para este día
              if (esFilaComensalesValida) {
                const comensales = parsearComensales(filaComensales[col])
                if (comensales !== null) {
                  diaObj.comensalesPorTipo[tipoActual] = comensales
                }
              }
            }
          }
        }

        const resultados = Array.from(mapaDias.values())
        if (resultados.length === 0) {
          alert("No se detectó programación. Revisa que las palabras FECHA estén en la columna A.")
          setImportando(false)
          return
        }
        setPlatosProgramados(resultados)
        setImportando(false)
      } catch (error) {
        console.error("Error al leer el archivo:", error)
        alert("Error al leer el archivo. Verifica que sea un Excel válido.")
        setImportando(false)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // Guardar en BD
  const guardarProgramacion = async () => {
    if (platosProgramados.length === 0) return
    if (!sedeSeleccionada) {
      alert("Selecciona una sede.")
      return
    }

    setCargando(true)
    try {
      const sedeId = sedeSeleccionada
      
      const platosExcelMap = new Map()
      platosProgramados.forEach(dia => {
        dia.platos.forEach((p: any) => {
          if (!platosExcelMap.has(p.nombre)) {
            platosExcelMap.set(p.nombre, { nombre: p.nombre, categoria: p.categoria_general })
          }
        })
      })

      const { data: platosDB } = await supabase
        .from("platos")
        .select("id, nombre")
        .in("nombre", Array.from(platosExcelMap.keys()))

      const mapaPlatos = new Map()
      platosDB?.forEach(p => mapaPlatos.set(p.nombre.toUpperCase(), p.id))

      const platosNoEncontrados = Array.from(platosExcelMap.values()).filter(
        (p: any) => !mapaPlatos.has(p.nombre)
      )

      if (platosNoEncontrados.length > 0) {
        setPlatosFaltantes(platosNoEncontrados)
        setMostrandoModalFaltantes(true)
        setCargando(false)
        return
      }

      // Insertar en planificacion_detalles
      const registrosAInsertar = platosProgramados.flatMap(dia =>
        dia.platos.map((p: any) => ({
          fecha: dia.fecha,
          plato_id: mapaPlatos.get(p.nombre),
          tipo: p.tipo,
          categoria: p.categoria_especifica,
          sede_id: sedeId
        }))
      )

      const { error } = await supabase.from("planificacion_detalles").insert(registrosAInsertar)
      if (error) throw error

      // Insertar/actualizar comensales por día + tipo (upsert por si se reimporta)
      const registrosComensales = platosProgramados.flatMap(dia =>
        Object.entries(dia.comensalesPorTipo || {}).map(([tipo, comensales]) => ({
          fecha: dia.fecha,
          sede_id: sedeId,
          tipo,
          comensales
        }))
      )

      if (registrosComensales.length > 0) {
        const { error: errorComensales } = await supabase
          .from("planificacion_comensales")
          .upsert(registrosComensales, { onConflict: "fecha,sede_id,tipo" })
        if (errorComensales) throw errorComensales
      }

      const nombreSede = sedes.find(s => s.id === sedeId)?.nombre || "Sede"
      alert(`✅ Programación para ${nombreSede} guardada con éxito!`)
      setPlatosProgramados([])
      setFileName("")
      router.refresh()
    } catch (error: any) {
      alert("Error: " + error.message)
    } finally {
      setCargando(false)
    }
  }

  const registrarPlatosFaltantes = async () => {
    setCargando(true)
    try {
      await supabase.from("platos").insert(platosFaltantes.map(p => ({ nombre: p.nombre, categoria: p.categoria })))
      alert("Platos registrados. Continuando...")
      setMostrandoModalFaltantes(false)
      guardarProgramacion()
    } catch (error: any) {
      alert("Error: " + error.message)
      setCargando(false)
    }
  }

 const getMenuStyle = (tipo: string) => {
  switch (tipo.toLowerCase()) {
    case 'dieta':
      return {
        header: 'bg-blue-100 text-blue-800',
        cell: 'bg-blue-50',
        cellAlt: 'bg-blue-50/60',
        category: 'bg-blue-100/70 text-blue-900',
        border: 'border-blue-200',
      }

    case 'especial':
      return {
        header: 'bg-purple-100 text-purple-800',
        cell: 'bg-purple-50',
        cellAlt: 'bg-purple-50/60',
        category: 'bg-purple-100/70 text-purple-900',
        border: 'border-purple-200',
      }

    case 'evento':
      return {
        header: 'bg-orange-100 text-orange-800',
        cell: 'bg-orange-50',
        cellAlt: 'bg-orange-50/60',
        category: 'bg-orange-100/70 text-orange-900',
        border: 'border-orange-200',
      }

    default:
  return {
    header: 'bg-green-100 text-green-800',
    cell: 'bg-green-50',
    cellAlt: 'bg-green-50/60',
    category: 'bg-green-100/70 text-green-900',
    border: 'border-green-200',
  }
  }
}

  // ─────────────────────────────────────────────
  // Data pivotada para la tabla estilo Excel
  // ─────────────────────────────────────────────
  const tablaMenu = useMemo(() => {
    const dias = platosProgramados.map(d => d.fecha)
    const tiposPresentes = TIPOS_ORDEN.filter(t =>
      platosProgramados.some(d => d.platos.some((p: any) => p.tipo === t))
    )

    const lookup: Record<string, Record<string, Record<string, string>>> = {}
    const comensales: Record<string, Record<string, number>> = {}
    platosProgramados.forEach(dia => {
      dia.platos.forEach((p: any) => {
        lookup[p.tipo] = lookup[p.tipo] || {}
        lookup[p.tipo][p.categoria_especifica] = lookup[p.tipo][p.categoria_especifica] || {}
        lookup[p.tipo][p.categoria_especifica][dia.fecha] = p.nombre
      })
      Object.entries(dia.comensalesPorTipo || {}).forEach(([tipo, valor]) => {
        comensales[tipo] = comensales[tipo] || {}
        comensales[tipo][dia.fecha] = valor as number
      })
    })

    return { dias, tiposPresentes, lookup, comensales }
  }, [platosProgramados])

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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-20 pb-6 sm:pt-24 sm:pb-10">
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
                <span style={{ color: '#FFFFFF' }}>Importar</span>
                <span style={{ color: '#F37F21' }}> Programación</span>
              </h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
                Carga el archivo Excel de Gerencia para sincronizar el calendario.
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

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Selector de sede */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
            <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
            Seleccionar sede
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <select
              value={sedeSeleccionada}
              onChange={(e) => setSedeSeleccionada(e.target.value)}
              className="w-full sm:flex-1 sm:max-w-md rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
              disabled={cargandoSedes}
            >
              {cargandoSedes ? (
                <option value="">Cargando sedes...</option>
              ) : sedes.length === 0 ? (
                <option value="">No hay sedes disponibles</option>
              ) : (
                sedes.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))
              )}
            </select>
            {sedeSeleccionada && (
              <span className="text-xs text-[#8CC63F] bg-[#8CC63F]/10 px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                ✅ Sede seleccionada
              </span>
            )}
          </div>
          {!sedeSeleccionada && sedes.length > 0 && (
            <p className="text-xs text-[#F37F21] mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              Selecciona una sede para importar
            </p>
          )}
        </div>

        {/* Estado del rol */}
        {rolUsuario && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#6B6B65]">Rol:</span>
            <span className="font-bold text-[#2B2B2B] capitalize">{rolUsuario}</span>
            {puedeImportar ? (
              <span className="text-xs text-[#8CC63F] bg-[#8CC63F]/10 px-2 py-0.5 rounded-full">✅ Permisos completos</span>
            ) : (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">⚠️ Solo lectura</span>
            )}
          </div>
        )}

        {/* Área de importación */}
        <div className={`
          rounded-lg border-2 border-dashed p-8 sm:p-10 text-center transition-all
          ${puedeImportar && sedeSeleccionada
            ? 'border-[#8CC63F]/50 bg-[#F5FBF0] hover:bg-[#EAF5DE]' 
            : 'border-gray-300 bg-gray-50 opacity-60'}
        `}>
          <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${puedeImportar && sedeSeleccionada ? 'text-[#8CC63F]' : 'text-gray-400'}`} />
          <h3 className="font-bold text-[#2B2B2B]">
            {!puedeImportar ? "Acceso restringido" : 
             !sedeSeleccionada ? "Selecciona una sede primero" : 
             "Selecciona el archivo Excel"}
          </h3>
          <p className="text-sm text-[#6B6B65] mt-1">
            {!puedeImportar ? "Solo Gerencia o Administrador" :
             !sedeSeleccionada ? "Elige una sede para continuar" :
             "Formato Excel (.xlsx, .xls) - La sede se toma de la selección actual"}
          </p>
          {puedeImportar && sedeSeleccionada && (
            <div className="mt-4">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#8CC63F] text-[#1F3A0A] rounded-lg font-semibold hover:bg-[#7AB835] transition">
                  <Upload size={18} />
                  Seleccionar archivo
                </span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={importarPlanificacion} 
                  className="hidden" 
                  disabled={importando}
                />
              </label>
              {fileName && (
                <p className="text-sm text-[#8CC63F] mt-2">
                  📄 {fileName}
                </p>
              )}
              {importando && (
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#8CC63F]" />
                  <span className="text-sm text-[#6B6B65]">Procesando archivo...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info de sede para importación */}
        {sedeSeleccionada && platosProgramados.length === 0 && (
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-3">
            <Building className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase">Importando para</p>
              <p className="text-sm font-bold text-[#2B2B2B]">
                {sedes.find(s => s.id === sedeSeleccionada)?.nombre}
              </p>
            </div>
          </div>
        )}

        {/* Botón guardar */}
        {platosProgramados.length > 0 && (
          <button
            onClick={guardarProgramacion}
            disabled={cargando}
            className="mt-4 w-full py-3 rounded-lg bg-[#2B2B2B] text-white font-bold hover:bg-[#3B3B3B] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {cargando ? "Guardando..." : `Guardar ${platosProgramados.length} días`}
          </button>
        )}

        {/* Tabla de menús detectados (estilo Excel) */}
        {platosProgramados.length > 0 && (
          <TablaProgramacionMenu 
    platosProgramados={platosProgramados as DiaProgramado[]}
    titulo="📋 Menús detectados"
  />

        )}

        {/* Modal platos nuevos */}
        {mostrandoModalFaltantes && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-[#F37F21]" />
                <h3 className="text-lg font-bold text-[#2B2B2B]">Platos nuevos</h3>
              </div>
              <p className="text-sm text-[#6B6B65] mb-3">
                Se encontraron {platosFaltantes.length} platos no registrados:
              </p>
              <div className="max-h-40 overflow-y-auto mb-4 space-y-1 bg-[#F5F5F0] rounded-lg p-3">
                {platosFaltantes.map((p, i) => (
                  <div key={i} className="text-sm text-[#2B2B2B] flex items-center justify-between">
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-xs text-[#6B6B65]">({p.categoria})</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMostrandoModalFaltantes(false)} 
                  className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={registrarPlatosFaltantes} 
                  className="flex-1 py-2.5 rounded-lg bg-[#F37F21] text-white font-medium hover:bg-[#C4600F] transition"
                >
                  Registrar todo
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Importar programación
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