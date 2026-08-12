'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building,
  Calendar,
  Users,
  Package,
  Calculator,
  FileSpreadsheet,
  Copy,
  Download,
  Loader2,
  ChefHat,
  UtensilsCrossed
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import CalendarioProgramacion from '@/components/CalendarioProgramacion'

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

interface InsumoRequerido {
  insumo_id: string
  insumo_nombre: string
  unidad: string
  cantidad_total: number
  cantidad_porcion: number
}

interface Receta {
  id: number
  plato_id: string
  insumo_id: string
  cantidad: number
}

interface Insumo {
  id: string
  nombre: string
  unidad: string
}

const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE", icon: "📋" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF", icon: "🥗" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED", icon: "🎯" },
]

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

// Función para formatear cantidad según la unidad más adecuada
const formatearCantidad = (cantidad: number, unidad: string): { cantidad: number; unidad: string } => {
  const unidadUpper = unidad.toUpperCase()
  
  if (unidadUpper === 'GR' && cantidad >= 1000) {
    return { cantidad: cantidad / 1000, unidad: 'KG' }
  }
  if (unidadUpper === 'ML' && cantidad >= 1000) {
    return { cantidad: cantidad / 1000, unidad: 'LT' }
  }
  if (unidadUpper === 'KG' && cantidad < 1 && cantidad > 0) {
    return { cantidad: cantidad * 1000, unidad: 'gr' }
  }
  if (unidadUpper === 'LT' && cantidad < 1 && cantidad > 0) {
    return { cantidad: cantidad * 1000, unidad: 'ML' }
  }
  return { cantidad, unidad }
}

// Función para redondear cantidades
const redondearCantidad = (cantidad: number): number => {
  if (cantidad === 0) return 0
  if (cantidad < 0.01) return Number(cantidad.toFixed(4))
  if (cantidad < 1) return Number(cantidad.toFixed(3))
  if (cantidad < 100) return Number(cantidad.toFixed(2))
  return Number(cantidad.toFixed(1))
}

