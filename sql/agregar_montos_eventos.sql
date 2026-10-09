-- Guarda el monto del alquiler y del lavado en cada evento.
-- Ejecutar en Supabase (SQL Editor) ANTES de desplegar el codigo que los inserta.
-- Los eventos anteriores quedan con monto_total en NULL (no se conoce el dato original).
alter table eventos
  add column if not exists monto_total numeric,
  add column if not exists incluye_lavado boolean not null default false,
  add column if not exists monto_lavado numeric not null default 0;
