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
  const { data: recordRows, error: recordsError } = await supabase
    .from('medical_records')
    .select('partner_id')
    .eq('athlete_id', athleteId)
    .eq('is_deleted', false)
    .not('partner_id', 'is', null);

  if (recordsError) return { data: [], error: recordsError.message };

  const partnerIds = [...new Set(
    (recordRows ?? []).map((row) => row.partner_id).filter((id): id is string => Boolean(id)),
  )];
  if (partnerIds.length === 0) return { data: [], error: null };

  const { data: partners, error: partnersError } = await supabase
    .from('medical_partners')
    .select('id, user_id, name, accreditation_status')
    .in('id', partnerIds);

  if (partnersError) return { data: [], error: partnersError.message };
  if (!partners || partners.length === 0) return { data: [], error: null };

  const granteeIds = [...new Set(
    partners.map((row) => row.user_id).filter((id): id is string => Boolean(id)),
  )];

  let consentRows: Array<{
    grantee_user_id: string | null;
    status: string | null;
    scope: string | null;
    granted_at: string | null;
    revoked_at: string | null;
  }> = [];

  if (granteeIds.length > 0) {
    const { data: consents, error: consentsError } = await supabase
      .from('medical_consents')
      .select('grantee_user_id, status, scope, granted_at, revoked_at')
      .eq('athlete_id', athleteId)
      .in('grantee_user_id', granteeIds);

    if (consentsError) return { data: [], error: consentsError.message };
    consentRows = consents ?? [];
  }

  const mapped: PartnerConsentInfo[] = partners.map((partner) => {
    const consent = consentRows.find((row) => row.grantee_user_id === partner.user_id);
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
