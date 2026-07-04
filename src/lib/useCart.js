import { useMemo, useState, useCallback } from 'react'

export function useCart() {
  const [items, setItems] = useState({}) // { [producto_id]: { producto, cantidad } }

  const add = useCallback((producto) => {
    setItems((prev) => {
      const actual = prev[producto.id]
      const cantidad = (actual?.cantidad || 0) + 1
      return { ...prev, [producto.id]: { producto, cantidad } }
    })
  }, [])

  const decrement = useCallback((productoId) => {
    setItems((prev) => {
      const actual = prev[productoId]
      if (!actual) return prev
      if (actual.cantidad <= 1) {
        const next = { ...prev }
        delete next[productoId]
        return next
      }
      return { ...prev, [productoId]: { ...actual, cantidad: actual.cantidad - 1 } }
    })
  }, [])

  const remove = useCallback((productoId) => {
    setItems((prev) => {
      const next = { ...prev }
      delete next[productoId]
      return next
    })
  }, [])

  const clear = useCallback(() => setItems({}), [])

  const lista = useMemo(() => Object.values(items), [items])

  const cantidadTotal = useMemo(
    () => lista.reduce((acc, it) => acc + it.cantidad, 0),
    [lista]
  )

  const total = useMemo(
    () => lista.reduce((acc, it) => acc + it.cantidad * Number(it.producto.precio_venta), 0),
    [lista]
  )

  return { items: lista, add, decrement, remove, clear, cantidadTotal, total }
}
