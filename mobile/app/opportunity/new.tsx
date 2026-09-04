import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, Check, ShieldAlert } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Chip,
  Header,
  Input,
  Screen,
  Text,
  useToast,
} from '@/components/ui';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import {
  OPPORTUNITY_TYPES,
  SPORTS,
  opportunityTypeHint,
  opportunityTypeLabel,
  positionLabel,
  positionsFor,
  sportLabel,
} from '@/constants/sports';
import { useT } from '@/i18n';
import { useAsync } from '@/hooks/useAsync';
import { createOpportunity } from '@/lib/api';
import { myOrganization } from '@/lib/api.opportunities';
import { errorMessage } from '@/lib/errors';
import { fullDate } from '@/lib/format';
import { Routes } from '@/lib/routes';
import { useAuth } from '@/providers/AuthProvider';
import type { Opportunity } from '@/types/models';

const TITLE_MAX = 120;
const DESCRIPTION_MIN = 30;
const DESCRIPTION_MAX = 3000;

interface Errors {
  title?: string;
  type?: string;
  sport?: string;
  location?: string;
  description?: string;
  deadline?: string;
}

/** A date-only ISO string, which is what `application_deadline` stores. */
function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * The child-safety notice is one sentence with a link inside it, so the
 * catalogue keeps it whole — a translator has to be free to put "Community
 * Guidelines" where their grammar wants it, not where English left it. This
 * marker stands in for the link while the sentence is translated, then splits
 * it into the text either side. If a translation drops the marker the sentence
 * still reads in full and the link still works, just at the end.
 */
const LINK_SLOT = '␟';

