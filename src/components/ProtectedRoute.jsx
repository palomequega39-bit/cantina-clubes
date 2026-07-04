import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading, usuario, error } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink">
        <p className="text-muted font-display text-lg tracking-wide">Cargando…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink px-6 text-center">
        <div className="max-w-sm">
          <p className="font-display text-xl text-alerta mb-2">No se pudo cargar tu usuario</p>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    )
  }

  if (!usuario) return null

  return children
}
