import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Link2Off, UserPlus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Avatar, Button, EmptyState, Header, Reveal, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { claimInvite, clearPendingInvite, getInviter, savePendingInvite, type InvitePerson } from '@/lib/api.invites';
import { isInviteCode, normalizeInviteCode } from '@/lib/invites/code';

/** Seeded as `platform_settings.app_version` store_url in 20261023000007_app_version_setting.sql. */
const APP_STORE_URL = 'https://apps.apple.com/app/id6785269968';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.aryaix.aceaix.athlete';

/** Phone visitors see their own store first. Desktop shows both, App Store then Google Play. */
function webStoreOrder(): ('ios' | 'android')[] {
  const ua = globalThis.navigator?.userAgent ?? '';
  if (/iPhone|iPad/i.test(ua)) return ['ios', 'android'];
  if (/Android/i.test(ua)) return ['android', 'ios'];
  return ['ios', 'android'];
}

function openStore(url: string) {
  if (typeof globalThis.open === 'function') globalThis.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Where an invite link lands: `/i/<code>`.
 *
 * Open before signing in (the router lets this route through without a
 * session). It shows who sent the invite, keeps the code until onboarding
 * finishes, and sends the visitor to sign up; the code is claimed once the
 * new account has finished onboarding (`useClaimPendingInvite`). Someone
 * already signed in can add the invite here, if their account is new enough.
 * Continue drops a stored code instead of keeping it.
 *
 * On the web, a visitor with a valid code also sees the code, a copy button,
 * and the store links. The native screen is unchanged.
 */
function WebInviteDownload({ code }: { code: string }) {
  const { spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const [copying, setCopying] = useState(false);
  const stores = webStoreOrder().map((kind) =>
    kind === 'ios'
      ? { key: 'ios' as const, label: t('invites.landingAppStore'), url: APP_STORE_URL }
      : { key: 'android' as const, label: t('invites.landingGooglePlay'), url: PLAY_STORE_URL },
  );

  const copy = async () => {
    setCopying(true);
    try {
      const clipboard = globalThis.navigator?.clipboard;
      if (!clipboard?.writeText) throw new Error('clipboard');
      await clipboard.writeText(code);
      toast.success(t('invites.landingCopied'));
    } catch {
      toast.error(t('invites.landingCopyFailed'));
    } finally {
      setCopying(false);
    }
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {/* LTR isolate plus writingDirection: an Arabic page must not reorder the code. */}
      <Text
        variant="display"
        align="center"
        selectable
        style={{ writingDirection: 'ltr', letterSpacing: 4 }}
      >
        {`\u2066${code}\u2069`}
      </Text>
      <Button
        label={t('invites.landingCopy')}
        variant="secondary"
        fullWidth
        loading={copying}
        onPress={() => void copy()}
        testID="invite-landing-copy"
      />
      <Text align="center">{t('invites.landingDownload')}</Text>
      <View style={{ gap: spacing.sm }}>
        {stores.map((store) => (
          <Button
            key={store.key}
            label={store.label}
            size="lg"
            fullWidth
            onPress={() => openStore(store.url)}
            testID={`invite-landing-store-${store.key}`}
          />
        ))}
      </View>
    </View>
  );
}

export default function InviteLanding() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { session, profile, loading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = normalizeInviteCode(params.code);
  const valid = isInviteCode(code);
  const [adding, setAdding] = useState(false);
  const hasSession = !!session;

  const inviter = useAsync<InvitePerson | null>(() => (valid ? getInviter(code) : Promise.resolve(null)), [code]);

  useEffect(() => {
    if (!valid || authLoading) return;
    // No account, or onboarding still unfinished. A finished account must not
    // get a new stored code; a code stored earlier stays for the claim check.
    if (hasSession && profile?.onboarding_completed !== false) return;
    savePendingInvite(code).catch(() => {});
  }, [code, valid, authLoading, hasSession, profile?.onboarding_completed]);

  const continueHome = async () => {
    await clearPendingInvite();
    router.replace(Routes.home);
  };

  const header = <Header back={false} title="AceAiX" />;

  if (inviter.loading && !inviter.data) {
    return (
      <Screen header={header}>
        <SkeletonList count={2} />
      </Screen>
    );
  }

  const person = inviter.data;
  if (!valid || !person) {
    return (
      <Screen header={header} testID="invite-landing-invalid">
        <EmptyState
          icon={<Link2Off size={26} color={colors.textMuted} />}
          title={t('invites.landingInvalidTitle')}
          body={t('invites.landingInvalidBody')}
          actionLabel={session ? t('invites.landingContinue') : t('invites.landingSignUp')}
          onAction={() => {
            if (session) void continueHome();
            else router.replace(Routes.auth.signUp);
          }}
        />
      </Screen>
    );
  }

  const name = person.first_name ?? '';
  const signedIn = !!session && !!profile;
  const webVisitor = Platform.OS === 'web' && !signedIn;

  const addInvite = async () => {
    setAdding(true);
    try {
      const out = await claimInvite(code);
      toast.success(t('invites.claimed', { name: out.inviter?.first_name ?? name }));
      router.replace(Routes.invite);
    } catch (err) {
      toast.error(errorMessage(err));
      setAdding(false);
    }
  };

  return (
    <Screen header={header} scroll contentStyle={{ gap: spacing.xl }} testID="invite-landing">
      <Reveal>
        <AnimatedGradient colors={theme.gradients.warm} radius={theme.radii.xl} style={{ padding: spacing.xl, gap: spacing.lg, alignItems: 'center' }}>
          <View style={{ borderRadius: 48, borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)' }}>
            <Avatar uri={person.avatar_url} name={name} size="xl" />
          </View>
          <Text variant="title" color="#FFFFFF" style={{ textAlign: 'center' }}>
            {name ? t('invites.landingTitle', { name }) : t('invites.landingTitleNoName')}
          </Text>
          {webVisitor ? null : (
            <Text color="rgba(255,255,255,0.92)" style={{ textAlign: 'center' }}>
              {signedIn ? t('invites.landingSignedInBody') : t('invites.landingBody')}
            </Text>
          )}
        </AnimatedGradient>
      </Reveal>

      {webVisitor ? (
        <View style={{ gap: spacing.sm }}>
          <WebInviteDownload code={code} />
          <Button label={t('invites.landingSignUp')} size="lg" fullWidth onPress={() => router.replace(Routes.auth.signUp)} testID="invite-landing-signup" />
          <Button label={t('invites.landingSignIn')} variant="ghost" fullWidth onPress={() => router.replace(Routes.auth.signIn)} />
        </View>
      ) : signedIn ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subheading" style={{ textAlign: 'center' }}>{t('invites.landingSignedIn')}</Text>
          {profile?.onboarding_completed ? (
            <Button label={t('invites.landingAddInvite')} size="lg" fullWidth loading={adding} icon={<UserPlus size={18} color="#FFFFFF" />}
              onPress={addInvite} testID="invite-landing-add" />
          ) : null}
          <Button label={t('invites.landingContinue')} variant="ghost" fullWidth onPress={() => void continueHome()} />
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <Button label={t('invites.landingSignUp')} size="lg" fullWidth onPress={() => router.replace(Routes.auth.signUp)} testID="invite-landing-signup" />
          <Button label={t('invites.landingSignIn')} variant="ghost" fullWidth onPress={() => router.replace(Routes.auth.signIn)} />
        </View>
      )}
    </Screen>
  );
}
