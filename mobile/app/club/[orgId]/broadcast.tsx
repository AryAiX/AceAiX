import React, { useState } from 'react';
import { View } from 'react-native';
import { BellRing, Megaphone } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Header,
  Input,
  Screen,
  SectionHeader,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import { ClubGateScreen, Counter, FieldLabel, gateStatus, useOrgId } from '@/components/club/manage/shared';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { getClubBroadcasts, getClubPage, sendClubBroadcast } from '@/lib/api.club';
import { BROADCAST_AUDIENCES, BROADCASTS_PER_DAY, type BroadcastAudience } from '@/lib/club';
import { clubLabel } from '@/lib/clubLabels';
import { errorMessage } from '@/lib/errors';
import { fullDate, timeOfDay } from '@/lib/format';

const TITLE_MAX = 80;
const BODY_MAX = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const AUDIENCE_HINT: Record<BroadcastAudience, string> = {
  followers: 'clubManage.broadcast.audienceFollowers',
  squad: 'clubManage.broadcast.audienceSquad',
  all: 'clubManage.broadcast.audienceAll',
};

/**
 * An announcement: a notification to the page's followers and/or squad
 * members — never a chat. Three a day; minors get it only from verified clubs.
 */
export default function ClubBroadcastScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const toast = useToast();
  const orgId = useOrgId();

  const page = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });
  const past = useAsync(() => getClubBroadcasts(orgId as string, 20), [orgId], { enabled: !!orgId });

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('followers');
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const [sending, setSending] = useState(false);

  const header = <Header title={t('clubManage.broadcast.title')} back />;
  const status = gateStatus(orgId, page, 'can_manage');
  if (status !== 'ok' || !page.data || !orgId) {
    return (
      <ClubGateScreen
        status={status === 'ok' ? 'gone' : status}
        header={header}
        error={page.error}
        onRetry={page.reload}
        orgId={orgId}
        testID="club-broadcast-screen"
      />
    );
  }

  const verified = page.data.organization.is_verified;
  const history = past.data ?? [];
  const now = Date.now();
  const sentToday = history.filter((b) => now - new Date(b.created_at).getTime() < DAY_MS).length;
  const left = Math.max(0, BROADCASTS_PER_DAY - sentToday);

  const send = async () => {
    const next = {
      title: title.trim().length < 3 ? t('clubManage.broadcast.titleShort') : undefined,
      body: body.trim().length < 3 ? t('clubManage.broadcast.bodyShort') : undefined,
    };
    setErrors(next);
    if (next.title || next.body) return;
    setSending(true);
    try {
      const result = await sendClubBroadcast(orgId, title, body, audience);
      toast.success(t('clubManage.broadcast.sent', { count: result.recipients }));
      setTitle('');
      setBody('');
      past.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen
      header={header}
      keyboardAvoiding
      onRefresh={() => {
        page.refresh();
        past.refresh();
      }}
      refreshing={past.refreshing}
      testID="club-broadcast-screen"
    >
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        <Card tone="primarySoft" padded style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <BellRing size={20} color={colors.primary} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              {t('clubManage.broadcast.howTitle')}
            </Text>
          </View>
          <Text variant="caption" tone="secondary">
            {t('clubManage.broadcast.howBody')}
          </Text>
        </Card>

        {!verified ? (
          <InfoNote tone="warning" icon="warning">
            {t('clubManage.broadcast.unverified')}
          </InfoNote>
        ) : (
          <InfoNote icon="shield">{t('clubManage.broadcast.minorsNote')}</InfoNote>
        )}

        <View style={{ gap: spacing.xs }}>
          <Input
            label={t('clubManage.broadcast.fieldTitle')}
            required
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setErrors((e) => ({ ...e, title: undefined }));
            }}
            placeholder={t('clubManage.broadcast.fieldTitlePlaceholder')}
            maxLength={TITLE_MAX}
            error={errors.title}
            testID="club-broadcast-title"
          />
          <Counter value={title} max={TITLE_MAX} />
        </View>

        <View style={{ gap: spacing.xs }}>
          <Input
            label={t('clubManage.broadcast.fieldBody')}
            required
            value={body}
            onChangeText={(v) => {
              setBody(v);
              setErrors((e) => ({ ...e, body: undefined }));
            }}
            placeholder={t('clubManage.broadcast.fieldBodyPlaceholder')}
            multiline
            maxLength={BODY_MAX}
            error={errors.body}
            testID="club-broadcast-body"
          />
          <Counter value={body} max={BODY_MAX} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <FieldLabel hint={t(AUDIENCE_HINT[audience])}>
            {t('clubManage.broadcast.audience')}
          </FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {BROADCAST_AUDIENCES.map((a) => (
              <Chip
                key={a}
                label={clubLabel(t, 'audience', a)}
                selected={audience === a}
                onPress={() => setAudience(a)}
                testID={`club-broadcast-audience-${a}`}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('clubManage.broadcast.send')}
            fullWidth
            icon={<Megaphone size={18} color={colors.textOnBrand} />}
            loading={sending}
            disabled={left === 0}
            onPress={send}
            testID="club-broadcast-send"
          />
          <Text variant="caption" tone={left === 0 ? 'warning' : 'muted'} align="center">
            {left === 0
              ? t('clubManage.broadcast.limitReached', { max: BROADCASTS_PER_DAY })
              : t('clubManage.broadcast.limit', { left, max: BROADCASTS_PER_DAY })}
          </Text>
        </View>

        <View>
          <SectionHeader title={t('clubManage.broadcast.past')} />
          {past.loading && !past.data ? (
            <SkeletonList count={2} variant="row" />
          ) : past.error && !past.data ? (
            <InfoNote tone="danger" icon="warning" actionLabel={t('common.retry')} onAction={past.reload}>
              {past.error}
            </InfoNote>
          ) : history.length === 0 ? (
            <EmptyState
              compact
              icon={<Megaphone size={24} color={colors.textMuted} />}
              title={t('clubManage.broadcast.noneTitle')}
              body={t('clubManage.broadcast.noneBody')}
            />
          ) : (
            <Card padded level={1}>
              {history.map((b, i) => (
                <View key={b.id} style={{ gap: spacing.xs }}>
                  {i > 0 ? <Divider style={{ marginVertical: spacing.md }} /> : null}
                  <Text variant="bodyStrong">{b.title}</Text>
                  <Text variant="caption" tone="secondary" numberOfLines={3}>
                    {b.body}
                  </Text>
                  <Text variant="caption" tone="muted">
                    {[
                      `${fullDate(b.created_at)} · ${timeOfDay(b.created_at)}`,
                      clubLabel(t, 'audience', b.audience),
                      b.recipients != null
                        ? t('clubManage.broadcast.recipients', { count: b.recipients })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}
