'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
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
import BarraSuperior from '@/app/dashboard/components/BarraSuperior'
import EstacionesDrawer from '@/app/dashboard/components/EstacionesDrawer'

const ARCHIVO = 'var(--font-archivo), system-ui, sans-serif'
const OSCURO = '#201E1D'
const FONDO = '#E7E7E2'
const VERDE = '#8CC63F'
const NARANJA = '#F37F21'
const PIEDRA = '#6B6B65'

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
  const [menuAbierto, setMenuAbierto] = useState(false)

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
  const displayName = getRoleStyle(currentUserRole).label

  if (!isAdmin) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: FONDO, fontFamily: ARCHIVO }}
      >
        <div className="flex flex-col items-center gap-4">
          <Shield className="w-12 h-12" style={{ color: NARANJA }} />
          <p className="font-bold" style={{ color: PIEDRA }}>No tienes permisos para acceder a esta sección</p>
          <Link href="/dashboard" style={{ color: VERDE }} className="hover:underline font-bold">
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full" style={{ background: FONDO, color: OSCURO, fontFamily: ARCHIVO }}>
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 flex items-center gap-3" style={{ borderTop: `4px solid ${VERDE}` }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: VERDE }} />
            <span className="font-bold" style={{ color: OSCURO }}>Procesando...</span>
          </div>
        </div>
      )}

      <EstacionesDrawer
        abierto={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        role={currentUserRole}
        displayName={displayName}
      />

      <BarraSuperior
        displayName={displayName}
        menuAbierto={menuAbierto}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      {/* ─── Encabezado ─── */}
      <div className="flex border-b-2" style={{ borderColor: PIEDRA }}>
        <div className="w-2 shrink-0" style={{ background: VERDE }} aria-hidden="true" />
        <div className="flex-1 px-5 py-10 sm:px-8 sm:py-14">
          <div className="mb-4 text-[10px] font-extrabold" style={{ letterSpacing: '0.2em', color: PIEDRA }}>
            PANEL DE LOGÍSTICA · MÓDULO DE GESTIÓN
          </div>
          <h1
            className="text-[36px] sm:text-[48px]"
            style={{ margin: 0, lineHeight: 0.95, letterSpacing: '-0.035em', fontWeight: 800 }}
          >
            Gestión de <span style={{ color: NARANJA }}>usuarios</span>
          </h1>
          <p className="mt-3 max-w-xl text-[15px]" style={{ color: PIEDRA }}>
            Administra los usuarios del sistema y sus roles/permisos
          </p>

          <div className="mt-8 grid grid-cols-2 xl:grid-cols-3 gap-3 max-w-2xl">
            <button
              type="button"
              onClick={() => setShowSedeModal(true)}
              className="min-h-[52px] flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-extrabold uppercase transition-colors"
              style={{ letterSpacing: '0.06em', border: `2px solid ${NARANJA}`, color: NARANJA, background: 'transparent' }}
            >
              <Building size={18} className="shrink-0" />
              <span className="truncate">Sedes</span>
            </button>

            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="min-h-[52px] flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-extrabold uppercase transition-colors"
              style={{ letterSpacing: '0.06em', background: VERDE, color: '#1F3A0A' }}
            >
              <Plus size={18} className="shrink-0" />
              <span className="truncate">Nuevo usuario</span>
            </button>

            <Link
              href="/dashboard"
              className="min-h-[52px] flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-extrabold uppercase transition-colors"
              style={{ letterSpacing: '0.06em', border: `2px solid ${OSCURO}`, color: OSCURO }}
            >
              <span className="truncate">← Panel</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        {/* Formulario de usuario */}
        {showForm && (
          <div className="mb-8 bg-white p-6" style={{ borderTop: `6px solid ${VERDE}` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-extrabold" style={{ color: OSCURO }}>
                {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
              </h2>
              <button onClick={resetForm} style={{ color: PIEDRA }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: OSCURO }}>Nombre completo</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none"
                  style={{ border: `2px solid ${FONDO}`, background: '#fff' }}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: OSCURO }}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 outline-none"
                  style={{ border: `2px solid ${FONDO}`, background: '#fff' }}
                  placeholder="ejemplo@empresa.com"
                  required
                />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: OSCURO }}>Contraseña</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 outline-none"
                    style={{ border: `2px solid ${FONDO}`, background: '#fff' }}
                    placeholder="••••••••"
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold mb-1" style={{ color: OSCURO }}>Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value, sede_id: '' })}
                  className="w-full px-4 py-2.5 outline-none"
                  style={{ border: `2px solid ${FONDO}`, background: '#fff' }}
                >
                  <option value="admin">Administrador</option>
                  <option value="gerencia">Gerencia</option>
                  <option value="compras">Compras</option>
                  <option value="cocinero">Cocinero</option>
                </select>
              </div>
              {formData.role === 'cocinero' && (
                <div>
                  <label className="block text-sm font-bold mb-1" style={{ color: OSCURO }}>Sede</label>
                  <select
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    className="w-full px-4 py-2.5 outline-none"
                    style={{ border: `2px solid ${FONDO}`, background: '#fff' }}
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
                  className="w-full sm:w-auto px-6 py-2.5 text-[13px] font-extrabold uppercase"
                  style={{ letterSpacing: '0.06em', border: `2px solid ${PIEDRA}`, color: PIEDRA }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-2.5 text-[13px] font-extrabold uppercase disabled:opacity-50"
                  style={{ letterSpacing: '0.06em', background: NARANJA, color: '#fff' }}
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
              className="px-4 py-2 text-[12px] font-extrabold uppercase transition-colors"
              style={{
                letterSpacing: '0.06em',
                background: selectedRole === 'todos' ? OSCURO : '#fff',
                color: selectedRole === 'todos' ? '#fff' : PIEDRA,
                border: `1px solid ${selectedRole === 'todos' ? OSCURO : '#DED8CF'}`,
              }}
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
                  className="px-4 py-2 text-[12px] font-extrabold uppercase transition-colors"
                  style={{
                    letterSpacing: '0.06em',
                    background: isSelected ? OSCURO : '#fff',
                    color: isSelected ? '#fff' : PIEDRA,
                    border: `1px solid ${isSelected ? OSCURO : '#DED8CF'}`,
                  }}
                >
                  {role.label}
                  <span className="ml-1 opacity-60">({count})</span>
                </button>
              )
            })}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: PIEDRA }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 outline-none w-full md:w-64"
              style={{ border: `2px solid #DED8CF`, background: '#fff' }}
              placeholder="Buscar usuario..."
            />
          </div>
        </div>

        {/* Contador */}
        <div className="mb-4">
          <p className="text-sm font-bold" style={{ color: PIEDRA }}>
            {filteredUsuarios.length} {filteredUsuarios.length === 1 ? 'usuario' : 'usuarios'}
          </p>
        </div>

        {/* Tabla de usuarios */}
        {filteredUsuarios.length > 0 ? (
          <div className="overflow-x-auto bg-white" style={{ borderTop: `4px solid ${OSCURO}` }}>
            <table className="w-full">
              <thead style={{ background: OSCURO }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Sede</th>
                  <th className="px-6 py-3 text-left text-xs font-extrabold text-white uppercase tracking-wider">Creado</th>
                  <th className="px-6 py-3 text-right text-xs font-extrabold text-white uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: '#EFEFE9' }}>
                {filteredUsuarios.map((usuario) => {
                  const roleStyle = getRoleStyle(usuario.role)
                  const RoleIcon = getRoleIcon(usuario.role)
                  const sedeNombre = usuario.sedes && usuario.sedes.length > 0 ? usuario.sedes[0].nombre : '-'
                  return (
                    <tr key={usuario.id} className="transition-colors" style={{ background: '#fff' }}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(140,198,63,0.14)' }}>
                            <UserCircle className="w-4 h-4" style={{ color: VERDE }} />
                          </div>
                          <span className="font-bold" style={{ color: OSCURO }}>{usuario.full_name || 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4" style={{ color: PIEDRA }}>{usuario.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-bold border ${roleStyle.color}`}>
                          <RoleIcon className="inline w-3 h-3 mr-1" />
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4" style={{ color: PIEDRA }}>{sedeNombre}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: PIEDRA }}>{formatDate(usuario.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(usuario)}
                            className="p-1.5 transition-colors"
                            style={{ color: PIEDRA }}
                            title="Editar usuario"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(usuario.id, usuario.full_name || usuario.email)}
                            className="p-1.5 transition-colors hover:text-red-500"
                            style={{ color: PIEDRA }}
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
          <div className="text-center py-12 bg-white" style={{ borderTop: `4px solid ${PIEDRA}` }}>
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: '#9A9A93' }} />
            <p className="font-bold" style={{ color: PIEDRA }}>
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </p>
            {!searchTerm && (
              <button onClick={() => setShowForm(true)} className="mt-3 font-bold hover:underline" style={{ color: VERDE }}>
                + Agregar primer usuario
              </button>
            )}
          </div>
        )}
      </main>

      {/* Modal para gestionar sedes */}
{showSedeModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
    <div className="bg-white max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6" style={{ borderTop: `6px solid ${NARANJA}` }}>

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 mb-5 min-w-0">
        <h3 className="text-lg sm:text-xl font-extrabold flex items-center gap-2 min-w-0" style={{ color: OSCURO }}>
          <Building className="w-5 h-5 shrink-0" style={{ color: VERDE }} />
          <span className="truncate">Sedes</span>
        </h3>

        <button
          type="button"
          onClick={resetSedeForm}
          className="shrink-0 w-9 h-9 flex items-center justify-center transition-colors"
          style={{ color: PIEDRA }}
          aria-label="Cerrar"
        >
          <X size={22} />
        </button>
      </div>


      {/* Sedes existentes */}
      <div className="mb-6">
        <label className="block text-sm font-extrabold mb-2" style={{ color: OSCURO }}>
          Sedes existentes
        </label>

        {sedes.length > 0 ? (
          <div style={{ border: `1px solid #DED8CF` }}>
            {sedes.map((sede) => (
              <div
                key={sede.id}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b last:border-b-0"
                style={{ borderColor: '#EFEFE9' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(140,198,63,0.14)' }}>
                    <Building className="w-4 h-4" style={{ color: VERDE }} />
                  </div>

                  <span className="text-sm font-bold" style={{ color: OSCURO }}>
                    {sede.nombre}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center" style={{ border: `1px dashed #DED8CF` }}>
            <Building className="w-8 h-8 mx-auto mb-2" style={{ color: '#9A9A93' }} />
            <p className="text-sm" style={{ color: PIEDRA }}>
              No hay sedes registradas
            </p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="pt-5" style={{ borderTop: `1px solid #DED8CF` }}>

        <label className="block text-sm font-extrabold mb-2" style={{ color: OSCURO }}>
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
              className="w-full px-4 py-2.5 outline-none"
              style={{ border: `2px solid #DED8CF` }}
              placeholder="Ej: Concesión Nueva Sede"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={resetSedeForm}
              className="w-full min-w-0 py-2.5 text-[13px] font-extrabold uppercase"
              style={{ letterSpacing: '0.06em', border: `2px solid ${PIEDRA}`, color: PIEDRA }}
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-w-0 py-2.5 text-[13px] font-extrabold uppercase disabled:opacity-50"
              style={{ letterSpacing: '0.06em', background: VERDE, color: '#1F3A0A' }}
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
      <footer style={{ borderTop: `1.5px solid #DED8CF` }} className="mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-2">
          <p style={{ fontSize: '0.8rem', color: PIEDRA }}>© 2026 MegaFood · Gestión de usuarios</p>
          <div className="flex items-center gap-2">
            <span
              style={{ width: '8px', height: '8px', background: VERDE, display: 'inline-block' }}
            />
            <span style={{ fontSize: '0.8rem', color: PIEDRA, fontWeight: 700 }}>v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
