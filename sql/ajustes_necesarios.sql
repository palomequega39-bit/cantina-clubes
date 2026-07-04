-- ============================================================
-- AJUSTES NECESARIOS EN SUPABASE PARA "NUEVA VENTA"
-- Corré esto en el SQL Editor de tu proyecto antes de probar la app.
-- Está separado en bloques comentados: podés correrlo todo junto.
-- ============================================================

-- 1) Foto de producto: la tabla "productos" no tenía columna para imagen.
--    La app ya soporta mostrar la foto si existe, y si es null muestra
--    un cuadrado de color con las iniciales del producto (no rompe nada
--    si por ahora no cargás fotos).
alter table productos
  add column if not exists imagen_url text;


-- 2) RLS faltante en "venta_detalles": todas las demás tablas tienen
--    Row Level Security activado, esta no. Sin esto, cualquier usuario
--    autenticado podría leer/insertar detalles de ventas de otro club.
alter table venta_detalles enable row level security;

create policy venta_detalles_select on venta_detalles
  for select using (
    exists (
      select 1 from ventas v
      where v.id = venta_detalles.venta_id
        and v.club_id = obtener_club_usuario()
    )
  );

create policy venta_detalles_insert on venta_detalles
  for insert with check (
    exists (
      select 1 from ventas v
      where v.id = venta_detalles.venta_id
        and v.club_id = obtener_club_usuario()
    )
  );


-- 3) Triggers que existen como función pero nunca quedaron enganchados.
--    Sin esto, el módulo de Nueva Venta funciona igual (el front hace
--    el insert de la venta), pero estos dos automatismos no corren solos:

-- 3a) Generar deuda en cuenta corriente cuando forma_pago = 'CTA_CTE'
create trigger trg_generar_deuda_cta_cte
  after insert on ventas
  for each row execute function generar_deuda_cta_cte();

-- 3b) Registrar el movimiento de stock (además de descontarlo)
create trigger trg_registrar_movimiento_stock
  after insert on venta_detalles
  for each row execute function registrar_movimiento_stock();

-- Nota: el trigger que YA descuenta el stock (trg_descontar_stock) se
-- deja como está, sigue funcionando igual que antes.
