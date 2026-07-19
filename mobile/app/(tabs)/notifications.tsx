import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  Eye,
  Briefcase,
  Award,
  UserPlus,
  MessageCircle,
  BadgeCheck,
  TrendingUp,
  Trophy,
  Clock,
  Zap,
  Trash2,
  Check,
} from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useNotifications } from '@/hooks/useNotifications';
import { AppNotification, NotifType, timeAgo, dismissNotif } from '@/lib/notificationService';

// ── Type → icon / color map ────────────────────────────────────────────────────
const TYPE_META: Record<NotifType, { icon: React.ComponentType<any>; color: string; label: string }> = {
  scout_interest: { icon: Eye, color: '#F59E0B', label: 'Scout Interest' },
  opportunity: { icon: Briefcase, color: Colors.accent, label: 'Opportunity' },
  endorsement: { icon: Award, color: '#A78BFA', label: 'Endorsement' },
  connection: { icon: UserPlus, color: Colors.success, label: 'Connection' },
  message: { icon: MessageCircle, color: Colors.primary, label: 'Message' },
  verification: { icon: BadgeCheck, color: Colors.primary, label: 'Verification' },
  performance: { icon: TrendingUp, color: Colors.accent, label: 'Performance' },
  milestone: { icon: Trophy, color: '#F59E0B', label: 'Milestone' },
  reminder: { icon: Clock, color: Colors.textMuted, label: 'Reminder' },
  system: { icon: Zap, color: Colors.textMuted, label: 'System' },
};

function getMeta(type: string) {
  return TYPE_META[type as NotifType] ?? { icon: Bell, color: Colors.textMuted, label: type };
}

// ── Deep-link resolver ─────────────────────────────────────────────────────────
function resolveDeepLink(notif: AppNotification): string | null {
  const d = notif.data as Record<string, string>;
  if (d?.route) return d.route;
  if (notif.action_url?.startsWith('/')) return notif.action_url;
  switch (notif.type) {
    case 'message': return '/(tabs)/messages';
    case 'opportunity': return '/(tabs)/opportunities';
    case 'connection': return '/(tabs)/network';
    case 'scout_interest':
    case 'endorsement': return '/(tabs)/profile';
    case 'performance':
    case 'milestone': return '/(tabs)/performance';
    default: return null;
  }
}

// ── NotifRow ───────────────────────────────────────────────────────────────────
function NotifRow({
  notif,
  onPress,
  onDismiss,
}: {
  notif: AppNotification;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const { icon: Icon, color } = getMeta(notif.type);

  return (
    <View style={[s.rowWrap, !notif.read && s.rowUnread]}>
      {!notif.read && <View style={s.unreadDot} />}
      <TouchableOpacity style={s.rowInner} onPress={onPress} activeOpacity={0.75}>
        <View style={[s.iconBox, { backgroundColor: `${color}18` }]}>
          <Icon color={color} size={20} strokeWidth={2} />
        </View>
        <View style={s.textBlock}>
          <Text style={[s.rowTitle, !notif.read && s.rowTitleUnread]} numberOfLines={1}>
            {notif.title}
          </Text>
          <Text style={s.rowBody} numberOfLines={2}>{notif.body}</Text>
          <Text style={s.rowTime}>{timeAgo(notif.created_at)}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={s.dismissBtn} onPress={onDismiss} hitSlop={8}>
        <Trash2 color={Colors.textFaint} size={15} />
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { groups, unreadCount, loading, refresh, markRead, markAllRead, removeNotif } =
    useNotifications();

  const handlePress = useCallback(
    async (notif: AppNotification) => {
      if (!notif.read) await markRead(notif.id);
      const link = resolveDeepLink(notif);
      if (link) router.push(link as any);
    },
    [markRead, router]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      removeNotif(id);
      await dismissNotif(id);
    },
    [removeNotif]
  );

  const isEmpty = groups.length === 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={s.unreadLabel}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead} activeOpacity={0.75}>
            <Check color={Colors.primary} size={13} strokeWidth={2.5} />
            <Text style={s.markAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, isEmpty && s.scrollEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {isEmpty ? (
          <View style={s.emptyState}>
            <View style={s.emptyIconWrap}>
              <Bell color={Colors.textDisabled} size={40} strokeWidth={1.5} />
            </View>
            <Text style={s.emptyTitle}>All caught up</Text>
            <Text style={s.emptyBody}>
              You have no notifications right now.{'\n'}Pull down to refresh.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label}>
              <View style={s.groupHeader}>
                <Text style={s.groupLabel}>{group.label}</Text>
                <View style={s.groupLine} />
              </View>
              {group.items.map((n) => (
                <NotifRow
                  key={n.id}
                  notif={n}
                  onPress={() => handlePress(n)}
                  onDismiss={() => handleDismiss(n.id)}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textPrimary,
  },
  unreadLabel: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  markAllTxt: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.xs,
    color: Colors.primary,
  },

  scroll: { paddingBottom: Spacing.xxxl },
  scrollEmpty: { flex: 1 },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  groupLabel: {
    fontFamily: Typography.family.semiBold,
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flexShrink: 0,
  },
  groupLine: { flex: 1, height: 1, backgroundColor: Colors.border },

  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    position: 'relative',
  },
  rowUnread: { backgroundColor: 'rgba(46, 139, 255, 0.05)' },
  unreadDot: {
    position: 'absolute',
    left: 6,
    top: '50%',
    marginTop: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  rowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: { flex: 1 },
  rowTitle: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    marginBottom: 3,
  },
  rowTitleUnread: {
    fontFamily: Typography.family.bold,
    color: Colors.textPrimary,
  },
  rowBody: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  rowTime: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.xs,
    color: Colors.textDisabled,
  },
  dismissBtn: {
    padding: Spacing.sm,
    flexShrink: 0,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.lg,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xl,
    color: Colors.textMuted,
  },
  emptyBody: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textDisabled,
    textAlign: 'center',
    lineHeight: 20,
  },
});
