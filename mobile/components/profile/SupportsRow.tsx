import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, MapPin } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, Input, Sheet, Skeleton, Tappable, Text, useToast } from '@/components/ui';
import { TeamPicker } from '@/components/teams/TeamPicker';
import { useAsync } from '@/hooks/useAsync';
import { fandomOf, setFavoriteTeams, setFavoriteVenue } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { useT } from '@/i18n';
import type { Team } from '@/types/models';

/**
 * The teams somebody supports, on their profile.
 *
 * It sits below the score rather than beside it, because a scout reading this
 * profile needs the score and the current club first — this is the human line
 * underneath, and on a fourteen-year-old's profile it is often the only line
 * that has anything in it yet.
 */
export function SupportsRow({
  userId,
  isSelf,
  sport,
}: {
  userId: string;
  isSelf: boolean;
  sport?: string | null;
}) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();

  const { data, loading, refresh } = useAsync(() => fandomOf(userId), [userId]);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Team[]>([]);
  const [venue, setVenue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setDraft(data?.teams ?? []);
    setVenue(data?.venue ?? '');
  }, [editing, data]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await setFavoriteTeams(draft.map((team) => team.id));
      await setFavoriteVenue(venue.trim() || null);
      setEditing(false);
      toast.success(t('teams.savedToast'));
      refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [draft, venue, refresh, t, toast]);

  if (loading && !data) return <Skeleton height={64} radius={16} />;

  const teams = data?.teams ?? [];
  const empty = teams.length === 0 && !data?.venue;

  if (empty && !isSelf) return null;

  return (
    <>
      <Card padded tone="alt" style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Heart size={14} color={colors.primary} />
          <Text variant="overline" tone="muted">
            {t('teams.supportsTitle')}
          </Text>
        </View>

        {empty ? (
          <Text variant="caption" tone="muted">
            {t('teams.emptySelf')}
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {teams.map((team) => (
                <Tappable
                  key={team.id}
                  onPress={() => router.push(Routes.team(team.id))}
                  accessibilityLabel={team.name}
                >
                  <View
                    style={{
                      paddingVertical: 7,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor: theme.alpha(colors.primary, 0.12),
                      borderWidth: 1,
                      borderColor: theme.alpha(colors.primary, 0.3),
                    }}
                  >
                    <Text variant="captionStrong" tone="primary">
                      {team.name}
                    </Text>
                  </View>
                </Tappable>
              ))}
            </View>

            {data?.venue ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color={colors.textMuted} />
                <Text variant="caption" tone="muted">
                  {t('teams.venueLabel')}: {data.venue}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {isSelf ? (
          <Button
            label={t('teams.editAction')}
            variant="ghost"
            size="sm"
            onPress={() => setEditing(true)}
            style={{ alignSelf: 'flex-start' }}
          />
        ) : null}
      </Card>

      <Sheet
        visible={editing}
        onClose={() => setEditing(false)}
        title={t('teams.stepTitle')}
        footer={
          <Button
            label={t('common.save')}
            fullWidth
            loading={saving}
            onPress={save}
          />
        }
      >
        <View style={{ gap: spacing.lg }}>
          <TeamPicker value={draft} onChange={setDraft} sport={sport} />
          <Input
            label={t('teams.venueTitle')}
            placeholder={t('teams.venuePlaceholder')}
            value={venue}
            onChangeText={setVenue}
            maxLength={80}
          />
        </View>
      </Sheet>
    </>
  );
}
