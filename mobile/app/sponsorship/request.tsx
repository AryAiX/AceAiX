import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, DateField, ErrorState, Header, Input, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { TagPicker } from '@/components/sponsorship/Tags';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getMySponsorship, saveSponsorshipRequest } from '@/lib/api.sponsorship';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { GIVES, NEEDS, parseAmount, parseDay, toggleTag, type Give, type Need } from '@/lib/sponsorship';

const CURRENCY = 'AED';

/**
 * An athlete's request for sponsorship — new, or `?id=` to edit one.
 *
 * Short on purpose: what it is for, when, how much, what is needed and what
 * the sponsor gets back. The database decides whether this athlete may ask at
 * all (a minor needs the guardian's sponsorship scope).
 */
export default function SponsorshipRequestScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' && params.id ? params.id : null;

  const mine = useAsync(getMySponsorship, []);
  const [title, setTitle] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [needs, setNeeds] = useState<Need[]>([]);
  const [needsOther, setNeedsOther] = useState('');
  const [gives, setGives] = useState<Give[]>([]);
  const [pitch, setPitch] = useState('');
  const [errors, setErrors] = useState<{
    title?: string;
    date?: string;
    amount?: string;
    needs?: string;
    needsOther?: string;
    pitch?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);

  /* Editing: fill the form once from the request being edited. */
  useEffect(() => {
    if (filled || !editingId || !mine.data) return;
    const existing = mine.data.requests.find((r) => r.id === editingId);
    if (!existing) return;
    setTitle(existing.title);
    setEventName(existing.event_name ?? '');
    setEventDate(existing.event_date ?? '');
    setLocation(existing.location ?? '');
    setAmount(existing.amount ? String(existing.amount) : '');
    setNeeds(existing.needs.filter((n): n is Need => (NEEDS as readonly string[]).includes(n)));
    setNeedsOther(existing.needs_other ?? '');
    setGives(existing.gives.filter((g): g is Give => (GIVES as readonly string[]).includes(g)));
    setPitch(existing.pitch ?? '');
    setFilled(true);
  }, [editingId, mine.data, filled]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.sponsorship);
  };

  const submit = async () => {
    const day = parseDay(eventDate);
    const value = parseAmount(amount);
    const otherText = needsOther.trim();
    const wantsOther = needs.includes('other');
    const next = {
      title: title.trim().length < 3 ? t('sponsorship.titleRequired') : undefined,
      date: day === undefined ? t('sponsorship.dateInvalid') : undefined,
      amount: value === undefined ? t('sponsorship.amountInvalid') : undefined,
      needs: needs.length === 0 ? t('sponsorship.needsRequired') : undefined,
      needsOther:
        wantsOther && (otherText.length < 2 || otherText.length > 60)
          ? t('sponsorship.needsOtherRequired')
          : undefined,
      pitch: pitch.trim().length < 10 ? t('sponsorship.pitchRequired') : undefined,
    };
    setErrors(next);
    if (next.title || next.date || next.amount || next.needs || next.needsOther || next.pitch) return;

    setSaving(true);
    try {
      await saveSponsorshipRequest(editingId, {
        title: title.trim(),
        event_name: eventName.trim(),
        event_date: day ?? null,
        location: location.trim(),
        needs,
        needs_other: wantsOther ? otherText : '',
        gives,
        amount: value ?? null,
        pitch: pitch.trim(),
      });
      toast.success(t('sponsorship.requestSaved'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Header title={t(editingId ? 'sponsorship.requestTitleEdit' : 'sponsorship.requestTitleNew')} back onBack={close} />
  );

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="sponsorship-request-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }
  if (!mine.data) {
    return (
      <Screen header={header} testID="sponsorship-request-screen">
        <ErrorState message={mine.error ?? t('common.somethingWentWrong')} onRetry={mine.reload} />
      </Screen>
    );
  }
  if (mine.data.role !== 'athlete' || mine.data.gate !== 'ok') {
    return (
      <Screen header={header} testID="sponsorship-request-screen">
        <InfoNote
          tone="warning"
          icon="warning"
          actionLabel={mine.data.gate === 'guardian_consent_required' ? t('sponsorship.askGuardian') : undefined}
          onAction={
            mine.data.gate === 'guardian_consent_required'
              ? () => router.push({ pathname: Routes.settingsGuardian, params: { add: 'sponsorship' } })
              : undefined
          }
        >
          {mine.data.gate === 'guardian_consent_required'
            ? `${t('sponsorship.guardianTitle')}. ${t('sponsorship.guardianBody')}`
            : t('errors.athleteOnly')}
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
          label={t('sponsorship.publishRequest')}
          fullWidth
          loading={saving}
          onPress={submit}
          testID="sponsorship-request-submit"
        />
      }
      testID="sponsorship-request-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <Input
          label={t('sponsorship.fTitle')}
          required
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder={t('sponsorship.fTitlePlaceholder')}
          maxLength={80}
          error={errors.title}
          testID="request-title"
        />
        <Input
          label={t('sponsorship.fEvent')}
          value={eventName}
          onChangeText={setEventName}
          placeholder={t('sponsorship.fEventPlaceholder')}
          maxLength={120}
        />
        <DateField
          label={t('sponsorship.fDate')}
          value={eventDate || null}
          onChange={(next) => {
            setEventDate(next ?? '');
            setErrors((e) => ({ ...e, date: undefined }));
          }}
          optional
          error={errors.date}
          testID="request-date"
        />
        <Input
          label={t('sponsorship.fLocation')}
          value={location}
          onChangeText={setLocation}
          maxLength={120}
        />
        <Input
          label={t('sponsorship.fAmount', { currency: CURRENCY })}
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            setErrors((e) => ({ ...e, amount: undefined }));
          }}
          placeholder={t('sponsorship.fAmountPlaceholder')}
          keyboardType="number-pad"
          hint={t('sponsorship.fAmountHint')}
          error={errors.amount}
          testID="request-amount"
        />
        <View style={{ gap: spacing.md }}>
          <TagPicker
            group="need"
            label={t('sponsorship.fNeeds')}
            required
            options={NEEDS}
            value={needs}
            error={errors.needs}
            onToggle={(tag) => {
              setNeeds((list) => toggleTag(list, tag));
              setErrors((e) => ({ ...e, needs: undefined, needsOther: tag === 'other' ? undefined : e.needsOther }));
            }}
          />
          {needs.includes('other') ? (
            <Input
              label={t('sponsorship.fNeedsOther')}
              required
              value={needsOther}
              onChangeText={(v) => {
                setNeedsOther(v);
                setErrors((e) => ({ ...e, needsOther: undefined }));
              }}
              maxLength={60}
              error={errors.needsOther}
              testID="request-needs-other"
            />
          ) : null}
        </View>
        <TagPicker
          group="give"
          label={t('sponsorship.fGives')}
          options={GIVES}
          value={gives}
          onToggle={(tag) => setGives((list) => toggleTag(list, tag))}
        />
        <Input
          label={t('sponsorship.fPitch')}
          required
          value={pitch}
          onChangeText={(v) => {
            setPitch(v);
            setErrors((e) => ({ ...e, pitch: undefined }));
          }}
          placeholder={t('sponsorship.fPitchPlaceholder')}
          multiline
          maxLength={600}
          error={errors.pitch}
        />
        <Text variant="caption" tone="muted">
          {t('sponsorship.noMoneyNote')}
        </Text>
      </View>
    </Screen>
  );
}
