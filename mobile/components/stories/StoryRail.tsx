import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BadgeCheck, Plus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Avatar, Reveal, Tappable, Text } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useT } from '@/i18n';
import { getStoryRail, type StoryRailEntry } from '@/lib/api.stories';
import { displayName } from '@/lib/format';
import { NATIVE_DRIVER } from '@/lib/motion';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import { StoryRing, type RingState } from './StoryRing';

/**
 * The row of rings at the top of Home.
 *
 * "Your story" is always first — it is how a story gets made, so it is there
 * even when nobody you follow has posted. Everyone else comes in the order the
 * database gives: something new first, then the people you have caught up
 * with, newest first within each.
 */

const RING = 72;
const LABEL_WIDTH = 76;

export function StoryRail() {
  const theme = useTheme();
  const { spacing } = theme;
  const router = useRouter();
  const t = useT();
  const { user, profile } = useAuth();

  const rail = useAsync(() => getStoryRail(30), [], { refetchOnFocus: true });
  const entries = useMemo(() => rail.data ?? [], [rail.data]);
  const mine = entries.find((e) => e.is_self) ?? null;
  const others = entries.filter((e) => !e.is_self);

  /* The viewer walks this list: tapping any bubble opens that author and
     carries on through everyone after them. */
  const queue = useMemo(() => entries.map((e) => e.author_id).join(','), [entries]);

  const open = (authorId: string) =>
    router.push({ pathname: Routes.story, params: { userId: authorId, queue } });

  const compose = () => router.push(Routes.newStory);

  const myName = displayName(profile?.full_name ?? mine?.name ?? null);

  return (
    <View
      style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.xs }}
      accessibilityLabel={t('stories.railLabel')}
      testID="story-rail"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.xs }}
      >
        <Reveal from="scale" index={0}>
          <YourBubble
            uri={profile?.avatar_url ?? mine?.avatar_url ?? null}
            name={myName}
            ring={mine ? (mine.unseen > 0 ? 'unseen' : 'seen') : 'none'}
            label={t('stories.yourStory')}
            openLabel={mine ? t('stories.openYourStory') : t('stories.addStory')}
            addLabel={t('stories.addStory')}
            onOpen={mine && user ? () => open(user.id) : compose}
            onAdd={compose}
          />
        </Reveal>

        {others.map((entry, index) => (
          <Reveal key={entry.author_id} from="scale" index={index + 1}>
            <AuthorBubble
              entry={entry}
              onPress={() => open(entry.author_id)}
              label={
                entry.unseen > 0
                  ? t('stories.openStoriesOfNew', { name: displayName(entry.name) })
                  : t('stories.openStoriesOf', { name: displayName(entry.name) })
              }
            />
          </Reveal>
        ))}
      </ScrollView>
    </View>
  );
}

function AuthorBubble({
  entry,
  label,
  onPress,
}: {
  entry: StoryRailEntry;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const name = displayName(entry.name);
  const ring: RingState = entry.unseen > 0 ? 'unseen' : 'seen';

  return (
    <Tappable
      onPress={onPress}
      scaleTo={0.9}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: LABEL_WIDTH, alignItems: 'center', gap: 6, paddingVertical: 4 }}
      testID={`story-bubble-${entry.author_id}`}
    >
      <StoryRing size={RING} state={ring}>
        <Avatar uri={entry.avatar_url} name={name} size="lg" />
      </StoryRing>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, maxWidth: LABEL_WIDTH }}>
        <Text
          variant="caption"
          tone={ring === 'unseen' ? 'default' : 'muted'}
          numberOfLines={1}
          style={{ flexShrink: 1, fontSize: 11.5 }}
        >
          {name.split(' ')[0]}
        </Text>
        {entry.is_verified ? <BadgeCheck size={12} color={theme.colors.info} /> : null}
      </View>
    </Tappable>
  );
}

function YourBubble({
  uri,
  name,
  ring,
  label,
  openLabel,
  addLabel,
  onOpen,
  onAdd,
}: {
  uri: string | null;
  name: string;
  ring: RingState;
  label: string;
  openLabel: string;
  addLabel: string;
  onOpen: () => void;
  onAdd: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const bob = useRef(new Animated.Value(0)).current;

  /* The "+" nods every few seconds — the one thing on the rail asking to be
     pressed, so it is the one thing that moves on its own. */
  useEffect(() => {
    if (reduced) {
      bob.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        Animated.timing(bob, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.spring(bob, { toValue: 0, speed: 12, bounciness: 14, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, reduced]);

  return (
    <View style={{ width: LABEL_WIDTH, alignItems: 'center', gap: 6, paddingVertical: 4 }}>
      <View>
        <Tappable
          onPress={onOpen}
          scaleTo={0.9}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel={openLabel}
          testID="story-bubble-self"
        >
          <StoryRing size={RING} state={ring}>
            <Avatar uri={uri} name={name} size="lg" />
          </StoryRing>
        </Tappable>

        <Animated.View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            transform: [
              { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) },
              { rotate: bob.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
            ],
          }}
        >
          <Pressable
            onPress={onAdd}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={addLabel}
            testID="story-add"
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              borderWidth: 3,
              borderColor: theme.colors.bg,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LinearGradient
              colors={theme.gradients.action}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View>
              <Plus size={14} color={theme.colors.textOnBrand} strokeWidth={3} />
            </View>
          </Pressable>
        </Animated.View>
      </View>
      <Text variant="caption" tone="secondary" numberOfLines={1} style={{ fontSize: 11.5 }}>
        {label}
      </Text>
    </View>
  );
}
