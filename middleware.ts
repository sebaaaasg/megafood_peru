import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 🔥 CAMBIO 1: Usar getUser() en lugar de getSession()
  // Esto autentica el token con el servidor de Supabase
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // 🔥 CAMBIO 2: Manejar el error de autenticación
  // Si hay un error o no hay usuario, consideramos que no hay sesión válida
  const hasValidSession = !error && user !== null

  const isPublicRoute = request.nextUrl.pathname === '/login' || 
                        request.nextUrl.pathname === '/signup' ||
                        request.nextUrl.pathname.startsWith('/api/auth')

  // 🔥 CAMBIO 3: Usar hasValidSession en lugar de session
  if (!hasValidSession && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    // Opcional: agregar un parámetro para mostrar un mensaje
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (hasValidSession && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}