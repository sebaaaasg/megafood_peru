'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Loader2,
  Search,
  Users,
  Edit,
  Trash2,
  X,
  UserCircle,
  Building,
  Shield,
} from 'lucide-react'
import { crearUsuario, editarUsuario, eliminarUsuario, crearSede } from '@/app/dashboard/usuarios/actions'

interface Usuario {
  id: string
  email: string
  full_name: string
  role: string
  sede_id: string | null
  created_at: string
  sedes: { id: string; nombre: string }[] | null
}

interface Sede {
  id: string
  nombre: string
}

interface UsuariosClientProps {
  initialUsuarios: Usuario[]
  initialSedes: Sede[]
  currentUserRole: string
}

const ROLES = [
  { value: 'admin', label: 'Administrador', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'gerencia', label: 'Gerencia', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'compras', label: 'Compras', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'cocinero', label: 'Cocinero', color: 'bg-green-100 text-green-700 border-green-200' },
]

const ROLE_ICONS: Record<string, any> = {
  admin: Shield,
  gerencia: UserCircle,
  compras: Building,
  cocinero: Users,
}

export default function UsuariosClient({
  initialUsuarios,
  initialSedes,
  currentUserRole,
}: UsuariosClientProps) {
  const router = useRouter()

  const [usuarios, setUsuarios] = useState<Usuario[]>(initialUsuarios)
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>(initialUsuarios)
  const [sedes, setSedes] = useState<Sede[]>(initialSedes)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showSedeModal, setShowSedeModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Usuario | null>(null)
  const [selectedRole, setSelectedRole] = useState('todos')

  // Mantener el estado local sincronizado si el padre (Server Component) recarga
  useEffect(() => {
    setUsuarios(initialUsuarios)
  }, [initialUsuarios])

  useEffect(() => {
    setSedes(initialSedes)
  }, [initialSedes])

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'cocinero',
    sede_id: '',
  })

  const [sedeFormData, setSedeFormData] = useState({ nombre: '' })

  // Filtrar usuarios
  useEffect(() => {
    let filtered = usuarios

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
      )
    }

    if (selectedRole !== 'todos') {
      filtered = filtered.filter((u) => u.role === selectedRole)
    }

    setFilteredUsuarios(filtered)
  }, [usuarios, searchTerm, selectedRole])

  const resetForm = () => {
    setFormData({ full_name: '', email: '', password: '', role: 'cocinero', sede_id: '' })
    setEditingUser(null)
    setShowForm(false)
  }

  const resetSedeForm = () => {
    setSedeFormData({ nombre: '' })
    setShowSedeModal(false)
  }

  // ── Crear sede ──────────────────────────────────────────
  const handleCreateSede = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sedeFormData.nombre.trim()) return

    setLoading(true)
    try {
      const nuevaSede = await crearSede(sedeFormData.nombre.trim())

      setSedes((prev) => [...prev, nuevaSede])

      if (formData.role === 'cocinero') {
        setFormData((prev) => ({ ...prev, sede_id: nuevaSede.id }))
      }

      alert('✅ Sede creada exitosamente')
      resetSedeForm()
      router.refresh()
    } catch (error: any) {
      console.error('Error:', error)
      alert('Error al crear la sede: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Crear / editar usuario ──────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name.trim() || !formData.email.trim()) return

    setLoading(true)
    try {
      const sedeId = formData.role === 'cocinero' ? formData.sede_id || null : null

      if (editingUser) {
        await editarUsuario(editingUser.id, {
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          role: formData.role,
          sede_id: sedeId,
        })
      } else {
        await crearUsuario({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          sede_id: sedeId,
        })
      }

      resetForm()
      router.refresh() // vuelve a cargar initialUsuarios desde el Server Component padre
    } catch (error: any) {
      console.error('Error:', error)
      alert('Error al guardar el usuario: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Eliminar usuario ────────────────────────────────────
  const handleDelete = async (id: string, fullName: string) => {
    if (!confirm(`¿Estás seguro de eliminar a "${fullName}"?`)) return

    setLoading(true)
    try {
      await eliminarUsuario(id)
      setUsuarios((prev) => prev.filter((u) => u.id !== id))
      router.refresh()
    } catch (error: any) {
      console.error('Error:', error)
      alert('Error al eliminar el usuario: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (usuario: Usuario) => {
    setFormData({
      full_name: usuario.full_name || '',
      email: usuario.email,
      password: '',
      role: usuario.role,
      sede_id: usuario.sede_id || '',
    })
    setEditingUser(usuario)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getRoleStyle = (role: string) => ROLES.find((r) => r.value === role) || ROLES[0]
  const getRoleIcon = (role: string) => ROLE_ICONS[role] || UserCircle

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'gerencia'

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFFFFF' }}>
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12 text-[#F37F21]" />
          <p className="text-[#6B6B65] font-medium">No tienes permisos para acceder a esta sección</p>
          <Link href="/dashboard" className="text-[#8CC63F] hover:underline">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ background: '#FFFFFF' }}>
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#8CC63F]" />
            <span className="text-gray-700">Procesando...</span>
          </div>
        </div>
      )}

      {/* Header estilo MegaFood */}
      <header className="relative overflow-hidden" style={{ background: '#2B2B2B' }}>
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #FFFFFF 0px, #FFFFFF 1px, transparent 1px, transparent 14px)',
          }}
          aria-hidden="true"
        />
        <div className="absolute left-0 top-0 bottom-0" style={{ width: '6px', background: '#F37F21' }} aria-hidden="true" />
        <div className="absolute left-[6px] top-0 bottom-0" style={{ width: '6px', background: '#8CC63F' }} aria-hidden="true" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-7 sm:pt-24 sm:pb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-7 md:gap-8">
            {/* Información del módulo */}
            <div className="min-w-0 md:flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="uppercase font-mono text-[11px] sm:text-xs"
                  style={{ fontWeight: 700, letterSpacing: '0.18em', color: '#8CC63F' }}
                >
                  Módulo de gestión
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                <span style={{ color: '#FFFFFF' }}>Gestión de</span>
                <span style={{ color: '#F37F21' }}> Usuarios</span>
              </h1>

              <p
                className="mt-2 max-w-xl"
                style={{ color: '#C9C9C3', fontSize: '1rem' }}
              >
                Administra los usuarios del sistema y sus roles/permisos
              </p>
            </div>

            {/* Acciones: 2 columnas en pantallas pequeñas, 3 en escritorio */}
            <div className="w-full md:flex-1 min-w-0">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setShowSedeModal(true)}
                  className="min-w-0 min-h-[52px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-[#F37F21]/10 text-[#F37F21] rounded-lg font-semibold hover:bg-[#F37F21]/20 transition border border-[#F37F21]/20"
                >
                  <Building size={18} className="shrink-0" />
                  <span className="truncate">Sedes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(!showForm)}
                  className="min-w-0 min-h-[52px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-[#8CC63F] text-[#1F3A0A] rounded-lg font-semibold hover:bg-[#7AB835] transition"
                >
                  <Plus size={18} className="shrink-0" />
                  <span className="truncate">Nuevo usuario</span>
                </button>

                <Link
                  href="/dashboard"
                  className="min-w-0 min-h-[52px] flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
                >
                  <ArrowLeft size={18} className="shrink-0" />
                  <span className="truncate">Panel</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        {/* Formulario de usuario */}
        {showForm && (
          <div className="mb-8 bg-white rounded-lg p-6 border border-[#E7E7E2] border-t-4 border-t-[#8CC63F] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#2B2B2B]">
                {editingUser ? '✏️ Editar usuario' : '➕ Nuevo usuario'}
              </h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                  placeholder="ejemplo@empresa.com"
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                    placeholder="••••••••"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-[#2B2B2B] mb-1">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, sede_id: '' })}
                  className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                >
                  <option value="admin">Administrador</option>
                  <option value="gerencia">Gerencia</option>
                  <option value="compras">Compras</option>
                  <option value="cocinero">Cocinero</option>
                </select>
              </div>
              {formData.role === 'cocinero' && (
                <div>
                  <label className="block text-sm font-medium text-[#2B2B2B] mb-1">Sede</label>
                  <select
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent"
                    required={formData.role === 'cocinero'}
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-6 py-2.5 border border-[#E7E7E2] text-[#6B6B65] rounded-lg font-medium hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#F37F21] text-white rounded-lg font-semibold hover:bg-[#C4600F] transition disabled:opacity-50"
                >
                  {editingUser ? 'Actualizar' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filtros y búsqueda */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRole('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedRole === 'todos' ? 'bg-[#2B2B2B] text-white' : 'bg-[#F5F5F0] text-[#6B6B65] hover:bg-[#E7E7E2]'
              }`}
            >
              Todos
            </button>
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.value
              const count = usuarios.filter((u) => u.role === role.value).length
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isSelected ? 'bg-[#2B2B2B] text-white' : 'bg-[#F5F5F0] text-[#6B6B65] hover:bg-[#E7E7E2]'
                  }`}
                >
                  {role.label}
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
              )
            })}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent w-full md:w-64"
              placeholder="Buscar usuario..."
            />
          </div>
        </div>

        {/* Contador */}
        <div className="mb-4">
          <p className="text-sm font-medium text-[#6B6B65]">
            {filteredUsuarios.length} {filteredUsuarios.length === 1 ? 'usuario' : 'usuarios'}
          </p>
        </div>

        {/* Tabla de usuarios */}
        {filteredUsuarios.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#E7E7E2] bg-white">
            <table className="w-full">
              <thead className="bg-[#F5F5F0]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#6B6B65] uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#6B6B65] uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#6B6B65] uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#6B6B65] uppercase tracking-wider">Sede</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#6B6B65] uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-[#6B6B65] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F0]">
                {filteredUsuarios.map((usuario) => {
                  const roleStyle = getRoleStyle(usuario.role)
                  const RoleIcon = getRoleIcon(usuario.role)
                  const sedeNombre = usuario.sedes && usuario.sedes.length > 0 ? usuario.sedes[0].nombre : '-'
                  return (
                    <tr key={usuario.id} className="hover:bg-[#F5FBF0] transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#8CC63F]/10 flex items-center justify-center">
                            <UserCircle className="w-4 h-4 text-[#8CC63F]" />
                          </div>
                          <span className="font-medium text-[#2B2B2B]">{usuario.full_name || 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#6B6B65]">{usuario.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${roleStyle.color}`}>
                          <RoleIcon className="inline w-3 h-3 mr-1" />
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[#6B6B65]">{sedeNombre}</td>
                      <td className="px-6 py-4 text-sm text-[#6B6B65]">{formatDate(usuario.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="p-1.5 text-[#6B6B65] hover:text-[#F37F21] rounded-lg hover:bg-[#F37F21]/10 transition"
                            title="Editar usuario"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(usuario.id, usuario.full_name || usuario.email)}
                            className="p-1.5 text-[#6B6B65] hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-[#F5F5F0] rounded-lg border border-[#E7E7E2]">
            <Users className="w-12 h-12 text-[#9A9A93] mx-auto mb-3" />
            <p className="text-[#6B6B65] font-medium">
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowForm(true)} className="mt-3 text-[#8CC63F] font-medium hover:underline">
                + Agregar primer usuario
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modal para gestionar sedes */}
{showSedeModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
    <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-xl">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-5 min-w-0">
        <h3 className="text-lg sm:text-xl font-bold text-[#2B2B2B] flex items-center gap-2 min-w-0">
          <Building className="w-5 h-5 text-[#8CC63F] shrink-0" />
          <span className="truncate">Sedes</span>
        </h3>

        <button
          type="button"
          onClick={resetSedeForm}
          className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          aria-label="Cerrar"
        >
          <X size={22} />
        </button>
      </div>


      {/* Sedes existentes */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-[#2B2B2B] mb-2">
          Sedes existentes
        </label>

        {sedes.length > 0 ? (
          <div className="border border-[#E7E7E2] rounded-lg overflow-hidden">
            {sedes.map((sede) => (
              <div
                key={sede.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0 border-[#F5F5F0] hover:bg-[#F5FBF0] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#8CC63F]/10 flex items-center justify-center">
                    <Building className="w-4 h-4 text-[#8CC63F]" />
                  </div>

                  <span className="text-sm font-medium text-[#2B2B2B]">
                    {sede.nombre}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-[#E7E7E2] rounded-lg px-4 py-6 text-center">
            <Building className="w-8 h-8 mx-auto mb-2 text-[#9A9A93]" />
            <p className="text-sm text-[#6B6B65]">
              No hay sedes registradas
            </p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="border-t border-[#E7E7E2] pt-5">

        <label className="block text-sm font-semibold text-[#2B2B2B] mb-2">
          Nueva sede
        </label>

        <form onSubmit={handleCreateSede}>
          <div className="mb-4">
            <input
              type="text"
              value={sedeFormData.nombre}
              onChange={(e) =>
                setSedeFormData({ nombre: e.target.value })
              }
              className="w-full px-4 py-2.5 border border-[#E7E7E2] rounded-lg focus:ring-2 focus:ring-[#8CC63F] focus:border-transparent outline-none"
              placeholder="Ej: Concesión Nueva Sede"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={resetSedeForm}
              className="w-full min-w-0 py-2.5 rounded-lg border border-[#E7E7E2] text-[#6B6B65] font-medium hover:bg-gray-50 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-w-0 py-2.5 rounded-lg bg-[#8CC63F] text-[#1F3A0A] font-bold hover:bg-[#7AB835] transition disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear sede'}
            </button>
          </div>
        </form>

      </div>
    </div>
  </div>
)}

      {/* Footer */}
      <footer style={{ borderTop: '1.5px solid #EFEFE9' }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: '#9A9A93' }}>© 2026 MegaFood · Gestión de usuarios</p>
          <div className="flex items-center gap-2">
            <span
              style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8CC63F', display: 'inline-block' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#9A9A93', fontWeight: 600 }}>v1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
