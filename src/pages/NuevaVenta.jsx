import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../lib/useCart'
import { formatMoney, initials, colorFromString } from '../lib/format'

const FORMAS_PAGO = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'CTA_CTE', label: 'Cta. corriente' },
]

export default function NuevaVenta() {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const cart = useCart()

  const [view, setView] = useState('categorias') // 'categorias' | 'productos' | 'carrito'
  const [categorias, setCategorias] = useState([])
  const [productos, setProductos] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const [formaPago, setFormaPago] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clienteId, setClienteId] = useState('')
  const [vendiendo, setVendiendo] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let mounted = true
    async function cargar() {
      setLoading(true)
      const [{ data: cats, error: e1 }, { data: prods, error: e2 }] = await Promise.all([
        supabase.from('categorias_productos').select('id, nombre').order('nombre'),
        supabase
          .from('productos')
          .select('id, categoria_id, nombre, precio_venta, stock_actual, activo, imagen_url')
          .eq('activo', true)
          .order('nombre'),
      ])
      if (!mounted) return
      if (e1 || e2) setLoadError((e1 || e2).message)
      setCategorias(cats ?? [])
      setProductos(prods ?? [])
      setLoading(false)
    }
    cargar()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (formaPago !== 'CTA_CTE' || clientes.length > 0) return
    supabase
      .from('clientes')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setClientes(data ?? []))
  }, [formaPago, clientes.length])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const productosDeCategoria = useMemo(
    () => productos.filter((p) => p.categoria_id === categoriaActiva?.id),
    [productos, categoriaActiva]
  )

  function abrirCategoria(cat) {
    setCategoriaActiva(cat)
    setView('productos')
  }

  function volverACategorias() {
    setView('categorias')
    setCategoriaActiva(null)
  }

  function cantidadEnCarrito(productoId) {
    return cart.items.find((it) => it.producto.id === productoId)?.cantidad ?? 0
  }

  async function confirmarVenta() {
    if (!formaPago || cart.items.length === 0) return
    if (formaPago === 'CTA_CTE' && !clienteId) return

    setVendiendo(true)
    try {
      const { data: venta, error: errVenta } = await supabase
        .from('ventas')
        .insert({
          club_id: usuario.club_id,
          cliente_id: formaPago === 'CTA_CTE' ? clienteId : null,
          subtotal: cart.total,
          total: cart.total,
          forma_pago: formaPago,
          usuario_id: usuario.id,
        })
        .select('id')
        .single()

      if (errVenta) throw errVenta

      const detalles = cart.items.map((it) => ({
        venta_id: venta.id,
        producto_id: it.producto.id,
        cantidad: it.cantidad,
        precio_unitario: it.producto.precio_venta,
        subtotal: it.cantidad * Number(it.producto.precio_venta),
      }))

      const { error: errDetalle } = await supabase.from('venta_detalles').insert(detalles)
      if (errDetalle) throw errDetalle

      setToast('Venta registrada ✓')
      cart.clear()
      setFormaPago(null)
      setClienteId('')
      volverACategorias()
    } catch (err) {
      setToast(`Error al vender: ${err.message}`)
    } finally {
      setVendiendo(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink">
        <p className="text-muted font-display">Cargando productos…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-ink px-6 text-center">
        <p className="text-alerta">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink flex flex-col">
      {view === 'categorias' && (
        <CategoriasView
          categorias={categorias}
          onSelect={abrirCategoria}
          onBack={() => navigate('/')}
        />
      )}

      {view === 'productos' && (
        <ProductosView
          categoria={categoriaActiva}
          productos={productosDeCategoria}
          cantidadEnCarrito={cantidadEnCarrito}
          onAdd={cart.add}
          onBack={volverACategorias}
        />
      )}

      {view === 'carrito' && (
        <CarritoView
          cart={cart}
          formaPago={formaPago}
          setFormaPago={setFormaPago}
          clientes={clientes}
          clienteId={clienteId}
          setClienteId={setClienteId}
          onBack={() => setView(categoriaActiva ? 'productos' : 'categorias')}
          onConfirmar={confirmarVenta}
          vendiendo={vendiendo}
        />
      )}

      {view !== 'carrito' && cart.cantidadTotal > 0 && (
        <button
          onClick={() => setView('carrito')}
          className="fixed bottom-0 left-0 right-0 mx-auto max-w-md h-20 bg-cancha text-ink flex items-center justify-between px-6 shadow-2xl active:brightness-95 transition"
        >
          <span className="font-display font-semibold text-lg">
            {cart.cantidadTotal} {cart.cantidadTotal === 1 ? 'producto' : 'productos'}
          </span>
          <span className="font-display font-bold text-xl tracking-tight">
            Cerrar venta · {formatMoney(cart.total)}
          </span>
        </button>
      )}

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-surface-2 border border-line px-5 py-3 rounded-xl text-foam font-medium shadow-xl z-50 max-w-[90%] text-center">
          {toast}
        </div>
      )}
    </div>
  )
}

