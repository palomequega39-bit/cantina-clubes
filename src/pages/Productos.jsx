import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatMoney, initials, colorFromString } from '../lib/format'

const VACIO = {
  id: null,
  nombre: '',
  categoria_id: '',
  precio_venta: '',
  costo: '',
  stock_actual: '',
  stock_minimo: '',
  imagen_url: '',
  activo: true,
}

export default function Productos() {
  const navigate = useNavigate()
  const { usuario } = useAuth()

  const [view, setView] = useState('lista') // 'lista' | 'form'
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [formError, setFormError] = useState(null)

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
    const [{ data: prods, error: e1 }, { data: cats, error: e2 }] = await Promise.all([
      supabase
        .from('productos')
        .select('id, categoria_id, nombre, precio_venta, costo, stock_actual, stock_minimo, activo, imagen_url')
        .order('nombre'),
      supabase.from('categorias_productos').select('id, nombre').order('nombre'),
    ])
    if (e1 || e2) setError((e1 || e2).message)
    setProductos(prods ?? [])
    setCategorias(cats ?? [])
    setLoading(false)
  }

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return productos
    return productos.filter((p) => p.nombre.toLowerCase().includes(q))
  }, [productos, busqueda])

  function nombreCategoria(id) {
    return categorias.find((c) => c.id === id)?.nombre ?? 'Sin categoría'
  }

  function abrirNuevo() {
    setForm(VACIO)
    setFormError(null)
    setView('form')
  }

  function abrirEdicion(p) {
    setForm({
      id: p.id,
      nombre: p.nombre ?? '',
      categoria_id: p.categoria_id ?? '',
      precio_venta: p.precio_venta ?? '',
      costo: p.costo ?? '',
      stock_actual: p.stock_actual ?? '',
      stock_minimo: p.stock_minimo ?? '',
      imagen_url: p.imagen_url ?? '',
      activo: p.activo,
    })
    setFormError(null)
    setView('form')
  }

  async function toggleActivo(p) {
    const { error } = await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id)
    if (error) {
      setToast(`Error: ${error.message}`)
      return
    }
    setProductos((prev) => prev.map((x) => (x.id === p.id ? { ...x, activo: !x.activo } : x)))
  }

  async function guardar(e) {
    e.preventDefault()
    setFormError(null)

    if (!form.nombre.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    if (!form.precio_venta || Number(form.precio_venta) <= 0) {
      setFormError('El precio de venta tiene que ser mayor a 0.')
      return
    }

    setGuardando(true)
    const payload = {
      nombre: form.nombre.trim(),
      categoria_id: form.categoria_id || null,
      precio_venta: Number(form.precio_venta),
      costo: form.costo === '' ? null : Number(form.costo),
      stock_actual: form.stock_actual === '' ? 0 : Number(form.stock_actual),
      stock_minimo: form.stock_minimo === '' ? 0 : Number(form.stock_minimo),
      imagen_url: form.imagen_url.trim() || null,
      activo: form.activo,
    }

    let error
    if (form.id) {
      ;({ error } = await supabase.from('productos').update(payload).eq('id', form.id))
    } else {
      ;({ error } = await supabase.from('productos').insert({ ...payload, club_id: usuario.club_id }))
    }

    setGuardando(false)
    if (error) {
      setFormError(error.message)
      return
    }

    setToast(form.id ? 'Producto actualizado ✓' : 'Producto creado ✓')
    setView('lista')
    cargarTodo()
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink">
        <p className="text-muted font-display">Cargando productos…</p>
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
          productos={productosFiltrados}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          nombreCategoria={nombreCategoria}
          onBack={() => navigate('/')}
          onEditar={abrirEdicion}
          onToggleActivo={toggleActivo}
          onNuevo={abrirNuevo}
        />
      )}

      {view === 'form' && (
        <FormView
          form={form}
          setForm={setForm}
          categorias={categorias}
          onBack={() => setView('lista')}
          onGuardar={guardar}
          guardando={guardando}
          formError={formError}
          esNuevo={!form.id}
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

function ListaView({
  productos,
  busqueda,
  setBusqueda,
  nombreCategoria,
  onBack,
  onEditar,
  onToggleActivo,
  onNuevo,
}) {
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
        <h1 className="font-display text-2xl font-semibold text-foam">Productos</h1>
      </header>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar producto…"
        className="w-full h-12 rounded-xl bg-surface border border-line px-4 text-foam placeholder:text-muted/60 mb-4"
      />

      {productos.length === 0 ? (
        <p className="text-muted text-center mt-16">No hay productos que coincidan.</p>
      ) : (
        <div className="space-y-2">
          {productos.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl bg-surface border border-line p-3 flex items-center gap-3 ${
                !p.activo ? 'opacity-50' : ''
              }`}
            >
              <button
                onClick={() => onEditar(p)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: p.imagen_url ? 'transparent' : `${colorFromString(p.nombre)}22` }}
                >
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="font-display font-bold text-sm"
                      style={{ color: colorFromString(p.nombre) }}
                    >
                      {initials(p.nombre)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-foam font-medium truncate">{p.nombre}</p>
                  <p className="text-muted text-sm truncate">{nombreCategoria(p.categoria_id)}</p>
                </div>
              </button>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="font-display font-semibold text-gol">
                  {formatMoney(p.precio_venta)}
                </span>
                <span
                  className={`text-xs ${
                    Number(p.stock_actual) <= Number(p.stock_minimo) ? 'text-alerta' : 'text-muted'
                  }`}
                >
                  Stock: {p.stock_actual}
                </span>
              </div>

              <button
                onClick={() => onToggleActivo(p)}
                className={`w-11 h-7 rounded-full shrink-0 relative transition ${
                  p.activo ? 'bg-cancha' : 'bg-line'
                }`}
                aria-label={p.activo ? 'Desactivar producto' : 'Activar producto'}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 rounded-full bg-ink transition ${
                    p.activo ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onNuevo}
        className="fixed bottom-6 right-5 w-16 h-16 rounded-full bg-gol text-ink font-display font-bold text-3xl shadow-2xl active:scale-90 transition flex items-center justify-center"
        aria-label="Nuevo producto"
      >
        +
      </button>
    </div>
  )
}

function FormView({ form, setForm, categorias, onBack, onGuardar, guardando, formError, esNuevo }) {
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
          {esNuevo ? 'Nuevo producto' : 'Editar producto'}
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
            placeholder="Ej: Coca-Cola 500ml"
          />
        </div>

        <div>
          <label className="block text-muted text-sm mb-1.5">Categoría</label>
          <select
            value={form.categoria_id}
            onChange={(e) => set('categoria_id', e.target.value)}
            className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-foam"
          >
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted text-sm mb-1.5">Precio de venta</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
              value={form.precio_venta}
              onChange={(e) => set('precio_venta', e.target.value)}
              className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-muted text-sm mb-1.5">Costo (opcional)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.costo}
              onChange={(e) => set('costo', e.target.value)}
              className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted text-sm mb-1.5">Stock actual</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={form.stock_actual}
              onChange={(e) => set('stock_actual', e.target.value)}
              className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-muted text-sm mb-1.5">Stock mínimo</label>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={form.stock_minimo}
              onChange={(e) => set('stock_minimo', e.target.value)}
              className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-lg text-foam"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="block text-muted text-sm mb-1.5">URL de la foto (opcional)</label>
          <input
            type="url"
            value={form.imagen_url}
            onChange={(e) => set('imagen_url', e.target.value)}
            className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-foam"
            placeholder="https://…"
          />
          <p className="text-muted text-xs mt-1.5">
            Por ahora se pega un link de imagen. Si lo dejás vacío, se muestra un cuadrado de color
            con las iniciales del producto.
          </p>
        </div>

        <button
          type="button"
          onClick={() => set('activo', !form.activo)}
          className="w-full h-14 rounded-xl bg-surface border border-line flex items-center justify-between px-4"
        >
          <span className="text-foam">Producto activo (visible en Nueva Venta)</span>
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
          {guardando ? 'Guardando…' : esNuevo ? 'Crear producto' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
