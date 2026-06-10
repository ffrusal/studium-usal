-- ============================================================
-- Studium USAL — 03: Administración, analíticas y archivos (R2)
-- Ejecutar en Supabase (SQL Editor), después de 01 y 02.
-- ============================================================

-- 1) Configuración editable desde el panel de administración.
--    Pisa a las variables de entorno sin necesidad de redeploy.
create table if not exists config (
  clave          text primary key,
  valor          text not null,
  actualizado_en timestamptz not null default now()
);

-- 2) Eventos de uso (analíticas simples)
create table if not exists eventos (
  id         bigint generated always as identity primary key,
  tipo       text not null,            -- consulta | indexacion | login
  catedra_id text,
  meta       jsonb,
  creado_en  timestamptz not null default now()
);
create index if not exists idx_eventos_fecha on eventos (creado_en desc);
create index if not exists idx_eventos_tipo  on eventos (tipo);

-- 3) Referencia al archivo original guardado en R2 (opcional)
alter table documentos add column if not exists r2_key text;
