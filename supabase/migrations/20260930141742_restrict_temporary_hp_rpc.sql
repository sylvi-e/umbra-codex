revoke all on function public.adjust_character_temporary_hp(uuid, numeric)
from public, anon;

grant execute on function public.adjust_character_temporary_hp(uuid, numeric)
to authenticated;
