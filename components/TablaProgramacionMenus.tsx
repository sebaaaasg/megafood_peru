// app/components/TablaProgramacionMenu.tsx
'use client'

import { Fragment, useMemo } from 'react'
import { Users } from 'lucide-react'

// ─── Constantes compartidas ───
export const CATEGORIAS_ORDEN = [
  "ENTRADA", "CÁRNICO", 
  "GUARNICIÓN 01", "GUARNICIÓN 02", "GUARNICIÓN 03", 
  "POSTRE", "BEBIBLE", "SALSA"
]

export const TIPOS_ORDEN = ["estandar", "dieta", "especial", "evento"]

export const TIPOS_MENU = [
  { value: "estandar", label: "Estándar", color: "#8CC63F", bg: "#EAF5DE", icon: "📋" },
  { value: "dieta", label: "Dieta", color: "#3B82F6", bg: "#EFF6FF", icon: "🥗" },
  { value: "especial", label: "Especial", color: "#8B5CF6", bg: "#F5F3FF", icon: "⭐" },
  { value: "evento", label: "Evento", color: "#F37F21", bg: "#FFF7ED", icon: "🎯" },
]

// ─── Tipos ───
export interface PlatoProgramado {
  tipo: string
  categoria_general: string
  categoria_especifica: string
  nombre: string
}

export interface DiaProgramado {
  fecha: string
  platos: PlatoProgramado[]
  comensalesPorTipo?: Record<string, number>
}

// ─── Estilos por tipo de menú ───
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

// ─── Componente ───
interface TablaProgramacionMenuProps {
  platosProgramados: DiaProgramado[]
  mostrarComensales?: boolean
  titulo?: string
  className?: string
}

export default function TablaProgramacionMenu({
  platosProgramados,
  mostrarComensales = true,
  titulo = "📋 Menús programados",
  className = ""
}: TablaProgramacionMenuProps) {
  
  // Data pivotada (misma lógica que tenías)
  const tablaMenu = useMemo(() => {
    const dias = platosProgramados.map(d => d.fecha)
    const tiposPresentes = TIPOS_ORDEN.filter(t =>
      platosProgramados.some(d => d.platos.some((p) => p.tipo === t))
    )

    const lookup: Record<string, Record<string, Record<string, string>>> = {}
    const comensales: Record<string, Record<string, number>> = {}
    
    platosProgramados.forEach(dia => {
      dia.platos.forEach((p) => {
        lookup[p.tipo] = lookup[p.tipo] || {}
        lookup[p.tipo][p.categoria_especifica] = lookup[p.tipo][p.categoria_especifica] || {}
        lookup[p.tipo][p.categoria_especifica][dia.fecha] = p.nombre
      })
      if (mostrarComensales) {
        Object.entries(dia.comensalesPorTipo || {}).forEach(([tipo, valor]) => {
          comensales[tipo] = comensales[tipo] || {}
          comensales[tipo][dia.fecha] = valor as number
        })
      }
    })

    return { dias, tiposPresentes, lookup, comensales }
  }, [platosProgramados, mostrarComensales])

  if (platosProgramados.length === 0) return null

  return (
    <div className={className}>
      {titulo && <h3 className="font-bold text-[#2B2B2B] mb-3">{titulo}</h3>}
      
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
                  <tr className={getMenuStyle(tipo).header}>
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
                        className={ci % 2 === 0
                          ? getMenuStyle(tipo).cell
                          : getMenuStyle(tipo).cellAlt
                        }
                      >
                        <td
                          className={`
                            sticky left-0 z-10 px-3 py-2 font-semibold
                            whitespace-nowrap border-r-2
                            ${getMenuStyle(tipo).category}
                            ${getMenuStyle(tipo).border}
                          `}
                        >
                          {cat}
                        </td>
                        {tablaMenu.dias.map((fecha, di) => (
                          <td
                            key={di}
                            className={`
                              px-3 py-2
                              text-[#2B2B2B]
                              border-l
                              ${getMenuStyle(tipo).border}
                              whitespace-nowrap
                            `}
                          >
                            {tablaMenu.lookup[tipo][cat][fecha] || (
                              <span className="text-[#B0B0A8]">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}

                  {/* Fila de comensales */}
                  {mostrarComensales && tablaMenu.comensales[tipo] && (
                    <tr className="bg-[#FFF6EC] border-t-2 border-[#F37F21]/30">
                      <td className="sticky left-0 z-10 px-3 py-2 font-bold text-[#F37F21] bg-[#FFF6EC] whitespace-nowrap flex items-center gap-1.5">
                        <Users size={12} />
                        COMENSALES
                      </td>
                      {tablaMenu.dias.map((fecha, di) => (
                        <td
                          key={di}
                          className="px-3 py-2 font-bold text-[#F37F21] border-l border-[#E7E7E2] whitespace-nowrap"
                        >
                          {tablaMenu.comensales[tipo][fecha] ?? (
                            <span className="text-[#B0B0A8] font-normal">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}