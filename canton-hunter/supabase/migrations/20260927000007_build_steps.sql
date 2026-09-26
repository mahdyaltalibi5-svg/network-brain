-- Build guide progress per product (step key -> { done, by, at }). Client-writable.
alter table public.launches add column if not exists build_steps jsonb not null default '{}';
