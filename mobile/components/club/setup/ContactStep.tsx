import React from 'react';
import { View } from 'react-native';
import { AtSign, Globe, Mail, Phone } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Chip, Input } from '@/components/ui';
import { useT } from '@/i18n';
import { FACILITY_PRESETS } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import {
  LIMITS,
  SETUP_SOCIALS,
  type ClubDraft,
  type ContactError,
} from '@/lib/clubSetup';
import { AddOwnInput, GroupLabel, counter } from './Bits';

/** Step 4: how to reach the club, its socials, what it has, and a short bio. */
export function ContactFields({
  draft,
  errors,
  onChange,
}: {
  draft: ClubDraft;
  errors: Partial<Record<ContactError, true>>;
  onChange: (patch: Partial<ClubDraft>) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const icon = colors.textMuted;

  const presetKeys = new Set(FACILITY_PRESETS.map((f) => f.toLowerCase()));
  const custom = draft.facilities.filter((f) => !presetKeys.has(f.toLowerCase()));
  const hasFacility = (f: string) => draft.facilities.some((x) => x.toLowerCase() === f.toLowerCase());
  const toggleFacility = (f: string) =>
    onChange({
      facilities: hasFacility(f)
        ? draft.facilities.filter((x) => x.toLowerCase() !== f.toLowerCase())
        : [...draft.facilities, f],
    });

  return (
    <View style={{ gap: spacing.xl }}>
      <Input
        label={t('clubSetup.contact.emailLabel')}
        value={draft.contact_email}
        onChangeText={(contact_email) => onChange({ contact_email })}
        placeholder={t('clubSetup.contact.emailPlaceholder')}
        error={errors.email ? t('clubSetup.contact.emailInvalid') : null}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        icon={<Mail size={18} color={icon} />}
        testID="club-setup-email"
      />
      <Input
        label={t('clubSetup.contact.phoneLabel')}
        value={draft.contact_phone}
        onChangeText={(contact_phone) => onChange({ contact_phone })}
        placeholder={t('clubSetup.contact.phonePlaceholder')}
        error={errors.phone ? t('clubSetup.contact.phoneInvalid') : null}
        keyboardType="phone-pad"
        maxLength={30}
        icon={<Phone size={18} color={icon} />}
        testID="club-setup-phone"
      />
      <Input
        label={t('clubSetup.contact.websiteLabel')}
        value={draft.website}
        onChangeText={(website) => onChange({ website })}
        placeholder={t('clubSetup.contact.websitePlaceholder')}
        error={errors.website ? t('clubSetup.contact.websiteInvalid') : null}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
        icon={<Globe size={18} color={icon} />}
        testID="club-setup-website"
      />

      <View style={{ gap: spacing.md }}>
        <GroupLabel hint={t('clubSetup.contact.socialsHint')}>{t('clubSetup.contact.socialsTitle')}</GroupLabel>
        {SETUP_SOCIALS.map((key) => (
          <Input
            key={key}
            label={clubLabel(t, 'social', key)}
            value={draft.socials[key] ?? ''}
            onChangeText={(value) => onChange({ socials: { ...draft.socials, [key]: value } })}
            placeholder={t('clubSetup.contact.socialPlaceholder')}
            maxLength={LIMITS.social}
            autoCapitalize="none"
            autoCorrect={false}
            icon={<AtSign size={16} color={icon} />}
            testID={`club-setup-social-${key}`}
          />
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        <GroupLabel>{t('clubSetup.contact.facilitiesTitle')}</GroupLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[...FACILITY_PRESETS, ...custom].map((facility) => (
            <Chip
              key={facility}
              label={clubLabel(t, 'facility', facility)}
              selected={hasFacility(facility)}
              onPress={() => toggleFacility(facility)}
              style={{ minHeight: theme.hit.min }}
            />
          ))}
        </View>
        {draft.facilities.length < LIMITS.facilities ? (
          <AddOwnInput
            placeholder={t('clubSetup.contact.facilityPlaceholder')}
            maxLength={LIMITS.facility}
            accessibilityLabel={t('clubSetup.contact.facilityAdd')}
            onAdd={(value) => {
              if (!hasFacility(value)) toggleFacility(value);
            }}
          />
        ) : null}
      </View>

      <Input
        label={t('clubSetup.contact.bioLabel')}
        value={draft.description}
        onChangeText={(description) => onChange({ description })}
        placeholder={t('clubSetup.contact.bioPlaceholder')}
        hint={counter(t, draft.description, LIMITS.description)}
        maxLength={LIMITS.description}
        multiline
        testID="club-setup-bio"
      />
    </View>
  );
}
