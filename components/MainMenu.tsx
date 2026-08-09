'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Package,
  UtensilsCrossed,
  Calendar,
  ShoppingCart,
  ClipboardList,
  ArrowUpRight,
  Leaf,
  LogOut,
  UserCircle,
} from "lucide-react";

type StationType = {
  id: string;
  n: string;
  title: string;
  description: string;
  icon: typeof Users;
  href: string;
  tone: "green" | "orange";
};

/*
  MEGA FOOD — Panel de logística
  Paleta corporativa exclusiva:
    Verde lima   #8CC63F  -> destacados / secundario
    Naranja      #F37F21  -> acentos, títulos, CTAs
    Blanco       #FFFFFF  -> fondo
  Tonos derivados solo para profundidad (hover / texto largo):
    Verde oscuro  #4A7A1E
    Naranja oscuro#C4600F
    Carbón        #2B2B2B (texto de lectura, nunca negro puro)

  Concepto: tablero de "comanda de cocina". Cada módulo es una estación
  operativa numerada (01–06) porque el flujo real de un negocio de menús
  SÍ es secuencial: insumos entran, se convierten en recetas, se programan
  en el menú, se preparan en cocina y generan la próxima orden de compra.
*/

const stations: StationType[] = [
  {
    id: "usuarios",
    n: "01",
    title: "Personal",
    description: "Roles y accesos por local",
    icon: Users,
    href: "/dashboard/usuarios",
    tone: "green",
  },
  {
    id: "insumos",
    n: "02",
    title: "Insumos",
    description: "Catálogo e inventario",
    icon: Package,
    href: "/dashboard/insumos",
    tone: "orange",
  },
  {
    id: "platos",
    n: "03",
    title: "Platos",
    description: "Componentes de cada plato",
    icon: UtensilsCrossed,
    href: "/dashboard/platos",
    tone: "green",
  },
  {
    id: "menus",
    n: "04",
    title: "Menús",
    description: "Programación por semana",
    icon: Calendar,
    href: "/dashboard/menus",
    tone: "orange",
  },
  {
    id: "cocina",
    n: "05",
    title: "Cocina",
    description: "Requerimiento diario",
    icon: ShoppingCart,
    href: "/dashboard/cocina",
    tone: "green",
  },
  {
    id: "compra",
    n: "06",
    title: "Compras",
    description: "Órdenes a proveedores",
    icon: ClipboardList,
    href: "/dashboard/compras",
    tone: "orange",
  },
] as const;

const toneStyles = {
  green: {
    ticket: "#8CC63F",
    iconBg: "#8CC63F",
    iconFg: "#1F3A0A",
    numFg: "#4A7A1E",
    hoverBorder: "#8CC63F",
  },
  orange: {
    ticket: "#F37F21",
    iconBg: "#F37F21",
    iconFg: "#FFFFFF",
    numFg: "#C4600F",
    hoverBorder: "#F37F21",
  },
};

function StationCard({ station }: { station: StationType }) {
  const Icon = station.icon;
  const t = toneStyles[station.tone];
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      href={station.href}
  className="group relative flex flex-col justify-between overflow-hidden bg-white transition-all duration-200 p-4 sm:p-6"
  style={{
    borderLeft: `1.5px solid ${isHovered ? t.hoverBorder : "#E7E7E2"}`,
    borderRight: `1.5px solid ${isHovered ? t.hoverBorder : "#E7E7E2"}`,
    borderBottom: `1.5px solid ${isHovered ? t.hoverBorder : "#E7E7E2"}`,
    borderTop: `5px solid ${t.ticket}`,
    borderRadius: "4px",
    minHeight: "150px",
    transform: isHovered ? "translateY(-3px)" : "translateY(0)",
    boxShadow: isHovered ? "0 10px 24px -12px rgba(43,43,43,0.22)" : "none",
  }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ticket perforation dots, kitchen-order motif */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-between px-3"
        style={{ transform: "translateY(-3px)" }}
        aria-hidden="true"
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: "#FFFFFF",
              display: "inline-block",
            }}
          />
        ))}
      </div>

      <div className="flex items-start justify-between">
        <div
          className="flex items-center justify-center"
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "4px",
            background: t.iconBg,
            color: t.iconFg,
          }}
        >
          <Icon size={26} strokeWidth={2} />
        </div>
        <span
          className="font-mono tracking-wider"
          style={{ fontSize: "13px", fontWeight: 700, color: t.numFg, letterSpacing: "0.05em" }}
        >
          EST. {station.n}
        </span>
      </div>

      <div className="mt-5">
        <h3
          style={{
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#2B2B2B",
            letterSpacing: "-0.01em",
          }}
        >
          {station.title}
        </h3>
        <p style={{ fontSize: "0.9rem", color: "#6B6B65", marginTop: "0.25rem" }}>
          {station.description}
        </p>
      </div>

      <div
        className="mt-4 inline-flex items-center gap-1 transition-transform duration-200 group-hover:translate-x-1"
        style={{ fontSize: "0.85rem", fontWeight: 700, color: t.ticket }}
      >
        Abrir estación
        <ArrowUpRight size={16} strokeWidth={2.5} />
      </div>
    </a>
  );
}

