-- Fase 3: integridad de datos
-- Ejecutar en Supabase (SQL Editor) del proyecto fvjcthnvuoixniygrlfm, ANTES de desplegar el codigo.
-- Es seguro ejecutarlo mas de una vez.

-- 1) "Pagado" separado de "Completado" ---------------------------------------
alter table eventos
  add column if not exists pagado boolean not null default false;

-- Los eventos que ya no tienen saldo (o ya estaban completados) se consideran pagados.
update eventos
   set pagado = true
 where pagado = false
   and (estado = 'completado' or coalesce(saldo_pendiente, 0) = 0);


-- 2) Cerrar el acta de inventario en UNA sola transaccion ---------------------
-- Descuenta del inventario lo roto/faltante, cierra las filas del acta y suma el
-- cobro al saldo del evento. Si algo falla, no se aplica nada. Llamarla dos veces
-- no descuenta doble porque solo procesa filas con cerrado = false.
-- Devuelve el monto total que se sumo al saldo del evento.
create or replace function cerrar_acta_evento(p_evento_id uuid)
returns numeric
language plpgsql
as $$
declare
  v_cobro numeric := 0;
begin
  -- Descuento del inventario por item (roto + faltante)
  update inventario_items i
     set cantidad_actual = greatest(i.cantidad_actual - p.perdida, 0)
    from (
      select item_id,
             sum(coalesce(cantidad_rota, 0)
                 + greatest(coalesce(cantidad_entregada, 0) - coalesce(cantidad_devuelta, 0) - coalesce(cantidad_rota, 0), 0)) as perdida
        from evento_inventario
       where evento_id = p_evento_id and cerrado = false
       group by item_id
    ) p
   where i.id = p.item_id and p.perdida > 0;

  -- Monto a cobrar de las filas que se estan cerrando
  select coalesce(sum(monto_cobro), 0)
    into v_cobro
    from evento_inventario
   where evento_id = p_evento_id and cerrado = false;

  update evento_inventario
     set cerrado = true
   where evento_id = p_evento_id and cerrado = false;

  -- El cobro se suma al saldo; si el evento estaba pagado, vuelve a tener saldo
  if v_cobro > 0 then
    update eventos
       set saldo_pendiente = coalesce(saldo_pendiente, 0) + v_cobro,
           pagado = false,
           estado = 'reservado'
     where id = p_evento_id;
  end if;

  return v_cobro;
end;
$$;

grant execute on function cerrar_acta_evento(uuid) to anon, authenticated;


-- 3) Validaciones en la base de datos -----------------------------------------
-- "not valid" no revisa las filas que ya existen, solo las nuevas y las que se modifiquen.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_compra_valores') then
    alter table compras_cerveza
      add constraint chk_compra_valores
      check (cantidad_cajas > 0 and precio_unitario >= 0 and monto_pagado >= 0 and deuda_pendiente >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_evento_valores') then
    alter table eventos
      add constraint chk_evento_valores
      check (adelanto >= 0 and saldo_pendiente >= 0 and coalesce(monto_total, 0) >= 0 and monto_lavado >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_inventario_item_valores') then
    alter table inventario_items
      add constraint chk_inventario_item_valores
      check (cantidad_actual >= 0 and precio_unitario >= 0) not valid;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'chk_evento_inventario_valores') then
    alter table evento_inventario
      add constraint chk_evento_inventario_valores
      check (cantidad_entregada >= 0 and cantidad_devuelta >= 0 and cantidad_rota >= 0) not valid;
  end if;
end $$;

-- Refresca la cache de la API
notify pgrst, 'reload schema';
