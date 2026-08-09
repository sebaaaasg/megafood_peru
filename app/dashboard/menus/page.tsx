'use client'

import Link from 'next/link'
import { ArrowLeft, Upload, Calendar, Edit, Eye, ClipboardList } from 'lucide-react'

// ─────────────────────────────────────────────
// Constantes con iconos de Lucide React
// ─────────────────────────────────────────────
const MODULES = [
  { 
    id: 1, 
    href: "/dashboard/programacion/importar", 
    variant: "green", 
    title: "Importar Excel",
    description: "Carga los archivos de Gerencia para automatizar el calendario.",
    icon: Upload
  },
  { 
    id: 2, 
    href: "/dashboard/programacion/manual", 
    variant: "blue", 
    title: "Programar Manual",
    description: "Diseña el calendario semana a semana con total control.",
    icon: Calendar
  },
  { 
    id: 3, 
    href: "/dashboard/programacion/editar", 
    variant: "orange", 
    title: "Editar Programación",
    description: "Modifica, actualiza o elimina platos programados existentes.",
    icon: Edit
  },
  { 
    id: 4, 
    href: "/dashboard/programacion/visualizacion", 
    variant: "green", 
    title: "Visualizar Planificación",
    description: "Consulta el calendario completo de menús por sede y fecha.",
    icon: Eye
  },
] as const

const VARIANT_STYLES = {
  green: { 
    bg: 'bg-[#8CC63F]/10', 
    hover: 'hover:border-[#8CC63F] hover:shadow-md hover:-translate-y-1', 
    text: 'text-[#8CC63F]',
    border: 'border-[#8CC63F]/20',
    active: 'bg-[#8CC63F]',
    light: 'bg-[#8CC63F]/5'
  },
  blue: { 
    bg: 'bg-blue-500/10', 
    hover: 'hover:border-blue-500 hover:shadow-md hover:-translate-y-1', 
    text: 'text-blue-500',
    border: 'border-blue-500/20',
    active: 'bg-blue-500',
    light: 'bg-blue-500/5'
  },
  orange: { 
    bg: 'bg-[#F37F21]/10', 
    hover: 'hover:border-[#F37F21] hover:shadow-md hover:-translate-y-1', 
    text: 'text-[#F37F21]',
    border: 'border-[#F37F21]/20',
    active: 'bg-[#F37F21]',
    light: 'bg-[#F37F21]/5'
  },
} as const

// ─────────────────────────────────────────────
// Componente de Tarjeta
// ─────────────────────────────────────────────
const ModuleCard = ({ module }: { module: typeof MODULES[number] }) => {
  const style = VARIANT_STYLES[module.variant as keyof typeof VARIANT_STYLES]
  const Icon = module.icon
  
  return (
    <Link
      href={module.href}
      className={`
        group flex flex-col items-center text-center p-6 rounded-2xl 
        border-2 transition-all duration-300
        bg-white ${style.border} ${style.hover}
        hover:shadow-xl
        min-h-[180px] md:min-h-[200px]
        w-full
      `}
    >
      {/* Icono con fondo consistente */}
      <div className={`
        flex items-center justify-center
        w-16 h-16 md:w-20 md:h-20
        rounded-2xl transition-all duration-300
        ${style.bg} group-hover:scale-110
        mb-4
      `}>
        <Icon 
          className={`w-8 h-8 md:w-10 md:h-10 ${style.text}`} 
          strokeWidth={2} 
        />
      </div>
      
      {/* Texto */}
      <div className="flex-1 flex flex-col justify-center">
        <h3 className="text-base md:text-lg font-bold text-[#2B2B2B] group-hover:text-[#1a1a1a] transition">
          {module.title}
        </h3>
        <p className="text-xs md:text-sm text-[#6B6B65] mt-1.5 leading-relaxed max-w-[200px] mx-auto">
          {module.description}
        </p>
      </div>
      
      {/* Indicador de acción */}
      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className={`
          text-xs font-bold uppercase tracking-wider
          ${style.text}
        `}>
          Acceder →
        </span>
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function ProgramacionPage() {
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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                <span style={{ color: '#FFFFFF' }}>Programación de</span>
                <span style={{ color: '#F37F21' }}> Menús</span>
              </h1>
              <p className="mt-2 text-sm sm:text-base" style={{ color: '#C9C9C3' }}>
                Selecciona tu método de trabajo para los menús de la semana.
              </p>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition text-sm sm:text-base"
              >
                <ArrowLeft size={18} />
                Panel
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        {/* Grid 2x2 responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {MODULES.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>

        {/* Footer informativo */}
        <div className="mt-8 sm:mt-12 pt-4 border-t border-[#E7E7E2]">
          <p className="text-center text-xs text-[#9A9A93]">
            Gestión de menús corporativos · {new Date().getFullYear()}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>
            © 2026 MegaFood · Programación de menús
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