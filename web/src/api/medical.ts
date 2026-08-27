import { supabase, unwrap, USER_FIELDS } from './_helpers';
import type { MedicalRecord, MedicalClearance, Injury, MedicalPartner, AthleteProfile, UserProfile, MedicalConsent } from '../types';

export type PartnerClearance = MedicalClearance & {
  athlete?: AthleteProfile & { user?: UserProfile };
};

export async function listMedicalRecords(athleteId: string): Promise<MedicalRecord[]> {
  return unwrap(
    await supabase.from('medical_records').select('*').eq('athlete_id', athleteId).eq('is_deleted', false).order('issued_at', { ascending: false }),
  ) as MedicalRecord[];
}

export async function deleteMedicalRecord(id: string): Promise<void> {
  unwrap(await supabase.from('medical_records').update({ is_deleted: true }).eq('id', id).select('id'));
}

export async function listClearances(athleteId: string): Promise<MedicalClearance[]> {
  return unwrap(
    await supabase.from('medical_clearances').select('*').eq('athlete_id', athleteId).order('created_at', { ascending: false }),
  ) as MedicalClearance[];
}

export async function latestClearance(athleteId: string): Promise<MedicalClearance | null> {
  const rows = await listClearances(athleteId);
  return rows[0] ?? null;
}

export async function listInjuries(athleteId: string): Promise<Injury[]> {
  return unwrap(
    await supabase.from('injuries').select('*').eq('athlete_id', athleteId).order('occurred_at', { ascending: false }),
  ) as Injury[];
}

/** The medical_partners row owned by the given user (for the partner dashboard). */
export async function getMyMedicalPartner(userId: string): Promise<MedicalPartner | null> {
  return unwrap(
    await supabase.from('medical_partners').select('*').eq('user_id', userId).maybeSingle(),
  ) as MedicalPartner | null;
}

/** Clearances issued by a partner, joined to the athlete profile + user. */
export async function listPartnerClearances(partnerId: string): Promise<PartnerClearance[]> {
  return unwrap(
    await supabase
      .from('medical_clearances')
      .select(`*, athlete:athlete_profiles(id, user_id, sport, user:user_profiles(${USER_FIELDS}))`)
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false }),
  ) as PartnerClearance[];
}

export async function listConsents(athleteId: string): Promise<MedicalConsent[]> {
  return unwrap(
    await supabase.from('medical_consents').select('*').eq('athlete_id', athleteId).order('granted_at', { ascending: false }),
  ) as MedicalConsent[];
}

export async function grantConsent(athleteId: string, granteeUserId: string): Promise<MedicalConsent> {
  return unwrap(
    await supabase.from('medical_consents').insert({
      athlete_id: athleteId,
      grantee_user_id: granteeUserId,
      scope: 'medical_records',
      status: 'granted',
    }).select('*').single(),
  ) as MedicalConsent;
}

export async function revokeConsent(consentId: string): Promise<MedicalConsent> {
  return unwrap(
    await supabase.from('medical_consents').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', consentId).select('*').single(),
  ) as MedicalConsent;
}
