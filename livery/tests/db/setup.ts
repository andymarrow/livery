import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

// The parts of a Supabase database our migrations depend on: roles, the auth
// and storage schemas, and the default grants Supabase gives anon/authenticated.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid());
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(__dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(dir, file), "utf8"));
  }
  // service_role needs table access like on Supabase (granted by default privileges there too).
  await db.exec(`grant all on all tables in schema public to service_role;`);
  return db;
}

export async function asRole<T>(db: PGlite, role: string, run: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  try {
    return await run();
  } finally {
    await db.exec(`reset role`);
  }
}
