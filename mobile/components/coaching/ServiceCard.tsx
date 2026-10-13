import React from 'react';
import { View } from 'react-native';
import { Clock, MapPin, Users, Video } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, Text } from '@/components/ui';
import { useT } from '@/i18n';
import type { CoachingService } from '@/lib/api.coaching';
import { amountLabel } from '@/lib/sponsorship';

interface Props {
  service: CoachingService;
  selected?: boolean;
  onPress?: () => void;
  /** Extra controls under the facts — the coach's edit buttons. */
  children?: React.ReactNode;
  testID?: string;
}

/** What can be booked, at a glance: kind, length, places, price, where. */
export function ServiceCard({ service, selected, onPress, children, testID }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const price = service.price == null ? t('coaching.priceOnRequest') : amountLabel(service.price, service.currency);
  const where =
    service.location_mode === 'fixed' ? service.location : t(`coaching.mode.${service.location_mode}`);

  return (
    <Card
      padded
      level={1}
      onPress={onPress}
      tone={selected ? 'primarySoft' : 'surface'}
      style={{
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : 'transparent',
        opacity: service.is_active === false ? 0.6 : 1,
      }}
      testID={testID}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Badge
            label={t(`coaching.kind.${service.kind}`)}
            tone={service.kind === 'class' ? 'accent' : service.kind === 'consultation' ? 'info' : 'primary'}
            style={{ alignSelf: 'flex-start' }}
          />
          <Text variant="subheading">{service.title}</Text>
        </View>
        <Text variant="bodyStrong" tone="success">
          {price}
        </Text>
      </View>
      {service.description ? (
        <Text variant="body" tone="secondary" numberOfLines={3}>
          {service.description}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        <Fact icon={<Clock size={13} color={colors.textMuted} />} label={t('coaching.minutes', { n: service.duration_minutes })} />
        {service.capacity > 1 ? (
          <Fact icon={<Users size={13} color={colors.textMuted} />} label={String(service.capacity)} />
        ) : null}
        <Fact
          icon={
            service.location_mode === 'online' ? (
              <Video size={13} color={colors.textMuted} />
            ) : (
              <MapPin size={13} color={colors.textMuted} />
            )
          }
          label={where ?? ''}
        />
      </View>
      {children}
    </Card>
  );
}

function Fact({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
      {icon}
      <Text variant="caption" tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}
