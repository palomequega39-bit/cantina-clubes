import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { slugify } from '../lib/format'

const VACIO = { id: null, nombre: '', requiere_cliente: false, activo: true, codigo: '' }

export default function FormasPago() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [view, setView] = useState('lista') // 'lista' | 'form'
  const [formasPago, setFormasPago] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  async function cargar() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('formas_pago')
      .select('id, nombre, codigo, requiere_cliente, activo')
      .order('nombre')
    if (error) setError(error.message)
    setFormasPago(data ?? [])
    setLoading(false)
  }

  const codigosExistentes = useMemo(
    () => new Set(formasPago.map((fp) => fp.codigo)),
    [formasPago]
  )

  function abrirNueva() {
    setForm(VACIO)
    setFormError(null)
    setView('form')
  }

  function abrirEdicion(fp) {
    setForm({
      id: fp.id,
      nombre: fp.nombre,
      codigo: fp.codigo,
      requiere_cliente: fp.requiere_cliente,
      activo: fp.activo,
    })
    setFormError(null)
    setView('form')
  }

  async function toggleActivo(fp) {
    const { error } = await supabase.from('formas_pago').update({ activo: !fp.activo }).eq('id', fp.id)
    if (error) {
      setToast(`Error: ${error.message}`)
      return
    }
    setFormasPago((prev) => prev.map((x) => (x.id === fp.id ? { ...x, activo: !x.activo } : x)))
  }

  async function guardar(e) {
    e.preventDefault()
    setFormError(null)
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }

    setGuardando(true)

    if (form.id) {
      // Editar: el nombre se puede cambiar libremente, el código interno no se toca
      const { error } = await supabase
        .from('formas_pago')
        .update({
          nombre: form.nombre.trim(),
          requiere_cliente: form.requiere_cliente,
          activo: form.activo,
        })
        .eq('id', form.id)
      setGuardando(false)
      if (error) {
        setFormError(error.message)
        return
      }
      setToast('Forma de pago actualizada ✓')
    } else {
      // Nueva: generamos el código interno a partir del nombre, evitando choques
      let base = slugify(form.nombre) || 'FORMA_PAGO'
      let codigo = base
      let i = 2
      while (codigosExistentes.has(codigo)) {
        codigo = `${base}_${i}`
        i++
      }

      const { error } = await supabase.from('formas_pago').insert({
        club_id: usuario.club_id,
        nombre: form.nombre.trim(),
        codigo,
        requiere_cliente: form.requiere_cliente,
        activo: form.activo,
      })
      setGuardando(false)
      if (error) {
        setFormError(error.message)
        return
      }
      setToast('Forma de pago creada ✓')
    }

    setView('lista')
    cargar()
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink">
        <p className="text-muted font-display">Cargando formas de pago…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink px-6 text-center">
        <p className="text-alerta">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink">
      {view === 'lista' && (
        <ListaView
          formasPago={formasPago}
          onBack={() => navigate('/')}
          onEditar={abrirEdicion}
          onToggleActivo={toggleActivo}
          onNueva={abrirNueva}
        />
      )}

      {view === 'form' && (
        <FormView
          form={form}
          setForm={setForm}
          onBack={() => setView('lista')}
          onGuardar={guardar}
          guardando={guardando}
          formError={formError}
          esNueva={!form.id}
        />
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-surface-2 border border-line px-5 py-3 rounded-xl text-foam font-medium shadow-xl z-50 max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  )
}

function ListaView({ formasPago, onBack, onEditar, onToggleActivo, onNueva }) {
  return (
    <div className="px-5 pt-6 pb-28">
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver al dashboard"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">Formas de pago</h1>
      </header>

      <p className="text-muted text-sm mb-4">
        Estas son las opciones que van a aparecer en Nueva Venta y al registrar pagos de clientes.
      </p>

      {formasPago.length === 0 ? (
        <p className="text-muted text-center mt-16">Todavía no hay formas de pago cargadas.</p>
      ) : (
        <div className="space-y-2">
          {formasPago.map((fp) => (
            <div
              key={fp.id}
              className={`rounded-xl bg-surface border border-line p-3 flex items-center gap-3 ${
                !fp.activo ? 'opacity-50' : ''
              }`}
            >
              <button onClick={() => onEditar(fp)} className="flex-1 min-w-0 text-left">
                <p className="text-foam font-medium truncate">{fp.nombre}</p>
                {fp.requiere_cliente && (
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gol/15 text-gol">
                    Requiere cliente (fiado)
                  </span>
                )}
              </button>

              <button
                onClick={() => onToggleActivo(fp)}
                className={`w-11 h-7 rounded-full shrink-0 relative transition ${
                  fp.activo ? 'bg-cancha' : 'bg-line'
                }`}
                aria-label={fp.activo ? 'Desactivar' : 'Activar'}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-ink transition ${
                    fp.activo ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onNueva}
        className="fixed bottom-6 right-5 w-16 h-16 rounded-full bg-gol text-ink font-display font-bold text-3xl shadow-2xl active:scale-90 transition flex items-center justify-center"
        aria-label="Nueva forma de pago"
      >
        +
      </button>
    </div>
  )
}

function FormView({ form, setForm, onBack, onGuardar, guardando, formError, esNueva }) {
  function set(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver a la lista"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">
          {esNueva ? 'Nueva forma de pago' : 'Editar forma de pago'}
        </h1>
      </header>

      <form onSubmit={onGuardar} className="space-y-4">
        <div>
          <label className="block text-muted text-sm mb-1.5">Nombre</label>
          <input
            type="text"
            required
            autoFocus
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
            placeholder="Ej: Mercado Pago"
          />
        </div>

        <button
          type="button"
          onClick={() => set('requiere_cliente', !form.requiere_cliente)}
          className="w-full rounded-xl bg-surface border border-line flex items-center justify-between px-4 py-3.5"
        >
          <span className="text-foam text-left pr-3">
            Requiere elegir cliente
            <span className="block text-muted text-xs mt-0.5">
              Marcá esto solo para la forma de pago "a cuenta" (fiado): genera deuda automática y
              pide elegir un cliente en Nueva Venta.
            </span>
          </span>
          <span
            className={`w-11 h-7 rounded-full shrink-0 relative transition ${
              form.requiere_cliente ? 'bg-cancha' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-ink transition ${
                form.requiere_cliente ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => set('activo', !form.activo)}
          className="w-full h-14 rounded-xl bg-surface border border-line flex items-center justify-between px-4"
        >
          <span className="text-foam">Activa (visible al vender)</span>
          <span
            className={`w-11 h-7 rounded-full shrink-0 relative transition ${
              form.activo ? 'bg-cancha' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-ink transition ${
                form.activo ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        {formError && (
          <p className="text-alerta text-sm text-center" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full h-14 rounded-xl bg-cancha text-ink font-display font-semibold text-lg tracking-wide active:scale-[0.98] transition disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : esNueva ? 'Crear forma de pago' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
