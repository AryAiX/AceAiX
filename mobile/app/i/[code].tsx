import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Link2Off, UserPlus } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { AnimatedGradient, Avatar, Button, EmptyState, Header, Reveal, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { useT } from '@/i18n';
import { Routes } from '@/lib/routes';
import { errorMessage } from '@/lib/errors';
import { claimInvite, getInviter, savePendingInvite, type InvitePerson } from '@/lib/api.invites';
import { isInviteCode, normalizeInviteCode } from '@/lib/invites/code';

/**
 * Where an invite link lands: `/i/<code>`.
 *
 * Open before signing in (the router lets this route through without a
 * session). It shows who sent the invite, keeps the code, and sends the
 * visitor to sign up; the code is claimed once the new account has finished
 * onboarding (`useClaimPendingInvite`). Someone already signed in can add the
 * invite here, if their account is new enough.
 */
export default function InviteLanding() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const router = useRouter();
  const t = useT();
  const toast = useToast();
  const { session, profile } = useAuth();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = normalizeInviteCode(params.code);
  const valid = isInviteCode(code);
  const [adding, setAdding] = useState(false);

  const inviter = useAsync<InvitePerson | null>(() => (valid ? getInviter(code) : Promise.resolve(null)), [code]);

  useEffect(() => {
    if (valid) savePendingInvite(code).catch(() => {});
  }, [code, valid]);

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
          onAction={() => router.replace(session ? Routes.home : Routes.auth.signUp)}
        />
      </Screen>
    );
  }

  const name = person.first_name ?? '';
  const signedIn = !!session && !!profile;

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
          <Text color="rgba(255,255,255,0.92)" style={{ textAlign: 'center' }}>
            {signedIn ? t('invites.landingSignedInBody') : t('invites.landingBody')}
          </Text>
        </AnimatedGradient>
      </Reveal>

      {signedIn ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="subheading" style={{ textAlign: 'center' }}>{t('invites.landingSignedIn')}</Text>
          {profile?.onboarding_completed ? (
            <Button label={t('invites.landingAddInvite')} size="lg" fullWidth loading={adding} icon={<UserPlus size={18} color="#FFFFFF" />}
              onPress={addInvite} testID="invite-landing-add" />
          ) : null}
          <Button label={t('invites.landingContinue')} variant="ghost" fullWidth onPress={() => router.replace(Routes.home)} />
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
