import { supabase } from './supabase';

export interface PartnerConsentInfo {
  partnerId: string;
  partnerName: string;
  accreditationStatus: string;
  consentStatus: string | null;
  consentScope: string | null;
  grantedAt: string | null;
  revokedAt: string | null;
}

export async function fetchConnectedPartners(
  athleteId: string,
): Promise<{ data: PartnerConsentInfo[]; error: string | null }> {
  const { data: consentRows, error: consentsError } = await supabase
    .from('medical_consents')
    .select('grantee_user_id, status, scope, granted_at, revoked_at')
    .eq('athlete_id', athleteId);

  if (consentsError) return { data: [], error: consentsError.message };

  const consentGranteeIds = [...new Set(
    (consentRows ?? []).map((row) => row.grantee_user_id).filter((id): id is string => Boolean(id)),
  )];

  const { data: recordRows, error: recordsError } = await supabase
    .from('medical_records')
    .select('partner_id')
    .eq('athlete_id', athleteId)
    .eq('is_deleted', false)
    .not('partner_id', 'is', null);

  if (recordsError) return { data: [], error: recordsError.message };

  const recordPartnerIds = [...new Set(
    (recordRows ?? []).map((row) => row.partner_id).filter((id): id is string => Boolean(id)),
  )];

  if (consentGranteeIds.length === 0 && recordPartnerIds.length === 0) {
    return { data: [], error: null };
  }

  let partnersQuery = supabase
    .from('medical_partners')
    .select('id, user_id, name, accreditation_status');

  if (recordPartnerIds.length > 0 && consentGranteeIds.length > 0) {
    partnersQuery = partnersQuery.or(
      `id.in.(${recordPartnerIds.join(',')}),user_id.in.(${consentGranteeIds.join(',')})`,
    );
  } else if (recordPartnerIds.length > 0) {
    partnersQuery = partnersQuery.in('id', recordPartnerIds);
  } else {
    partnersQuery = partnersQuery.in('user_id', consentGranteeIds);
  }

  const { data: partners, error: partnersError } = await partnersQuery;

  if (partnersError) return { data: [], error: partnersError.message };
  if (!partners || partners.length === 0) return { data: [], error: null };

  const mapped: PartnerConsentInfo[] = partners.map((partner) => {
    const consent = (consentRows ?? []).find((row) => row.grantee_user_id === partner.user_id);
    return {
      partnerId: partner.id,
      partnerName: partner.name ?? 'Medical Partner',
      accreditationStatus: partner.accreditation_status,
      consentStatus: consent?.status ?? null,
      consentScope: consent?.scope ?? null,
      grantedAt: consent?.granted_at ?? null,
      revokedAt: consent?.revoked_at ?? null,
    };
  });

  return { data: mapped, error: null };
}
