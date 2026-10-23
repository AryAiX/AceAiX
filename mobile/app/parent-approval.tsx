import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { CheckboxRow } from '@/components/onboarding/Shared';
import { Button, Card, Loader, Screen, Text } from '@/components/ui';
import { useI18n, useT } from '@/i18n';
import {
  fetchConsentPage,
  submitConsentDecision,
  type ConsentOptions,
  type ConsentScreen,
} from '@/lib/parentApproval';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * The page a parent opens from the consent email.
 *
 * It is public: the route gate does not send a signed-out visitor to welcome,
 * or a signed-in one back into onboarding. The request carries the app's
 * public key, not the visitor's session.
 */

type ViewState = ConsentScreen | { screen: 'loading' };

const PRIVACY_URL = 'https://aceaix.com/privacy';
const CHILD_SAFETY_URL = 'https://aceaix.com/child-safety';
const SAFETY_EMAIL = 'safety@aceaix.com';

function tokenFrom(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' ? raw.trim() : '';
}

function useWebConsentMeta(title: string) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const previousTitle = document.title;
    document.title = title;

    const existing = document.querySelector('meta[name="robots"]');
    const meta = existing ?? document.createElement('meta');
    const previousContent = existing?.getAttribute('content') ?? null;
    if (!existing) {
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');

    return () => {
      document.title = previousTitle;
      if (!existing) meta.remove();
      else if (previousContent === null) meta.removeAttribute('content');
      else meta.setAttribute('content', previousContent);
    };
  }, [title]);
}

function openLink(url: string) {
  Linking.openURL(url).catch(() => {
    /* no handler for mailto, or the browser refused the link */
  });
}

function LinkText({ children, url }: { children: string; url: string }) {
  return (
    <Text
      variant="caption"
      tone="primary"
      accessibilityRole="link"
      onPress={() => openLink(url)}
      style={{ textDecorationLine: 'underline' }}
    >
      {children}
    </Text>
  );
}

function Footer() {
  const t = useT();
  const theme = useTheme();
  const [before, after = ''] = t('parentApproval.footer').split('{{email}}');

  return (
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.lg }}>
      <Text variant="caption" tone="secondary">
        {before}
        <LinkText url={`mailto:${SAFETY_EMAIL}`}>{SAFETY_EMAIL}</LinkText>
        {after}
      </Text>
      <Text variant="caption" tone="secondary">
        <LinkText url={PRIVACY_URL}>{t('parentApproval.privacy')}</LinkText>
        {' · '}
        <LinkText url={CHILD_SAFETY_URL}>{t('parentApproval.childSafety')}</LinkText>
      </Text>
    </View>
  );
}

function Status({ title, body }: { title: string; body: string }) {
  const theme = useTheme();
  return (
    <Card padded="lg">
      <Text variant="heading">{title}</Text>
      <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
        {body}
      </Text>
    </Card>
  );
}

function Option({
  checked,
  title,
  body,
  onToggle,
  disabled,
}: {
  checked: boolean;
  title: string;
  body: string;
  onToggle: () => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
      <CheckboxRow checked={checked} onToggle={disabled ? () => {} : onToggle} label={`${title}. ${body}`}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" tone="secondary">
          {body}
        </Text>
      </CheckboxRow>
    </View>
  );
}

/**
 * The device language is already selected and unsaved. On web, point the
 * document the same way so Arabic lays out right to left without writing
 * that guess into the visitor's stored choice.
 */
function useUnsavedWritingDirection() {
  const { direction, hasChosen } = useI18n();
  useEffect(() => {
    if (Platform.OS !== 'web' || hasChosen || typeof document === 'undefined') return;
    const root = document.documentElement;
    const previous = root.getAttribute('dir');
    root.dir = direction === 'rtl' ? 'rtl' : 'ltr';
    return () => {
      if (previous === null) root.removeAttribute('dir');
      else root.setAttribute('dir', previous);
    };
  }, [direction, hasChosen]);
}

