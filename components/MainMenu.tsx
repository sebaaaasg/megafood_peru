'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from '@/lib/supabase/client';
import { LogOut } from "lucide-react";
import { IconMenuBurger } from "@/app/dashboard/components/NucleoIcons";
import EstacionesDrawer from "@/app/dashboard/components/EstacionesDrawer";
import { estacionesVisibles, P, TONOS, type Estacion } from "@/app/dashboard/components/estaciones";

/** Iniciales para el avatar: "Juan Pérez" -> "JP", "Administrador" -> "A". */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase()
  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase()
}

// ─────────────────────────────────────────────────────────
// Rail lateral oscuro. La hamburguesa de arriba abre el mismo
// drawer que usa el resto del dashboard; los botones de abajo
// son accesos directos a cada estación.
// ─────────────────────────────────────────────────────────
function Rail({
  items,
  onAbrirMenu,
  iniciales: ini,
}: {
  items: Estacion[]
  onAbrirMenu: () => void
  iniciales: string
}) {
  const pathname = usePathname()

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col items-center gap-8 px-0 pb-8 pt-6 sm:flex"
      style={{ width: 92, background: P.a900, borderRadius: '0 40px 40px 0' }}
    >
      {/* Las tres barras */}
      <button
        type="button"
        onClick={onAbrirMenu}
        aria-label="Abrir menú de estaciones"
        aria-controls="drawer-estaciones"
        title="Menú"
        className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          background: P.a,
          color: P.n100,
          // @ts-expect-error -- variables CSS del anillo de foco
          '--tw-ring-color': P.a300,
          '--tw-ring-offset-color': P.a900,
        }}
      >
        <IconMenuBurger style={{ width: 24, height: 24 }} strokeWidth={2.75} />
      </button>

      {/* Accesos directos */}
      <nav className="flex flex-col items-center gap-3.5" aria-label="Estaciones">
        {items.map((est) => {
          const Icon = est.icon
          const activa = pathname === est.href || pathname.startsWith(est.href + '/')

          return (
            <Link
              key={est.id}
              href={est.href}
              title={est.label}
              aria-label={est.label}
              aria-current={activa ? 'page' : undefined}
              className="flex h-[52px] w-[52px] items-center justify-center rounded-[20px] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                background: activa ? P.b : 'transparent',
                color: activa ? P.n100 : P.a300,
                // @ts-expect-error -- variables CSS del anillo de foco
                '--tw-ring-color': P.a300,
                '--tw-ring-offset-color': P.a900,
              }}
            >
              <Icon filled={activa} style={{ width: 23, height: 23 }} strokeWidth={2.4} />
            </Link>
          )
        })}
      </nav>

      <span
        className="mt-auto flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold"
        style={{ background: P.b700, color: P.n100 }}
        aria-hidden="true"
      >
        {ini}
      </span>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────
