-- Fase 5: rendimiento
-- Ejecutar en Supabase (SQL Editor) del proyecto fvjcthnvuoixniygrlfm, ANTES de desplegar el codigo.
-- Es seguro ejecutarlo mas de una vez.

-- Totales de cervezas calculados por la base de datos: la app ya no tiene que bajar
-- todo el historial de compras y cajas solo para sumar.
create or replace view resumen_cerveza as
select
  (select coalesce(sum(deuda_pendiente), 0) from compras_cerveza) as deuda_distribuidor,
  (select coalesce(sum(
            case tipo
              when 'debe' then cajas_recibidas
              when 'devolucion' then -cajas_recibidas
              else 0
            end), 0) from cajas_vacias) as cajas_pendientes;

grant select on resumen_cerveza to anon, authenticated;

-- Refresca la cache de la API
notify pgrst, 'reload schema';