export default function ParentApprovalScreen() {
  const t = useT();
  const theme = useTheme();
  useUnsavedWritingDirection();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = tokenFrom(params.token);
  const [view, setView] = useState<ViewState>({ screen: 'loading' });
  const [choices, setChoices] = useState<ConsentOptions | null>(null);
  const [submitting, setSubmitting] = useState<'approve' | 'decline' | null>(null);

  useWebConsentMeta(t('parentApproval.title'));

  const load = useCallback(async () => {
    if (!token) {
      setView({ screen: 'invalid' });
      return;
    }
    setView({ screen: 'loading' });
    const next = await fetchConsentPage(token);
    setView(next);
    if (next.screen === 'pending') setChoices(next.options);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (decision: 'approve' | 'decline') => {
    if (view.screen !== 'pending' || submitting) return;
    const picked = choices ?? view.options;
    setSubmitting(decision);
    const next = await submitConsentDecision(token, decision, picked);
    setSubmitting(null);
    setView(next);
  };

  const toggle = (key: keyof ConsentOptions) => {
    setChoices((current) => (current ? { ...current, [key]: !current[key] } : current));
  };

  let body: React.ReactNode;
  if (view.screen === 'loading') {
    body = <Loader label={t('parentApproval.loading')} />;
  } else if (view.screen === 'error') {
    body = (
      <Card padded="lg">
        <Text variant="heading">{t('parentApproval.errorTitle')}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          {t('parentApproval.errorBody')}
        </Text>
        <Button
          label={t('parentApproval.retry')}
          onPress={() => void load()}
          style={{ marginTop: theme.spacing.lg }}
        />
      </Card>
    );
  } else if (view.screen === 'invalid') {
    body = <Status title={t('parentApproval.invalidTitle')} body={t('parentApproval.invalidBody')} />;
  } else if (view.screen === 'expired') {
    body = <Status title={t('parentApproval.expiredTitle')} body={t('parentApproval.expiredBody')} />;
  } else if (view.screen === 'answered') {
    body = <Status title={t('parentApproval.answeredTitle')} body={t('parentApproval.answeredBody')} />;
  } else if (view.screen === 'approved') {
    body = <Status title={t('parentApproval.approvedTitle')} body={t('parentApproval.approvedBody')} />;
  } else if (view.screen === 'declined') {
    body = <Status title={t('parentApproval.declinedTitle')} body={t('parentApproval.declinedBody')} />;
  } else {
    const selected = choices ?? view.options;
    const name = view.childName ?? t('parentApproval.yourChild');
    const busy = submitting !== null;
    body = (
      <Card padded="lg">
        <Text variant="heading">{t('parentApproval.heading', { name })}</Text>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.md }}>
          {t('parentApproval.introCreated')}
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: theme.spacing.sm }}>
          {t('parentApproval.introHidden')}
        </Text>

        <Text variant="subheading" style={{ marginTop: theme.spacing.xl }}>
          {t('parentApproval.approving')}
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          <Option
            checked={selected.allow_discovery}
            title={t('parentApproval.discoveryTitle')}
            body={t('parentApproval.discoveryBody')}
            disabled={busy}
            onToggle={() => toggle('allow_discovery')}
          />
          <Option
            checked={selected.allow_messaging}
            title={t('parentApproval.messagingTitle')}
            body={t('parentApproval.messagingBody')}
            disabled={busy}
            onToggle={() => toggle('allow_messaging')}
          />
          <Option
            checked={selected.allow_media}
            title={t('parentApproval.mediaTitle')}
            body={t('parentApproval.mediaBody')}
            disabled={busy}
            onToggle={() => toggle('allow_media')}
          />
          <Option
            checked={selected.allow_assessments}
            title={t('parentApproval.assessmentsTitle')}
            body={t('parentApproval.assessmentsBody')}
            disabled={busy}
            onToggle={() => toggle('allow_assessments')}
          />
          <Option
            checked={selected.allow_sponsorship}
            title={t('parentApproval.sponsorshipTitle')}
            body={t('parentApproval.sponsorshipBody')}
            disabled={busy}
            onToggle={() => toggle('allow_sponsorship')}
          />
          <Option
            checked={selected.allow_bookings}
            title={t('parentApproval.bookingsTitle')}
            body={t('parentApproval.bookingsBody')}
            disabled={busy}
            onToggle={() => toggle('allow_bookings')}
          />
        </View>

        <Button
          label={t('parentApproval.approve')}
          fullWidth
          loading={submitting === 'approve'}
          disabled={busy}
          onPress={() => void submit('approve')}
          style={{ marginTop: theme.spacing.lg }}
        />
        <Button
          label={t('parentApproval.decline')}
          variant="ghost"
          fullWidth
          loading={submitting === 'decline'}
          disabled={busy}
          onPress={() => void submit('decline')}
          style={{ marginTop: theme.spacing.sm }}
        />
        <Footer />
      </Card>
    );
  }

  return (
    <Screen testID="parent-approval">
      <View style={{ paddingTop: theme.spacing.xl }}>{body}</View>
    </Screen>
  );
}