export default function RequerimientoCocina() {
  const router = useRouter()
  const supabase = createClient()
  
  const [sedes, setSedes] = useState<Sede[]>([])
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [fechaSeleccionada, setFechaSeleccionada] = useState("")
  const [programacion, setProgramacion] = useState<ProgramacionItem[]>([])
  const [cargando, setCargando] = useState(false)
  const [cantidadPersonas, setCantidadPersonas] = useState<number>(100)
  const [insumosRequeridos, setInsumosRequeridos] = useState<InsumoRequerido[]>([])
  const [calculando, setCalculando] = useState(false)
  const [recetas, setRecetas] = useState<Receta[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  
  // Estados para los botones de exportación
  const [exportando, setExportando] = useState(false)
  const [exportandoSolo, setExportandoSolo] = useState(false)

  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  useEffect(() => {
    if (sedeSeleccionada && fechaSeleccionada) {
      cargarProgramacion()
    }
  }, [sedeSeleccionada, fechaSeleccionada])

  const cargarDatosIniciales = async () => {
    setCargando(true)
    
    try {
      const [{ data: sedesData }, { data: recetasData }, { data: insumosData }] = await Promise.all([
        supabase.from("sedes").select("id, nombre").order("nombre"),
        supabase.from("recetas").select("*"),
        supabase.from("insumos").select("id, nombre, unidad")
      ])
      
      if (sedesData) setSedes(sedesData)
      if (recetasData) setRecetas(recetasData)
      if (insumosData) setInsumos(insumosData)
    } catch (error) {
      console.error("Error al cargar datos:", error)
    } finally {
      setCargando(false)
    }
  }

  const cargarProgramacion = async () => {
    if (!sedeSeleccionada || !fechaSeleccionada) return
    
    setCargando(true)
    try {
      const { data } = await supabase
        .from("planificacion_detalles")
        .select("id, fecha_texto, tipo, categoria, plato_id")
        .eq("sede_id", sedeSeleccionada)
        .eq("fecha_texto", fechaSeleccionada)

      if (data && data.length > 0) {
        const platoIds = [...new Set(data.map(p => p.plato_id))]
        const { data: platosData } = await supabase
          .from("platos")
          .select("id, nombre")
          .in("id", platoIds)

        const mapaPlatos = new Map()
        platosData?.forEach(p => mapaPlatos.set(p.id, p.nombre))

        const programacionConNombre = data.map(p => ({
          ...p,
          plato_nombre: mapaPlatos.get(p.plato_id) || "Desconocido"
        }))

        setProgramacion(programacionConNombre)
        setInsumosRequeridos([])
      } else {
        setProgramacion([])
        setInsumosRequeridos([])
      }
    } catch (error) {
      console.error("Error al cargar programación:", error)
    } finally {
      setCargando(false)
    }
  }

  const calcularRequerimiento = async () => {
    if (programacion.length === 0) {
      alert("Primero seleccione una fecha con programación")
      return
    }
    if (cantidadPersonas <= 0) {
      alert("Ingrese un número válido de personas")
      return
    }

    setCalculando(true)
    
    try {
      const mapaInsumos = new Map<string, InsumoRequerido>()

      for (const item of programacion) {
        const recetaPlato = recetas.filter(r => r.plato_id === item.plato_id)
        
        for (const receta of recetaPlato) {
          const cantidadTotal = receta.cantidad * cantidadPersonas
          const insumo = insumos.find(i => i.id === receta.insumo_id)
          
          if (!insumo) continue
          
          if (mapaInsumos.has(receta.insumo_id)) {
            const existente = mapaInsumos.get(receta.insumo_id)!
            existente.cantidad_total += cantidadTotal
          } else {
            mapaInsumos.set(receta.insumo_id, {
              insumo_id: receta.insumo_id,
              insumo_nombre: insumo.nombre,
              unidad: insumo.unidad,
              cantidad_total: cantidadTotal,
              cantidad_porcion: receta.cantidad
            })
          }
        }
      }

      const resultado = Array.from(mapaInsumos.values()).sort((a, b) => 
        a.insumo_nombre.localeCompare(b.insumo_nombre)
      )
      
      setInsumosRequeridos(resultado)
    } catch (error) {
      console.error("Error al calcular requerimiento:", error)
      alert("Error al calcular el requerimiento")
    } finally {
      setCalculando(false)
    }
  }

const exportarAExcel = async () => {
    if (programacion.length === 0) {
      alert("No hay programación para exportar")
      return
    }

    setExportando(true)
    try {
      const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)
      
      // 1. Crear el libro de Excel
      const wb = new ExcelJS.Workbook()
      wb.creator = 'MegaFood'
      wb.created = new Date()

      // Paleta de colores
      const COLOR_OSCURO = 'FF2B2B2B'
      const COLOR_NARANJA = 'FFF37F21'
      const COLOR_VERDE = 'FF8CC63F'
      const COLOR_FONDO_GRIS = 'FFF5F5F0'

      // ==========================================
      // HOJA 1: RESUMEN
      // ==========================================
      const wsResumen = wb.addWorksheet('Resumen')
      
      wsResumen.mergeCells('A1:B2')
      const cellTitleRes = wsResumen.getCell('A1')
      cellTitleRes.value = 'RESUMEN GENERAL'
      cellTitleRes.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
      cellTitleRes.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
      cellTitleRes.alignment = { vertical: 'middle', horizontal: 'center' }

      wsResumen.addRow([])

      const resumenDatos: any[][] = [
        ['Sede Asignada', sedeInfo?.nombre || 'No especificada'],
        ['Fecha de Programación', fechaSeleccionada],
        ['N° de Personas (Comensales)', cantidadPersonas]
      ]

      resumenDatos.forEach(dato => {
        const row = wsResumen.addRow(dato)
        row.getCell(1).font = { bold: true, color: { argb: COLOR_OSCURO } }
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_FONDO_GRIS } }
        
        if (typeof dato[1] === 'number') {
           row.getCell(2).font = { bold: true, color: { argb: COLOR_NARANJA } }
        }
      })

      wsResumen.columns = [{ width: 35 }, { width: 30 }]

      // ==========================================
      // HOJA 2: DETALLE POR PLATO
      // ==========================================
      const wsDetalle = wb.addWorksheet('Detalle por Plato')
      
      wsDetalle.mergeCells('A1:E2')
      const cellTitleDet = wsDetalle.getCell('A1')
      cellTitleDet.value = `REPORTE DETALLADO - ${sedeInfo?.nombre?.toUpperCase() || 'SEDE'}`
      cellTitleDet.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
      cellTitleDet.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
      cellTitleDet.alignment = { vertical: 'middle', horizontal: 'center' }

      wsDetalle.addRow([]) // Espacio vacío

      const headers = ['Plato', 'Categoría', 'Insumo', 'Cantidad', 'Unidad']
      const rowHeader = wsDetalle.addRow(headers)
      rowHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_NARANJA } }
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
      })

      // Lógica de colores alternados por plato
      programacion.forEach((item, index) => {
        const insumosPlato = recetas.filter(r => r.plato_id === item.plato_id)
        
        // Alternamos entre Blanco y Verde Pastel suave
        const colorFondoPlato = index % 2 === 0 ? 'FFFFFFFF' : 'FFF5FBF0'
        
        insumosPlato.forEach(receta => {
          const insumo = insumos.find(i => i.id === receta.insumo_id)
          const cantidadTotal = receta.cantidad * cantidadPersonas
          const { cantidad: cF, unidad: uF } = formatearCantidad(cantidadTotal, insumo?.unidad || 'unid')
          const cantidadFinal = redondearCantidad(cF)
          
          const rowData: any[] = [
            item.plato_nombre,
            item.categoria,
            insumo?.nombre || 'Desconocido',
            cantidadFinal,
            uF
          ]
          
          const row = wsDetalle.addRow(rowData)
          
          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 10 }
            
            // Pintamos el fondo según el color asignado al plato
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondoPlato } }
            
            cell.border = {
              top: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              bottom: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              left: { style: 'hair', color: { argb: 'FFDDDDDD' } },
              right: { style: 'hair', color: { argb: 'FFDDDDDD' } }
            }
            cell.alignment = { vertical: 'middle', horizontal: colNumber >= 4 ? 'center' : 'left' }
            
            if (colNumber === 4) {
              cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: COLOR_NARANJA } }
            }
          })
        })
      })

      wsDetalle.columns = [
        { width: 35 }, // Plato
        { width: 20 }, // Categoría
        { width: 35 }, // Insumo
        { width: 15 }, // Cantidad
        { width: 15 }  // Unidad
      ]

      // Generar archivo
      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `reporte_completo_cocina_${sedeInfo?.nombre}_${fechaSeleccionada}.xlsx`)
    } catch (error) {
      console.error("Error al exportar completo:", error)
      alert("Error al exportar el archivo")
    } finally {
      setExportando(false)
    }
  }
