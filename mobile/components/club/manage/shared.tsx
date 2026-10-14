import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Building2, Lock } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ErrorState, Screen, SkeletonList, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { getClubSquads, type ClubPage, type ClubSquad, type ClubSquadsPage, type ClubViewer } from '@/lib/api.club';
import { Routes } from '@/lib/routes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A route param as one clean string, or null. */
export function paramOf(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/** A route param that must be a uuid (ids), or null. */
export function idParam(value: string | string[] | undefined): string | null {
  const raw = paramOf(value);
  return raw && UUID.test(raw) ? raw : null;
}

/** `orgId` from `app/club/[orgId]/…`. */
export function useOrgId(): string | null {
  const params = useLocalSearchParams<{ orgId?: string | string[] }>();
  return idParam(params.orgId);
}

export type GateStatus = 'missing' | 'loading' | 'error' | 'gone' | 'denied' | 'ok';

type Permission = keyof Pick<ClubViewer, 'can_manage' | 'can_post' | 'can_score'> | 'team' | 'any';

/** Whether the viewer may use a screen that needs `need`. */
export function viewerMay(page: ClubPage, need: Permission): boolean {
  const v = page.viewer;
  if (need === 'any') return v.can_manage || v.can_post || v.can_score;
  if (need === 'team') return !!v.role;
  return v[need];
}

export function gateStatus(
  orgId: string | null,
  state: { data: ClubPage | null; loading: boolean; error: string | null },
  need: Permission,
): GateStatus {
  if (!orgId) return 'missing';
  if (state.loading && !state.data) return 'loading';
  if (state.error && !state.data) return 'error';
  if (!state.data) return 'gone';
  return viewerMay(state.data, need) ? 'ok' : 'denied';
}

/** Every state a club-team screen can be in before its form shows. */
export function ClubGateScreen({
  status,
  header,
  error,
  onRetry,
  orgId,
  testID,
}: {
  status: Exclude<GateStatus, 'ok'>;
  header: React.ReactNode;
  error?: string | null;
  onRetry?: () => void;
  orgId: string | null;
  testID?: string;
}) {
  const { colors } = useTheme();
  const t = useT();
  const router = useRouter();

  let body: React.ReactNode;
  if (status === 'loading') body = <SkeletonList count={3} variant="row" />;
  else if (status === 'error') body = <ErrorState message={error} onRetry={onRetry} />;
  else if (status === 'denied')
    body = (
      <EmptyState
        icon={<Lock size={26} color={colors.textMuted} />}
        title={t('clubManage.gate.deniedTitle')}
        body={t('clubManage.gate.deniedBody')}
        actionLabel={orgId ? t('clubManage.gate.viewPage') : undefined}
        onAction={orgId ? () => router.replace(Routes.organization(orgId)) : undefined}
      />
    );
  else
    body = (
      <EmptyState
        icon={<Building2 size={26} color={colors.textMuted} />}
        title={t('clubManage.gate.goneTitle')}
        body={t('clubManage.gate.goneBody')}
      />
    );

  return (
    <Screen header={header} testID={testID}>
      {body}
    </Screen>
  );
}

/** A small label over a group of chips or a picker. */
export function FieldLabel({
  children,
  hint,
  style,
}: {
  children: string;
  hint?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: 2 }, style]}>
      <Text variant="captionStrong" tone="secondary">
        {children}
      </Text>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** "62/80" under a text field. */
export function Counter({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9;
  return (
    <Text variant="caption" tone={near ? 'warning' : 'muted'} style={{ alignSelf: 'flex-end' }}>
      {`${value.length}/${max}`}
    </Text>
  );
}

/** Go back, or to the page team's hub when there is nothing to go back to. */
export function useCloseTo(orgId: string | null) {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else if (orgId) router.replace(Routes.clubManage(orgId));
  };
}

/**
 * A squad by id, wherever its season. `getClubSquads` answers one season at a
 * time (the current one by default), so older seasons are asked in turn.
 */
export async function findSquad(
  orgId: string,
  squadId: string,
): Promise<{ page: ClubSquadsPage; squad: ClubSquad | null }> {
  const first = await getClubSquads(orgId);
  const hit = first.squads.find((s) => s.id === squadId);
  if (hit) return { page: first, squad: hit };
  for (const season of first.seasons) {
    if (season.id === first.season_id) continue;
    const other = await getClubSquads(orgId, season.id);
    const found = other.squads.find((s) => s.id === squadId);
    if (found) return { page: other, squad: found };
  }
  return { page: first, squad: null };
}

export interface LinkedPerson {
  user_id: string;
  name: string;
  kind: 'player' | 'staff';
  squad: string;
}

/**
 * Everyone who accepted a place on one of the club's squads, across seasons —
 * the only people an award may be linked to.
 */
export async function acceptedSquadPeople(orgId: string): Promise<LinkedPerson[]> {
  const first = await getClubSquads(orgId);
  const pages: ClubSquadsPage[] = [first];
  for (const season of first.seasons) {
    if (season.id === first.season_id) continue;
    pages.push(await getClubSquads(orgId, season.id));
  }
  const seen = new Set<string>();
  const out: LinkedPerson[] = [];
  for (const p of pages) {
    for (const squad of p.squads) {
      for (const person of [...squad.staff, ...squad.players]) {
        const uid = person.linked_user_id;
        if (person.link_status !== 'accepted' || !uid || seen.has(`${uid}:${person.kind}`)) continue;
        seen.add(`${uid}:${person.kind}`);
        out.push({
          user_id: uid,
          name: person.display_name,
          kind: person.kind,
          squad: squad.name?.trim() || squad.category,
        });
      }
    }
  }
  return out;
}
