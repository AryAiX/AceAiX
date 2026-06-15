import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { UserProfile, UserPrivate } from '../types';

export async function getUserProfile(id: string): Promise<UserProfile | null> {
  return unwrap(await supabase.from('user_profiles').select(USER_FIELDS).eq('id', id).maybeSingle()) as UserProfile | null;
}

export async function updateUserProfile(id: string, patch: Partial<UserProfile>): Promise<UserProfile> {
  const allowed: Partial<UserProfile> = {
    full_name: patch.full_name,
    avatar_url: patch.avatar_url,
    bio: patch.bio,
    city: patch.city,
    country: patch.country,
  };
  Object.keys(allowed).forEach((k) => allowed[k as keyof UserProfile] === undefined && delete allowed[k as keyof UserProfile]);
  return unwrap(await supabase.from('user_profiles').update(allowed).eq('id', id).select(USER_FIELDS).single()) as UserProfile;
}

export async function getUserPrivate(userId: string): Promise<UserPrivate | null> {
  return unwrap(
    await supabase.from('user_private').select('*').eq('user_id', userId).maybeSingle(),
  ) as UserPrivate | null;
}

export async function updateUserPrivate(userId: string, patch: Partial<UserPrivate>): Promise<UserPrivate> {
  return unwrap(
    await supabase.from('user_private').upsert({ user_id: userId, ...patch }).select('*').single(),
  ) as UserPrivate;
}
