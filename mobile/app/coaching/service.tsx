import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, Chip, ErrorState, Header, Input, Screen, SkeletonList, Text, useToast } from '@/components/ui';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getMyCoaching, saveCoachingService } from '@/lib/api.coaching';
import {
  DURATIONS,
  LOCATION_MODES,
  SERVICE_KINDS,
  capacityFor,
  type LocationMode,
  type ServiceKind,
} from '@/lib/coaching';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';
import { parseAmount } from '@/lib/sponsorship';

const CURRENCY = 'AED';

/** A service a coach offers — new, or `?id=` to edit one. */
export default function CoachingServiceScreen() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' && params.id ? params.id : null;

  const mine = useAsync(getMyCoaching, []);
  const [kind, setKind] = useState<ServiceKind>('session');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(60);
  const [capacity, setCapacity] = useState('8');
  const [price, setPrice] = useState('');
  const [mode, setMode] = useState<LocationMode>('fixed');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<{ title?: string; capacity?: string; price?: string; location?: string }>({});
  const [saving, setSaving] = useState(false);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (filled || !editingId || !mine.data) return;
    const existing = mine.data.services.find((s) => s.id === editingId);
    if (!existing) return;
    setKind(existing.kind);
    setTitle(existing.title);
    setDescription(existing.description ?? '');
    setDuration(existing.duration_minutes);
    setCapacity(String(Math.max(2, existing.capacity)));
    setPrice(existing.price != null ? String(existing.price) : '');
    setMode(existing.location_mode);
    setLocation(existing.location ?? '');
    setFilled(true);
  }, [editingId, mine.data, filled]);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace(Routes.coaching);
  };

  const submit = async () => {
    const places = capacityFor(kind, capacity);
    /* A price of 0 is a free session, which parseAmount reads as "not a number". */
    const cost = price.trim() === '0' ? 0 : parseAmount(price);
    const next = {
      title: title.trim().length < 3 ? t('coaching.titleRequired') : undefined,
      capacity: places === undefined ? t('coaching.capacityInvalid') : undefined,
      price: cost === undefined ? t('coaching.priceInvalid') : undefined,
      location: mode === 'fixed' && location.trim().length < 3 ? t('coaching.locationRequired') : undefined,
    };
    setErrors(next);
    if (next.title || next.capacity || next.price || next.location) return;

    setSaving(true);
    try {
      await saveCoachingService(editingId, {
        kind,
        title: title.trim(),
        description: description.trim(),
        duration_minutes: duration,
        capacity: places ?? 1,
        price: cost ?? null,
        location_mode: mode,
        location: location.trim(),
      });
      toast.success(t('coaching.serviceSaved'));
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const header = (
    <Header title={t(editingId ? 'coaching.serviceEdit' : 'coaching.serviceNew')} back onBack={close} />
  );

  if (mine.loading && !mine.data) {
    return (
      <Screen header={header} testID="coaching-service-screen">
        <SkeletonList count={3} variant="row" />
      </Screen>
    );
  }
  if (!mine.data) {
    return (
      <Screen header={header} testID="coaching-service-screen">
        <ErrorState message={mine.error ?? t('common.somethingWentWrong')} onRetry={mine.reload} />
      </Screen>
    );
  }
  if (mine.data.role !== 'coach') {
    return (
      <Screen header={header} testID="coaching-service-screen">
        <InfoNote tone="warning" icon="warning">
          {t('errors.coachOnly')}
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
          label={t('coaching.saveService')}
          fullWidth
          loading={saving}
          onPress={submit}
          testID="coaching-service-submit"
        />
      }
      testID="coaching-service-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('coaching.sKind')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SERVICE_KINDS.map((k) => (
              <Chip
                key={k}
                label={t(`coaching.kind.${k}`)}
                selected={kind === k}
                onPress={() => setKind(k)}
                testID={`service-kind-${k}`}
              />
            ))}
          </View>
        </View>

        <Input
          label={t('coaching.sTitle')}
          required
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            setErrors((e) => ({ ...e, title: undefined }));
          }}
          placeholder={t('coaching.sTitlePlaceholder')}
          maxLength={80}
          error={errors.title}
          testID="service-title"
        />
        <Input
          label={t('coaching.sDescription')}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={600}
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('coaching.sDuration')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {DURATIONS.map((d) => (
              <Chip
                key={d}
                label={t('coaching.minutes', { n: d })}
                selected={duration === d}
                onPress={() => setDuration(d)}
              />
            ))}
          </View>
        </View>

        {kind === 'class' ? (
          <Input
            label={t('coaching.sCapacity')}
            value={capacity}
            onChangeText={(v) => {
              setCapacity(v);
              setErrors((e) => ({ ...e, capacity: undefined }));
            }}
            keyboardType="number-pad"
            error={errors.capacity}
            testID="service-capacity"
          />
        ) : null}

        <Input
          label={t('coaching.sPrice', { currency: CURRENCY })}
          value={price}
          onChangeText={(v) => {
            setPrice(v);
            setErrors((e) => ({ ...e, price: undefined }));
          }}
          keyboardType="number-pad"
          hint={t('coaching.sPriceHint')}
          error={errors.price}
          testID="service-price"
        />

        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('coaching.sWhere')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {LOCATION_MODES.map((m) => (
              <Chip
                key={m}
                label={t(`coaching.mode.${m}`)}
                selected={mode === m}
                onPress={() => {
                  setMode(m);
                  setErrors((e) => ({ ...e, location: undefined }));
                }}
                testID={`service-mode-${m}`}
              />
            ))}
          </View>
          {mode === 'fixed' ? (
            <Input
              label={t('coaching.sLocation')}
              required
              value={location}
              onChangeText={(v) => {
                setLocation(v);
                setErrors((e) => ({ ...e, location: undefined }));
              }}
              placeholder={t('coaching.sLocationPlaceholder')}
              maxLength={160}
              error={errors.location}
              testID="service-location"
            />
          ) : (
            <Text variant="caption" tone="muted">
              {t(mode === 'flexible' ? 'coaching.flexibleHint' : 'coaching.onlineHint')}
            </Text>
          )}
        </View>
      </View>
    </Screen>
  );
}
