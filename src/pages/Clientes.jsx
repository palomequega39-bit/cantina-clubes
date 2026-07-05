import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatMoney, initials, colorFromString } from '../lib/format'

const VACIO = { id: null, nombre: '', telefono: '', observaciones: '', activo: true }
const FORMAS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
]

export default function Clientes() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [view, setView] = useState('lista') // 'lista' | 'form' | 'detalle'
  const [clientes, setClientes] = useState([])
  const [saldos, setSaldos] = useState({}) // { cliente_id: saldo }
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

  const [clienteActivo, setClienteActivo] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [cargandoMovs, setCargandoMovs] = useState(false)

  useEffect(() => {
    cargarTodo()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  async function cargarTodo() {
    setLoading(true)
    setError(null)
    const [{ data: cli, error: e1 }, { data: sal, error: e2 }] = await Promise.all([
      supabase.from('clientes').select('id, nombre, telefono, observaciones, activo').order('nombre'),
      supabase.from('vw_saldo_clientes').select('id, saldo'),
    ])
    if (e1 || e2) setError((e1 || e2).message)
    setClientes(cli ?? [])
    const map = {}
    ;(sal ?? []).forEach((s) => (map[s.id] = Number(s.saldo)))
    setSaldos(map)
    setLoading(false)
  }

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return clientes
    return clientes.filter((c) => c.nombre.toLowerCase().includes(q))
  }, [clientes, busqueda])

  function abrirNuevo() {
    setForm(VACIO)
    setFormError(null)
    setView('form')
  }

  function abrirEdicion(c) {
    setForm({
      id: c.id,
      nombre: c.nombre ?? '',
      telefono: c.telefono ?? '',
      observaciones: c.observaciones ?? '',
      activo: c.activo,
    })
    setFormError(null)
    setView('form')
  }

  async function abrirDetalle(c) {
    setClienteActivo(c)
    setView('detalle')
    setCargandoMovs(true)
    const { data } = await supabase
      .from('cuenta_corriente_movimientos')
      .select('id, fecha, tipo, importe, forma_pago, observacion')
      .eq('cliente_id', c.id)
      .order('fecha', { ascending: false })
    setMovimientos(data ?? [])
    setCargandoMovs(false)
  }

  async function guardar(e) {
    e.preventDefault()
    setFormError(null)
    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    setGuardando(true)
    const payload = {
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim() || null,
      observaciones: form.observaciones.trim() || null,
      activo: form.activo,
    }
    let error
    if (form.id) {
      ;({ error } = await supabase.from('clientes').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('clientes').insert({ ...payload, club_id: usuario.club_id }))
    }
    setGuardando(false)
    if (error) {
      setFormError(error.message)
      return
    }
    setToast(form.id ? 'Cliente actualizado ✓' : 'Cliente creado ✓')
    setView('lista')
    cargarTodo()
  }

  async function registrarPago(monto, formaPago, observacion) {
    const { error } = await supabase.from('cuenta_corriente_movimientos').insert({
      club_id: usuario.club_id,
      cliente_id: clienteActivo.id,
      tipo: 'PAGO',
      importe: monto,
      forma_pago: formaPago,
      observacion: observacion || null,
    })
    if (error) {
      setToast(`Error: ${error.message}`)
      return false
    }
    setToast('Pago registrado ✓')
    await abrirDetalle(clienteActivo)
    cargarTodo()
    return true
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink">
        <p className="text-muted font-display">Cargando clientes…</p>
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
          clientes={clientesFiltrados}
          saldos={saldos}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          onBack={() => navigate('/')}
          onAbrir={abrirDetalle}
          onNuevo={abrirNuevo}
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
          esNuevo={!form.id}
        />
      )}

      {view === 'detalle' && clienteActivo && (
        <DetalleView
          cliente={clienteActivo}
          saldo={saldos[clienteActivo.id] ?? 0}
          movimientos={movimientos}
          cargando={cargandoMovs}
          onBack={() => setView('lista')}
          onEditar={() => abrirEdicion(clienteActivo)}
          onRegistrarPago={registrarPago}
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

function ListaView({ clientes, saldos, busqueda, setBusqueda, onBack, onAbrir, onNuevo }) {
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
        <h1 className="font-display text-2xl font-semibold text-foam">Clientes</h1>
      </header>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar cliente…"
        className="w-full h-12 rounded-xl bg-surface border border-line px-4 text-foam placeholder:text-muted/60 mb-4"
      />

      {clientes.length === 0 ? (
        <p className="text-muted text-center mt-16">No hay clientes que coincidan.</p>
      ) : (
        <div className="space-y-2">
          {clientes.map((c) => {
            const saldo = saldos[c.id] ?? 0
            return (
              <button
                key={c.id}
                onClick={() => onAbrir(c)}
                className={`w-full rounded-xl bg-surface border border-line p-3 flex items-center gap-3 text-left ${
                  !c.activo ? 'opacity-50' : ''
                }`}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${colorFromString(c.nombre)}22` }}
                >
                  <span className="font-display font-bold text-sm" style={{ color: colorFromString(c.nombre) }}>
                    {initials(c.nombre)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foam font-medium truncate">{c.nombre}</p>
                  {c.telefono && <p className="text-muted text-sm truncate">{c.telefono}</p>}
                </div>
                <span
                  className={`font-display font-semibold ${
                    saldo > 0 ? 'text-alerta' : 'text-muted'
                  }`}
                >
                  {saldo > 0 ? formatMoney(saldo) : 'Al día'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button
        onClick={onNuevo}
        className="fixed bottom-6 right-5 w-16 h-16 rounded-full bg-gol text-ink font-display font-bold text-3xl shadow-2xl active:scale-90 transition flex items-center justify-center"
        aria-label="Nuevo cliente"
      >
        +
      </button>
    </div>
  )
}

function FormView({ form, setForm, onBack, onGuardar, guardando, formError, esNuevo }) {
  function set(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">
          {esNuevo ? 'Nuevo cliente' : 'Editar cliente'}
        </h1>
      </header>

      <form onSubmit={onGuardar} className="space-y-4">
        <div>
          <label className="block text-muted text-sm mb-1.5">Nombre</label>
          <input
            type="text"
            required
            value={form.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
            placeholder="Nombre y apellido"
          />
        </div>

        <div>
          <label className="block text-muted text-sm mb-1.5">Teléfono (opcional)</label>
          <input
            type="tel"
            value={form.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
            placeholder="Ej: 351 123 4567"
          />
        </div>

        <div>
          <label className="block text-muted text-sm mb-1.5">Observaciones (opcional)</label>
          <textarea
            value={form.observaciones}
            onChange={(e) => set('observaciones', e.target.value)}
            rows={3}
            className="w-full rounded-xl bg-surface border border-line px-4 py-3 text-foam"
            placeholder="Notas internas sobre el cliente"
          />
        </div>

        <button
          type="button"
          onClick={() => set('activo', !form.activo)}
          className="w-full h-14 rounded-xl bg-surface border border-line flex items-center justify-between px-4"
        >
          <span className="text-foam">Cliente activo</span>
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
          {guardando ? 'Guardando…' : esNuevo ? 'Crear cliente' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}

function DetalleView({ cliente, saldo, movimientos, cargando, onBack, onEditar, onRegistrarPago }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState('EFECTIVO')
  const [observacion, setObservacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [err, setErr] = useState(null)

  async function handlePago(e) {
    e.preventDefault()
    setErr(null)
    const n = Number(monto)
    if (!n || n <= 0) {
      setErr('Ingresá un monto válido.')
      return
    }
    setEnviando(true)
    const ok = await onRegistrarPago(n, formaPago, observacion.trim())
    setEnviando(false)
    if (ok) {
      setMostrarForm(false)
      setMonto('')
      setFormaPago('EFECTIVO')
      setObservacion('')
    }
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver a la lista"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam truncate flex-1">
          {cliente.nombre}
        </h1>
        <button
          onClick={onEditar}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-lg active:scale-95 transition"
          aria-label="Editar cliente"
        >
          ✎
        </button>
      </header>

      <div className="rounded-2xl bg-surface border border-line p-5 mb-5 text-center">
        <p className="text-muted text-sm mb-1">Saldo actual</p>
        <p className={`font-display text-3xl font-bold ${saldo > 0 ? 'text-alerta' : 'text-cancha'}`}>
          {saldo > 0 ? formatMoney(saldo) : 'Al día'}
        </p>
      </div>

      {!mostrarForm ? (
        <button
          onClick={() => setMostrarForm(true)}
          className="w-full h-14 rounded-xl bg-cancha text-ink font-display font-semibold text-lg tracking-wide active:scale-[0.98] transition mb-6"
        >
          Registrar pago
        </button>
      ) : (
        <form onSubmit={handlePago} className="rounded-2xl bg-surface border border-line p-4 mb-6 space-y-3">
          <div>
            <label className="block text-muted text-sm mb-1.5">Monto que paga</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full h-14 rounded-xl bg-surface-2 border border-line px-4 text-lg text-foam"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-muted text-sm mb-1.5">Forma de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMAS_PAGO.map((fp) => (
                <button
                  key={fp.value}
                  type="button"
                  onClick={() => setFormaPago(fp.value)}
                  className={`h-12 rounded-xl border text-sm font-medium transition active:scale-[0.97] ${
                    formaPago === fp.value
                      ? 'bg-cancha text-ink border-cancha'
                      : 'bg-surface-2 text-foam border-line'
                  }`}
                >
                  {fp.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-muted text-sm mb-1.5">Observación (opcional)</label>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="w-full h-12 rounded-xl bg-surface-2 border border-line px-4 text-foam"
              placeholder="Ej: pago parcial"
            />
          </div>
          {err && <p className="text-alerta text-sm text-center">{err}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="flex-1 h-12 rounded-xl border border-line text-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 h-12 rounded-xl bg-gol text-ink font-display font-semibold disabled:opacity-60"
            >
              {enviando ? 'Guardando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      )}

      <p className="text-muted text-sm mb-2">Movimientos</p>

      {cargando ? (
        <p className="text-muted text-center mt-8">Cargando…</p>
      ) : movimientos.length === 0 ? (
        <p className="text-muted text-center mt-8">Todavía no hay movimientos.</p>
      ) : (
        <div className="space-y-2">
          {movimientos.map((m) => (
            <div
              key={m.id}
              className="rounded-xl bg-surface border border-line p-3 flex items-center justify-between"
            >
              <div className="min-w-0">
                <p className="text-foam font-medium">
                  {m.tipo === 'DEUDA' ? 'Consumo (fiado)' : `Pago${m.forma_pago ? ` · ${m.forma_pago}` : ''}`}
                </p>
                <p className="text-muted text-sm">
                  {new Date(m.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  {' · '}
                  {new Date(m.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                {m.observacion && <p className="text-muted text-sm truncate">{m.observacion}</p>}
              </div>
              <span
                className={`font-display font-semibold shrink-0 ${
                  m.tipo === 'DEUDA' ? 'text-alerta' : 'text-cancha'
                }`}
              >
                {m.tipo === 'DEUDA' ? '+' : '−'}
                {formatMoney(m.importe)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
