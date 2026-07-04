import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = todavía no se sabe
  const [usuario, setUsuario] = useState(null) // fila de la tabla `usuarios` (club_id, nombre, rol)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarUsuario = useCallback(async (authUserId) => {
    if (!authUserId) {
      setUsuario(null)
      return
    }
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, club_id, nombre, email, rol')
      .eq('id', authUserId)
      .maybeSingle()

    if (error) {
      setError(error.message)
      setUsuario(null)
      return
    }
    if (!data) {
      setError(
        'Tu usuario de autenticación no tiene un registro asociado en la tabla "usuarios". Pedile a un administrador que te dé de alta en el club.'
      )
      setUsuario(null)
      return
    }
    setUsuario(data)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      await cargarUsuario(session?.user?.id)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setLoading(true)
      await cargarUsuario(session?.user?.id)
      setLoading(false)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [cargarUsuario])

  const signIn = async (email, password) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(traducirErrorAuth(error.message))
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    usuario,
    loading,
    error,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function traducirErrorAuth(msg) {
  if (msg?.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.'
  return msg
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
