import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  ConfirmSheet,
  Dropdown,
  ErrorState,
  Header,
  Input,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { SPORTS, otherSportLevelLabel, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import {
  CHILD_LEVELS,
  childBirthYears,
  deleteChildProfile,
  getMyChildProfiles,
  saveChildProfile,
  type ChildLevel,
} from '@/lib/api.childProfiles';
import { errorMessage } from '@/lib/errors';
import { sanitizeNameInput } from '@/lib/nameInput';
import { Routes } from '@/lib/routes';

/** A first name only. sanitizeNameInput already drops digits and symbols as it
    is typed; the server checks again. */
function validChildName(name: string): boolean {
  const clean = sanitizeNameInput(name).trim();
  return clean.length >= 1 && clean.length <= 40;
}

/**
 * A child profile for a child under 13 (QA-174): add one, or `?id=` to change
 * or delete one. Not an account; only the parent sees it.
 */
export default function ChildProfileScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' && params.id ? params.id : null;

  const mine = useAsync(getMyChildProfiles, []);
  const [firstName, setFirstName] = useState('');
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [sport, setSport] = useState('');
  const [level, setLevel] = useState<ChildLevel>('casual');
  const [errors, setErrors] = useState<{ name?: string; year?: string; sport?: string }>({});
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const existing = useMemo(
    () => (editingId ? mine.data?.profiles.find((p) => p.id === editingId) ?? null : null),
    [editingId, mine.data],
  );

  useEffect(() => {
    if (filled || !existing) return;
    setFirstName(existing.first_name);
    setBirthYear(existing.birth_year);
    setSport(existing.sport);
    setLevel(existing.level);
    setFilled(true);
  }, [existing, filled]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.childrenTab);
  };

  const sportOptions = useMemo(
    () => SPORTS.map((s) => ({ key: s.key, label: sportLabel(t, s.key), emoji: s.emoji })),
    [t],
  );
  const yearOptions = useMemo(
    () =>
      mine.data
        ? childBirthYears(mine.data.this_year).map((year) => ({
            key: String(year),
            label: t('safety.under13.yearOption', { year }),
          }))
        : [],
    [mine.data, t],
  );

  const submit = async () => {
    const next = {
      name: validChildName(firstName) ? undefined : t('safety.under13.firstNameRequired'),
      year: birthYear === null ? t('safety.under13.birthYearRequired') : undefined,
      sport: sport ? undefined : t('safety.under13.sportRequired'),
    };
    setErrors(next);
    if (next.name || next.year || next.sport || birthYear === null) return;

    setSaving(true);
    try {
      await saveChildProfile(editingId, {
        first_name: firstName.trim(),
        birth_year: birthYear,
        sport,
        level,
      });
      toast.success(t('safety.under13.saved'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editingId) return;
    setDeleting(true);
    try {
      await deleteChildProfile(editingId);
      toast.success(t('safety.under13.deleted'));
      setConfirming(false);
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const header = (
    <Header
      title={t(editingId ? 'safety.under13.editTitle' : 'safety.under13.newTitle')}
      back
      onBack={close}
    />
  );

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="child-profile-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }
  if (!mine.data) {
    return (
      <Screen header={header} testID="child-profile-screen">
        <ErrorState message={mine.error ?? t('common.somethingWentWrong')} onRetry={mine.reload} />
      </Screen>
    );
  }
  if (!mine.data.enabled || (editingId && !existing) || (!editingId && !mine.data.can_add)) {
    const message = !mine.data.enabled
      ? t('safety.under13.notAvailable')
      : editingId
        ? t('safety.under13.notFound')
        : t('safety.under13.limitNote', { max: mine.data.max });
    return (
      <Screen header={header} testID="child-profile-screen">
        <InfoNote tone="warning" icon="warning">
          {message}
        </InfoNote>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      keyboardAvoiding
      footer={
        <Button
          label={t('safety.under13.save')}
          fullWidth
          loading={saving}
          onPress={() => void submit()}
          testID="child-profile-save"
        />
      }
      testID="child-profile-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <InfoNote>{t('safety.under13.privacyNote')}</InfoNote>

        <Input
          label={t('safety.under13.firstNameLabel')}
          required
          value={firstName}
          onChangeText={(value) => {
            setFirstName(sanitizeNameInput(value));
            setErrors((e) => ({ ...e, name: undefined }));
          }}
          hint={t('safety.under13.firstNameHint')}
          error={errors.name}
          maxLength={40}
          autoCapitalize="words"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          testID="child-profile-first-name"
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('safety.under13.birthYearLabel')}
          </Text>
          <Dropdown
            required
            placeholder={t('common.choose')}
            options={yearOptions}
            value={birthYear !== null ? [String(birthYear)] : []}
            onChange={(next) => {
              if (next[0]) {
                setBirthYear(Number(next[0]));
                setErrors((e) => ({ ...e, year: undefined }));
              }
            }}
            testID="child-profile-birth-year"
          />
          {errors.year ? (
            <Text variant="caption" tone="danger">
              {errors.year}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('safety.under13.sportLabel')}
          </Text>
          <Dropdown
            required
            searchable
            searchKeys
            emptyLabel={t('sports.noSportMatches')}
            placeholder={t('profile.sportPlaceholder')}
            options={sportOptions}
            value={sport ? [sport] : []}
            onChange={(next) => {
              if (next[0]) {
                setSport(next[0]);
                setErrors((e) => ({ ...e, sport: undefined }));
              }
            }}
            testID="child-profile-sport"
          />
          {errors.sport ? (
            <Text variant="caption" tone="danger">
              {errors.sport}
            </Text>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('safety.under13.levelLabel')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {CHILD_LEVELS.map((value) => (
              <Chip
                key={value}
                label={otherSportLevelLabel(t, value)}
                selected={level === value}
                onPress={() => setLevel(value)}
                testID={`child-profile-level-${value}`}
              />
            ))}
          </View>
        </View>

        {editingId ? (
          <Button
            label={t('safety.under13.delete')}
            variant="danger"
            onPress={() => setConfirming(true)}
            testID="child-profile-delete"
          />
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirming}
        title={t('safety.under13.deleteTitle', { name: existing?.first_name ?? '' })}
        message={t('safety.under13.deleteBody')}
        confirmLabel={t('safety.under13.delete')}
        destructive
        loading={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}
