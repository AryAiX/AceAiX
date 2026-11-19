import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Trash2 } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  ChevronForward,
  ConfirmSheet,
  IconButton,
  SectionHeader,
  Tappable,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { otherSportLevelLabel, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { deleteChildProfile, getMyChildProfiles, type ChildProfile } from '@/lib/api.childProfiles';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

/**
 * Children under 13, at the top of a parent's Children tab (QA-174).
 *
 * Shows nothing at all while the `child_profiles` switch is off and the
 * parent has none, so prd looks exactly as before. With the switch off and
 * profiles left over, each one can still be deleted, but not opened or added.
 */
export function ChildProfilesSection() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const state = useAsync(getMyChildProfiles, [], { refetchOnFocus: true });
  const [removing, setRemoving] = useState<ChildProfile | null>(null);
  const [busy, setBusy] = useState(false);

  const data = state.data;
  if (!data || (!data.enabled && data.profiles.length === 0)) return null;

  const confirmDelete = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteChildProfile(removing.id);
      toast.success(t('safety.under13.deleted'));
      setRemoving(null);
      state.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padded testID="child-profiles-section">
      <View style={{ gap: spacing.md }}>
        <SectionHeader
          compact
          title={t('safety.under13.sectionTitle')}
          count={data.profiles.length || undefined}
        />
        <Text variant="caption" tone="secondary">
          {t('safety.under13.sectionIntro')}
        </Text>

        {!data.enabled ? (
          <InfoNote tone="warning" icon="warning">
            {t('safety.under13.offNote')}
          </InfoNote>
        ) : null}

        {data.profiles.length === 0 ? (
          <Text variant="body" tone="secondary">
            {t('safety.under13.emptyBody')}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {data.profiles.map((child) => {
              const meta = t('safety.under13.meta', {
                sport: sportLabel(t, child.sport),
                level: otherSportLevelLabel(t, child.level),
                year: child.birth_year,
              });
              const row = (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {child.first_name}
                    </Text>
                    <Text variant="caption" tone="secondary">
                      {meta}
                    </Text>
                  </View>
                  {data.enabled ? (
                    <ChevronForward size={18} color={colors.textMuted} />
                  ) : (
                    <IconButton
                      icon={<Trash2 size={18} color={colors.danger} />}
                      label={t('safety.under13.deleteTitle', { name: child.first_name })}
                      onPress={() => setRemoving(child)}
                      tone="transparent"
                      testID={`child-profile-delete-${child.id}`}
                    />
                  )}
                </View>
              );
              return (
                <View key={child.id} style={{ gap: spacing.xs }}>
                  {data.enabled ? (
                    <Tappable
                      onPress={() => router.push(Routes.childProfile(child.id))}
                      accessibilityRole="button"
                      accessibilityLabel={`${child.first_name}, ${meta}`}
                      testID={`child-profile-${child.id}`}
                    >
                      {row}
                    </Tappable>
                  ) : (
                    row
                  )}
                  {child.can_have_account ? (
                    <InfoNote>{t('safety.under13.canHaveAccount', { name: child.first_name })}</InfoNote>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {data.enabled ? (
          data.can_add ? (
            <Button
              label={t('safety.under13.add')}
              variant="secondary"
              icon={<Plus size={18} color={colors.primary} />}
              onPress={() => router.push(Routes.childProfile())}
              testID="child-profile-add"
            />
          ) : (
            <Text variant="caption" tone="muted">
              {t('safety.under13.limitNote', { max: data.max })}
            </Text>
          )
        ) : null}

        <Text variant="caption" tone="muted">
          {t('safety.under13.removedNote')}
        </Text>
      </View>

      <ConfirmSheet
        visible={removing !== null}
        title={t('safety.under13.deleteTitle', { name: removing?.first_name ?? '' })}
        message={t('safety.under13.deleteBody')}
        confirmLabel={t('safety.under13.delete')}
        destructive
        loading={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setRemoving(null)}
      />
    </Card>
  );
}
