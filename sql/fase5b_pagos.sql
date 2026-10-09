-- Fase 5B: tabla de pagos
-- Ejecutar en Supabase (SQL Editor) del proyecto fvjcthnvuoixniygrlfm, ANTES de desplegar el codigo.
-- Es seguro ejecutarlo mas de una vez (no duplica los pagos ya migrados).
--
-- Cada cobro queda registrado con su fecha. Los ingresos de un mes son la suma de los pagos
-- de ese mes, asi que ya no cambian si despues se edita o se borra un evento.

-- 1) Tabla -------------------------------------------------------------------
create table if not exists pagos (
  id uuid primary key default gen_random_uuid(),
  -- Si se borra el evento, el pago se queda (el dinero ya se cobro) y evento_id pasa a NULL
  evento_id uuid references eventos(id) on delete set null,
  -- Positivo: cobro. Negativo: devolucion o correccion de un adelanto mal anotado.
  monto numeric not null check (monto <> 0),
  fecha date not null default ((now() at time zone 'America/La_Paz')::date),
  tipo text not null check (tipo in ('adelanto', 'saldo', 'ajuste')),
  descripcion text,   -- "Cliente — tipo fecha": se guarda para entender el pago aunque se borre el evento
  nota text,
  created_at timestamptz not null default now()
);

create index if not exists pagos_fecha_idx on pagos (fecha);
create index if not exists pagos_evento_idx on pagos (evento_id);

grant select, insert, update, delete on pagos to anon, authenticated;

-- Supabase puede crear las tablas nuevas con RLS activado y sin politicas, y asi la app no ve ni guarda nada.
-- Se deja igual que el resto de las tablas del proyecto (RLS desactivado).
alter table pagos disable row level security;


-- 2) Texto descriptivo de un evento --------------------------------------------
create or replace function descripcion_evento(p_evento_id uuid)
returns text
language sql
stable
as $$
  select trim(coalesce(c.nombre, '')) || ' — ' || coalesce(e.tipo_evento, '') || ' ' || to_char(e.fecha::date, 'DD/MM/YYYY')
    from eventos e
    left join clientes c on c.id = e.cliente_id
   where e.id = p_evento_id
$$;


-- 3) Migracion de los cobros que ya existen -----------------------------------
-- Adelantos: se fechan el dia en que se creo la reserva.
insert into pagos (evento_id, monto, fecha, tipo, descripcion)
select e.id,
       e.adelanto,
       (e.created_at at time zone 'America/La_Paz')::date,
       'adelanto',
       descripcion_evento(e.id)
  from eventos e
 where coalesce(e.adelanto, 0) > 0
   and not exists (select 1 from pagos p where p.evento_id = e.id and p.tipo = 'adelanto');

-- Saldos ya cobrados: se fechan el dia de pago que estaba guardado.
insert into pagos (evento_id, monto, fecha, tipo, descripcion)
select e.id,
       e.monto_saldo_cobrado,
       e.fecha_pago::date,
       'saldo',
       descripcion_evento(e.id)
  from eventos e
 where coalesce(e.monto_saldo_cobrado, 0) > 0
   and e.fecha_pago is not null
   and not exists (select 1 from pagos p where p.evento_id = e.id and p.tipo = 'saldo');


-- 4) Adelantos nuevos y correcciones, automaticos ------------------------------
create or replace function registrar_adelanto_evento()
returns trigger
language plpgsql
as $$
declare
  v_hoy date := (now() at time zone 'America/La_Paz')::date;
begin
  if tg_op = 'INSERT' then
    if coalesce(new.adelanto, 0) > 0 then
      insert into pagos (evento_id, monto, fecha, tipo, descripcion)
      values (new.id, new.adelanto, v_hoy, 'adelanto', descripcion_evento(new.id));
    end if;
  elsif coalesce(new.adelanto, 0) <> coalesce(old.adelanto, 0) then
    -- Cambiar el adelanto de un evento no reescribe el pasado: queda una correccion con fecha de hoy
    insert into pagos (evento_id, monto, fecha, tipo, descripcion, nota)
    values (new.id, coalesce(new.adelanto, 0) - coalesce(old.adelanto, 0), v_hoy, 'ajuste',
            descripcion_evento(new.id), 'Corrección del adelanto');
  end if;
  return null;
end;
$$;

drop trigger if exists eventos_registrar_adelanto on eventos;
create trigger eventos_registrar_adelanto
  after insert or update of adelanto on eventos
  for each row execute function registrar_adelanto_evento();


-- 5) Cobrar el saldo (total o parcial) en una sola transaccion -------------------
-- Guarda el pago y baja el saldo del evento. Si el saldo llega a 0, el evento queda como pagado,
-- y si ya se realizo pasa a completado. Devuelve el saldo que queda.
create or replace function registrar_pago(p_evento_id uuid, p_monto numeric, p_nota text default null)
returns numeric
language plpgsql
as $$
declare
  v_evento eventos%rowtype;
  v_hoy date := (now() at time zone 'America/La_Paz')::date;
  v_saldo numeric;
  v_nuevo numeric;
begin
  select * into v_evento from eventos where id = p_evento_id for update;
  if not found then
    raise exception 'No se encontró el evento';
  end if;
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que 0';
  end if;

  v_saldo := coalesce(v_evento.saldo_pendiente, 0);
  if p_monto > v_saldo then
    raise exception 'El monto supera el saldo pendiente (Bs. %)', v_saldo;
  end if;
  v_nuevo := v_saldo - p_monto;

  insert into pagos (evento_id, monto, fecha, tipo, descripcion, nota)
  values (p_evento_id, p_monto, v_hoy, 'saldo', descripcion_evento(p_evento_id), nullif(trim(coalesce(p_nota, '')), ''));

  update eventos
     set saldo_pendiente = v_nuevo,
         pagado = (v_nuevo = 0),
         estado = case
                    when v_nuevo = 0 and coalesce(fecha_fin, fecha)::date < v_hoy then 'completado'
                    else estado
                  end,
         -- Se mantienen al dia por compatibilidad con la version anterior de la app
         fecha_pago = v_hoy,
         monto_saldo_cobrado = coalesce(monto_saldo_cobrado, 0) + p_monto
   where id = p_evento_id;

  return v_nuevo;
end;
$$;

grant execute on function registrar_pago(uuid, numeric, text) to anon, authenticated;

-- Refresca la cache de la API
notify pgrst, 'reload schema';
