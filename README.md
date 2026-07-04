# Cantina — Sistema de ventas para clubes

MVP mobile-first: **Login → Dashboard → Nueva Venta → Reporte del día**.

Stack: React + Vite + Tailwind CSS v4 + Supabase (Auth + Postgres + RLS).

## 1. Antes de correrlo: ajustes en Supabase

Abrí el **SQL Editor** de tu proyecto y corré el archivo `sql/ajustes_necesarios.sql`.
Agrega la columna de foto en `productos`, activa RLS en `venta_detalles` (no lo tenía)
y engancha dos triggers que existían como función pero no estaban conectados
(deuda automática en cuenta corriente y registro de movimiento de stock).

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Completá `.env` con los datos de tu proyecto (Dashboard → **Connect** → API):

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

La `anon key` es pública y segura de exponer en el frontend: la seguridad real
la dan las políticas RLS que ya tenés configuradas por `club_id`.

## 3. Instalar y correr

```bash
npm install
npm run dev
```

Abrí `http://localhost:5173`. Para probarlo en el celular en la misma red wifi,
Vite ya expone el server en la red (`host: true`), así que entrás con la IP local
que te muestra la terminal (ej: `http://192.168.0.x:5173`).

## 4. Usuarios de prueba

Como `usuarios.id` está encadenado a `auth.users` (Supabase Auth), para crear un
usuario de prueba:

1. Dashboard de Supabase → **Authentication → Users → Add user** (con email y contraseña).
2. Copiá el UUID que te genera.
3. Insertá una fila en `usuarios` con ese mismo `id`, el `club_id` correspondiente y `rol`.

## 5. Cómo está armada la Nueva Venta

- **Categorías** (grilla grande, 2 columnas) → tocás una → **Productos** de esa
  categoría (foto o iniciales de color, precio, botón **+** redondo).
- Cada toque en **+** suma al carrito; aparece un contador sobre el producto.
- Mientras haya productos en el carrito, aparece una barra flotante abajo
  ("marcador") con cantidad y total — toca para ir a **Cerrar venta**.
- Ahí: lista editable (+/−), forma de pago, cliente (si es cuenta corriente),
  y botón flotante **Vender** que hace el insert de `ventas` + `venta_detalles`.
  El stock se descuenta solo (trigger existente).

## 6. Deploy en GitHub Pages

El repo ya incluye `.github/workflows/deploy.yml`, que compila y publica solo.
Pasos únicos (una sola vez):

1. Subí el proyecto a un repo de GitHub (rama `main`).
2. **Settings → Secrets and variables → Actions → New repository secret** y
   cargá dos secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   (los mismos valores que usaste en tu `.env` local)
3. **Settings → Pages → Build and deployment → Source:** elegí **"GitHub Actions"**
   (no "Deploy from a branch").
4. Hacé un push a `main` (o entrá a la pestaña **Actions** del repo y corré el
   workflow manualmente). Cuando termine en verde, Pages te va a mostrar la URL
   final, algo como `https://tu-usuario.github.io/nombre-del-repo/`.

Cada vez que hagas push a `main`, se vuelve a compilar y publicar solo.

**Importante:** la app usa `HashRouter` (las URLs se ven como `.../#/login`,
`.../#/venta`) a propósito, porque GitHub Pages no tiene forma de redirigir
rutas del lado del servidor. Si el día de mañana lo mudás a Vercel/Netlify
(que sí soportan esto), se puede volver a `BrowserRouter` para URLs más limpias.

También sirve cualquier otro hosting de estáticos (Vercel, Netlify, Cloudflare
Pages) — ahí sí conviene volver a `BrowserRouter` y cargar las mismas dos
variables de entorno en la configuración del proyecto.

## Próximos pasos sugeridos (no incluidos en este MVP)

- Pantalla de **Productos/Stock** (alta, edición, carga de fotos a Supabase Storage).
- Pantalla de **Clientes** y **Cuenta corriente** (pagos, historial de deuda).
- Pantalla de **Gastos**.
- PWA (instalable, ícono en pantalla de inicio) — hoy funciona como web mobile-first
  pero no está empaquetada como PWA todavía.