const exportarSoloInsumos = async () => {
    if (programacion.length === 0) {
      alert("No hay programación para exportar")
      return
    }

    setExportandoSolo(true)
    try {
      const sedeInfo = sedes.find(s => s.id === sedeSeleccionada)
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Insumos por Plato')

      // Colores
      const COLOR_OSCURO = 'FF2B2B2B'
      const COLOR_VERDE = 'FF8CC63F'

      ws.mergeCells('A1:D2')
      const cellTitle = ws.getCell('A1')
      cellTitle.value = `INSUMOS REQUERIDOS - ${fechaSeleccionada}`
      cellTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } }
      cellTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_OSCURO } }
      cellTitle.alignment = { vertical: 'middle', horizontal: 'center' }

      ws.addRow([])

      const headers = ['Plato', 'Insumo', 'Cantidad', 'Unidad']
      const rowHeader = ws.addRow(headers)
      rowHeader.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_VERDE } }
        cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      // Lógica de colores alternados por plato
      programacion.forEach((item, index) => {
        const insumosPlato = recetas.filter(r => r.plato_id === item.plato_id)
        
        // Alternamos entre Blanco y Verde Pastel suave
        const colorFondoPlato = index % 2 === 0 ? 'FFE9F6DE' : 'FFCAEAB0'
        
        insumosPlato.forEach(receta => {
          const insumo = insumos.find(i => i.id === receta.insumo_id)
          const { cantidad: cF, unidad: uF } = formatearCantidad(
            receta.cantidad * cantidadPersonas, 
            insumo?.unidad || 'unid'
          )
          
          const rowData: any[] = [
            item.plato_nombre,
            insumo?.nombre || 'Desconocido',
            redondearCantidad(cF),
            uF
          ]

          const row = ws.addRow(rowData)
          row.eachCell((cell, colNumber) => {
            cell.font = { name: 'Arial', size: 10 }
            
            // Pintamos el fondo según el color asignado al plato
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colorFondoPlato } }
            
            cell.alignment = { vertical: 'middle', horizontal: colNumber >= 3 ? 'center' : 'left' }
            cell.border = {
              bottom: { style: 'hair', color: { argb: 'FFEEEEEE' } },
              top: { style: 'hair', color: { argb: 'FFEEEEEE' } },
              left: { style: 'hair', color: { argb: 'FFEEEEEE' } },
              right: { style: 'hair', color: { argb: 'FFEEEEEE' } }
            }
          })
        })
      })

      ws.columns = [
        { width: 35 }, { width: 35 }, { width: 15 }, { width: 15 }
      ]

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      saveAs(blob, `insumos_desglosados_${sedeInfo?.nombre || 'sede'}_${fechaSeleccionada}.xlsx`)
    } catch (error) {
      console.error("Error al exportar insumos:", error)
      alert("Error al exportar los insumos")
    } finally {
      setExportandoSolo(false)
    }
  }

  const programacionPorTipo = programacion.reduce((acc, item) => {
    if (!acc[item.tipo]) acc[item.tipo] = []
    acc[item.tipo].push(item)
    return acc
  }, {} as Record<string, ProgramacionItem[]>)

  const totalPlatos = programacion.length

  const copiarRequerimiento = () => {
    const texto = insumosRequeridos.map(i => {
      const { cantidad, unidad } = formatearCantidad(i.cantidad_total, i.unidad)
      const cantidadRedondeada = redondearCantidad(cantidad)
      return `${i.insumo_nombre}: ${cantidadRedondeada} ${unidad}`
    }).join("\n")
    
    navigator.clipboard.writeText(texto)
    alert("✅ Requerimiento copiado al portapapeles")
  }

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

        <div className="relative max-w-7xl mx-auto px-8 pt-24 pb-10">
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
                <span style={{ color: '#FFFFFF' }}>Requerimiento</span>
                <span style={{ color: '#F37F21' }}> Cocina</span>
              </h1>
              <p className="mt-2" style={{ color: '#C9C9C3', fontSize: '1rem' }}>
                Calcula los insumos necesarios según la programación del día.
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
              >
                <ArrowLeft size={18} />
                Panel
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Selector de Sede */}
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Building className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
              Sede
            </label>
            <select
              value={sedeSeleccionada}
              onChange={(e) => {
                setSedeSeleccionada(e.target.value)
                setFechaSeleccionada("")
                setProgramacion([])
                setInsumosRequeridos([])
              }}
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
            >
              <option value="">Seleccionar sede</option>
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Calendar className="inline w-4 h-4 mr-2 text-[#F37F21]" />
              Fecha de programación
            </label>
            <CalendarioProgramacion
              sedeId={sedeSeleccionada}
              onFechaSeleccionada={(fecha) => {
                setFechaSeleccionada(fecha)
                setProgramacion([])
                setInsumosRequeridos([])
              }}
              fechaSeleccionada={fechaSeleccionada}
            />
            {fechaSeleccionada && (
              <p className="text-xs text-[#8CC63F] mt-1">
                ✓ Fecha seleccionada: {fechaSeleccionada}
              </p>
            )}
          </div>

          {/* Número de personas */}
          <div>
            <label className="block text-sm font-medium text-[#2B2B2B] mb-1">
              <Users className="inline w-4 h-4 mr-2 text-[#8CC63F]" />
              N° de personas
            </label>
            <input
              type="number"
              value={cantidadPersonas}
              onChange={(e) => setCantidadPersonas(parseInt(e.target.value) || 0)}
              min="1"
              className="w-full rounded-lg border border-[#E7E7E2] px-4 py-2.5 text-sm text-[#2B2B2B] outline-none focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
            />
          </div>
        </div>

        {/* Botón calcular */}
        {fechaSeleccionada && (
          <div className="mb-6">
            {cargando ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#8CC63F]" />
              </div>
            ) : programacion.length > 0 ? (
              <button
                onClick={calcularRequerimiento}
                disabled={calculando}
                className="w-full md:w-auto px-6 py-3 rounded-lg bg-[#2B2B2B] text-white font-medium hover:bg-[#3B3B3B] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {calculando ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Calculator className="w-5 h-5" />
                )}
                {calculando ? "Calculando..." : `Calcular requerimiento para ${cantidadPersonas} personas`}
              </button>
            ) : (
              <div className="text-center py-8 rounded-lg border border-[#F37F21]/20 bg-[#F37F21]/5">
                <Calendar className="w-12 h-12 text-[#F37F21] mx-auto mb-2" />
                <p className="text-[#6B6B65]">No hay programación para esta fecha</p>
                <p className="text-xs text-[#9A9A93] mt-1">Selecciona otra fecha en el calendario</p>
              </div>
            )}
          </div>
        )}

        {/* Menú y Requerimiento */}
        {programacion.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Menú del día */}
            <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4" style={{ background: '#2B2B2B' }}>
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  Menú del {fechaSeleccionada}
                </h2>
              </div>
              <div className="p-5">
                {Object.entries(programacionPorTipo).map(([tipo, items]) => {
                  const tipoInfo = TIPOS_MENU.find(t => t.value === tipo)
                  return (
                    <div key={tipo} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs font-bold rounded-full px-3 py-1"
                          style={{ background: tipoInfo?.bg, color: tipoInfo?.color }}
                        >
                          {tipoInfo?.icon} {tipoInfo?.label}
                        </span>
                        <span className="text-xs text-[#9A9A93]">{items.length} platos</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((item) => {
                          const catColor = CAT_COLORS[item.categoria] || { color: "#555", bg: "#f5f5f5" }
                          return (
                            <div key={item.id} className="p-2 rounded-lg" style={{ background: catColor.bg }}>
                              <span className="text-[10px] font-bold uppercase block" style={{ color: catColor.color }}>
                                {item.categoria}
                              </span>
                              <span className="text-sm font-medium text-[#2B2B2B]">{item.plato_nombre}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                <div className="mt-4 pt-3 border-t border-[#E7E7E2]">
                  <p className="text-xs text-[#6B6B65] flex items-center gap-2">
                    <Users className="w-3 h-3" />
                    Total: {totalPlatos} platos · {cantidadPersonas} comensales
                  </p>
                </div>
              </div>
            </div>

            {/* Requerimiento de insumos */}
            <div className="rounded-lg border border-[#E7E7E2] bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-4" style={{ background: '#2B2B2B' }}>
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Requerimiento de Insumos
                </h2>
              </div>
              <div className="p-5">
                {insumosRequeridos.length === 0 ? (
                  <div className="text-center py-8 text-[#6B6B65]">
                    <Calculator className="w-12 h-12 mx-auto mb-2 text-[#9A9A93]" />
                    <p>Haz clic en "Calcular requerimiento"</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-[#E7E7E2]">
                      <p className="text-xs font-bold text-[#6B6B65] uppercase">Insumo</p>
                      <p className="text-xs font-bold text-[#6B6B65] uppercase">Cantidad total</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {insumosRequeridos.map((insumo) => {
                        const { cantidad: cantidadFormateada, unidad: unidadFormateada } = formatearCantidad(
                          insumo.cantidad_total,
                          insumo.unidad
                        )
                        const cantidadRedondeada = redondearCantidad(cantidadFormateada)
                        
                        return (
                          <div key={insumo.insumo_id} className="flex justify-between items-center py-2 border-b border-[#F5F5F0]">
                            <div>
                              <p className="text-sm font-medium text-[#2B2B2B]">{insumo.insumo_nombre}</p>
                              <p className="text-[10px] text-[#9A9A93]">
                                {insumo.cantidad_porcion.toFixed(3)} {insumo.unidad} × {cantidadPersonas} pers.
                              </p>
                            </div>
                            <p className="text-sm font-bold text-[#F37F21]">
                              {cantidadRedondeada} {unidadFormateada}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E7E7E2]">
                      <p className="text-xs text-[#6B6B65] flex justify-between">
                        <span>Total insumos:</span>
                        <span className="font-bold text-[#2B2B2B]">{insumosRequeridos.length} items</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Botones de exportación */}
        {insumosRequeridos.length > 0 && (
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={copiarRequerimiento}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
            >
              <Copy className="w-4 h-4" />
              Copiar lista
            </button>
            <button
              onClick={exportarSoloInsumos}
              disabled={exportandoSolo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#3B82F6] text-white font-medium hover:bg-[#2563EB] transition disabled:opacity-50"
            >
              {exportandoSolo ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {exportandoSolo ? "Exportando..." : "Exportar solo insumos"}
            </button>
            <button
              onClick={exportarAExcel}
              disabled={exportando}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-medium hover:bg-[#7AB835] transition disabled:opacity-50"
            >
              {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportando ? "Exportando..." : "Exportar reporte completo"}
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Requerimiento de cocina
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