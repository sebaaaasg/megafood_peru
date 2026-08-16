'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, Lock } from 'lucide-react'
import Image from 'next/image'

const LOGIN_DOMAIN = 'sistema.com' // 🔒 mantener en un solo lugar

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const cleanUsername = username.trim()
      // Si ya escribieron un email completo, se respeta. Si no, se construye
      // el email interno a partir del username (patrón username@sistema.com).
      const loginEmail = cleanUsername.includes('@')
        ? cleanUsername
        : `${cleanUsername}@${LOGIN_DOMAIN}`

      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) {
        console.error('Error de login:', error)
        setError('Credenciales incorrectas. Por favor, verifica tus datos.')
      } else if (data?.session) {
        console.log('Login exitoso:', data.session.user.email)
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      console.error('Error inesperado:', err)
      setError('Ocurrió un error inesperado. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: "#FFFFFF" }}>
      <div className="max-w-md w-full">
        {/* Logo MegaFood */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/megafood3.png"
              alt="MegaFood Logo"
              width={80}
              height={80}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            <span style={{ color: "#2B2B2B" }}>MEGA</span>
            <span style={{ color: "#F37F21" }}>FOOD</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#6B6B65" }}>
            Inicia sesión para acceder al panel de gestión
          </p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-lg p-8" style={{ 
          borderLeft: "1.5px solid #E7E7E2",
          borderRight: "1.5px solid #E7E7E2",
          borderBottom: "1.5px solid #E7E7E2",
          borderTop: "5px solid #F37F21",
        }}>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: "#2B2B2B" }}>
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5" style={{ color: "#6B6B65" }} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F37F21] transition-all duration-200"
                  style={{
                    border: "1.5px solid #E7E7E2",
                    background: "#FFFFFF",
                    color: "#2B2B2B",
                  }}
                  placeholder="username"
                  required
                />
              </div>
              <p className="text-xs" style={{ color: "#9A9A93" }}>
                Usa "admin" o tu nombre de usuario registrado
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ color: "#2B2B2B" }}>
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5" style={{ color: "#6B6B65" }} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F37F21] transition-all duration-200"
                  style={{
                    border: "1.5px solid #E7E7E2",
                    background: "#FFFFFF",
                    color: "#2B2B2B",
                  }}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg" style={{
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
              }}>
                <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "#F37F21",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#C4600F"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F37F21"
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: "#9A9A93" }}>
              Sistema seguro • Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}