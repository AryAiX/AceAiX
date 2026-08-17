CREATE OR REPLACE FUNCTION public.update_own_profile(
  p_full_name text,
  p_bio text,
  p_city text,
  p_country text,
  p_sport text,
  p_position text,
  p_current_club text,
  p_level text,
  p_nationality text,
  p_phone text,
  p_date_of_birth date
)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.user_profiles
  SET full_name = p_full_name,
      bio = p_bio,
      city = p_city,
      country = p_country
  WHERE id = auth.uid();

  UPDATE public.athlete_profiles
  SET sport = p_sport,
      position = p_position,
      position_primary = p_position,
      current_club = p_current_club,
      level = COALESCE(p_level, 'amateur'),
      nationality = p_nationality,
      bio = p_bio
  WHERE user_id = auth.uid();

  INSERT INTO public.user_private (user_id, phone, date_of_birth)
  VALUES (auth.uid(), p_phone, p_date_of_birth)
  ON CONFLICT (user_id) DO UPDATE
  SET phone = EXCLUDED.phone,
      date_of_birth = EXCLUDED.date_of_birth;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_own_profile(text, text, text, text, text, text, text, text, text, text, date) TO authenticated;