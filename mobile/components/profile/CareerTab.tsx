import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Award, BadgeCheck, ScrollText, Trophy } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Input,
  SectionHeader,
  Sheet,
  Skeleton,
  Text,
  useToast,
} from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import {
  addMatchRecord,
  CertificationEntry,
  getEndorsements,
  getMatchRecords,
  HonorEntry,
  normaliseCertifications,
  normaliseHonors,
  saveCertifications,
  saveHonors,
} from '@/lib/api.profile';
import { errorMessage } from '@/lib/errors';
import { displayName, fullDate, metaLine, roleLabel } from '@/lib/format';
import { useT } from '@/i18n';

interface Props {
  athleteId: string | null;
  isSelf: boolean;
  /** Raw JSONB from the profile bundle. */
  honors: unknown[];
  certifications: unknown[];
  refreshKey?: number;
  onChanged?: () => void;
}

const EMPTY_MATCH = {
  match_date: '',
  competition: '',
  opponent: '',
  result: '',
  minutes_played: '',
  goals: '',
  assists: '',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function CareerTab({
  athleteId,
  isSelf,
  honors,
  certifications,
  refreshKey = 0,
  onChanged,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const toast = useToast();
  const t = useT();

  const matches = useAsync(
    () => (athleteId ? getMatchRecords(athleteId) : Promise.resolve([])),
    [athleteId, refreshKey],
    { enabled: !!athleteId },
  );
  const endorsements = useAsync(
    () => (athleteId ? getEndorsements(athleteId) : Promise.resolve([])),
    [athleteId, refreshKey],
    { enabled: !!athleteId },
  );

  // JSONB lists live on the profile row, so they are edited here and mirrored
  // locally to avoid a full profile reload on every small addition.
  const [honorList, setHonorList] = useState<HonorEntry[]>(() => normaliseHonors(honors));
  const [certList, setCertList] = useState<CertificationEntry[]>(() =>
    normaliseCertifications(certifications),
  );

  useEffect(() => setHonorList(normaliseHonors(honors)), [honors]);
  useEffect(() => setCertList(normaliseCertifications(certifications)), [certifications]);

  const [matchForm, setMatchForm] = useState<typeof EMPTY_MATCH | null>(null);
  const [honorForm, setHonorForm] = useState<{ title: string; org: string; year: string } | null>(
    null,
  );
  const [certForm, setCertForm] = useState<{ title: string; issuer: string; date: string } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const submitMatch = useCallback(async () => {
    if (!matchForm || !athleteId) return;
    if (!ISO_DATE.test(matchForm.match_date.trim())) {
      toast.error(t('profile.matchDateInvalid'));
      return;
    }
    setSaving(true);
    try {
      await addMatchRecord(athleteId, {
        match_date: matchForm.match_date.trim(),
        competition: matchForm.competition.trim() || null,
        opponent: matchForm.opponent.trim() || null,
        result: matchForm.result.trim() || null,
        minutes_played: toNumber(matchForm.minutes_played),
        goals: toNumber(matchForm.goals) ?? 0,
        assists: toNumber(matchForm.assists) ?? 0,
      });
      setMatchForm(null);
      toast.success(t('profile.matchAddedToast'));
      matches.reload();
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [athleteId, matchForm, matches, onChanged, t, toast]);

  const submitHonor = useCallback(async () => {
    if (!honorForm) return;
    if (!honorForm.title.trim()) {
      toast.error(t('profile.honourTitleRequired'));
      return;
    }
    const next: HonorEntry[] = [
      {
        title: honorForm.title.trim(),
        org: honorForm.org.trim() || null,
        year: honorForm.year.trim() || null,
        type: 'individual',
      },
      ...honorList,
    ];
    setSaving(true);
    try {
      await saveHonors(next);
      setHonorList(next);
      setHonorForm(null);
      toast.success(t('profile.honourAddedToast'));
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [honorForm, honorList, onChanged, t, toast]);

  const submitCert = useCallback(async () => {
    if (!certForm) return;
    if (!certForm.title.trim()) {
      toast.error(t('profile.certificateTitleRequired'));
      return;
    }
    const next: CertificationEntry[] = [
      {
        title: certForm.title.trim(),
        issuer: certForm.issuer.trim() || null,
        date: certForm.date.trim() || null,
        verified: false,
      },
      ...certList,
    ];
    setSaving(true);
    try {
      await saveCertifications(next);
      setCertList(next);
      setCertForm(null);
      toast.success(t('profile.certificateAddedToast'));
      onChanged?.();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [certForm, certList, onChanged, t, toast]);

  if (!athleteId) {
    return (
      <EmptyState
        compact
        title={t('profile.noCareerTitle')}
        body={t('profile.noCareerBody')}
      />
    );
  }

  return (
    <View style={{ gap: spacing.xxl }}>
      {/* ── Matches ── */}
      <View>
        <SectionHeader
          title={t('common.matches')}
          action={isSelf ? t('profile.add') : undefined}
          onAction={isSelf ? () => setMatchForm({ ...EMPTY_MATCH }) : undefined}
        />
        {matches.loading ? (
          <Skeleton height={72} />
        ) : matches.error ? (
          <ErrorState message={matches.error} onRetry={matches.reload} compact />
        ) : (matches.data ?? []).length === 0 ? (
          <EmptyState
            compact
            icon={<ScrollText size={24} color={colors.textMuted} />}
            title={t(
              isSelf ? 'profile.matchesEmptyTitleSelf' : 'profile.matchesEmptyTitleOther',
            )}
            body={t(
              isSelf ? 'profile.matchesEmptyBodySelf' : 'profile.matchesEmptyBodyOther',
            )}
            actionLabel={isSelf ? t('profile.logMatchTitle') : undefined}
            onAction={isSelf ? () => setMatchForm({ ...EMPTY_MATCH }) : undefined}
          />
        ) : (
          <Card padded={false}>
            {(matches.data ?? []).map((match, index) => (
              <View key={match.id}>
                {index > 0 ? <Divider /> : null}
                <View style={{ padding: spacing.lg, gap: 4 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                    }}
                  >
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {match.opponent
                        ? t('profile.matchVersus', { opponent: match.opponent })
                        : t('profile.matchFallback')}
                    </Text>
                    {/* The result is free text the athlete typed, so it shows as written. */}
                    {match.result ? <Badge label={match.result} tone="neutral" /> : null}
                    {match.source === 'verified' ? (
                      <Badge label={t('common.verified')} tone="info" />
                    ) : null}
                  </View>
                  <Text variant="caption" tone="muted">
                    {metaLine(fullDate(match.match_date), match.competition)}
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {metaLine(
                      match.minutes_played != null
                        ? t('profile.matchMinutes', { n: match.minutes_played })
                        : null,
                      t('profile.matchGoals', { count: match.goals }),
                      t('profile.matchAssists', { count: match.assists }),
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* ── Honours ── */}
      <View>
        <SectionHeader
          title={t('profile.honoursTitle')}
          action={isSelf ? t('profile.add') : undefined}
          onAction={isSelf ? () => setHonorForm({ title: '', org: '', year: '' }) : undefined}
        />
        {honorList.length === 0 ? (
          <EmptyState
            compact
            icon={<Trophy size={24} color={colors.textMuted} />}
            title={t(
              isSelf ? 'profile.honoursEmptyTitleSelf' : 'profile.honoursEmptyTitleOther',
            )}
            body={isSelf ? t('profile.honoursEmptyBodySelf') : undefined}
            actionLabel={isSelf ? t('profile.addHonourTitle') : undefined}
            onAction={isSelf ? () => setHonorForm({ title: '', org: '', year: '' }) : undefined}
          />
        ) : (
          <Card padded={false}>
            {honorList.map((honor, index) => (
              <View key={`${honor.title}-${index}`}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                  }}
                >
                  <Trophy size={18} color={colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {honor.title}
                    </Text>
                    {metaLine(honor.org, honor.year) ? (
                      <Text variant="caption" tone="muted">
                        {metaLine(honor.org, honor.year)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* ── Certifications ── */}
      <View>
        <SectionHeader
          title={t('profile.certificatesTitle')}
          action={isSelf ? t('profile.add') : undefined}
          onAction={isSelf ? () => setCertForm({ title: '', issuer: '', date: '' }) : undefined}
        />
        {certList.length === 0 ? (
          <EmptyState
            compact
            icon={<Award size={24} color={colors.textMuted} />}
            title={t(
              isSelf
                ? 'profile.certificatesEmptyTitleSelf'
                : 'profile.certificatesEmptyTitleOther',
            )}
            body={isSelf ? t('profile.certificatesEmptyBodySelf') : undefined}
            actionLabel={isSelf ? t('profile.addCertificateTitle') : undefined}
            onAction={isSelf ? () => setCertForm({ title: '', issuer: '', date: '' }) : undefined}
          />
        ) : (
          <Card padded={false}>
            {certList.map((cert, index) => (
              <View key={`${cert.title}-${index}`}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.lg,
                  }}
                >
                  <Award size={18} color={colors.info} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={2}>
                      {cert.title}
                    </Text>
                    {metaLine(cert.issuer, cert.date) ? (
                      <Text variant="caption" tone="muted">
                        {metaLine(cert.issuer, cert.date)}
                      </Text>
                    ) : null}
                  </View>
                  {cert.verified ? <BadgeCheck size={18} color={colors.info} /> : null}
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* ── Endorsements ── */}
      <View>
        <SectionHeader title={t('profile.endorsementsTitle')} />
        {endorsements.loading ? (
          <Skeleton height={64} />
        ) : endorsements.error ? (
          <ErrorState message={endorsements.error} onRetry={endorsements.reload} compact />
        ) : (endorsements.data ?? []).length === 0 ? (
          <EmptyState
            compact
            icon={<BadgeCheck size={24} color={colors.textMuted} />}
            title={t('profile.endorsementsEmptyTitle')}
            body={isSelf ? t('profile.endorsementsEmptyBodySelf') : undefined}
          />
        ) : (
          <Card padded={false}>
            {(endorsements.data ?? []).map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <Divider /> : null}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.md,
                    padding: spacing.lg,
                  }}
                >
                  <Avatar
                    uri={item.endorser?.avatar_url}
                    name={item.endorser?.full_name}
                    size="sm"
                    verified={item.endorser?.is_verified}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {displayName(item.endorser?.full_name)}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {metaLine(roleLabel(item.endorser_role), item.skill_or_trait)}
                    </Text>
                    {item.note ? (
                      <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                        “{item.note}”
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}
      </View>

      {/* ── Add a match ── */}
      <Sheet
        visible={matchForm !== null}
        onClose={() => (saving ? undefined : setMatchForm(null))}
        title={t('profile.logMatchTitle')}
        subtitle={t('profile.logMatchSubtitle')}
      >
        <View style={{ gap: spacing.md }}>
          <Input
            label={t('profile.matchDate')}
            required
            /* The stored format is fixed, so the example stays as it is typed. */
            placeholder="2026-03-14"
            value={matchForm?.match_date ?? ''}
            onChangeText={(text) => setMatchForm((f) => (f ? { ...f, match_date: text } : f))}
            keyboardType="numbers-and-punctuation"
            hint={t('profile.matchDateHint')}
          />
          <Input
            label={t('profile.matchCompetition')}
            placeholder={t('profile.matchCompetitionPlaceholder')}
            value={matchForm?.competition ?? ''}
            onChangeText={(text) => setMatchForm((f) => (f ? { ...f, competition: text } : f))}
          />
          <Input
            label={t('profile.matchOpponent')}
            placeholder={t('profile.matchOpponentPlaceholder')}
            value={matchForm?.opponent ?? ''}
            onChangeText={(text) => setMatchForm((f) => (f ? { ...f, opponent: text } : f))}
          />
          <Input
            label={t('profile.matchResult')}
            placeholder={t('profile.matchResultPlaceholder')}
            value={matchForm?.result ?? ''}
            onChangeText={(text) => setMatchForm((f) => (f ? { ...f, result: text } : f))}
            maxLength={20}
          />
          {/* The three placeholders below are bare numerals on a number pad —
              nothing to translate. */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Input
              containerStyle={{ flex: 1 }}
              label={t('profile.matchMinutesLabel')}
              placeholder="90"
              keyboardType="number-pad"
              value={matchForm?.minutes_played ?? ''}
              onChangeText={(text) =>
                setMatchForm((f) => (f ? { ...f, minutes_played: text } : f))
              }
            />
            <Input
              containerStyle={{ flex: 1 }}
              label={t('profile.matchGoalsLabel')}
              placeholder="0"
              keyboardType="number-pad"
              value={matchForm?.goals ?? ''}
              onChangeText={(text) => setMatchForm((f) => (f ? { ...f, goals: text } : f))}
            />
            <Input
              containerStyle={{ flex: 1 }}
              label={t('profile.matchAssistsLabel')}
              placeholder="0"
              keyboardType="number-pad"
              value={matchForm?.assists ?? ''}
              onChangeText={(text) => setMatchForm((f) => (f ? { ...f, assists: text } : f))}
            />
          </View>
          <Button
            label={t('profile.saveMatch')}
            fullWidth
            loading={saving}
            style={{ marginTop: spacing.sm }}
            onPress={submitMatch}
          />
        </View>
      </Sheet>

      {/* ── Add an honour ── */}
      <Sheet
        visible={honorForm !== null}
        onClose={() => (saving ? undefined : setHonorForm(null))}
        title={t('profile.addHonourTitle')}
      >
        <View style={{ gap: spacing.md }}>
          <Input
            label={t('profile.honourTitleLabel')}
            required
            placeholder={t('profile.honourTitlePlaceholder')}
            value={honorForm?.title ?? ''}
            onChangeText={(text) => setHonorForm((f) => (f ? { ...f, title: text } : f))}
          />
          <Input
            label={t('profile.honourOrgLabel')}
            placeholder={t('profile.honourOrgPlaceholder')}
            value={honorForm?.org ?? ''}
            onChangeText={(text) => setHonorForm((f) => (f ? { ...f, org: text } : f))}
          />
          <Input
            label={t('profile.honourYearLabel')}
            placeholder="2026"
            keyboardType="number-pad"
            maxLength={4}
            value={honorForm?.year ?? ''}
            onChangeText={(text) => setHonorForm((f) => (f ? { ...f, year: text } : f))}
          />
          <Button
            label={t('profile.saveHonour')}
            fullWidth
            loading={saving}
            style={{ marginTop: spacing.sm }}
            onPress={submitHonor}
          />
        </View>
      </Sheet>

      {/* ── Add a certificate ── */}
      <Sheet
        visible={certForm !== null}
        onClose={() => (saving ? undefined : setCertForm(null))}
        title={t('profile.addCertificateTitle')}
      >
        <View style={{ gap: spacing.md }}>
          <Input
            label={t('profile.certificateTitleLabel')}
            required
            placeholder={t('profile.certificateTitlePlaceholder')}
            value={certForm?.title ?? ''}
            onChangeText={(text) => setCertForm((f) => (f ? { ...f, title: text } : f))}
          />
          <Input
            label={t('profile.certificateIssuerLabel')}
            placeholder={t('profile.certificateIssuerPlaceholder')}
            value={certForm?.issuer ?? ''}
            onChangeText={(text) => setCertForm((f) => (f ? { ...f, issuer: text } : f))}
          />
          <Input
            label={t('profile.certificateYearLabel')}
            placeholder="2026"
            keyboardType="number-pad"
            maxLength={4}
            value={certForm?.date ?? ''}
            onChangeText={(text) => setCertForm((f) => (f ? { ...f, date: text } : f))}
          />
          <Button
            label={t('profile.saveCertificate')}
            fullWidth
            loading={saving}
            style={{ marginTop: spacing.sm }}
            onPress={submitCert}
          />
        </View>
      </Sheet>
    </View>
  );
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
