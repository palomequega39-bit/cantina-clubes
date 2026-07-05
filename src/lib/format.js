const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatMoney(value) {
  const n = Number(value) || 0
  return currencyFormatter.format(n)
}

export function initials(text) {
  if (!text) return '?'
  return text.trim().slice(0, 2).toUpperCase()
}

// Genera un color estable a partir de un string (para las tarjetas de producto sin foto)
export function colorFromString(text) {
  const palette = ['#52d17c', '#ffb545', '#5ea8ff', '#ff8a5e', '#c792ff', '#4ad1c9']
  let hash = 0
  for (let i = 0; i < (text || '').length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash)
  }
  return palette[Math.abs(hash) % palette.length]
}

export function todayRangeISO() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

// Convierte "Mercado Pago" -> "MERCADO_PAGO" (identificador interno estable)
export function slugify(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca acentos
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