export default function MainMenu() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUserEmail(user.email || null);
      const email = user.email || 'Colaborador';
      const name = email.split('@')[0];
      setUserName(name.charAt(0).toUpperCase() + name.slice(1));
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
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#FFFFFF" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#8CC63F] border-t-transparent rounded-full animate-spin"></div>
          <p style={{ color: "#6B6B65" }}>Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "#FFFFFF" }}>
      {/* Header: superficie tipo tabla de cortar / acero, textura sutil */}
      <header
        className="relative overflow-hidden"
        style={{ background: "#2B2B2B" }}
      >
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
          style={{ width: "6px", background: "#F37F21" }}
          aria-hidden="true"
        />
        <div
          className="absolute left-[6px] top-0 bottom-0"
          style={{ width: "6px", background: "#8CC63F" }}
          aria-hidden="true"
        />

        <div className="relative max-w-6xl mx-auto px-8 py-14">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "4px",
                    background: "#8CC63F",
                  }}
                >
                  <Leaf size={22} color="#1F3A0A" strokeWidth={2.5} />
                </div>
                <span
                  className="uppercase font-mono"
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "#8CC63F",
                  }}
                >
                  Panel de logística
                </span>
              </div>

              <h1
                style={{
                  fontSize: "3.25rem",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                <span style={{ color: "#FFFFFF" }}>MEGA</span>
                <span style={{ color: "#F37F21" }}>FOOD</span>
              </h1>

              <p
                className="mt-4 max-w-xl"
                style={{ color: "#C9C9C3", fontSize: "1.05rem", lineHeight: 1.5 }}
              >
                De la lista de insumos al plato en la mesa. Todo tu flujo de
                cocina, en un solo lugar.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <span
                  style={{
                    color: "#8CC63F",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  👋 Hola, {userName}
                </span>
                <span
                  style={{
                    width: "4px",
                    height: "4px",
                    borderRadius: "50%",
                    background: "#8CC63F",
                    display: "inline-block",
                  }}
                />
                <span
                  style={{
                    color: "#C9C9C3",
                    fontSize: "0.85rem",
                  }}
                >
                  {new Intl.DateTimeFormat('es-ES', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date())}
                </span>
              </div>
            </div>

            {/* Botón de logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
              style={{
                backdropFilter: "blur(4px)",
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Grid de estaciones */}
      <main className="max-w-6xl mx-auto px-8 py-14">
        <div className="flex items-center gap-3 mb-8">
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "2px",
              background: "#F37F21",
              display: "inline-block",
            }}
          />
          <h2
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#6B6B65",
              textTransform: "uppercase",
            }}
          >
            Estaciones operativas
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5">
          {stations.map((s) => (
            <StationCard key={s.id} station={s} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1.5px solid #EFEFE9" }} className="mt-4">
        <div className="max-w-6xl mx-auto px-8 py-6 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: "0.8rem", color: "#9A9A93" }}>
            © 2026 MegaFood · Sistema de gestión de alimentos
          </p>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#8CC63F",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: "0.8rem", color: "#9A9A93", fontWeight: 600 }}>
              v1.0
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}