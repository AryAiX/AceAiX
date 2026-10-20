import React, { useRef } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Input } from '@/components/ui';
import { useT } from '@/i18n';
import { OptionCard } from '@/components/onboarding/Shared';
import { LIMITS, type BasicsError, type ClubDraft } from '@/lib/clubSetup';
import { GroupLabel } from './Bits';

/** Step 1: club or academy, the name, the year, who runs it. */
export function BasicsFields({
  draft,
  errors,
  onChange,
}: {
  draft: ClubDraft;
  errors: Partial<Record<BasicsError, true>>;
  onChange: (patch: Partial<ClubDraft>) => void;
}) {
  const { spacing } = useTheme();
  const t = useT();
  const localRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const ceoRef = useRef<TextInput>(null);

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.md }}>
        <GroupLabel>{t('clubSetup.basics.typeLabel')}</GroupLabel>
        <OptionCard
          emoji="🏟️"
          title={t('clubSetup.basics.typeClub')}
          subtitle={t('clubSetup.basics.typeClubHint')}
          selected={draft.type === 'club'}
          onPress={() => onChange({ type: 'club' })}
          testID="club-setup-type-club"
        />
        <OptionCard
          emoji="🎓"
          title={t('clubSetup.basics.typeAcademy')}
          subtitle={t('clubSetup.basics.typeAcademyHint')}
          selected={draft.type === 'academy'}
          onPress={() => onChange({ type: 'academy' })}
          testID="club-setup-type-academy"
        />
      </View>

      <Input
        label={t('clubSetup.basics.nameLabel')}
        required
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        placeholder={t('clubSetup.basics.namePlaceholder')}
        error={errors.name ? t('clubSetup.basics.nameRequired') : null}
        maxLength={LIMITS.name}
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => localRef.current?.focus()}
        testID="club-setup-name"
      />
      <Input
        ref={localRef}
        label={t('clubSetup.basics.localNameLabel')}
        value={draft.name_local}
        onChangeText={(name_local) => onChange({ name_local })}
        placeholder={t('clubSetup.basics.localNamePlaceholder')}
        hint={t('clubSetup.basics.localNameHint')}
        maxLength={LIMITS.nameLocal}
        returnKeyType="next"
        onSubmitEditing={() => yearRef.current?.focus()}
        testID="club-setup-name-local"
      />
      <Input
        ref={yearRef}
        label={t('clubSetup.basics.yearLabel')}
        required
        value={draft.founded_year}
        onChangeText={(v) => onChange({ founded_year: v.replace(/[^0-9]/g, '').slice(0, 4) })}
        placeholder={t('clubSetup.basics.yearPlaceholder')}
        error={errors.year ? t('clubSetup.basics.yearInvalid', { year: new Date().getFullYear() }) : null}
        keyboardType="number-pad"
        maxLength={4}
        returnKeyType="next"
        onSubmitEditing={() => ceoRef.current?.focus()}
        testID="club-setup-year"
      />
      <Input
        ref={ceoRef}
        label={t('clubSetup.basics.ceoLabel')}
        required
        value={draft.ceo_name}
        onChangeText={(ceo_name) => onChange({ ceo_name })}
        placeholder={t('clubSetup.basics.ceoPlaceholder')}
        error={errors.ceo ? t('clubSetup.basics.ceoRequired') : null}
        maxLength={LIMITS.ceo}
        autoCapitalize="words"
        returnKeyType="done"
        testID="club-setup-ceo"
      />
    </View>
  );
}
