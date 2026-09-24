insert into private.admin_allowlist (email)
values (lower('andrelugamer1209@gmail.com'))
on conflict (email) do nothing;

update public.user_roles as roles
set role = 'admin'::public.app_role
from auth.users as users
where roles.user_id = users.id
  and lower(users.email) = lower('andrelugamer1209@gmail.com')
  and roles.role is distinct from 'admin'::public.app_role;
