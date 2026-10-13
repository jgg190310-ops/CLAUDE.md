-- Drink · o servidor no Supabase
-- Cole tudo no SQL Editor do projeto (supabase.com > seu projeto > SQL Editor > New query) e toque em Run.
-- Pode rodar de novo sem estragar nada.
--
-- O que fica aqui:
--   motoristas_cadastro  o cadastro de quem quer dirigir, para a equipe aprovar (os arquivos vão para o bucket "documentos")
--   relatos              os problemas relatados pelos passageiros
--   voltas_bar           as voltas que saíram de bar parceiro, confirmadas pelo motorista (libera o benefício do bar)
--   admins               os e-mails da equipe que podem entrar no painel do Drink
-- O app (chave pública, papel "anon") só consegue ENVIAR: não lê cadastro nem documento de ninguém. Quem envia um
-- cadastro guarda um segredo no celular e, com ele, consulta só o próprio resultado (função status_cadastro).
-- A equipe entra no painel com e-mail e senha (Supabase Auth) e só vê tudo se o e-mail estiver em admins.

create extension if not exists pgcrypto with schema extensions;

-- a equipe do Drink -------------------------------------------------------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', ''))) $$;
revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;

drop policy if exists "a equipe se vê" on public.admins;
create policy "a equipe se vê" on public.admins for select to authenticated using (public.eh_admin());

-- o cadastro dos motoristas ------------------------------------------------------------------------------------------
create table if not exists public.motoristas_cadastro (
  id uuid primary key,
  criado timestamptz not null default now(),
  celular text not null check (celular ~ '^[0-9]{10,13}$'),
  nome text not null check (char_length(nome) between 2 and 80),
  email text check (email is null or char_length(email) <= 120),
  cpf text not null check (cpf ~ '^[0-9]{11}$'),
  nascimento date not null,
  cnh_numero text not null check (cnh_numero ~ '^[0-9]{11}$'),
  cnh_categoria text not null check (char_length(cnh_categoria) <= 3),
  cnh_validade date not null,
  cnh_primeira date not null,
  veiculo text not null check (veiculo in ('bike', 'patinete')),
  veiculo_desc text check (veiculo_desc is null or char_length(veiculo_desc) <= 80),
  pix_tipo text check (pix_tipo is null or char_length(pix_tipo) <= 20),
  pix_chave text check (pix_chave is null or char_length(pix_chave) <= 77),
  selfie text not null check (selfie like id::text || '/%'),
  cnh_foto text check (cnh_foto is null or cnh_foto like id::text || '/%'),
  antecedentes text check (antecedentes is null or antecedentes like id::text || '/%'),
  segredo_hash text not null check (segredo_hash ~ '^[0-9a-f]{64}$'),
  estado text not null default 'em_analise' check (estado in ('em_analise', 'aprovado', 'recusado')),
  motivo text check (motivo is null or char_length(motivo) <= 300),
  revisado_em timestamptz,
  revisado_por text
);
create index if not exists motoristas_cadastro_estado on public.motoristas_cadastro (estado, criado desc);
alter table public.motoristas_cadastro enable row level security;

drop policy if exists "o app envia o cadastro" on public.motoristas_cadastro;
create policy "o app envia o cadastro" on public.motoristas_cadastro for insert to anon
  with check (estado = 'em_analise' and motivo is null and revisado_em is null and revisado_por is null);
drop policy if exists "a equipe vê os cadastros" on public.motoristas_cadastro;
create policy "a equipe vê os cadastros" on public.motoristas_cadastro for select to authenticated using (public.eh_admin());
drop policy if exists "a equipe aprova ou recusa" on public.motoristas_cadastro;
create policy "a equipe aprova ou recusa" on public.motoristas_cadastro for update to authenticated
  using (public.eh_admin()) with check (public.eh_admin());
grant insert on public.motoristas_cadastro to anon;
grant select, update on public.motoristas_cadastro to authenticated;

-- quem enviou consulta só o próprio resultado, com o segredo que ficou no celular
create or replace function public.status_cadastro(p_id uuid, p_segredo text)
returns table (estado text, motivo text, revisado_em timestamptz)
language sql stable security definer set search_path = public, extensions
as $$
  select c.estado, c.motivo, c.revisado_em from public.motoristas_cadastro c
  where c.id = p_id and c.segredo_hash = encode(extensions.digest(p_segredo, 'sha256'), 'hex')
$$;
revoke all on function public.status_cadastro(uuid, text) from public;
grant execute on function public.status_cadastro(uuid, text) to anon, authenticated;

-- os relatos de problema ---------------------------------------------------------------------------------------------
create table if not exists public.relatos (
  id uuid primary key default gen_random_uuid(),
  criado timestamptz not null default now(),
  corrida text check (corrida is null or char_length(corrida) <= 40),
  motivo text not null check (char_length(motivo) <= 60),
  texto text not null check (char_length(texto) between 10 and 600),
  celular text check (celular is null or celular ~ '^[0-9]{10,13}$'),
  volta text check (volta is null or char_length(volta) <= 300),
  resolvido boolean not null default false
);
alter table public.relatos enable row level security;
drop policy if exists "o app envia o relato" on public.relatos;
create policy "o app envia o relato" on public.relatos for insert to anon with check (resolvido = false);
drop policy if exists "a equipe vê os relatos" on public.relatos;
create policy "a equipe vê os relatos" on public.relatos for select to authenticated using (public.eh_admin());
drop policy if exists "a equipe resolve" on public.relatos;
create policy "a equipe resolve" on public.relatos for update to authenticated using (public.eh_admin()) with check (public.eh_admin());
grant insert on public.relatos to anon;
grant select, update on public.relatos to authenticated;

