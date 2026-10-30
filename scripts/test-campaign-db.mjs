import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
const root = fileURLToPath(new URL('..', import.meta.url));
const db=new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key default gen_random_uuid(),email text,raw_user_meta_data jsonb default '{}');
grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid,name text,bucket_id text,owner_id text);
create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/') $$;`);
const names= (await readdir(root+'/supabase/migrations')).sort();
for(const name of names) {
 if(name.includes('portraits') || name.includes('portrait_') || name.includes('grant_admin')) continue;
 let sql=await readFile(root+'/supabase/migrations/'+name,'utf8');
 sql=sql.replace('create extension if not exists pgcrypto;','');
 // Seed realistic legacy records immediately before the new migration.
 if(name.includes('campaign_systems')) {
  await db.exec(`insert into auth.users(id,email) values('10000000-0000-0000-0000-000000000001','master@test.invalid'),('10000000-0000-0000-0000-000000000002','player@test.invalid'),('10000000-0000-0000-0000-000000000003','outsider@test.invalid');
insert into public.campaigns(id,owner_id,name) values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Legacy campaign');
insert into public.character_sheets(id,owner_id,name) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Existing player');
insert into public.character_stats(character_id,stat_key,label,base_value) values('30000000-0000-0000-0000-000000000001','test','Preserved',42);`);
 }
 try {await db.exec(sql);} catch(e) {console.error('MIGRATION FAILED',name,e.message);process.exit(1);}
}
console.log('All applicable migrations loaded');
await db.exec(await readFile(root+'/supabase/tests/campaign_systems.sql','utf8'));
console.log('Campaign migration and RLS assertions passed');
await db.close();
