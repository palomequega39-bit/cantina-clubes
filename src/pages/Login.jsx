import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState(null)

  if (!loading && session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setLocalError(null)
    setSubmitting(true)
    const { error } = await signIn(email.trim(), password)
    setSubmitting(false)
    if (error) setLocalError(error.message ?? 'No se pudo iniciar sesión.')
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-cancha/15 border border-cancha/30 mx-auto mb-4 flex items-center justify-center">
            <span className="font-display text-2xl font-semibold text-cancha">C</span>
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Cantina</h1>
          <p className="text-muted mt-1">Ingresá para abrir la caja</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam placeholder:text-muted/60 focus:border-cancha outline-none"
              placeholder="tu@club.com"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam placeholder:text-muted/60 focus:border-cancha outline-none"
              placeholder="••••••••"
            />
          </div>

          {localError && (
            <p className="text-alerta text-sm text-center pt-1" role="alert">
              {localError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 rounded-xl bg-cancha text-ink font-display font-semibold text-lg tracking-wide active:scale-[0.98] transition disabled:opacity-60 mt-6"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
