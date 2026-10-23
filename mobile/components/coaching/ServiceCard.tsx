import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Clock, MapPin, Users, Video } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Badge, Card, ExpandableText, Text } from '@/components/ui';
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
  const description = service.description ?? '';
  const hasDescription = description.trim().length > 0;
  const [pressed, setPressed] = useState(false);
  const resting = service.is_active === false ? 0.6 : 1;

  const header = (
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
  );

  const facts = (
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
  );

  const select = (node: React.ReactNode, name: string) =>
    onPress ? (
      <Pressable
        key={name}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole={name === 'main' ? 'button' : undefined}
        accessible={name === 'main'}
        accessibilityState={name === 'main' ? { selected: !!selected } : undefined}
        style={{ gap: spacing.sm }}
      >
        {node}
      </Pressable>
    ) : (
      <View key={name} style={{ gap: spacing.sm }}>
        {node}
      </View>
    );

  return (
    <Card
      padded
      level={1}
      tone={selected ? 'primarySoft' : 'surface'}
      style={{
        gap: spacing.sm,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : 'transparent',
        opacity: pressed ? resting * 0.94 : resting,
      }}
      testID={testID}
    >
      {hasDescription ? (
        <ExpandableText text={description} lines={3} variant="body" tone="secondary">
          {(paragraph, link) => (
            <>
              {select(
                <>
                  {header}
                  {paragraph}
                </>,
                'main',
              )}
              {/* The card's own gap would open a band around the link. Pull it
                  back so the line sits on the description, as before. */}
              {link ? (
                <View style={{ marginTop: -spacing.sm, marginBottom: -spacing.sm }}>{link}</View>
              ) : null}
              {select(facts, 'facts')}
              {children}
            </>
          )}
        </ExpandableText>
      ) : (
        <>
          {select(
            <>
              {header}
              {facts}
            </>,
            'main',
          )}
          {children}
        </>
      )}
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
