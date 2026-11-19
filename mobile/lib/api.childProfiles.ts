import { supabase } from '@/lib/supabase';
import { AppError } from '@/lib/errors';

/**
 * Child profiles for children under 13 (QA-174).
 *
 * Not accounts: a parent keeps a first name, birth year, sport and level for
 * a child who is too young to sign up. Every rule lives in
 * `20261119000001_child_profiles.sql`: only the parent sees them, nothing
 * else in the app can read them, and the whole feature sits behind the
 * `child_profiles` switch, which is off on prd. With the switch off the list
 * still comes back, so a parent can always delete what they have.
 */

export const CHILD_LEVELS = ['casual', 'club', 'competitive'] as const;
export type ChildLevel = (typeof CHILD_LEVELS)[number];

/** The oldest a child on a child profile can be this year. */
export const CHILD_MAX_AGE_THIS_YEAR = 13;

export interface ChildProfile {
  id: string;
  first_name: string;
  birth_year: number;
  sport: string;
  level: ChildLevel;
  /** True from the year the child turns 13. */
  can_have_account: boolean;
  /** The profile is deleted after this year ends. */
  removed_after_year: number;
}

export interface MyChildProfiles {
  /** The switch is on and this is a parent account. */
  enabled: boolean;
  can_add: boolean;
  max: number;
  this_year: number;
  profiles: ChildProfile[];
}

export interface ChildProfileInput {
  first_name: string;
  birth_year: number;
  sport: string;
  level: ChildLevel;
}

export async function getMyChildProfiles(): Promise<MyChildProfiles> {
  const { data, error } = await supabase.rpc('my_child_profiles');
  if (error) throw new AppError(error);
  return data as MyChildProfiles;
}

/** Add a child profile (`id` null) or change one. Returns its id. */
export async function saveChildProfile(id: string | null, input: ChildProfileInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_child_profile', {
    p_id: id,
    p_first_name: input.first_name,
    p_birth_year: input.birth_year,
    p_sport: input.sport,
    p_level: input.level,
  });
  if (error) throw new AppError(error);
  return data as string;
}

/** Delete one for good. False when it was already gone. */
export async function deleteChildProfile(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('delete_child_profile', { p_id: id });
  if (error) throw new AppError(error);
  return data === true;
}

/** The birth years a child profile accepts, newest first. */
export function childBirthYears(thisYear: number): number[] {
  const years: number[] = [];
  for (let year = thisYear; year >= thisYear - CHILD_MAX_AGE_THIS_YEAR; year -= 1) years.push(year);
  return years;
}

export function isChildLevel(value: string): value is ChildLevel {
  return (CHILD_LEVELS as readonly string[]).includes(value);
}
