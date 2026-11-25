-- One checkout routine only: the address-based one that locks stock rows.
drop function if exists public.place_order(p_payment_method text, p_shipping_address jsonb, p_items jsonb);

-- New accounts get a profile automatically again.
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();