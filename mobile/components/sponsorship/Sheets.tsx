import React, { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, Sheet, Text, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { applyToSponsorCall, makeSponsorOffer } from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { parseAmount } from '@/lib/sponsorship';

const MESSAGE_MAX = 600;

/** A sponsor's offer on one open request. */
export function OfferSheet({
  target,
  onClose,
  onSent,
}: {
  target: { requestId: string; name: string; currency: string; amount: number | null } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!target) return;
    const parsed = parseAmount(amount);
    if (parsed === undefined) {
      setError(t('sponsorship.amountInvalid'));
      return;
    }
    setSending(true);
    try {
      await makeSponsorOffer(target.requestId, message, parsed);
      toast.success(t('sponsorship.offerSent'));
      setMessage('');
      setAmount('');
      onSent();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={!!target}
      onClose={onClose}
      title={target ? t('sponsorship.offerTitle', { name: target.name }) : undefined}
      subtitle={t('sponsorship.noMoneyNote')}
      testID="offer-sheet"
    >
      <View style={{ gap: spacing.lg }}>
        <Input
          label={t('sponsorship.offerAmountLabel', { currency: target?.currency ?? 'AED' })}
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            setError(null);
          }}
          keyboardType="number-pad"
          placeholder={target?.amount ? String(target.amount) : undefined}
          error={error}
          testID="offer-amount"
        />
        <Input
          label={t('sponsorship.messageLabel')}
          value={message}
          onChangeText={setMessage}
          placeholder={t('sponsorship.offerMessagePlaceholder')}
          multiline
          maxLength={MESSAGE_MAX}
          testID="offer-message"
        />
        <Button
          label={t('sponsorship.sendOffer')}
          fullWidth
          loading={sending}
          onPress={send}
          testID="offer-send"
        />
      </View>
    </Sheet>
  );
}

/** An athlete's application to one call. */
export function ApplySheet({
  target,
  onClose,
  onSent,
}: {
  target: { callId: string; name: string } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!target) return;
    setSending(true);
    try {
      await applyToSponsorCall(target.callId, message);
      toast.success(t('sponsorship.applicationSent'));
      setMessage('');
      onSent();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={!!target}
      onClose={onClose}
      title={target ? t('sponsorship.applyTitle', { name: target.name }) : undefined}
      subtitle={t('sponsorship.applyHint')}
      testID="apply-sheet"
    >
      <View style={{ gap: spacing.lg }}>
        <Input
          label={t('sponsorship.messageLabel')}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={MESSAGE_MAX}
          testID="apply-message"
        />
        <Text variant="caption" tone="muted">
          {t('sponsorship.noMoneyNote')}
        </Text>
        <Button
          label={t('sponsorship.sendApplication')}
          fullWidth
          loading={sending}
          onPress={send}
          testID="apply-send"
        />
      </View>
    </Sheet>
  );
}
