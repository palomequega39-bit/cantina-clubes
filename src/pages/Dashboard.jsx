import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { usuario, signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-ink px-5 pt-8 pb-10 flex flex-col">
      <header className="flex items-start justify-between mb-10">
        <div>
          <p className="text-muted text-sm">Hola,</p>
          <h1 className="font-display text-2xl font-semibold text-foam">
            {usuario?.nombre ?? 'Usuario'}
          </h1>
        </div>
        <button
          onClick={signOut}
          className="h-10 px-4 rounded-lg border border-line text-muted text-sm active:scale-95 transition"
        >
          Salir
        </button>
      </header>

      <div className="flex-1 flex flex-col gap-4">
        <Link
          to="/venta"
          className="group rounded-2xl bg-cancha text-ink p-6 flex items-center justify-between active:scale-[0.98] transition shadow-lg shadow-cancha/10"
        >
          <div>
            <p className="font-display text-2xl font-semibold">Nueva Venta</p>
            <p className="text-ink/70 mt-1">Cargar pedido en ventanilla</p>
          </div>
          <span className="text-4xl font-display">→</span>
        </Link>

        <Link
          to="/reporte"
          className="rounded-2xl bg-surface border border-line p-6 flex items-center justify-between active:scale-[0.98] transition"
        >
          <div>
            <p className="font-display text-2xl font-semibold text-foam">Reporte del día</p>
            <p className="text-muted mt-1">Totales, filtros y ventas</p>
          </div>
          <span className="text-4xl font-display text-gol">→</span>
        </Link>
      </div>

      <p className="text-center text-muted/60 text-xs mt-8">
        {usuario?.rol ? `Rol: ${usuario.rol}` : ''}
      </p>
    </div>
  )
}
