'use client'

import { X, ChefHat, Calendar, AlertCircle, Loader2 } from 'lucide-react'

interface Plato {
  id: string
  nombre: string
  categoria: string
}

interface ModalEditarPlatoProps {
  isOpen: boolean
  onClose: () => void
  platosDisponibles: Plato[]
  categoria: string
  fechaLegible: string
  platoActual: string
  platoActualNombre: string
  platoSeleccionado: string
  onPlatoChange: (platoId: string) => void
  onGuardar: () => void
  isLoading?: boolean
}

export default function ModalEditarPlato({
  isOpen,
  onClose,
  platosDisponibles,
  categoria,
  fechaLegible,
  platoActual,
  platoActualNombre,
  platoSeleccionado,
  onPlatoChange,
  onGuardar,
  isLoading = false
}: ModalEditarPlatoProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div
        className="bg-[#FEFEFA] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="relative px-6 py-6 border-b border-[#DED8CF] bg-gradient-to-r from-[#F5F5F0] to-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-lg flex-shrink-0"
                style={{ background: '#8CC63F' }}
              >
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#2C2C24] leading-tight">
                  Cambiar plato
                </h2>
                <p className="text-sm text-[#78786C] mt-0.5">
                  Selecciona un nuevo plato para esta posición
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-[#9A9A93] hover:text-[#2C2C24] transition p-1 rounded-lg hover:bg-[#F5F5F0]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">

          {/* Información actual */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#78786C] uppercase tracking-wide mb-1.5">
                📅 Fecha
              </label>
              <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F5F0] rounded-lg border border-[#DED8CF]">
                <Calendar className="w-4 h-4 text-[#8CC63F] flex-shrink-0" />
                <span className="text-sm font-medium text-[#2C2C24]">{fechaLegible}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#78786C] uppercase tracking-wide mb-1.5">
                🏷️ Categoría
              </label>
              <div className="px-4 py-3 bg-[#F5F5F0] rounded-lg border border-[#DED8CF]">
                <span className="text-sm font-medium text-[#2C2C24]">{categoria}</span>
              </div>
            </div>
          </div>

          {/* Plato actual */}
          {platoActual && (
            <div className="p-4 rounded-lg border-l-4" style={{
              borderColor: '#8CC63F',
              background: '#F5FBF0'
            }}>
              <p className="text-xs font-semibold text-[#78786C] uppercase tracking-wide mb-1">
                ✓ Plato actual
              </p>
              <p className="text-sm font-medium text-[#2C2C24]">{platoActualNombre}</p>
            </div>
          )}

          {/* Selector de nuevo plato */}
          <div>
            <label className="block text-xs font-semibold text-[#78786C] uppercase tracking-wide mb-2">
              🍽️ Nuevo plato
            </label>
            <select
              value={platoSeleccionado}
              onChange={(e) => onPlatoChange(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border-2 border-[#DED8CF] px-4 py-3 text-sm text-[#2C2C24] font-medium outline-none transition-all focus:border-[#8CC63F] focus:ring-2 focus:ring-[#8CC63F]/20"
            >
              <option value="">Seleccionar un plato...</option>
              {platosDisponibles.length === 0 ? (
                <option disabled>No hay platos disponibles en esta categoría</option>
              ) : (
                platosDisponibles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))
              )}
            </select>

            {platosDisponibles.length === 0 && (
              <div className="mt-2 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  No hay otros platos disponibles en la categoría <strong>{categoria}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F5F5F0] border-t border-[#DED8CF] flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-lg border border-[#DED8CF] text-[#78786C] font-semibold hover:bg-[#FEFEFA] transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            disabled={!platoSeleccionado || isLoading}
            className="flex-1 py-2.5 px-4 rounded-lg font-semibold text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: platoSeleccionado ? '#8CC63F' : '#CCCCCC',
              color: platoSeleccionado ? 'white' : '#999'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                Cambiar plato
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
