'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // Si hay sesión, redirigir al dashboard
        router.push('/dashboard')
      } else {
        // Si no hay sesión, redirigir al login
        router.push('/login')
      }
    }

    verificarSesion()
  }, [router, supabase])

  // Mostrar un loader mientras se verifica la sesión
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-4" style={{ background: '#8CC63F' }}>
          <svg className="w-8 h-8 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: '#6B6B65' }}>
          Redirigiendo...
        </p>
      </div>
    </div>
  )
}