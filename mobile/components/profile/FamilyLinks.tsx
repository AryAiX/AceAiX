import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Button, Card, Divider, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { startConversation, type ChildOnProfile, type GuardianContact } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';
import { Routes } from '@/lib/routes';

function relationshipLabel(t: (key: string) => string, relationship: string): string {
  switch (relationship) {
    case 'parent':
      return t('safety.relationshipParent');
    case 'guardian':
    case 'coach_guardian':
      return t('safety.relationshipGuardian');
    case 'other':
      return t('safety.relationshipOther');
    default:
      return relationship;
  }
}

/**
 * The parent on a child's profile, and the children on a parent's profile.
 *
 * Both lists are already filtered by the server. An empty list draws nothing.
 */
export function FamilyLinks({
  guardians,
  childLinks,
}: {
  guardians: GuardianContact[];
  childLinks: ChildOnProfile[];
}) {
  if (guardians.length === 0 && childLinks.length === 0) return null;
  return (
    <>
      {guardians.length > 0 ? <GuardiansCard rows={guardians} /> : null}
      {childLinks.length > 0 ? <ChildrenCard rows={childLinks} /> : null}
    </>
  );
}

function GuardiansCard({ rows }: { rows: GuardianContact[] }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [messaging, setMessaging] = useState<string | null>(null);

  const open = (userId: string) => router.push(Routes.profile(userId));

  const message = async (userId: string) => {
    if (messaging) return;
    setMessaging(userId);
    try {
      const conversationId = await startConversation(userId);
      router.push(Routes.chat(conversationId));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMessaging(null);
    }
  };

  return (
    <Card padded="sm" testID="profile-guardian-card">
      {rows.length === 1 ? null : (
        <Text variant="overline" tone="muted">
          {t('common.guardian')}
        </Text>
      )}
      {rows.map((row, index) => {
        const name = displayName(row.full_name, t('common.guardian'));
        return (
          <View key={row.guardian_user_id}>
            {index > 0 ? <Divider style={{ marginVertical: spacing.sm }} /> : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: rows.length === 1 && index === 0 ? 0 : spacing.sm,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={name}
                onPress={() => open(row.guardian_user_id)}
                style={{ flex: 1, gap: spacing.sm }}
              >
                {rows.length === 1 ? (
                  <Text variant="overline" tone="muted">
                    {t('common.guardian')}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Avatar uri={row.avatar_url} name={row.full_name} size="sm" />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {relationshipLabel(t, row.relationship)}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <Button
                label={t('common.message')}
                variant="secondary"
                size="sm"
                loading={messaging === row.guardian_user_id}
                onPress={() => void message(row.guardian_user_id)}
                testID="profile-message-guardian"
              />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function ChildrenCard({ rows }: { rows: ChildOnProfile[] }) {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const router = useRouter();

  return (
    <Card padded="sm" testID="profile-children-card">
      {rows.length === 1 ? null : (
        <Text variant="overline" tone="muted">
          {t('safety.parentOf')}
        </Text>
      )}
      {rows.map((row, index) => {
        const name = displayName(row.full_name, t('common.athlete'));
        return (
          <View key={row.minor_user_id}>
            {index > 0 ? <Divider style={{ marginVertical: spacing.sm }} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={name}
              onPress={() => router.push(Routes.profile(row.minor_user_id))}
              style={{
                gap: spacing.sm,
                marginTop: rows.length === 1 && index === 0 ? 0 : spacing.sm,
              }}
            >
              {rows.length === 1 ? (
                <Text variant="overline" tone="muted">
                  {t('safety.parentOf')}
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Avatar uri={row.avatar_url} name={row.full_name} size="sm" />
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {name}
                </Text>
              </View>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );
}
