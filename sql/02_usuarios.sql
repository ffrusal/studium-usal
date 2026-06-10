-- ============================================================
-- Studium USAL — 02: Usuarios, perfiles y roles
-- Ejecutar en Supabase (SQL Editor), después de 01_schema.sql.
-- Requiere activar Google como proveedor en Auth → Providers.
-- ============================================================

-- 1) Tabla de perfiles: 1 fila por usuario autenticado
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  nombre     text,
  rol        text not null default 'estudiante'
             check (rol in ('estudiante','docente','autoridad')),
  creado_en  timestamptz not null default now()
);

-- 2) Alta automática del perfil al registrarse + restricción de dominio.
--    Si el email no es @usal.edu.ar, el registro FALLA (no entra nadie de afuera).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is null or new.email !~* '@usal\.edu\.ar$' then
    raise exception 'Solo se permiten cuentas institucionales @usal.edu.ar';
  end if;
  insert into public.profiles (id, email, nombre)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3) RLS: cada usuario puede leer su propio perfil (el backend usa service_role
--    y no se ve afectado por estas políticas).
alter table profiles enable row level security;

drop policy if exists "leer mi perfil" on profiles;
create policy "leer mi perfil" on profiles
  for select using (auth.uid() = id);

-- 4) Asignación de roles (manual por ahora; luego se hace UI de administración).
--    Todos entran como 'estudiante'. Para promover a docente o autoridad:
--
--    update profiles set rol = 'docente'   where email = 'nombre.apellido@usal.edu.ar';
--    update profiles set rol = 'autoridad' where email = 'franciscojose.f@usal.edu.ar';

-- 5) Vista rápida para auditar quién tiene qué rol
create or replace view v_usuarios as
  select email, nombre, rol, creado_en from profiles order by creado_en desc;
