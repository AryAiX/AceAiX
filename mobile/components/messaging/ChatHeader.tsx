import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronLeft, MoreHorizontal } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Skeleton, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { displayName, roleLabel } from '@/lib/format';
import type { ConversationPeer } from '@/lib/api.messaging';

interface Props {
  peer: ConversationPeer | null;
  loading: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenMenu: () => void;
}

/**
 * The thread's own header: back, the person, and the safety menu.
 *
 * The whole avatar-and-name block is one large target, because "tap their name
 * to see who they actually are" is the check we most want an athlete to make
 * before replying to a stranger.
 */
export function ChatHeader({ peer, loading, onBack, onOpenProfile, onOpenMenu }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing, hit } = theme;
  const t = useT();

  const name = displayName(peer?.full_name);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 56,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('messaging.backToMessages')}
        style={({ pressed }) => ({
          width: hit.min,
          height: hit.min,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <ChevronLeft size={24} color={colors.text} />
      </Pressable>

      <Pressable
        onPress={peer ? onOpenProfile : undefined}
        disabled={!peer}
        accessibilityRole="button"
        accessibilityLabel={
          peer
            ? t('messaging.openProfileOf', { name })
            : t('messaging.loadingConversation')
        }
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: hit.min,
          opacity: pressed ? 0.65 : 1,
        })}
      >
        {loading && !peer ? (
          <>
            <Skeleton width={36} height={36} radius={18} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="45%" height={13} />
              <Skeleton width="25%" height={10} />
            </View>
          </>
        ) : (
          <>
            <Avatar
              uri={peer?.avatar_url}
              name={peer?.full_name}
              size="sm"
              verified={peer?.is_verified}
            />
            <View style={{ flex: 1 }}>
              <Text variant="subheading" numberOfLines={1}>
                {name}
              </Text>
              {peer ? (
                <Text variant="overline" tone="muted" numberOfLines={1}>
                  {roleLabel(peer.role)}
                </Text>
              ) : null}
            </View>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={onOpenMenu}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t('messaging.moreOptions')}
        style={({ pressed }) => ({
          width: hit.min,
          height: hit.min,
          borderRadius: radii.pill,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <MoreHorizontal size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}