// Tarjeta de estación
// ─────────────────────────────────────────────────────────
function StationCard({ station }: { station: Estacion }) {
  const Icon = station.icon
  const t = TONOS[station.tone]
  const [hover, setHover] = useState(false)

  return (
    <Link
      href={station.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative flex flex-col gap-3 overflow-hidden p-6 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2"
      style={{
        background: P.n100,
        borderRadius: 32,
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover
          ? '0 3px 10px rgba(46,43,37,0.16)'
          : '0 1px 2px rgba(46,43,37,0.14)',
        // @ts-expect-error -- variables CSS del anillo de foco
        '--tw-ring-color': t.chip,
        '--tw-ring-offset-color': P.bg,
      }}
    >
      {/* Halo decorativo */}
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-[120px] w-[120px] rounded-full"
        style={{ background: t.halo }}
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-between">
        <span
          className="flex h-[54px] w-[54px] items-center justify-center rounded-[20px] transition-transform duration-300 group-hover:scale-105"
          style={{ background: t.chip, color: t.onChip }}
        >
          <Icon filled={hover} style={{ width: 25, height: 25 }} strokeWidth={2.4} />
        </span>
        <span
          className="text-[11px] font-extrabold"
          style={{ letterSpacing: '0.14em', color: P.n600 }}
        >
          EST. {station.n}
        </span>
      </div>

      <div className="relative">
        <h3 className="text-2xl" style={{ fontFamily: 'var(--font-caprasimo)', color: P.text, margin: '0 0 4px' }}>
          {station.label}
        </h3>
        <p className="text-sm" style={{ color: P.n700, margin: 0 }}>
          {station.hint}
        </p>
      </div>

      <div
        className="relative mt-auto flex items-center justify-end pt-3.5"
        style={{ borderTop: `1px solid ${P.n300}` }}
      >
        <span
          className="inline-flex items-center gap-1 text-sm font-bold transition-transform duration-200 group-hover:translate-x-0.5"
          style={{ color: t.link }}
        >
          Abrir ↗
        </span>
      </div>
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center" style={{ background: P.bg }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: P.a, borderTopColor: 'transparent' }}
          />
          <p style={{ color: P.n700 }}>Cargando panel...</p>
        </div>
      </div>
    );
  }

  const visibles = estacionesVisibles(userRole);
  const ini = iniciales(userName);

  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="flex min-h-screen w-full" style={{ background: P.bg, color: P.text }}>
      <Rail items={visibles} onAbrirMenu={() => setMenuAbierto(true)} iniciales={ini} />

      <EstacionesDrawer
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
        role={userRole}
        displayName={userName}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-6 px-4 pb-14 pt-6 sm:px-8 lg:px-10">

        {/* ─── Cabecera ─── */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* En móvil el rail no se muestra: la hamburguesa vive aquí */}
            <button
              type="button"
              onClick={() => setMenuAbierto(true)}
              aria-label="Abrir menú de estaciones"
              aria-controls="drawer-estaciones"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 focus:outline-none focus:ring-2 sm:hidden"
              style={{ background: P.a, color: P.n100 }}
            >
              <IconMenuBurger style={{ width: 22, height: 22 }} strokeWidth={2.75} />
            </button>

            <Link href="/dashboard" className="flex items-baseline gap-2.5">
              <span className="text-2xl" style={{ fontFamily: 'var(--font-caprasimo)', color: P.text }}>
                Megafood
              </span>
              <span className="text-2xl" style={{ fontFamily: 'var(--font-caprasimo)', color: P.b700 }}>
                Perú
              </span>
            </Link>
          </div>

          <div
            className="flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-2"
            style={{ background: P.n100, border: `1px solid ${P.n300}` }}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: P.b600, color: P.n100 }}
              aria-hidden="true"
            >
              {ini}
            </span>
            <span className="hidden max-w-[150px] truncate text-[13px] font-bold sm:block">
              {userName}
            </span>
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              style={{ color: P.n700 }}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ─── Hero ─── */}
        <section
          className="relative flex items-center gap-10 overflow-hidden px-7 py-10 sm:px-13 sm:py-12"
          style={{ background: P.a900, color: P.n100, borderRadius: 40 }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                `repeating-linear-gradient(135deg, ${P.a800} 0 22px, transparent 22px 44px), repeating-linear-gradient(45deg, ${P.a800} 0 22px, transparent 22px 44px)`,
              backgroundSize: '62px 62px',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute -top-[90px] right-[-70px] h-[340px] w-[340px] rounded-full opacity-50"
            style={{ background: P.b700 }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[-120px] right-[120px] h-[240px] w-[240px] rounded-full opacity-60"
            style={{ background: P.a600 }}
            aria-hidden="true"
          />

          <div className="relative flex-1">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[12px] font-extrabold uppercase"
              style={{ background: P.b, color: P.a900, letterSpacing: '0.12em' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 20A7 7 0 0 1 18 4c0 8-4 12-7 16Z" />
                <path d="M11 20c-4 0-6-3-6-3" />
              </svg>
              Panel de logística
            </span>

            <h1
              className="text-5xl sm:text-6xl lg:text-[76px]"
              style={{
                fontFamily: 'var(--font-caprasimo)',
                margin: '18px 0 6px',
                letterSpacing: '-0.02em',
                lineHeight: 0.95,
              }}
            >
              Mega<span style={{ color: P.a400 }}>food</span>
            </h1>

            <p className="text-[17px]" style={{ maxWidth: '46ch', color: P.n300, margin: 0 }}>
              Hola, {userName}.
              <br />
              <span className="capitalize">{fecha}.</span>
            </p>
          </div>
        </section>

        {/* ─── Estaciones ─── */}
        <section className="mx-auto w-full max-w-[1180px]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl sm:text-[28px]" style={{ fontFamily: 'var(--font-caprasimo)', margin: 0 }}>
              Estaciones operativas
            </h2>
          </div>

          {visibles.length > 0 ? (
            // 1 columna en móvil, 2x2 al encoger la ventana, 3 en pantalla amplia.
            <div className="grid grid-cols-1 gap-[18px] min-[560px]:grid-cols-2 xl:grid-cols-3">
              {visibles.map((est) => (
                <StationCard key={est.id} station={est} />
              ))}
            </div>
          ) : (
            <div
              className="px-6 py-12 text-center"
              style={{ background: P.n100, borderRadius: 32, color: P.n700 }}
            >
              No tienes estaciones asignadas. Contacta a un administrador.
            </div>
          )}
        </section>

        {/* ─── Pie ─── */}
        <footer
          className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-4 px-7 py-5"
          style={{ background: P.surface, borderRadius: 32 }}
        >
          <span className="text-[13px]" style={{ color: P.n700 }}>
            Megafood Perú · Panel de logística · v2.0
          </span>
          <span className="flex gap-2" aria-hidden="true">
            <span className="h-2 w-[26px] rounded-full" style={{ background: P.a }} />
            <span className="h-2 w-[26px] rounded-full" style={{ background: P.b600 }} />
            <span className="h-2 w-[26px] rounded-full" style={{ background: P.a400 }} />
          </span>
        </footer>
      </div>
    </div>
  );
}
