import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Sheet, Text } from '@/components/ui';
import {
  cleanSportName,
  listedSportKey,
  sportLabel,
  validSportName,
} from '@/constants/sports';
import { useT } from '@/i18n';
import { requestSport } from '@/lib/api.profile';
import { errorMessage } from '@/lib/errors';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Ask for a sport that is not in the catalogue.
 *
 * A name that already matches a listed sport is not sent. The athlete is
 * offered that sport instead.
 */
export function RequestSportSheet({
  visible,
  initialName,
  onClose,
  onSent,
  onSelectListed,
}: {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onSent: () => void;
  onSelectListed: (key: string) => void;
}) {
  const t = useT();
  const { spacing } = useTheme();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listed, setListed] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName(initialName);
    setError(null);
    setListed(null);
    setBusy(false);
  }, [visible, initialName]);

  const send = async () => {
    const clean = cleanSportName(name);
    if (!validSportName(clean)) {
      setListed(null);
      setError(t('errors.sportNameInvalid'));
      return;
    }
    const match = listedSportKey(t, clean);
    if (match) {
      setError(null);
      setListed(match);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestSport(clean);
      onSent();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const listedLabel = listed ? sportLabel(t, listed) : '';

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('sports.notListed')}
      testID="sport-request-sheet"
    >
      <View style={{ gap: spacing.md }}>
        <Input
          label={t('sports.requestName')}
          value={name}
          onChangeText={(text) => {
            setName(text);
            setListed(null);
            setError(null);
          }}
          maxLength={40}
          autoCapitalize="words"
          autoCorrect={false}
          error={listed ? null : error}
          testID="sport-request-name"
        />
        {listed ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="body">{t('sports.alreadyListed', { sport: listedLabel })}</Text>
            <Button
              label={t('sports.chooseThisSport', { sport: listedLabel })}
              onPress={() => onSelectListed(listed)}
              testID="sport-request-choose-listed"
            />
          </View>
        ) : (
          <>
            <Text variant="caption" tone="secondary">
              {t('sports.requestNote', { other: t('sports.other') })}
            </Text>
            <Button
              label={t('sports.sendForReview')}
              onPress={() => void send()}
              loading={busy}
              testID="sport-request-send"
            />
          </>
        )}
      </View>
    </Sheet>
  );
}
