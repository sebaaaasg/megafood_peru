// components/ExportadorExcel.tsx
import { useState } from 'react';
import * as XLSX from 'xlsx';

interface ExportadorExcelProps {
  datos: any[];
  metadata: {
    sedeNombre: string;
    fecha: string;
    cantidadPersonas: number;
    rol: 'gerencia' | 'compras';
    costoTotal?: number;
  };
  opciones?: {
    incluirResumen?: boolean;
    incluirGraficos?: boolean;
    formato?: 'excel' | 'csv';
  };
  disabled?: boolean;
  onExport?: () => void;
}

export const ExportadorExcel = ({ 
  datos, 
  metadata, 
  opciones = {}, 
  disabled = false,
  onExport 
}: ExportadorExcelProps) => {
  const [exportando, setExportando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  const exportar = async (formato: 'excel' | 'csv') => {
    setExportando(true);
    try {
      if (formato === 'excel') {
        await exportarExcel();
      } else {
        await exportarCSV();
      }
      onExport?.();
    } catch (error) {
      console.error('Error en exportación:', error);
    } finally {
      setExportando(false);
      setMostrarModal(false);
    }
  };

  const exportarExcel = async () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja de resumen
    if (opciones.incluirResumen !== false) {
      const resumenData = [
        ['REPORTE DE REQUERIMIENTO'],
        ['Sede:', metadata.sedeNombre],
        ['Fecha:', metadata.fecha],
        ['Comensales:', metadata.cantidadPersonas],
        ['Total Insumos:', datos.length],
        ...(metadata.rol === 'gerencia' ? [['Costo Total:', metadata.costoTotal]] : [])
      ];
      const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
      XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    }
    
    // Hoja de datos
    const wsDatos = XLSX.utils.json_to_sheet(datos);
    XLSX.utils.book_append_sheet(wb, wsDatos, 'Insumos');
    
    const nombreArchivo = `requerimiento_${metadata.sedeNombre}_${metadata.fecha}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  const exportarCSV = async () => {
    const ws = XLSX.utils.json_to_sheet(datos);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `requerimiento_${metadata.sedeNombre}_${metadata.fecha}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        disabled={disabled || exportando}
        className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-bold hover:bg-white/30 transition disabled:opacity-50 flex items-center gap-1"
      >
        {exportando ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <i className="ti ti-file-excel" />
        )}
        Exportar
      </button>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-bold text-lg mb-4">Exportar reporte</h3>
            <div className="space-y-3">
              <button
                onClick={() => exportar('excel')}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <i className="ti ti-file-excel" /> Excel (.xlsx)
              </button>
              <button
                onClick={() => exportar('csv')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <i className="ti ti-file-text" /> CSV
              </button>
              <button
                onClick={() => setMostrarModal(false)}
                className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};