function CategoriasView({ categorias, onSelect, onBack }) {
  return (
    <div className="px-5 pt-6 pb-32">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver al dashboard"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">Nueva Venta</h1>
      </header>

      {categorias.length === 0 ? (
        <p className="text-muted text-center mt-16">
          Todavía no hay categorías cargadas para este club.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className="aspect-square rounded-2xl bg-surface border border-line flex items-center justify-center p-3 active:scale-[0.97] active:border-cancha transition"
              style={{ boxShadow: `inset 0 0 0 1px transparent` }}
            >
              <span
                className="font-display text-lg font-semibold text-center leading-tight"
                style={{ color: colorFromString(cat.nombre) }}
              >
                {cat.nombre}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ProductosView({ categoria, productos, cantidadEnCarrito, onAdd, onBack }) {
  return (
    <div className="px-5 pt-6 pb-32">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver a categorías"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">{categoria?.nombre}</h1>
      </header>

      {productos.length === 0 ? (
        <p className="text-muted text-center mt-16">No hay productos activos en esta categoría.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {productos.map((p) => {
            const enCarrito = cantidadEnCarrito(p.id)
            const sinStock = p.stock_actual !== null && Number(p.stock_actual) <= 0
            return (
              <div
                key={p.id}
                className="rounded-2xl bg-surface border border-line overflow-hidden flex flex-col"
              >
                <div
                  className="aspect-square w-full flex items-center justify-center relative"
                  style={{
                    backgroundColor: p.imagen_url ? 'transparent' : `${colorFromString(p.nombre)}22`,
                  }}
                >
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <span
                      className="font-display text-3xl font-bold"
                      style={{ color: colorFromString(p.nombre) }}
                    >
                      {initials(p.nombre)}
                    </span>
                  )}

                  <button
                    onClick={() => onAdd(p)}
                    disabled={sinStock}
                    className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-cancha text-ink font-display font-bold text-2xl flex items-center justify-center shadow-lg active:scale-90 transition disabled:bg-line disabled:text-muted"
                    aria-label={`Agregar ${p.nombre}`}
                  >
                    +
                  </button>

                  {enCarrito > 0 && (
                    <span className="absolute top-2 right-2 min-w-[26px] h-[26px] px-1.5 rounded-full bg-gol text-ink font-display font-bold text-sm flex items-center justify-center">
                      {enCarrito}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-foam font-medium leading-tight truncate">{p.nombre}</p>
                  <p className="font-display text-gol font-semibold mt-0.5">
                    {formatMoney(p.precio_venta)}
                  </p>
                  {sinStock && <p className="text-alerta text-xs mt-1">Sin stock</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CarritoView({
  cart,
  formaPago,
  setFormaPago,
  clientes,
  clienteId,
  setClienteId,
  onBack,
  onConfirmar,
  vendiendo,
}) {
  const puedeVender =
    cart.items.length > 0 && formaPago && !(formaPago === 'CTA_CTE' && !clienteId) && !vendiendo

  return (
    <div className="px-5 pt-6 pb-36">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Seguir agregando productos"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">Cerrar venta</h1>
      </header>

      {cart.items.length === 0 ? (
        <p className="text-muted text-center mt-16">El carrito está vacío.</p>
      ) : (
        <>
          <div className="space-y-2 mb-6">
            {cart.items.map((it) => (
              <div
                key={it.producto.id}
                className="rounded-xl bg-surface border border-line p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-foam font-medium truncate">{it.producto.nombre}</p>
                  <p className="text-muted text-sm">{formatMoney(it.producto.precio_venta)} c/u</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => cart.decrement(it.producto.id)}
                    className="w-9 h-9 rounded-lg bg-surface-2 border border-line font-display text-lg active:scale-90 transition"
                    aria-label="Quitar uno"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-display font-semibold">{it.cantidad}</span>
                  <button
                    onClick={() => cart.add(it.producto)}
                    className="w-9 h-9 rounded-lg bg-surface-2 border border-line font-display text-lg active:scale-90 transition"
                    aria-label="Agregar uno"
                  >
                    +
                  </button>
                </div>
                <p className="font-display font-semibold text-gol w-20 text-right">
                  {formatMoney(it.cantidad * Number(it.producto.precio_venta))}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-6 px-1">
            <span className="text-muted font-display text-lg">Total</span>
            <span className="font-display text-3xl font-bold text-gol">
              {formatMoney(cart.total)}
            </span>
          </div>

          <p className="text-muted text-sm mb-2">Forma de pago</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {FORMAS_PAGO.map((fp) => (
              <button
                key={fp.value}
                onClick={() => setFormaPago(fp.value)}
                className={`h-14 rounded-xl border font-medium transition active:scale-[0.97] ${
                  formaPago === fp.value
                    ? 'bg-cancha text-ink border-cancha'
                    : 'bg-surface text-foam border-line'
                }`}
              >
                {fp.label}
              </button>
            ))}
          </div>

          {formaPago === 'CTA_CTE' && (
            <div className="mb-4">
              <label className="block text-muted text-sm mb-1.5" htmlFor="cliente">
                Cliente
              </label>
              <select
                id="cliente"
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="w-full h-14 rounded-xl bg-surface border border-line px-4 text-foam"
              >
                <option value="">Elegir cliente…</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={onConfirmar}
            disabled={!puedeVender}
            className="fixed bottom-0 left-0 right-0 mx-auto max-w-md h-20 bg-gol text-ink font-display font-bold text-xl tracking-wide shadow-2xl active:brightness-95 transition disabled:bg-line disabled:text-muted"
          >
            {vendiendo ? 'Vendiendo…' : `Vender · ${formatMoney(cart.total)}`}
          </button>
        </>
      )}
    </div>
  )
}
