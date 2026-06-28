import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Camera } from 'lucide-react-native';
import { Colors, Spacing, Typography, Radii } from '@/constants/theme';
import { StoryAuthorGroup } from '@/lib/storiesService';
import { useAuth } from '@/context/AuthContext';
import { useStoriesContext } from '@/context/StoriesContext';

interface Props {
  onOpenViewer: (groups: StoryAuthorGroup[], startIndex: number) => void;
  onOpenCreator: () => void;
}

export function StoriesTray({ onOpenViewer, onOpenCreator }: Props) {
  const { groups, loading } = useStoriesContext();
  const { profile } = useAuth();

  const ownGroup    = groups.find(g => g.is_own);
  const othersGroups = groups.filter(g => !g.is_own);
  const allGroups    = ownGroup ? [ownGroup, ...othersGroups] : othersGroups;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.container}
    >
      {/* Your Story */}
      <TouchableOpacity
        style={s.item}
        onPress={() => ownGroup ? onOpenViewer(allGroups, 0) : onOpenCreator()}
        activeOpacity={0.8}
      >
        <View style={s.avatarWrap}>
          {ownGroup ? (
            <PulseRingWrapper unseen={ownGroup.has_unseen} own>
              <AvatarInner name={profile?.full_name} avatar={profile?.avatar_url} />
            </PulseRingWrapper>
          ) : (
            <AddStoryButton name={profile?.full_name} avatar={profile?.avatar_url} />
          )}
        </View>
        <Text style={s.label} numberOfLines={1}>
          {ownGroup ? 'Your story' : 'Add story'}
        </Text>
      </TouchableOpacity>

      {/* Others */}
      {othersGroups.map((group, i) => {
        const viewerIdx = ownGroup ? i + 1 : i;
        return (
          <TouchableOpacity
            key={group.author_id}
            style={s.item}
            onPress={() => onOpenViewer(allGroups, viewerIdx)}
            activeOpacity={0.8}
          >
            <View style={s.avatarWrap}>
              <PulseRingWrapper unseen={group.has_unseen}>
                <AvatarInner name={group.author_name} avatar={group.author_avatar} />
              </PulseRingWrapper>
            </View>
            <Text style={s.label} numberOfLines={1}>
              {group.author_name?.split(' ')[0] ?? 'Athlete'}
            </Text>
          </TouchableOpacity>
        );
      })}

      {!loading && groups.length === 0 && (
        <Text style={s.emptyHint}>No stories yet</Text>
      )}
    </ScrollView>
  );
}

// ── PulseRingWrapper ──────────────────────────────────────────────────────────
// Unseen: gradient ring with a slow pulse glow
// Seen / own: plain ring
function PulseRingWrapper({
  children, unseen, own,
}: {
  children: React.ReactNode;
  unseen: boolean;
  own?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!unseen || own) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse,       { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse,       { toValue: 1,    duration: 900, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.45, duration: 900, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [unseen, own]);

  if (own) {
    return (
      <View style={[s.ringBase, { borderColor: Colors.primary, borderWidth: 2 }]}>
        {children}
      </View>
    );
  }

  if (!unseen) {
    return (
      <View style={[s.ringBase, { borderColor: Colors.textFaint, borderWidth: 2 }]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <Animated.View style={[s.pulseGlow, { opacity: glowOpacity }]} />
      <LinearGradient
        colors={[Colors.primary, Colors.accent, Colors.primary]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={s.gradientRing}
      >
        <View style={s.ringInner}>{children}</View>
      </LinearGradient>
    </Animated.View>
  );
}

// ── AddStoryButton ────────────────────────────────────────────────────────────
function AddStoryButton({ name, avatar }: { name?: string | null; avatar?: string | null }) {
  return (
    <View style={s.addWrap}>
      <LinearGradient
        colors={[`${Colors.primary}35`, `${Colors.accent}25`]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={s.addGrad}
      />
      <AvatarInner name={name} avatar={avatar} />
      <View style={s.addBadge}>
        <Camera color={Colors.white} size={10} strokeWidth={2.5} />
      </View>
    </View>
  );
}

// ── AvatarInner ───────────────────────────────────────────────────────────────
function AvatarInner({ name, avatar }: { name?: string | null; avatar?: string | null }) {
  if (avatar) {
    return <Image source={{ uri: avatar }} style={s.avatarImg} />;
  }
  return (
    <View style={s.avatarDefault}>
      <Text style={s.avatarInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const RING_SIZE   = 64;
const AVATAR_SIZE = 54;
const GLOW_SIZE   = RING_SIZE + 8;

const s = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
    alignItems: 'center',
  },
  item:      { alignItems: 'center', gap: 6, width: RING_SIZE + 8 },
  avatarWrap:{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },

  // Gradient ring (unseen)
  gradientRing: {
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    padding: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  ringInner: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.bg,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  pulseGlow: {
    position: 'absolute',
    width: GLOW_SIZE, height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: Colors.primary,
    alignSelf: 'center',
    top: -(GLOW_SIZE - RING_SIZE) / 2,
    left: -(GLOW_SIZE - RING_SIZE) / 2,
  },

  // Seen / own border ring
  ringBase: {
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },

  // Add story
  addWrap: {
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: `${Colors.primary}50`,
    borderStyle: 'dashed',
  },
  addGrad: { ...StyleSheet.absoluteFillObject },
  addBadge: {
    position: 'absolute', bottom: 1, right: 1,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.bg,
  },

  // Avatar
  avatarImg:     { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarDefault: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: Colors.white, fontFamily: Typography.family.bold, fontSize: Typography.size.md },

  // Label
  label: {
    fontFamily: Typography.family.medium,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    width: RING_SIZE + 8,
  },
  emptyHint: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
    alignSelf: 'center',
    paddingLeft: Spacing.md,
  },
  // unused (kept for compatibility)
  textFaint: { color: Colors.textFaint },
});
