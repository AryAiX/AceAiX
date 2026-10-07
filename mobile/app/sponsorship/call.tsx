import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Chip,
  ErrorState,
  Header,
  Input,
  Screen,
  SkeletonList,
  Switch,
  Text,
  useToast,
} from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { TagPicker } from '@/components/sponsorship/Tags';
import { SPORTS, sportLabel } from '@/constants/sports';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getMySponsorship, saveSponsorCall } from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { OFFERS, parseAmount, parseDay, toggleTag, type Offer } from '@/lib/sponsorship';

const CURRENCY = 'AED';

/**
 * A sponsor's call — new, or `?id=` to edit one. Only a verified sponsor can
 * publish; the database says so, and this screen says why before the form.
 */
export default function SponsorCallScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' && params.id ? params.id : null;

  const mine = useAsync(getMySponsorship, []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sport, setSport] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>(['cash']);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [slots, setSlots] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [minors, setMinors] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; range?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (filled || !editingId || !mine.data) return;
    const existing = mine.data.calls.find((c) => c.id === editingId);
    if (!existing) return;
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setSport(existing.sport);
    setOffers(existing.offers.filter((o): o is Offer => (OFFERS as readonly string[]).includes(o)));
    setMin(existing.amount_min != null ? String(existing.amount_min) : '');
    setMax(existing.amount_max != null ? String(existing.amount_max) : '');
    setSlots(String(existing.slots));
    setDeadline(existing.deadline ?? '');
    setMinors(existing.open_to_minors);
    setFilled(true);
  }, [editingId, mine.data, filled]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.sponsorship);
  };

  const submit = async () => {
    const lo = parseAmount(min);
    const hi = parseAmount(max);
    const day = parseDay(deadline);
    const count = Math.min(500, Math.max(1, Math.round(Number(slots) || 1)));
    const next = {
      title: title.trim().length < 3 ? t('sponsorship.titleRequired') : undefined,
      range:
        lo === undefined || hi === undefined
          ? t('sponsorship.amountInvalid')
          : lo != null && hi != null && lo > hi
            ? t('sponsorship.rangeInvalid')
            : undefined,
      date: day === undefined ? t('sponsorship.dateInvalid') : undefined,
    };
    setErrors(next);
    if (next.title || next.range || next.date) return;

    setSaving(true);
    try {
      await saveSponsorCall(editingId, {
        title: title.trim(),
        description: description.trim(),
        sport,
        offers,
        amount_min: lo ?? null,
        amount_max: hi ?? null,
        slots: count,
        deadline: day ?? null,
        open_to_minors: minors,
      });
      toast.success(t('sponsorship.callSaved'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Header title={t(editingId ? 'sponsorship.callTitleEdit' : 'sponsorship.callTitleNew')} back onBack={close} />
  );

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="sponsor-call-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }
  if (!mine.data) {
    return (
      <Screen header={header} testID="sponsor-call-screen">
        <ErrorState message={mine.error ?? t('common.somethingWentWrong')} onRetry={mine.reload} />
      </Screen>
    );
  }
  if (mine.data.role !== 'sponsor' || mine.data.gate !== 'ok') {
    const unverified = mine.data.gate === 'sponsor_not_verified';
    return (
      <Screen header={header} testID="sponsor-call-screen">
        <InfoNote
          tone="warning"
          icon="warning"
          actionLabel={unverified ? t('sponsorship.requestVerification') : undefined}
          onAction={unverified ? () => router.push(Routes.settingsAccount) : undefined}
        >
          {unverified
            ? `${t('sponsorship.notVerifiedTitle')}. ${t('sponsorship.notVerifiedBody')}`
            : t('errors.sponsorOnly')}
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
          label={t('sponsorship.publishCall')}
          fullWidth
          loading={saving}
          onPress={submit}
          testID="sponsor-call-submit"
        />
      }
      testID="sponsor-call-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <Input
          label={t('sponsorship.cTitle')}
          required
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder={t('sponsorship.cTitlePlaceholder')}
          maxLength={80}
          error={errors.title}
          testID="call-title"
        />
        <Input
          label={t('sponsorship.cDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={800}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('sponsorship.cSport')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
            <Chip label={t('sponsorship.anySport')} selected={!sport} onPress={() => setSport(null)} />
            {SPORTS.map((s) => (
              <Chip
                key={s.key}
                label={sportLabel(t, s.key)}
                icon={<Text variant="caption">{s.emoji}</Text>}
                selected={sport === s.key}
                onPress={() => setSport(s.key)}
              />
            ))}
          </ScrollView>
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
            label={t('sponsorship.cMin', { currency: CURRENCY })}
            value={min}
            onChangeText={(v) => {
              setMin(v);
              setErrors((e) => ({ ...e, range: undefined }));
            }}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
          />
          <Input
            label={t('sponsorship.cMax', { currency: CURRENCY })}
            value={max}
            onChangeText={(v) => {
              setMax(v);
              setErrors((e) => ({ ...e, range: undefined }));
            }}
            keyboardType="number-pad"
            error={errors.range}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Input
            label={t('sponsorship.cSlots')}
            value={slots}
            onChangeText={setSlots}
            keyboardType="number-pad"
            containerStyle={{ flex: 1 }}
          />
          <Input
            label={t('sponsorship.cDeadline')}
            value={deadline}
            onChangeText={(v) => {
              setDeadline(v);
              setErrors((e) => ({ ...e, date: undefined }));
            }}
            placeholder="2027-01-31"
            autoCapitalize="none"
            error={errors.date}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="bodyStrong">{t('sponsorship.cMinors')}</Text>
            <Text variant="caption" tone="muted">
              {t('sponsorship.cMinorsHint')}
            </Text>
          </View>
          <Switch value={minors} onValueChange={setMinors} accessibilityLabel={t('sponsorship.cMinors')} />
        </View>
      </View>
    </Screen>
  );
}
