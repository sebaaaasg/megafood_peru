'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  IconImportar,
  IconManual,
  IconEditar,
  IconVisualizacion,
} from '@/app/dashboard/components/NucleoIcons'

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'
const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'
const VERDE = '#8CC63F'
const NARANJA = '#F37F21'
const PIEDRA = '#6B6B65'
const AZUL = '#3B82F6'

// ─────────────────────────────────────────────
// Constantes con iconos de Lucide React
// ─────────────────────────────────────────────
const MODULES = [
  {
    id: 1,
    href: "/dashboard/menus/importar",
    accent: VERDE,
    title: "Importar Excel",
    description: "Carga los archivos de Gerencia para automatizar el calendario.",
    icon: IconImportar
  },
  {
    id: 2,
    href: "/dashboard/menus/manual",
    accent: AZUL,
    title: "Programar Manual",
    description: "Diseña el calendario semana a semana con total control.",
    icon: IconManual
  },
  {
    id: 3,
    href: "/dashboard/menus/editar",
    accent: NARANJA,
    title: "Editar Programación",
    description: "Modifica, actualiza o elimina platos programados existentes.",
    icon: IconEditar
  },
  {
    id: 4,
    href: "/dashboard/menus/visualizacion",
    accent: VERDE,
    title: "Visualizar Planificación",
    description: "Consulta el calendario completo de menús por sede y fecha.",
    icon: IconVisualizacion
  },
] as const

// ─────────────────────────────────────────────
// Componente de Tarjeta
// ─────────────────────────────────────────────
const ModuleCard = ({ module }: { module: typeof MODULES[number] }) => {
  const Icon = module.icon
  const [hover, setHover] = useState(false)

  return (
    <Link
      href={module.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex min-h-[200px] flex-col items-center gap-4 p-6 text-center transition-colors duration-150"
      style={{
        background: hover ? OSCURO : '#fff',
        color: hover ? '#fff' : OSCURO,
        borderTop: `6px solid ${module.accent}`,
      }}
    >
      <div
        className="flex h-16 w-16 items-center justify-center md:h-20 md:w-20"
        style={{ background: hover ? 'rgba(255,255,255,0.12)' : `${module.accent}1F`, color: module.accent }}
      >
        <Icon className="h-8 w-8 md:h-10 md:w-10" strokeWidth={2} />
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <h3 className="text-base font-extrabold md:text-lg">
          {module.title}
        </h3>
        <p className="mx-auto mt-1.5 max-w-[200px] text-xs leading-relaxed md:text-sm" style={{ color: hover ? 'rgba(255,255,255,0.75)' : PIEDRA }}>
          {module.description}
        </p>
      </div>

      <span
        className="text-xs font-extrabold uppercase"
        style={{ letterSpacing: '0.12em', color: module.accent }}
      >
        Acceder →
      </span>
    </Link>
  )
}

// ─────────────────────────────────────────────
// Componente Principal
// ─────────────────────────────────────────────
export default function ProgramacionPage() {
  return (
    <div className="min-h-screen w-full" style={{ background: FONDO, color: OSCURO, fontFamily: ARCHIVO }}>
      {/* ─── Encabezado ─── */}
      <div className="flex border-b-2" style={{ borderColor: PIEDRA }}>
        <div className="w-2 shrink-0" style={{ background: NARANJA }} aria-hidden="true" />
        <div className="flex-1 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-4 text-[10px] font-extrabold" style={{ letterSpacing: '0.2em', color: PIEDRA }}>
            PANEL DE LOGÍSTICA · MÓDULO DE GESTIÓN
          </div>
          <h1
            className="text-[36px] sm:text-[48px]"
            style={{ margin: 0, lineHeight: 0.95, letterSpacing: '-0.035em', fontWeight: 800 }}
          >
            Programación de <span style={{ color: NARANJA }}>menús</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px]" style={{ color: PIEDRA }}>
            Selecciona tu método de trabajo para los menús de la semana.
          </p>

          <div className="mt-8">
            <Link
              href="/dashboard"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-extrabold uppercase transition-colors"
              style={{ letterSpacing: '0.06em', border: `2px solid ${OSCURO}`, color: OSCURO }}
            >
              ← Panel
            </Link>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {MODULES.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8" style={{ borderTop: `2px solid ${OSCURO}` }}>
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-2 px-4 py-4 sm:flex-row sm:px-8">
          <p className="text-[13px]" style={{ color: PIEDRA }}>
            Megafood Perú · Programación de menús · v1.0
          </p>
          <span className="flex gap-2" aria-hidden="true">
            <span style={{ width: 26, height: 6, background: PIEDRA }} />
            <span style={{ width: 26, height: 6, background: VERDE }} />
            <span style={{ width: 26, height: 6, background: NARANJA }} />
          </span>
        </div>
      </footer>
    </div>
  )
}
