import React from 'react';
import { View } from 'react-native';
import { Users } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Badge, Divider, EmptyState, ListItem } from '@/components/ui';
import { useT } from '@/i18n';
import type { ClubEventRegistration } from '@/lib/api.club';
import { displayName } from '@/lib/format';

/** Who has signed up, oldest first — the page team's view of an event. */
export function RegistrationList({
  registrations,
  onOpen,
}: {
  registrations: ClubEventRegistration[];
  onOpen: (userId: string) => void;
}) {
  const { colors } = useTheme();
  const t = useT();

  if (registrations.length === 0) {
    return (
      <EmptyState
        compact
        icon={<Users size={26} color={colors.textMuted} />}
        title={t('clubMatch.event.noRegistrations')}
        body={t('clubMatch.event.noRegistrationsBody')}
      />
    );
  }

  return (
    <View testID="event-registrations">
      {registrations.map((r, index) => {
        const name = displayName(r.full_name, t('clubMatch.event.someone'));
        return (
          <View key={r.id}>
            {index > 0 ? <Divider /> : null}
            <ListItem
              title={name}
              subtitle={r.note ?? undefined}
              left={<Avatar uri={r.avatar_url} name={name} size="sm" />}
              right={r.is_minor ? <Badge label={t('clubMatch.event.under18')} tone="info" /> : undefined}
              onPress={() => onOpen(r.user_id)}
              showChevron
            />
          </View>
        );
      })}
    </View>
  );
}
