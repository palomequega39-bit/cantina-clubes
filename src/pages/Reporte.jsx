import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatMoney } from '../lib/format'

const FORMAS_PAGO = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CTA_CTE']

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Reporte() {
  const navigate = useNavigate()
  const [fecha, setFecha] = useState(hoyISO())
  const [formaPago, setFormaPago] = useState('TODAS')
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [abierta, setAbierta] = useState(null)
  const [detalles, setDetalles] = useState({})

  useEffect(() => {
    let mounted = true
    async function cargar() {
      setLoading(true)
      setError(null)
      const start = `${fecha}T00:00:00`
      const end = `${fecha}T23:59:59.999`

      let query = supabase
        .from('ventas')
        .select('id, fecha, total, forma_pago, cliente_id, clientes(nombre)')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: false })

      if (formaPago !== 'TODAS') query = query.eq('forma_pago', formaPago)

      const { data, error } = await query
      if (!mounted) return
      if (error) setError(error.message)
      setVentas(data ?? [])
      setLoading(false)
    }
    cargar()
    return () => {
      mounted = false
    }
  }, [fecha, formaPago])

  const resumen = useMemo(() => {
    const porFormaPago = {}
    let total = 0
    for (const v of ventas) {
      porFormaPago[v.forma_pago] = (porFormaPago[v.forma_pago] ?? 0) + Number(v.total)
      total += Number(v.total)
    }
    return { porFormaPago, total, cantidad: ventas.length }
  }, [ventas])

  async function toggleDetalle(ventaId) {
    if (abierta === ventaId) {
      setAbierta(null)
      return
    }
    setAbierta(ventaId)
    if (!detalles[ventaId]) {
      const { data } = await supabase
        .from('venta_detalles')
        .select('cantidad, precio_unitario, subtotal, productos(nombre)')
        .eq('venta_id', ventaId)
      setDetalles((prev) => ({ ...prev, [ventaId]: data ?? [] }))
    }
  }

  return (
    <div className="min-h-dvh bg-ink px-5 pt-6 pb-10">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="w-11 h-11 rounded-xl bg-surface border border-line flex items-center justify-center text-xl active:scale-95 transition"
          aria-label="Volver al dashboard"
        >
          ←
        </button>
        <h1 className="font-display text-2xl font-semibold text-foam">Reporte del día</h1>
      </header>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block text-muted text-sm mb-1.5" htmlFor="fecha">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full h-12 rounded-xl bg-surface border border-line px-3 text-foam"
          />
        </div>
        <div>
          <label className="block text-muted text-sm mb-1.5" htmlFor="formaPago">
            Forma de pago
          </label>
          <select
            id="formaPago"
            value={formaPago}
            onChange={(e) => setFormaPago(e.target.value)}
            className="w-full h-12 rounded-xl bg-surface border border-line px-3 text-foam"
          >
            <option value="TODAS">Todas</option>
            {FORMAS_PAGO.map((fp) => (
              <option key={fp} value={fp}>
                {fp}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-alerta text-center my-6">{error}</p>}

      {!error && (
        <>
          <div className="rounded-2xl bg-surface border border-line p-5 mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted">Total facturado</span>
              <span className="font-display text-3xl font-bold text-gol">
                {formatMoney(resumen.total)}
              </span>
            </div>
            <p className="text-muted text-sm mb-3">
              {resumen.cantidad} {resumen.cantidad === 1 ? 'venta' : 'ventas'}
            </p>

            {Object.keys(resumen.porFormaPago).length > 0 && (
              <div className="border-t border-line pt-3 space-y-1.5">
                {Object.entries(resumen.porFormaPago).map(([fp, monto]) => (
                  <div key={fp} className="flex items-center justify-between text-sm">
                    <span className="text-muted">{fp}</span>
                    <span className="text-foam font-medium">{formatMoney(monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-muted text-sm mb-2">Detalle de ventas</p>

          {loading ? (
            <p className="text-muted text-center mt-10">Cargando…</p>
          ) : ventas.length === 0 ? (
            <p className="text-muted text-center mt-10">No hay ventas con estos filtros.</p>
          ) : (
            <div className="space-y-2">
              {ventas.map((v) => (
                <div key={v.id} className="rounded-xl bg-surface border border-line overflow-hidden">
                  <button
                    onClick={() => toggleDetalle(v.id)}
                    className="w-full flex items-center justify-between p-3.5 text-left active:bg-surface-2 transition"
                  >
                    <div>
                      <p className="text-foam font-medium">
                        {new Date(v.fecha).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {v.forma_pago}
                      </p>
                      {v.clientes?.nombre && (
                        <p className="text-muted text-sm">{v.clientes.nombre}</p>
                      )}
                    </div>
                    <span className="font-display font-semibold text-gol">
                      {formatMoney(v.total)}
                    </span>
                  </button>

                  {abierta === v.id && (
                    <div className="border-t border-line px-3.5 py-2.5 bg-surface-2/50 space-y-1">
                      {(detalles[v.id] ?? []).map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted">
                            {d.cantidad} × {d.productos?.nombre ?? 'Producto'}
                          </span>
                          <span className="text-foam">{formatMoney(d.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
