import React, { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, useToast } from '@/components/ui';
import { DateOfBirthStep, MINIMUM_AGE } from '@/components/onboarding/SignupSteps';
import { calculateAge, toIsoDate } from '@/components/onboarding/Shared';
import { useT } from '@/i18n';
import { setDateOfBirth } from '@/lib/api';
import { errorMessage } from '@/lib/errors';

/**
 * The sign-up date-of-birth step, for an account that has none saved (older
 * accounts made before sign-up asked). Same picker, same warnings; saving
 * writes the viewer's own private row, exactly as sign-up does. Shown only
 * while no date is saved, so it is never a way to change one.
 */
export function BirthDateForm({ onSaved }: { onSaved: () => void }) {
  const { spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const [value, setValue] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const tooYoung = value != null && calculateAge(value) < MINIMUM_AGE;

  const save = async () => {
    if (!value || tooYoung) return;
    setSaving(true);
    try {
      await setDateOfBirth(toIsoDate(value));
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ gap: spacing.xl }}>
      <DateOfBirthStep value={value} onChange={setValue} role="athlete" onChooseRole={() => undefined} />
      <Button
        label={t('common.save')}
        fullWidth
        disabled={!value || tooYoung}
        loading={saving}
        onPress={save}
        testID="birth-date-save"
      />
    </View>
  );
}
