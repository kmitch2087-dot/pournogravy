
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    case
      when lower(new.email) in (
        'aopie91@gmail.com',
        'kristinmitchell@aethyx.space',
        'kmitch2087@gmail.com'
      ) then true
      else false
    end
  )
  on conflict (id) do update
    set is_admin = excluded.is_admin or public.profiles.is_admin,
        email = excluded.email;
  return new;
end;
$function$;

-- Make sure the trigger exists on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;
