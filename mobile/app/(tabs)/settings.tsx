import React, { useEffect, useState } from 'react';
import { Alert, View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, TextInput, ActivityIndicator, Linking } from 'react-native';
import { User, Bell, Shield, Globe, ChevronRight, LogOut, HelpCircle, Info, RefreshCw, Link, Eye, Briefcase, Award, UserPlus, MessageCircle, BadgeCheck, TrendingUp, Trophy, Clock, Zap, Moon, Dumbbell, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { Colors, Typography, Spacing, Radii } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { triggerChessSyncFull, isSyncStale } from '@/lib/chessService';
import { useChessStats } from '@/hooks/useChessStats';
import {
  DEFAULT_PREFS,
  fetchNotifPrefs,
  saveNotifPrefs,
  NotificationPrefs,
} from '@/lib/notificationService';
import {
  fetchConsent,
  SportifyConsent,
} from '@/lib/sportifyService';
import { SportifyConsentModal } from '@/components/sportify/SportifyConsentModal';

type NotifCategory = {
  key: keyof NotificationPrefs;
  label: string;
  Icon: React.ComponentType<any>;
  color: string;
};

const NOTIF_CATEGORIES: NotifCategory[] = [
  { key: 'scout_interest', label: 'Scout Interest', Icon: Eye, color: '#F59E0B' },
  { key: 'opportunity', label: 'Opportunities', Icon: Briefcase, color: Colors.accent },
  { key: 'endorsement', label: 'Endorsements', Icon: Award, color: '#A78BFA' },
  { key: 'connection', label: 'Connections', Icon: UserPlus, color: Colors.success },
  { key: 'message', label: 'Messages', Icon: MessageCircle, color: Colors.primary },
  { key: 'verification', label: 'Verification', Icon: BadgeCheck, color: Colors.primary },
  { key: 'performance', label: 'Performance Updates', Icon: TrendingUp, color: Colors.accent },
  { key: 'milestone', label: 'Milestones', Icon: Trophy, color: '#F59E0B' },
  { key: 'reminder', label: 'Reminders', Icon: Clock, color: Colors.textMuted },
  { key: 'system', label: 'System', Icon: Zap, color: Colors.textMuted },
];

export default function Settings() {
  const { profile, signOut, deleteAccount, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [publicProfile, setPublicProfile] = useState(profile?.is_open_to_offers ?? true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [chesscom, setChesscom] = useState(profile?.chesscom_username ?? '');
  const [lichess, setLichess] = useState(profile?.lichess_username ?? '');
  const [footballPlayerId, setFootballPlayerId] = useState(profile?.football_api_player_id ?? '');
  const [savingConn, setSavingConn] = useState(false);
  const [connSaved, setConnSaved] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Notification prefs
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_PREFS });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  const { stats: chessStats } = useChessStats(profile?.sport === 'chess' ? user?.id : null);
  const canSyncChess = !chessStats || isSyncStale(chessStats.last_synced_at, 3600000);

  // Sportify state
  const [sportifyConsent, setSportifyConsent] = useState<SportifyConsent | null>(null);
  const [consentModalVisible, setConsentModalVisible] = useState(false);
  const [sportifyId, setSportifyId] = useState(profile?.sportify_athlete_id ?? '');
  const [sportifyLinking, setSportifyLinking] = useState(false);
  const [sportifyMsg, setSportifyMsg] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifPrefs(user.id).then((p) => {
      setPrefs({ ...DEFAULT_PREFS, ...p });
    });
    fetchConsent(user.id).then(setSportifyConsent);
  }, [user]);

  useEffect(() => {
    setPublicProfile(profile?.is_open_to_offers ?? true);
  }, [profile?.is_open_to_offers]);

  async function handleVisibilityChange(value: boolean) {
    if (!user || savingVisibility) return;
    const previous = publicProfile;
    setPublicProfile(value);
    setSavingVisibility(true);
    const { error } = await supabase
      .from('athlete_profiles')
      .update({ is_open_to_offers: value })
      .eq('user_id', user.id);
    setSavingVisibility(false);
    if (error) {
      setPublicProfile(previous);
      Alert.alert('Visibility not updated', error.message);
      return;
    }
    await refreshProfile();
  }

  function setPref<K extends keyof NotificationPrefs>(key: K, val: NotificationPrefs[K]) {
    setPrefs((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSavePrefs() {
    if (!user) return;
    setSavingPrefs(true);
    const { error } = await saveNotifPrefs(user.id, prefs);
    setSavingPrefs(false);
    if (error) {
      Alert.alert('Preferences not saved', error);
      return;
    }
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  }

  async function handleSaveConnections() {
    if (!user) return;
    setSavingConn(true);
    setConnError(null);
    const { error } = await supabase
      .from('athlete_profiles')
      .update({
        chesscom_username: chesscom || null,
        lichess_username: lichess || null,
        football_api_player_id: footballPlayerId || null,
      })
      .eq('user_id', user.id);
    if (error) {
      setConnError(error.message);
    } else {
      await refreshProfile();
      setConnSaved(true);
      setTimeout(() => setConnSaved(false), 2000);
    }
    setSavingConn(false);
  }

  async function handleChessSync() {
    if (!user) return;
    setSyncing(true);
    setSyncMsg(null);
    const { ok, error } = await triggerChessSyncFull(user.id, chesscom || null, lichess || null);
    setSyncMsg(ok ? 'Chess data synced!' : (error ?? 'Sync failed'));
    setSyncing(false);
    setTimeout(() => setSyncMsg(null), 4000);
  }

  async function handleSportifyLink() {
    if (!user || !sportifyId.trim()) return;
    setSportifyLinking(true);
    setSportifyMsg(null);
    const partnerId = sportifyId.trim();
    const { data: verifiedResult, error: lookupError } = await supabase
      .from('sportify_results')
      .select('id')
      .eq('athlete_id', user.id)
      .eq('verification_ref', partnerId)
      .limit(1)
      .maybeSingle();
    if (lookupError || !verifiedResult) {
      setSportifyLinking(false);
      setSportifyMsg(lookupError?.message ?? 'No partner-issued result matches this ID.');
      return;
    }
    const { error } = await supabase
      .from('athlete_profiles')
      .update({ sportify_linked: true, sportify_athlete_id: partnerId })
      .eq('user_id', user.id);
    if (error) {
      setSportifyMsg(error.message);
    } else {
      await refreshProfile();
      setSportifyMsg('Sportify account linked!');
    }
    setSportifyLinking(false);
    setTimeout(() => setSportifyMsg(null), 3000);
  }

  async function handleSportifyDisconnect() {
    if (!user) return;
    setDisconnecting(true);
    const { error } = await supabase.rpc('disconnect_sportify');
    if (error) {
      setDisconnecting(false);
      setSportifyMsg(error.message);
      return;
    }
    await refreshProfile();
    setSportifyConsent(null);
    setSportifyId('');
    setDisconnecting(false);
    setSportifyMsg('Disconnected and data deleted.');
    setTimeout(() => setSportifyMsg(null), 3000);
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  function confirmDeleteAccount() {
    if (deletingAccount) return;
    Alert.alert(
      'Delete AceAiX account?',
      'This permanently deletes your AceAiX account, profile, posts, messages, imported performance data, and sign-in access. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: handleDeleteAccount,
        },
      ],
    );
  }

  async function handleDeleteAccount() {
    setDeletingAccount(true);
    const { error } = await deleteAccount();
    setDeletingAccount(false);
    if (error) {
      Alert.alert('Account deletion failed', error);
      return;
    }
    router.replace('/login');
  }

  const isChessSport = profile?.sport === 'chess';
  const isFootballSport = profile?.sport && profile.sport !== 'chess';

  return (
    <View style={s.root}>
      <AppHeader title="Settings" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Profile summary */}
        <TouchableOpacity style={s.profileCard} onPress={() => router.push('/(tabs)/edit-profile' as any)}>
          <View style={s.profileAv}>
            <Text style={s.profileAvTxt}>{profile?.full_name?.[0]?.toUpperCase() ?? 'A'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{profile?.full_name ?? 'Athlete'}</Text>
            <Text style={s.profileSub}>Edit your personal and athlete information</Text>
          </View>
          <ChevronRight color={Colors.textMuted} size={18} />
        </TouchableOpacity>

        {/* Account */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account</Text>
          <View style={s.group}>
            {[
              { label: 'Personal Information', Icon: User, onPress: () => router.push('/(tabs)/edit-profile' as any) },
              { label: 'Privacy & Security', Icon: Shield, onPress: () => void Linking.openURL('https://aceaix.com/privacy') },
              {
                label: 'Language',
                Icon: Globe,
                value: 'English',
                onPress: () => Alert.alert('Language', 'English is the supported language in this release.'),
              },
            ].map((item, i) => (
              <TouchableOpacity key={item.label} style={[s.row, i > 0 && s.rowBorder]} onPress={item.onPress}>
                <View style={s.rowLeft}>
                  <item.Icon color={Colors.textMuted} size={18} />
                  <Text style={s.rowLabel}>{item.label}</Text>
                </View>
                <View style={s.rowRight}>
                  {item.value && <Text style={s.rowValue}>{item.value}</Text>}
                  <ChevronRight color={Colors.textDisabled} size={16} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Push Notifications</Text>
          <View style={s.group}>
            {/* Master toggle */}
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Bell color={Colors.primary} size={18} />
                <View>
                  <Text style={s.rowLabel}>Enable Push Notifications</Text>
                  <Text style={s.rowSub}>Receive alerts on your device</Text>
                </View>
              </View>
              <Switch
                value={prefs.push_enabled !== false}
                onValueChange={(v) => setPref('push_enabled', v)}
                trackColor={{ false: Colors.elevated, true: `${Colors.primary}60` }}
                thumbColor={prefs.push_enabled !== false ? Colors.primary : Colors.textDisabled}
              />
            </View>

            {/* Per-category toggles */}
            {prefs.push_enabled !== false && NOTIF_CATEGORIES.map((cat) => (
              <View key={cat.key} style={[s.row, s.rowBorder]}>
                <View style={s.rowLeft}>
                  <cat.Icon color={cat.color} size={16} />
                  <Text style={s.rowLabel}>{cat.label}</Text>
                </View>
                <Switch
                  value={prefs[cat.key] !== false}
                  onValueChange={(v) => setPref(cat.key, v)}
                  trackColor={{ false: Colors.elevated, true: `${Colors.primary}60` }}
                  thumbColor={prefs[cat.key] !== false ? Colors.primary : Colors.textDisabled}
                />
              </View>
            ))}

            {/* Quiet hours */}
            {prefs.push_enabled !== false && (
              <View style={[s.row, s.rowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.sm }]}>
                <View style={s.rowLeft}>
                  <Moon color={Colors.textMuted} size={16} />
                  <View>
                    <Text style={s.rowLabel}>Quiet Hours</Text>
                    <Text style={s.rowSub}>No push during these hours (UTC)</Text>
                  </View>
                </View>
                <View style={s.quietRow}>
                  <View style={s.quietField}>
                    <Text style={s.quietLbl}>From</Text>
                    <TextInput
                      style={s.quietInput}
                      value={prefs.quiet_start ?? DEFAULT_PREFS.quiet_start}
                      onChangeText={(v) => setPref('quiet_start', v)}
                      placeholder="22:00"
                      placeholderTextColor={Colors.textDisabled}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View style={s.quietField}>
                    <Text style={s.quietLbl}>Until</Text>
                    <TextInput
                      style={s.quietInput}
                      value={prefs.quiet_end ?? DEFAULT_PREFS.quiet_end}
                      onChangeText={(v) => setPref('quiet_end', v)}
                      placeholder="07:00"
                      placeholderTextColor={Colors.textDisabled}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Save prefs */}
            <View style={[s.row, s.rowBorder]}>
              <TouchableOpacity
                style={[s.connSaveBtn, savingPrefs && { opacity: 0.6 }]}
                onPress={handleSavePrefs}
                disabled={savingPrefs}
              >
                {savingPrefs
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={s.connSaveTxt}>{prefsSaved ? 'Saved!' : 'Save Preferences'}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Profile */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Public Profile</Text>
          <View style={s.group}>
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Globe color={Colors.textMuted} size={18} />
                <Text style={s.rowLabel}>Profile Visible to Scouts</Text>
              </View>
              <Switch
                accessibilityLabel="Profile visible to scouts"
                value={publicProfile}
                onValueChange={(value) => void handleVisibilityChange(value)}
                disabled={savingVisibility}
                trackColor={{ false: Colors.elevated, true: `${Colors.primary}60` }}
                thumbColor={publicProfile ? Colors.primary : Colors.textDisabled}
              />
            </View>
          </View>
        </View>

        {/* Connected Data */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Connected Data</Text>
          <View style={s.group}>
            {/* Chess.com */}
            <View style={[s.row, { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.sm }]}>
              <View style={s.rowLeft}>
                <Link color={Colors.textMuted} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Chess.com Username</Text>
                  <Text style={s.rowSub}>Auto-syncs ratings, records, and recent games</Text>
                </View>
              </View>
              <TextInput
                style={s.connInput}
                value={chesscom}
                onChangeText={setChesscom}
                placeholder="e.g. magnuscarlsen"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {/* Lichess */}
            <View style={[s.row, s.rowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.sm }]}>
              <View style={s.rowLeft}>
                <Link color={Colors.textMuted} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Lichess Username</Text>
                  <Text style={s.rowSub}>Rating history + W/L/D synced from Lichess</Text>
                </View>
              </View>
              <TextInput
                style={s.connInput}
                value={lichess}
                onChangeText={setLichess}
                placeholder="e.g. DrNykterstein"
                placeholderTextColor={Colors.textDisabled}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {isFootballSport && (
              <View style={[s.row, s.rowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.sm }]}>
                <View style={s.rowLeft}>
                  <Link color={Colors.textMuted} size={18} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>API-Football Player ID</Text>
                    <Text style={s.rowSub}>Set by admin to enable live stats sync from API-Football</Text>
                  </View>
                </View>
                <TextInput
                  style={s.connInput}
                  value={footballPlayerId}
                  onChangeText={setFootballPlayerId}
                  placeholder="e.g. 276"
                  placeholderTextColor={Colors.textDisabled}
                  keyboardType="numeric"
                />
              </View>
            )}
            <View style={[s.row, s.rowBorder, { gap: Spacing.sm }]}>
              <TouchableOpacity
                style={[s.connSaveBtn, savingConn && { opacity: 0.6 }]}
                onPress={handleSaveConnections}
                disabled={savingConn}
              >
                {savingConn
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={s.connSaveTxt}>{connSaved ? 'Saved!' : 'Save'}</Text>
                }
              </TouchableOpacity>
              {isChessSport && (
                <TouchableOpacity
                  style={[s.connSyncBtn, (!canSyncChess || syncing) && { opacity: 0.5 }]}
                  onPress={handleChessSync}
                  disabled={!canSyncChess || syncing}
                >
                  {syncing
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <>
                        <RefreshCw color={canSyncChess ? Colors.primary : Colors.textDisabled} size={14} />
                        <Text style={[s.connSyncTxt, !canSyncChess && { color: Colors.textDisabled }]}>
                          {canSyncChess ? 'Sync Chess' : 'Synced recently'}
                        </Text>
                      </>
                  }
                </TouchableOpacity>
              )}
            </View>
            {(connError || syncMsg) && (
              <View style={[s.row, s.rowBorder]}>
                <Text style={[s.statusMsg, { color: syncMsg?.includes('synced') ? Colors.success : connError ? Colors.error : Colors.textMuted }]}>
                  {connError ?? syncMsg}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Sportify Academy */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Sportify Academy</Text>
          <View style={s.group}>
            {/* Linked status */}
            <View style={s.row}>
              <View style={s.rowLeft}>
                <Dumbbell color={sportifyConsent?.granted_at && !sportifyConsent.revoked_at ? Colors.success : Colors.textMuted} size={18} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Sportify Academy</Text>
                  <Text style={s.rowSub}>
                    {sportifyConsent?.granted_at && !sportifyConsent.revoked_at
                      ? `Linked · Consent granted ${new Date(sportifyConsent.granted_at).toLocaleDateString()}`
                      : 'Physical test results & talent assessment'}
                  </Text>
                </View>
              </View>
              {sportifyConsent?.granted_at && !sportifyConsent.revoked_at && (
                <View style={[s.statusDot, { backgroundColor: Colors.success }]} />
              )}
            </View>

            {/* If not consented, show link flow */}
            {(!sportifyConsent?.granted_at || sportifyConsent.revoked_at) && (
              <View style={[s.row, s.rowBorder, { flexDirection: 'column', alignItems: 'flex-start', gap: Spacing.sm }]}>
                <View style={s.rowLeft}>
                  <Link color={Colors.textMuted} size={18} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rowLabel}>Sportify Verification Reference</Text>
                    <Text style={s.rowSub}>Enter the reference issued with your imported partner result</Text>
                  </View>
                </View>
                <TextInput
                  style={s.connInput}
                  value={sportifyId}
                  onChangeText={setSportifyId}
                  placeholder="e.g. SPF-ATH-12345"
                  placeholderTextColor={Colors.textDisabled}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[s.sportifyLinkBtn, (!sportifyId.trim()) && { opacity: 0.4 }]}
                  onPress={() => setConsentModalVisible(true)}
                  disabled={!sportifyId.trim()}
                >
                  <BadgeCheck color={Colors.white} size={14} />
                  <Text style={s.sportifyLinkTxt}>Link & Consent</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* If linked, show manage options */}
            {sportifyConsent?.granted_at && !sportifyConsent.revoked_at && (
              <>
                <TouchableOpacity
                  style={[s.row, s.rowBorder]}
                  onPress={() => router.push('/(tabs)/sportify-academy' as any)}
                >
                  <View style={s.rowLeft}>
                    <Trophy color={Colors.textMuted} size={18} />
                    <Text style={s.rowLabel}>View Results & Appointments</Text>
                  </View>
                  <ChevronRight color={Colors.textDisabled} size={16} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.row, s.rowBorder, disconnecting && { opacity: 0.5 }]}
                  onPress={handleSportifyDisconnect}
                  disabled={disconnecting}
                >
                  <View style={s.rowLeft}>
                    <Trash2 color={Colors.error} size={18} />
                    <View>
                      <Text style={[s.rowLabel, { color: Colors.error }]}>Disconnect & Delete Data</Text>
                      <Text style={s.rowSub}>Permanently removes all imported results</Text>
                    </View>
                  </View>
                  {disconnecting && <ActivityIndicator size="small" color={Colors.error} />}
                </TouchableOpacity>
              </>
            )}

            {sportifyMsg && (
              <View style={[s.row, s.rowBorder]}>
                <Text style={[s.statusMsg, { color: sportifyMsg.includes('Linked') || sportifyMsg.includes('Disconnected') ? Colors.success : Colors.error }]}>
                  {sportifyMsg}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Support */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Support</Text>
          <View style={s.group}>
            {[
              {
                label: 'Help Center',
                Icon: HelpCircle,
                onPress: () => void Linking.openURL('https://aceaix.com/support'),
              },
              {
                label: 'About AceAiX',
                Icon: Info,
                onPress: () => Alert.alert(
                  'About AceAiX',
                  'AceAiX helps athletes build verified profiles, track performance, connect with sports professionals, and discover opportunities.\n\nVersion 1.0.0',
                ),
              },
              {
                label: 'Privacy Policy',
                Icon: Shield,
                onPress: () => void Linking.openURL('https://aceaix.com/privacy'),
              },
              {
                label: 'Terms of Service',
                Icon: Globe,
                onPress: () => void Linking.openURL('https://aceaix.com/terms'),
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={item.label}
                accessibilityRole="button"
                style={[s.row, i > 0 && s.rowBorder]}
                onPress={item.onPress}
              >
                <View style={s.rowLeft}>
                  <item.Icon color={Colors.textMuted} size={18} />
                  <Text style={s.rowLabel}>{item.label}</Text>
                </View>
                <ChevronRight color={Colors.textDisabled} size={16} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI data use */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>AI & Data Use</Text>
          <View style={s.group}>
            <View style={s.infoBlock}>
              <View style={s.rowLeft}>
                <Shield color={Colors.primary} size={18} />
                <Text style={s.rowLabel}>Third-party AI sharing</Text>
              </View>
              <Text style={s.infoText}>
                This App Store build does not send your personal profile, health, medical, or performance data to a third-party AI service. If AceAiX enables an external AI provider in a future release, the app will explain what data is sent, identify the provider, and ask for your permission before sharing it.
              </Text>
            </View>
          </View>
        </View>

        {/* Account deletion */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Deletion</Text>
          <View style={s.group}>
            <View style={s.infoBlock}>
              <View style={s.rowLeft}>
                <Trash2 color={Colors.error} size={18} />
                <Text style={[s.rowLabel, { color: Colors.error }]}>Permanently Delete Account</Text>
              </View>
              <Text style={s.infoText}>
                Delete your account directly from AceAiX. This removes your sign-in access and associated profile, settings, posts, notifications, applications, imported results, and related athlete data.
              </Text>
              <TouchableOpacity
                style={[s.deleteAccountBtn, deletingAccount && { opacity: 0.6 }]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={s.deleteAccountTxt}>Delete My Account</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={handleSignOut}>
          <LogOut color={Colors.error} size={18} />
          <Text style={s.logoutTxt}>Log Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>AceAiX v1.0.0 · Athlete Portal</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      <SportifyConsentModal
        visible={consentModalVisible}
        isMinor={profile?.sportify_is_minor ?? false}
        onClose={() => setConsentModalVisible(false)}
        onConsented={async () => {
          if (user) {
            await handleSportifyLink();
            const c = await fetchConsent(user.id);
            setSportifyConsent(c);
          }
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  profileAv: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  profileAvTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.xl, color: Colors.white },
  profileName: { fontFamily: Typography.family.bold, fontSize: Typography.size.lg, color: Colors.textPrimary },
  profileSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, marginTop: 2 },
  section: { gap: Spacing.sm },
  sectionTitle: { fontFamily: Typography.family.bold, fontSize: Typography.size.xs, color: Colors.textDisabled, letterSpacing: 1.2, textTransform: 'uppercase', paddingHorizontal: 2 },
  group: { backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md + 2 },
  rowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  rowLabel: { fontFamily: Typography.family.medium, fontSize: Typography.size.md, color: Colors.textPrimary },
  rowValue: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted },
  rowSub: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, marginTop: 1 },
  quietRow: { flexDirection: 'row', gap: Spacing.md, width: '100%' as any },
  quietField: { flex: 1, gap: 4 },
  quietLbl: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled },
  quietInput: { backgroundColor: Colors.elevated, borderRadius: Radii.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border, textAlign: 'center' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, backgroundColor: `${Colors.error}12`, borderRadius: Radii.lg, paddingVertical: Spacing.lg, borderWidth: 1, borderColor: `${Colors.error}25` },
  logoutTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.md, color: Colors.error },
  version: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs, color: Colors.textDisabled, textAlign: 'center' },
  connInput: { width: '100%' as any, backgroundColor: Colors.elevated, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  connSaveBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  connSaveTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  connSyncBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: `${Colors.primary}15`, borderRadius: Radii.md, paddingVertical: 9, borderWidth: 1, borderColor: `${Colors.primary}30` },
  connSyncTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.primary },
  statusMsg: { fontFamily: Typography.family.regular, fontSize: Typography.size.xs },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  infoBlock: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.md },
  infoText: { fontFamily: Typography.family.regular, fontSize: Typography.size.sm, color: Colors.textMuted, lineHeight: 20 },
  deleteAccountBtn: { backgroundColor: Colors.error, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center' },
  deleteAccountTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
  sportifyLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: Radii.lg, paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg },
  sportifyLinkTxt: { fontFamily: Typography.family.bold, fontSize: Typography.size.sm, color: Colors.white },
});
