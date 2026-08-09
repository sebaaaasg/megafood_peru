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
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

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
  const [sedeDetectada, setSedeDetectada] = useState("")
  const [mostrandoModalFaltantes, setMostrandoModalFaltantes] = useState(false)
  const [mostrandoModalSede, setMostrandoModalSede] = useState(false)
  const [puedeImportar, setPuedeImportar] = useState(false)
  const [rolUsuario, setRolUsuario] = useState("")
  const [fileName, setFileName] = useState("")
  const [importando, setImportando] = useState(false)

  // Verificar permisos
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
    }
    verificarPermisos()
  }, [supabase])

  // Formatear fecha como en importación
  const formatearFechaExcel = (valor: any) => {
    let fechaJS: Date
    if (typeof valor === 'number') {
      fechaJS = new Date(Math.round((valor - 25569) * 86400 * 1000))
    } else {
      fechaJS = new Date(valor)
    }
    return fechaJS.toLocaleDateString('es-ES', {
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      timeZone: 'UTC'
    })
  }

  // Importar Excel
  const importarPlanificacion = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!puedeImportar) {
      alert("No tienes permisos para importar planificaciones.")
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

        // Detectar sede
        let textoSede = ""
        for (let r = 0; r < Math.min(matriz.length, 10); r++) {
          const fila = matriz[r]
          if (!fila) continue
          for (let c = 0; c < Math.min(fila.length, 5); c++) {
            const valorCelda = fila[c]?.toString().toUpperCase() || ""
            if (valorCelda.includes("PROGRAMACION DE MENUS")) {
              textoSede = valorCelda.replace(/.*PROGRAMACION DE MENUS\s*[-\s]*/i, "").trim()
              break
            }
          }
          if (textoSede) break
        }
        setSedeDetectada(textoSede.trim())

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
            for (let col = 1; col <= 14; col++) {
              const valorCelda = filaFechas[col]
              if (!valorCelda) continue

              const fechaLegible = formatearFechaExcel(valorCelda)
              if (!mapaDias.has(fechaLegible)) {
                mapaDias.set(fechaLegible, { fecha: fechaLegible, platos: [] })
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
    if (!sedeDetectada) {
      alert("No se detectó ninguna sede en el Excel.")
      return
    }

    setCargando(true)
    try {
      const { data: sedesData } = await supabase
        .from("sedes")
        .select("id")
        .ilike("nombre", sedeDetectada)

      if (!sedesData || sedesData.length === 0) {
        setMostrandoModalSede(true)
        setCargando(false)
        return
      }

      const sedeId = sedesData[0].id
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

      // 🔥 Insertar en la tabla correcta (planificacion_detalles)
      const registrosAInsertar = platosProgramados.flatMap(dia =>
        dia.platos.map((p: any) => ({
          fecha_texto: dia.fecha,
          plato_id: mapaPlatos.get(p.nombre),
          tipo: p.tipo,
          categoria: p.categoria_especifica,
          sede_id: sedeId
        }))
      )

      const { error } = await supabase.from("planificacion_detalles").insert(registrosAInsertar)
      if (error) throw error

      alert(`✅ Programación para ${sedeDetectada} guardada con éxito!`)
      setPlatosProgramados([])
      setSedeDetectada("")
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

  const registrarSede = async () => {
    setCargando(true)
    try {
      await supabase.from("sedes").insert([{ nombre: sedeDetectada }])
      alert(`Sede "${sedeDetectada}" registrada.`)
      setMostrandoModalSede(false)
      guardarProgramacion()
    } catch (error: any) {
      alert("Error: " + error.message)
      setCargando(false)
    }
  }

  const getBadgeStyle = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'dieta': return "bg-blue-100 text-blue-700"
      case 'especial': return "bg-purple-100 text-purple-700"
      case 'evento': return "bg-orange-100 text-orange-700"
      default: return "bg-gray-100 text-gray-700"
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
    platosProgramados.forEach(dia => {
      dia.platos.forEach((p: any) => {
        lookup[p.tipo] = lookup[p.tipo] || {}
        lookup[p.tipo][p.categoria_especifica] = lookup[p.tipo][p.categoria_especifica] || {}
        lookup[p.tipo][p.categoria_especifica][dia.fecha] = p.nombre
      })
    })

    return { dias, tiposPresentes, lookup }
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
                <span style={{ color: '#FFFFFF' }}>Importar</span>
                <span style={{ color: '#F37F21' }}> Programación</span>
              </h1>
              <p className="mt-2" style={{ color: '#C9C9C3', fontSize: '1rem' }}>
                Carga el archivo Excel de Gerencia para sincronizar el calendario.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/programacion"
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
      <main className="max-w-4xl mx-auto px-8 py-8">
        {/* Estado del rol */}
        {rolUsuario && (
          <div className="mb-4 flex items-center gap-2 text-sm">
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
          rounded-lg border-2 border-dashed p-10 text-center transition-all
          ${puedeImportar 
            ? 'border-[#8CC63F]/50 bg-[#F5FBF0] hover:bg-[#EAF5DE]' 
            : 'border-gray-300 bg-gray-50 opacity-60'}
        `}>
          <Upload className={`w-12 h-12 mx-auto mb-3 ${puedeImportar ? 'text-[#8CC63F]' : 'text-gray-400'}`} />
          <h3 className="font-bold text-[#2B2B2B]">
            {puedeImportar ? "Selecciona el archivo" : "Acceso restringido"}
          </h3>
          <p className="text-sm text-[#6B6B65] mt-1">
            {puedeImportar ? "Formato Excel (.xlsx, .xls)" : "Solo Gerencia o Administrador"}
          </p>
          {puedeImportar && (
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

        {/* Sede detectada */}
        {sedeDetectada && (
          <div className="mt-4 p-4 rounded-lg bg-[#8CC63F]/10 border border-[#8CC63F]/20 flex items-center gap-3">
            <Building className="w-5 h-5 text-[#8CC63F]" />
            <div>
              <p className="text-xs font-bold text-[#8CC63F] uppercase">Sede detectada</p>
              <p className="text-sm font-bold text-[#2B2B2B]">{sedeDetectada}</p>
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
          <div className="mt-6">
            <h3 className="font-bold text-[#2B2B2B] mb-3">📋 Menús detectados</h3>
            <div className="bg-white rounded-lg border border-[#E7E7E2] shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
                <table className="border-collapse text-xs w-full">
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 bg-[#2B2B2B] text-white text-left px-3 py-2.5 font-bold min-w-[150px]">
                        Categoría
                      </th>
                      {tablaMenu.dias.map((fecha, i) => (
                        <th
                          key={i}
                          className="sticky top-0 z-20 bg-[#2B2B2B] text-white text-left px-3 py-2.5 font-semibold min-w-[190px] whitespace-nowrap border-l border-white/10"
                        >
                          {fecha}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tablaMenu.tiposPresentes.map((tipo) => (
                      <Fragment key={tipo}>
                        {/* Fila separadora de tipo */}
                        <tr className={getBadgeStyle(tipo)}>
                          <td
                            className="sticky left-0 z-10 px-3 py-1.5 font-bold uppercase text-[11px] tracking-wide"
                            style={{ background: 'inherit' }}
                          >
                            {tipo}
                          </td>
                          {tablaMenu.dias.map((_, di) => (
                            <td key={di} style={{ background: 'inherit' }} />
                          ))}
                        </tr>





                        {/* Filas de categorías */}
{CATEGORIAS_ORDEN
  .filter(cat => tablaMenu.lookup[tipo]?.[cat])
  .map((cat, ci) => (
    <tr
      key={cat}
      className={ci % 2 === 0 ? 'bg-white' : 'bg-[#F7F7F3]'}
    >
      <td
        className="sticky left-0 z-10 px-3 py-2 font-semibold
                   text-[#2B2B2B] bg-[#E5E5DC]
                   border-r-2 border-[#C9C9C0]
                   whitespace-nowrap"
      >
        {cat}
      </td>

      {tablaMenu.dias.map((fecha, di) => (
        <td
          key={di}
          className="px-3 py-2 text-[#2B2B2B]
                     border-l border-[#E7E7E2]
                     whitespace-nowrap"
        >
          {tablaMenu.lookup[tipo][cat][fecha] || (
            <span className="text-[#B0B0A8]">—</span>
          )}
        </td>
      ))}
    </tr>
  ))}




                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal sede nueva */}
        {mostrandoModalSede && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-6 h-6 text-[#F37F21]" />
                <h3 className="text-lg font-bold text-[#2B2B2B]">Sede nueva</h3>
              </div>
              <p className="text-sm text-[#6B6B65] mb-4">
                "{sedeDetectada}" no existe en el sistema. ¿Deseas registrarla?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setMostrandoModalSede(false)} 
                  className="flex-1 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={registrarSede} 
                  className="flex-1 py-2.5 rounded-lg bg-[#F37F21] text-white font-medium hover:bg-[#C4600F] transition"
                >
                  Registrar sede
                </button>
              </div>
            </div>
          </div>
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
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
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