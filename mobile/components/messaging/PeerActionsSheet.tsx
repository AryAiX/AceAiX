import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { AlertTriangle, Ban, Bell, BellOff, Flag, UserRound } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  Divider,
  Input,
  ListItem,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { blockUser, reportContent } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';

/**
 * Mute / block / report for one person, shared by the inbox row menu and the
 * thread's "…". One component means the safety actions cannot drift apart
 * between the two places a user reaches for them.
 */

/* `value` is what the moderation table stores and is never translated; only
   `labelKey` is read by a person. */
const REPORT_REASONS: { value: string; labelKey: string }[] = [
  { value: 'harassment', labelKey: 'messaging.reasonHarassment' },
  { value: 'child_safety', labelKey: 'messaging.reasonChildSafety' },
  { value: 'scam', labelKey: 'messaging.reasonScam' },
  { value: 'spam', labelKey: 'messaging.reasonSpam' },
  { value: 'nudity', labelKey: 'messaging.reasonNudity' },
  { value: 'hate', labelKey: 'messaging.reasonHate' },
  { value: 'impersonation', labelKey: 'messaging.reasonImpersonation' },
  { value: 'other', labelKey: 'messaging.reasonOther' },
];

type Step = 'menu' | 'report' | 'block' | null;

interface Props {
  visible: boolean;
  userId: string | null;
  name: string | null;
  /** Omit `onToggleMute` to hide the mute row (the thread has no mute). */
  muted?: boolean;
  onToggleMute?: () => void;
  /** Omit to hide the "View profile" row. */
  onViewProfile?: () => void;
  onClose: () => void;
  onBlocked?: (userId: string) => void;
}

export function PeerActionsSheet({
  visible,
  userId,
  name,
  muted = false,
  onToggleMute,
  onViewProfile,
  onClose,
  onBlocked,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();

  const [step, setStep] = useState<Step>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setStep('menu');
      setDetails('');
    } else {
      setStep(null);
    }
  }, [visible]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /* iOS refuses to present a modal while another is still dismissing, so we
     close the current sheet, wait for the animation, then open the next. */
  const goTo = useCallback((next: Step) => {
    setStep(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStep(next), 240);
  }, []);

  const close = useCallback(() => {
    setStep(null);
    onClose();
  }, [onClose]);

  const who = displayName(name, t('messaging.thisPerson'));

  const handleReport = async (reason: string) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      await reportContent('user', userId, reason, details.trim() || undefined);
      close();
      toast.success(t('messaging.reportThanks'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      await blockUser(userId);
      const blockedId = userId;
      close();
      toast.success(t('messaging.blockedToast', { name: who }));
      onBlocked?.(blockedId);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet visible={step === 'menu'} onClose={close} title={who} scrollable={false}>
        <View style={{ paddingBottom: spacing.sm }}>
          {onViewProfile ? (
            <>
              <ListItem
                title={t('common.viewProfile')}
                left={<UserRound size={20} color={colors.textSecondary} />}
                onPress={() => {
                  close();
                  onViewProfile();
                }}
                showChevron={false}
              />
              <Divider />
            </>
          ) : null}

          {onToggleMute ? (
            <>
              <ListItem
                title={
                  muted
                    ? t('messaging.unmuteConversation')
                    : t('messaging.muteConversation')
                }
                subtitle={t('messaging.muteHint')}
                left={
                  muted ? (
                    <Bell size={20} color={colors.textSecondary} />
                  ) : (
                    <BellOff size={20} color={colors.textSecondary} />
                  )
                }
                onPress={() => {
                  onToggleMute();
                  close();
                }}
                showChevron={false}
              />
              <Divider />
            </>
          ) : null}

          <ListItem
            title={t('common.report')}
            subtitle={t('messaging.reportHint')}
            left={<Flag size={20} color={colors.textSecondary} />}
            onPress={() => goTo('report')}
            showChevron={false}
          />
          <Divider />
          <ListItem
            title={t('messaging.blockPerson', { name: who })}
            subtitle={t('messaging.blockHint')}
            left={<Ban size={20} color={colors.danger} />}
            destructive
            onPress={() => goTo('block')}
            showChevron={false}
          />
        </View>
      </Sheet>

      <Sheet
        visible={step === 'report'}
        onClose={close}
        title={t('messaging.reportPerson', { name: who })}
        subtitle={t('messaging.reportReasonPrompt')}
        height={0.88}
        footer={
          <Button label={t('common.cancel')} variant="ghost" fullWidth onPress={close} />
        }
      >
        <View>
          {REPORT_REASONS.map((reason, index) => (
            <View key={reason.value}>
              {index > 0 ? <Divider /> : null}
              <ListItem
                title={t(reason.labelKey)}
                left={
                  reason.value === 'child_safety' ? (
                    <AlertTriangle size={20} color={colors.danger} />
                  ) : (
                    <Flag size={20} color={colors.textSecondary} />
                  )
                }
                onPress={() => handleReport(reason.value)}
                disabled={busy}
                showChevron={false}
              />
            </View>
          ))}

          <Input
            label={t('messaging.reportDetailsLabel')}
            placeholder={t('common.optional')}
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={2000}
            containerStyle={{ marginTop: spacing.lg }}
          />

          <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
            {t('messaging.reportEmergencyNote')}
          </Text>
        </View>
      </Sheet>

      <ConfirmSheet
        visible={step === 'block'}
        title={t('messaging.blockConfirmTitle', { name: who })}
        message={t('messaging.blockConfirmBody')}
        confirmLabel={t('common.block')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy}
        onConfirm={handleBlock}
        onCancel={close}
      />
    </>
  );
}
