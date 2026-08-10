import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────
// Mapa de acceso por rol
// Cada entrada define qué prefijos de ruta puede visitar cada rol.
// '*' significa acceso total.
// ─────────────────────────────────────────────────────────
const ROLE_ACCESS: Record<string, string[]> = {
  admin: ['*'],
  gerencia: ['*'],
  cocinero: ['/dashboard/cocina'],
  compras: ['/dashboard/compras'],
}

// A dónde mandamos a cada rol tras login o cuando se le deniega el acceso
// a una ruta. Ahora es la misma para todos: el menú de estaciones.
const ROLE_HOME: Record<string, string> = {
  admin: '/dashboard',
  gerencia: '/dashboard',
  cocinero: '/dashboard',
  compras: '/dashboard',
}

function hasAccess(role: string, pathname: string): boolean {
  // '/dashboard' exacto (el menú de estaciones) es visible para
  // cualquier rol autenticado, sin importar su ROLE_ACCESS.
  if (pathname === '/dashboard' || pathname === '/dashboard/') return true

  const allowed = ROLE_ACCESS[role]
  if (!allowed) return false // rol desconocido -> sin acceso, fail-closed
  if (allowed.includes('*')) return true
  return allowed.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const hasValidSession = !error && user !== null

  const pathname = request.nextUrl.pathname

  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/api/auth')

  // ── Sin sesión válida ───────────────────────────────────
  if (!hasValidSession && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ── Con sesión, pero intenta ir a /login o /signup ──────
  if (hasValidSession && (pathname === '/login' || pathname === '/signup')) {
    // Redirige a su "home" según rol en vez de siempre /dashboard
    const role = await getUserRole(supabase, user!.id)
    const home = (role && ROLE_HOME[role]) || '/dashboard'
    return NextResponse.redirect(new URL(home, request.url))
  }

  // ── Con sesión: validar acceso por rol a rutas privadas ─
  if (hasValidSession && !isPublicRoute) {
    const role = await getUserRole(supabase, user!.id)

    if (!role) {
      // No se pudo determinar el rol -> fail-closed, no dejar pasar
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (!hasAccess(role, pathname)) {
      const home = ROLE_HOME[role] || '/login'
      const redirectUrl = new URL(home, request.url)
      redirectUrl.searchParams.set('accessDenied', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

// ─────────────────────────────────────────────────────────
// Obtiene el rol del usuario desde la tabla profiles.
// NOTA: esta query respeta RLS (usa el cliente autenticado del
// propio usuario), por lo que la policy "profiles_select_authenticated"
// (auth.role() = 'authenticated') debe seguir permitiendo este SELECT.
// ─────────────────────────────────────────────────────────
async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data.role
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}