'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from '@/lib/supabase/client';
import EstacionesDrawer from "@/app/dashboard/components/EstacionesDrawer";
import BarraSuperior from "@/app/dashboard/components/BarraSuperior";
import {
  estacionesVisibles,
  P,
  TONOS,
  type Estacion,
} from "@/app/dashboard/components/estaciones";

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'
const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'

// ─────────────────────────────────────────────────────────
// Tarjeta de estación
// ─────────────────────────────────────────────────────────
function TarjetaEstacion({ estacion }: { estacion: Estacion; indice: number }) {
  const Icon = estacion.icon
  const acento = TONOS[estacion.tone].solido
  const [hover, setHover] = useState(false)

  return (
    <Link
      href={estacion.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex min-h-[200px] flex-col gap-2.5 p-5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        textDecoration: 'none',
        background: hover ? OSCURO : '#fff',
        color: hover ? '#fff' : OSCURO,
        borderTop: `6px solid ${acento}`,
        // @ts-expect-error -- variables CSS del anillo de foco
        '--tw-ring-color': acento,
        '--tw-ring-offset-color': FONDO,
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[44px] font-extrabold leading-none" style={{ letterSpacing: '-0.04em' }}>
          {estacion.n}
        </span>
        <Icon filled={hover} style={{ width: 22, height: 22 }} strokeWidth={2} />
      </div>

      <div className="mt-auto">
        <div className="text-[24px] font-extrabold" style={{ letterSpacing: '-0.025em' }}>
          {estacion.label}
        </div>
        <div className="mt-0.5 text-[13px]" style={{ opacity: 0.65 }}>
          {estacion.hint}
        </div>
      </div>

      <span
        className="inline-block w-fit pt-2.5 text-[11px] font-extrabold uppercase"
        style={{ letterSpacing: '0.12em', color: acento, borderTop: `2px solid ${acento}` }}
      >
        Abrir →
      </span>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────

export default function MainMenu() {
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState<string>("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 🔥 Obtener full_name y role de la tabla profiles en una sola query
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', user.id)
        .single();

      let displayName = profile?.full_name || user.email?.split('@')[0] || 'Colaborador';
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

      setUserName(displayName);
      setUserRole(profile?.role ?? null);
      setLoading(false);
    };

    getUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen w-full items-center justify-center"
        style={{ background: FONDO, fontFamily: ARCHIVO }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4"
            style={{ borderColor: P.verde, borderTopColor: 'transparent' }}
          />
          <p style={{ color: P.tintaSuave }}>Cargando panel...</p>
        </div>
      </div>
    );
  }

  const visibles = estacionesVisibles(userRole);

  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date()).toUpperCase();

  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: FONDO, color: OSCURO, fontFamily: ARCHIVO }}
    >
      <EstacionesDrawer
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
        role={userRole}
        displayName={userName}
      />

      <BarraSuperior
        displayName={userName}
        menuAbierto={menuAbierto}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      {/* ─── Encabezado ─── */}
      <div className="flex border-b-2" style={{ borderColor: P.piedra }}>
        <div className="w-2 shrink-0" style={{ background: P.verde }} aria-hidden="true" />
        <div className="grid flex-1 items-end gap-6 px-5 py-10 sm:grid-cols-[1fr_auto] sm:px-8 sm:py-14">
          <div>
            <div
              className="mb-4 text-[10px] font-extrabold"
              style={{ letterSpacing: '0.2em', color: P.piedra }}
            >
              PANEL DE LOGÍSTICA · {visibles.length} ESTACIÓN{visibles.length === 1 ? '' : 'ES'}
            </div>
            <h1
              className="text-[40px] sm:text-[56px] lg:text-[70px]"
              style={{ margin: 0, lineHeight: 0.95, letterSpacing: '-0.035em', fontWeight: 800 }}
            >
              Hola, <span style={{ color: P.naranja }}>{userName}</span>
            </h1>
          </div>
          <div
            className="border-l-2 pl-4 text-[11px] font-extrabold sm:leading-[1.7]"
            style={{ borderColor: P.piedra, letterSpacing: '0.08em', color: P.piedra }}
          >
            {fecha}
            <br />
            {hora}
            <br />
            <span style={{ color: OSCURO }}>{visibles.length} / {visibles.length} ACTIVAS</span>
          </div>
        </div>
      </div>

      {/* ─── Estaciones ─── */}
      <div className="flex-1 px-5 py-8 sm:px-8 sm:py-11">
        <div className="flex items-baseline justify-between border-b-2 pb-3" style={{ borderColor: OSCURO }}>
          <h2 className="text-[26px]" style={{ margin: 0, letterSpacing: '-0.02em', fontWeight: 800 }}>
            Estaciones operativas
          </h2>
        </div>

        {visibles.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 min-[560px]:grid-cols-2 xl:grid-cols-3">
            {visibles.map((estacion, i) => (
              <TarjetaEstacion key={estacion.id} estacion={estacion} indice={i} />
            ))}
          </div>
        ) : (
          <div
            className="mt-6 px-7 py-14 text-center"
            style={{ background: '#fff', color: P.tintaSuave }}
          >
            No tienes estaciones asignadas. Contacta a un administrador.
          </div>
        )}
      </div>
    </div>
  );
}