/** One selectable type card. */
function TypeCard({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t('opportunities.post.typeA11y', { label, hint })}
      onPress={onPress}
      style={({ pressed }) => ({
        flexBasis: '47%',
        flexGrow: 1,
        minHeight: 76,
        justifyContent: 'center',
        gap: 2,
        padding: spacing.md,
        borderRadius: radii.md,
        borderWidth: 1.5,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text variant="bodyStrong" tone={selected ? 'primary' : 'default'} style={{ flex: 1 }}>
          {label}
        </Text>
        {selected ? <Check size={16} color={colors.primary} strokeWidth={2.8} /> : null}
      </View>
      <Text variant="caption" tone="muted">
        {hint}
      </Text>
    </Pressable>
  );
}

/**
 * Posting an opportunity.
 *
 * The preview at the bottom is the point of the screen: a recruiter should see
 * the card an athlete will see before they publish it, not after.
 */
export default function NewOpportunityScreen() {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();

  const organization = useAsync(() => myOrganization(), []);

  const [title, setTitle] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [sport, setSport] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [description, setDescription] = useState('');

  const [picking, setPicking] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const positions = useMemo(() => positionsFor(sport), [sport]);

  const [safetyBefore, ...safetyRest] = t('opportunities.post.safetyBody', {
    guidelines: LINK_SLOT,
  }).split(LINK_SLOT);
  const safetyAfter = safetyRest.join(LINK_SLOT);

  const preview = useMemo<Opportunity>(
    () => ({
      id: 'preview',
      title: title.trim() || t('opportunities.post.previewPlaceholder'),
      type,
      description: description.trim() || null,
      location: location.trim() || null,
      sport,
      position,
      deadline: deadline ? toIsoDate(deadline) : null,
      org_id: organization.data?.id ?? null,
      org_name: organization.data?.name ?? profile?.full_name ?? null,
      org_logo: organization.data?.logo_url ?? profile?.avatar_url ?? null,
      org_verified: organization.data?.is_verified ?? false,
      match_percent: 0,
      reasons: [],
      has_applied: false,
      is_saved: false,
      created_at: new Date().toISOString(),
    }),
    [t, title, type, description, location, sport, position, deadline, organization.data, profile],
  );

  const validate = (): Errors => {
    const next: Errors = {};
    if (title.trim().length < 4) next.title = t('opportunities.post.titleError');
    if (!type) next.type = t('opportunities.post.typeError');
    if (!sport) next.sport = t('opportunities.post.sportError');
    if (location.trim().length < 2) next.location = t('opportunities.post.whereError');
    if (description.trim().length < DESCRIPTION_MIN) {
      next.description = t('opportunities.post.detailsError', { count: DESCRIPTION_MIN });
    }
    if (deadline && deadline < startOfToday()) {
      next.deadline = t('opportunities.post.deadlineError');
    }
    return next;
  };

  const onSubmit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error(t('opportunities.post.checkFields'));
      return;
    }

    setSubmitting(true);
    try {
      const id = await createOpportunity({
        title: title.trim(),
        description: description.trim(),
        type: type as string,
        sport: sport as string,
        position: position ?? null,
        location: location.trim() || null,
        deadline: deadline ? toIsoDate(deadline) : null,
        organizationId: organization.data?.id ?? null,
      });
      toast.success(t('opportunities.post.posted'));
      router.replace(Routes.opportunity(id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      header={<Header back title={t('opportunities.post.title')} />}
      keyboardAvoiding
      footer={
        <Button
          label={t('opportunities.post.submit')}
          fullWidth
          loading={submitting}
          onPress={onSubmit}
          testID="post-opportunity-submit"
        />
      }
      testID="new-opportunity-screen"
    >
      <View style={{ gap: spacing.xl }}>
        <Input
          label={t('opportunities.post.titleLabel')}
          required
          placeholder={t('opportunities.post.titlePlaceholder')}
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (errors.title) setErrors((e) => ({ ...e, title: undefined }));
          }}
          maxLength={TITLE_MAX}
          error={errors.title}
          hint={t('opportunities.post.titleHint')}
        />

        {/* Type */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('opportunities.post.typeLabel')}
            <Text variant="captionStrong" tone="danger">{' *'}</Text>
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {OPPORTUNITY_TYPES.map((option) => (
              <TypeCard
                key={option.key}
                label={opportunityTypeLabel(t, option.key)}
                hint={opportunityTypeHint(t, option.key)}
                selected={type === option.key}
                onPress={() => {
                  setType(option.key);
                  setErrors((e) => ({ ...e, type: undefined }));
                }}
              />
            ))}
          </View>
          {errors.type ? (
            <Text variant="caption" tone="danger">
              {errors.type}
            </Text>
          ) : null}
        </View>

        {/* Sport */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('opportunities.post.sportLabel')}
            <Text variant="captionStrong" tone="danger">{' *'}</Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -spacing.lg }}
            contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}
          >
            {SPORTS.map((s) => (
              <Chip
                key={s.key}
                label={sportLabel(t, s.key)}
                icon={<Text variant="caption">{s.emoji}</Text>}
                selected={sport === s.key}
                onPress={() => {
                  setSport(s.key);
                  setPosition(null);
                  setErrors((e) => ({ ...e, sport: undefined }));
                }}
              />
            ))}
          </ScrollView>
          {errors.sport ? (
            <Text variant="caption" tone="danger">
              {errors.sport}
            </Text>
          ) : null}
        </View>

        {/* Position */}
        {positions.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="captionStrong" tone="secondary">
              {t('opportunities.post.positionLabel')}
            </Text>
            <Text variant="caption" tone="muted">
              {t('opportunities.post.positionHint')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Chip
                label={t('opportunities.post.positionAny')}
                selected={!position}
                onPress={() => setPosition(null)}
              />
              {positions.map((p) => (
                <Chip
                  key={p}
                  label={positionLabel(t, p)}
                  selected={position === p}
                  onPress={() => setPosition((current) => (current === p ? null : p))}
                />
              ))}
            </View>
          </View>
        ) : null}

        <Input
          label={t('opportunities.post.whereLabel')}
          required
          placeholder={t('opportunities.post.wherePlaceholder')}
          value={location}
          onChangeText={(value) => {
            setLocation(value);
            if (errors.location) setErrors((e) => ({ ...e, location: undefined }));
          }}
          maxLength={120}
          error={errors.location}
        />

        {/* Deadline */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="captionStrong" tone="secondary">
            {t('opportunities.post.deadlineLabel')}
          </Text>
          <Pressable
            onPress={() => setPicking(true)}
            accessibilityRole="button"
            accessibilityLabel={
              deadline
                ? t('opportunities.post.deadlineChange', {
                    date: fullDate(toIsoDate(deadline)),
                  })
                : t('opportunities.post.deadlineChoose')
            }
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: 52,
              paddingHorizontal: spacing.lg,
              borderRadius: radii.md,
              borderWidth: 1.5,
              borderColor: errors.deadline
                ? colors.danger
                : deadline
                  ? colors.primary
                  : colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <CalendarDays size={20} color={deadline ? colors.primary : colors.textMuted} />
            <Text variant="body" tone={deadline ? 'default' : 'muted'} style={{ flex: 1 }}>
              {deadline ? fullDate(toIsoDate(deadline)) : t('opportunities.post.deadlineNone')}
            </Text>
            {deadline ? (
              <Pressable
                onPress={() => setDeadline(null)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t('opportunities.post.deadlineClearA11y')}
              >
                <Text variant="captionStrong" tone="primary">
                  {t('common.clear')}
                </Text>
              </Pressable>
            ) : null}
          </Pressable>

          {errors.deadline ? (
            <Text variant="caption" tone="danger">
              {errors.deadline}
            </Text>
          ) : null}

          {picking ? (
            <View
              style={
                Platform.OS === 'ios'
                  ? {
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      overflow: 'hidden',
                    }
                  : undefined
              }
            >
              <DateTimePicker
                value={deadline ?? startOfToday()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={startOfToday()}
                themeVariant={theme.scheme}
                onChange={(event, selected) => {
                  // Android shows a dialog and closes itself; iOS stays inline.
                  if (Platform.OS !== 'ios') setPicking(false);
                  // 'dismissed' still carries a date on Android — cancelling
                  // must not quietly pick one.
                  if (event.type === 'set' && selected) {
                    setDeadline(selected);
                    setErrors((e) => ({ ...e, deadline: undefined }));
                  }
                }}
              />
              {Platform.OS === 'ios' ? (
                <Button
                  label={t('common.done')}
                  variant="ghost"
                  fullWidth
                  size="sm"
                  onPress={() => setPicking(false)}
                />
              ) : null}
            </View>
          ) : null}
        </View>

        <Input
          label={t('opportunities.post.detailsLabel')}
          required
          placeholder={t('opportunities.post.detailsPlaceholder')}
          value={description}
          onChangeText={(value) => {
            setDescription(value);
            if (errors.description) setErrors((e) => ({ ...e, description: undefined }));
          }}
          multiline
          maxLength={DESCRIPTION_MAX}
          error={errors.description}
          hint={`${description.trim().length}/${DESCRIPTION_MAX}`}
        />

        {/* Live preview */}
        <View style={{ gap: spacing.sm }}>
          <Text variant="heading">{t('opportunities.post.previewTitle')}</Text>
          <Text variant="caption" tone="muted">
            {t('opportunities.post.previewHint')}
          </Text>
          <OpportunityCard opportunity={preview} preview />
        </View>

        {/* Child safety — required before anyone can post. */}
        <Card tone="alt" style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ShieldAlert size={18} color={colors.warning} />
            <Text variant="captionStrong">{t('opportunities.post.safetyTitle')}</Text>
          </View>
          <Text variant="caption" tone="secondary">
            {safetyBefore}
            <Text
              variant="captionStrong"
              tone="primary"
              accessibilityRole="link"
              accessibilityLabel={t('opportunities.post.safetyLinkA11y')}
              onPress={() => router.push(Routes.guidelines)}
            >
              {t('common.communityGuidelines')}
            </Text>
            {safetyAfter}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
