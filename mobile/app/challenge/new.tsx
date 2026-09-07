import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Header,
  Input,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
  useToast,
} from '@/components/ui';
import { useAction } from '@/hooks/useAsync';
import { useAuth } from '@/providers/AuthProvider';
import { createChallenge } from '@/lib/api';
import { Routes } from '@/lib/routes';
import { SPORTS } from '@/constants/sports';
import { useT } from '@/i18n';

type Kind = 'measured' | 'judged';
type Window = '7' | '14' | '30';

/**
 * Setting a challenge, for a verified coach or club.
 *
 * The form is short on purpose. A coach writing this on a phone between
 * sessions will abandon anything longer, and the only two fields that decide
 * whether the answers are usable are the brief and whether there is a number.
 */
export default function NewChallengeScreen() {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();

  const [sport, setSport] = useState<string>(SPORTS[0]?.key ?? 'Football');
  const sports = useMemo(() => SPORTS.map((s) => ({ value: s.key, label: s.label })), []);
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [rules, setRules] = useState('');
  const [kind, setKind] = useState<Kind>('measured');
  const [metricLabel, setMetricLabel] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [better, setBetter] = useState<'higher' | 'lower'>('higher');
  const [ageMin, setAgeMin] = useState('13');
  const [ageMax, setAgeMax] = useState('19');
  const [window, setWindow] = useState<Window>('7');

  const closesAt = useMemo(() => {
    const days = Number(window);
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }, [window]);

  const valid =
    title.trim().length >= 4 &&
    brief.trim().length >= 10 &&
    (kind === 'judged' || metricLabel.trim().length >= 2);

  const create = useAction(async () => {
    return createChallenge({
      sport,
      title,
      brief,
      closesAt,
      rules: rules || null,
      metricLabel: kind === 'measured' ? metricLabel : null,
      metricUnit: kind === 'measured' ? metricUnit || metricLabel : null,
      metricBetter: better,
      ageMin: ageMin.trim() ? Number(ageMin) : null,
      ageMax: ageMax.trim() ? Number(ageMax) : null,
    });
  });

  return (
    <Screen
      header={<Header title={t('challenges.newTitle')} back bordered />}
      keyboardAvoiding
      testID="challenge-new-screen"
      footer={
        <Button
          label={t('challenges.create')}
          fullWidth
          disabled={!valid}
          loading={create.loading}
          onPress={async () => {
            const id = await create.run();
            if (!id) {
              if (create.error) toast.error(create.error);
              return;
            }
            toast.success(t('challenges.created'));
            router.replace(Routes.challenge(id));
          }}
        />
      }
    >
      <View style={{ gap: spacing.lg, paddingBottom: spacing.xl }}>
        <Text variant="body" tone="secondary">
          {t('challenges.newBody')}
        </Text>

        <SegmentedControl options={sports.slice(0, 3)} value={sport} onChange={setSport} />

        <Input
          label={t('challenges.fieldTitle')}
          placeholder={t('challenges.fieldTitlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          maxLength={90}
        />

        <Input
          label={t('challenges.fieldBrief')}
          placeholder={t('challenges.fieldBriefPlaceholder')}
          value={brief}
          onChangeText={setBrief}
          multiline
          maxLength={1200}
        />

        <Input
          label={t('challenges.fieldRules')}
          placeholder={t('challenges.fieldRulesPlaceholder')}
          value={rules}
          onChangeText={setRules}
          multiline
          maxLength={1200}
        />

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('challenges.fieldMeasured')} />
          <SegmentedControl
            options={[
              { value: 'measured' as Kind, label: t('challenges.measuredYes') },
              { value: 'judged' as Kind, label: t('challenges.measuredNo') },
            ]}
            value={kind}
            onChange={setKind}
          />
        </View>

        {kind === 'measured' ? (
          <Card padded tone="alt" style={{ gap: spacing.md }}>
            <Input
              label={t('challenges.fieldMetricLabel')}
              placeholder={t('challenges.fieldMetricLabelPlaceholder')}
              value={metricLabel}
              onChangeText={setMetricLabel}
              maxLength={40}
            />
            <Input
              label={t('challenges.fieldMetricUnit')}
              placeholder={t('challenges.fieldMetricUnitPlaceholder')}
              value={metricUnit}
              onChangeText={setMetricUnit}
              maxLength={12}
            />
            <View style={{ gap: spacing.xs }}>
              <Text variant="caption" tone="muted">
                {t('challenges.fieldBetter')}
              </Text>
              <SegmentedControl
                options={[
                  { value: 'higher' as const, label: t('challenges.betterHigher') },
                  { value: 'lower' as const, label: t('challenges.betterLower') },
                ]}
                value={better}
                onChange={setBetter}
              />
            </View>
          </Card>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('challenges.fieldAges')} />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Input value={ageMin} onChangeText={setAgeMin} keyboardType="numeric" maxLength={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Input value={ageMax} onChangeText={setAgeMax} keyboardType="numeric" maxLength={2} />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionHeader title={t('challenges.fieldCloses')} />
          <SegmentedControl
            options={[
              { value: '7' as Window, label: t('challenges.closesIn7') },
              { value: '14' as Window, label: t('challenges.closesIn14') },
              { value: '30' as Window, label: t('challenges.closesIn30') },
            ]}
            value={window}
            onChange={setWindow}
          />
        </View>

        {profile?.is_verified ? null : (
          <Card padded tone="alt">
            <Text variant="caption" tone="warning">
              {t('errors.challengeNotAllowed')}
            </Text>
          </Card>
        )}
      </View>
    </Screen>
  );
}
