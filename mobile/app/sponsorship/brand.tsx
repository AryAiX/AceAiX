import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, ErrorState, Header, Input, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { TagPicker } from '@/components/sponsorship/Tags';
import { SPORTS, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getMySponsorship, saveSponsorProfile } from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { OFFERS, parseAmount, toggleTag, type Offer } from '@/lib/sponsorship';

const CURRENCY = 'AED';

/** The sponsor's brand profile: what an athlete reads before applying. */
export default function SponsorBrandScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();

  const mine = useAsync(getMySponsorship, []);
  const [company, setCompany] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [about, setAbout] = useState('');
  const [sports, setSports] = useState<string[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [errors, setErrors] = useState<{ website?: string; range?: string }>({});
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (filled || !mine.data?.profile) return;
    const p = mine.data.profile;
    setCompany(p.company_name ?? '');
    setIndustry(p.industry ?? '');
    setWebsite(p.website ?? '');
    setAbout(p.about ?? '');
    setSports(p.sports ?? []);
    setOffers((p.offers ?? []).filter((o): o is Offer => (OFFERS as readonly string[]).includes(o)));
    setMin(p.budget_min != null ? String(p.budget_min) : '');
    setMax(p.budget_max != null ? String(p.budget_max) : '');
    setFilled(true);
  }, [mine.data, filled]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.sponsorship);
  };

  const submit = async () => {
    const lo = parseAmount(min);
    const hi = parseAmount(max);
    const site = website.trim();
    const next = {
      website: site && !/^https?:\/\//i.test(site) ? t('sponsorship.websiteInvalid') : undefined,
      range:
        lo === undefined || hi === undefined
          ? t('sponsorship.amountInvalid')
          : lo != null && hi != null && lo > hi
            ? t('sponsorship.rangeInvalid')
            : undefined,
    };
    setErrors(next);
    if (next.website || next.range) return;

    setSaving(true);
    try {
      await saveSponsorProfile({
        company_name: company.trim(),
        industry: industry.trim(),
        website: site,
        about: about.trim(),
        sports,
        offers,
        budget_min: lo ?? null,
        budget_max: hi ?? null,
      });
      toast.success(t('sponsorship.brandSaved'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const header = <Header title={t('sponsorship.brandTitle')} back onBack={close} />;

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="sponsor-brand-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }
  if (!mine.data) {
    return (
      <Screen header={header} testID="sponsor-brand-screen">
        <ErrorState message={mine.error ?? t('common.somethingWentWrong')} onRetry={mine.reload} />
      </Screen>
    );
  }
  if (mine.data.role !== 'sponsor') {
    return (
      <Screen header={header} testID="sponsor-brand-screen">
        <InfoNote tone="warning" icon="warning">
          {t('errors.sponsorOnly')}
        </InfoNote>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      keyboardAvoiding
      footer={<Button label={t('common.save')} fullWidth loading={saving} onPress={submit} testID="sponsor-brand-submit" />}
      testID="sponsor-brand-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <Input label={t('sponsorship.bCompany')} value={company} onChangeText={setCompany} maxLength={80} testID="brand-company" />
        <Input label={t('sponsorship.bIndustry')} value={industry} onChangeText={setIndustry} maxLength={60} />
        <Input
          label={t('sponsorship.bWebsite')}
          value={website}
          onChangeText={(v) => {
            setWebsite(v);
            setErrors((e) => ({ ...e, website: undefined }));
          }}
          placeholder="https://"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          error={errors.website}
        />
        <Input label={t('sponsorship.bAbout')} value={about} onChangeText={setAbout} multiline maxLength={600} />

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('sponsorship.bSports')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SPORTS.map((s) => (
              <Chip
                key={s.key}
                label={sportLabel(t, s.key)}
                icon={<Text variant="caption">{s.emoji}</Text>}
                selected={sports.includes(s.key)}
                onPress={() => setSports((list) => toggleTag(list, s.key))}
              />
            ))}
          </View>
        </View>

        <TagPicker
          group="offer"
          label={t('sponsorship.cOffers')}
          options={OFFERS}
          value={offers}
          onToggle={(tag) => setOffers((list) => toggleTag(list, tag))}
        />

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            label={t('sponsorship.bBudgetMin', { currency: CURRENCY })}
            value={min}
            onChangeText={(v) => {
              setMin(v);
              setErrors((e) => ({ ...e, range: undefined }));
            }}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
          />
          <Input
            label={t('sponsorship.bBudgetMax', { currency: CURRENCY })}
            value={max}
            onChangeText={(v) => {
              setMax(v);
              setErrors((e) => ({ ...e, range: undefined }));
            }}
            keyboardType="number-pad"
            error={errors.range}
            hint={t('sponsorship.bBudgetHint')}
            containerStyle={{ flex: 1 }}
          />
        </View>
      </View>
    </Screen>
  );
}