-- as voltas dos bares parceiros -------------------------------------------------------------------------------------
-- O benefício do bar (o chope por conta da casa) só vale para volta confirmada por um motorista APROVADO: quem tem
-- só o QR da mesa não consegue inventar uma volta. O motorista confirma com o segredo do cadastro dele, e o bar
-- confere o código do recibo com um segredo do bar que fica só no celular do dono (o primeiro que conferir fica).
create table if not exists public.bares_segredo (
  bar text primary key check (bar ~ '^[A-Za-z0-9_-]{16}$'),
  segredo_hash text not null check (segredo_hash ~ '^[0-9a-f]{64}$'),
  criado timestamptz not null default now()
);
alter table public.bares_segredo enable row level security;

create table if not exists public.voltas_bar (
  bar text not null check (bar ~ '^[A-Za-z0-9_-]{16}$'),
  corrida text not null check (corrida ~ '^[A-Za-z0-9_-]{16,32}$'),
  cupom text not null check (cupom ~ '^[0-9]{4}$'),
  motorista uuid not null references public.motoristas_cadastro (id),
  criado timestamptz not null default now(),
  usado timestamptz,
  primary key (bar, corrida)
);
create index if not exists voltas_bar_cupom on public.voltas_bar (bar, cupom, criado desc);
alter table public.voltas_bar enable row level security;
drop policy if exists "a equipe vê as voltas" on public.voltas_bar;
create policy "a equipe vê as voltas" on public.voltas_bar for select to authenticated using (public.eh_admin());
grant select on public.voltas_bar to authenticated;

-- o motorista aprovado confirma a volta que saiu da porta do bar
create or replace function public.confirmar_volta(p_id uuid, p_segredo text, p_bar text, p_corrida text, p_cupom text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.motoristas_cadastro c
    where c.id = p_id and c.estado = 'aprovado' and c.segredo_hash = encode(extensions.digest(p_segredo, 'sha256'), 'hex')
  ) then
    return false;
  end if;
  insert into public.voltas_bar (bar, corrida, cupom, motorista) values (p_bar, p_corrida, p_cupom, p_id)
  on conflict (bar, corrida) do nothing;
  return true;
end
$$;
revoke all on function public.confirmar_volta(uuid, text, text, text, text) from public;
grant execute on function public.confirmar_volta(uuid, text, text, text, text) to anon, authenticated;

-- o bar confere o código do recibo: 'vale' (e já fica usado), 'usado', 'nao' ou 'segredo' (outro aparelho é o dono)
create or replace function public.conferir_volta(p_bar text, p_segredo text, p_cupom text)
returns table (resultado text, criado timestamptz, usado timestamptz)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  h text;
  v public.voltas_bar%rowtype;
begin
  if p_segredo is null or char_length(p_segredo) < 20 or p_cupom !~ '^[0-9]{4}$' then
    return query select 'nao'::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  h := encode(extensions.digest(p_segredo, 'sha256'), 'hex');
  insert into public.bares_segredo (bar, segredo_hash) values (p_bar, h) on conflict (bar) do nothing;
  if not exists (select 1 from public.bares_segredo b where b.bar = p_bar and b.segredo_hash = h) then
    return query select 'segredo'::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  select * into v from public.voltas_bar x
  where x.bar = p_bar and x.cupom = p_cupom and x.criado > now() - interval '30 days'
  order by (x.usado is null) desc, x.criado desc limit 1;
  if not found then
    return query select 'nao'::text, null::timestamptz, null::timestamptz;
    return;
  end if;
  if v.usado is not null then
    return query select 'usado'::text, v.criado, v.usado;
    return;
  end if;
  update public.voltas_bar set usado = now() where bar = v.bar and corrida = v.corrida;
  return query select 'vale'::text, v.criado, now();
end
$$;
revoke all on function public.conferir_volta(text, text, text) from public;
grant execute on function public.conferir_volta(text, text, text) to anon, authenticated;

-- os arquivos: selfie, foto da CNH e certidão, num bucket fechado --------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 12582912, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "o app envia documentos" on storage.objects;
create policy "o app envia documentos" on storage.objects for insert to anon
  with check (bucket_id = 'documentos' and name ~ '^[0-9a-f-]{36}/(selfie|cnh|antecedentes)\.(jpg|png|webp|pdf)$');
drop policy if exists "a equipe vê documentos" on storage.objects;
create policy "a equipe vê documentos" on storage.objects for select to authenticated
  using (bucket_id = 'documentos' and public.eh_admin());

-- a equipe: troque pelo e-mail (ou e-mails) de quem vai aprovar os motoristas. Crie o mesmo e-mail em
-- Authentication > Users > Add user (com senha) para entrar no painel.
insert into public.admins (email) values ('drinksuportemdv@gmail.com') on conflict do nothing;
