import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Lock, SearchX } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, EmptyState, ErrorState, Screen, SkeletonList, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { ClubPage } from '@/lib/api.club';
import { metaLine } from '@/lib/format';
import { Routes } from '@/lib/routes';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function one(v: string | string[] | undefined): string | null {
  const raw = Array.isArray(v) ? v[0] : v;
  return typeof raw === 'string' && UUID.test(raw) ? raw : null;
}

/** `orgId` from the route, and the optional `id` being edited. Invalid → null. */
export function useFormParams(): { orgId: string | null; editId: string | null; badEditId: boolean } {
  const params = useLocalSearchParams<{ orgId?: string | string[]; id?: string | string[] }>();
  const editRaw = Array.isArray(params.id) ? params.id[0] : params.id;
  const editId = one(params.id);
  return { orgId: one(params.orgId), editId, badEditId: !!editRaw && !editId };
}

export type FormGate = 'invalid' | 'loading' | 'error' | 'gone' | 'denied';

/** Every state a club form can be in before the form itself. */
export function FormGateScreen({
  gate,
  header,
  error,
  onRetry,
  orgId,
  testID,
}: {
  gate: FormGate;
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
  if (gate === 'loading') body = <SkeletonList count={3} variant="row" />;
  else if (gate === 'error') body = <ErrorState message={error} onRetry={onRetry} />;
  else if (gate === 'denied')
    body = (
      <EmptyState
        icon={<Lock size={26} color={colors.textMuted} />}
        title={t('clubMatch.form.deniedTitle')}
        body={t('clubMatch.form.deniedBody')}
        actionLabel={orgId ? t('clubMatch.form.backToPage') : undefined}
        onAction={orgId ? () => router.replace(Routes.organization(orgId)) : undefined}
      />
    );
  else
    body = (
      <EmptyState
        icon={<SearchX size={26} color={colors.textMuted} />}
        title={t('clubMatch.form.goneTitle')}
        body={t('clubMatch.form.goneBody')}
      />
    );

  return (
    <Screen header={header} testID={testID}>
      {body}
    </Screen>
  );
}

/** A labelled row of chips, the form's most common shape. */
export function ChipField<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  hint?: string;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="captionStrong" tone="secondary">
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** The club's main address, to prefill a home venue or an event location. */
export function primaryAddress(page: ClubPage | null | undefined): string {
  if (!page) return '';
  const primary = page.locations.find((l) => l.is_primary);
  return metaLine(primary?.address ?? page.organization.address, primary?.city ?? page.organization.city) || '';
}
