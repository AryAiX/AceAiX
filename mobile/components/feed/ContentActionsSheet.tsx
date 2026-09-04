import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, Platform, Share, View } from 'react-native';
import {
  AlertTriangle,
  Ban,
  Flag,
  Link2,
  Share2,
  Trash2,
} from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  ConfirmSheet,
  Divider,
  Input,
  ListItem,
  Sheet,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { blockUser, deleteComment, deletePost, reportContent } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { displayName } from '@/lib/format';

/**
 * The safety menu behind every "…".
 *
 * Report and block are never more than two taps from a post, and the same
 * component serves comments, so there is exactly one place where this logic
 * can be got wrong.
 */

export interface ContentTarget {
  kind: 'post' | 'comment';
  id: string;
  authorId: string;
  authorName: string | null;
  isOwn: boolean;
  /** Posts have a shareable link; comments do not. */
  link?: string;
}

/**
 * `value` is what moderation stores and reads — it is a database value and
 * stays in English in every language. Only `labelKey`, the line the reporter
 * reads, is translated.
 */
const REPORT_REASONS: { value: string; labelKey: string }[] = [
  { value: 'spam', labelKey: 'feed.reasonSpam' },
  { value: 'harassment', labelKey: 'feed.reasonHarassment' },
  { value: 'nudity', labelKey: 'feed.reasonNudity' },
  { value: 'violence', labelKey: 'feed.reasonViolence' },
  { value: 'hate', labelKey: 'feed.reasonHate' },
  { value: 'impersonation', labelKey: 'feed.reasonImpersonation' },
  { value: 'child_safety', labelKey: 'feed.reasonChildSafety' },
  { value: 'scam', labelKey: 'feed.reasonScam' },
  { value: 'other', labelKey: 'feed.reasonOther' },
];

type Step = 'menu' | 'report' | 'block' | 'delete' | null;

interface Props {
  /** Null closes the sheet. */
  target: ContentTarget | null;
  onClose: () => void;
  onDeleted?: (target: ContentTarget) => void;
  onBlocked?: (userId: string) => void;
}

export function ContentActionsSheet({ target, onClose, onDeleted, onBlocked }: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const toast = useToast();
  const t = useT();

  const [step, setStep] = useState<Step>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (target) {
      setStep('menu');
      setDetails('');
    } else {
      setStep(null);
    }
  }, [target]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /* Two modals must never be on screen at once: iOS refuses to present one
     while another is still dismissing, so we close, wait, then open. */
  const goTo = useCallback((next: Step) => {
    setStep(null);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStep(next), 240);
  }, []);

  const close = useCallback(() => {
    setStep(null);
    onClose();
  }, [onClose]);

  /* "post" and "comment" are chosen as whole sentences rather than dropped
     into one — a noun cannot be slotted into a title in every language. */
  const isComment = target?.kind === 'comment';
  const name = displayName(target?.authorName, t('feed.thisPerson'));

  const handleShare = async () => {
    if (!target?.link) return;
    close();
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url: target.link, message: target.link }
          : { message: target.link },
      );
    } catch {
      /* the user backed out of the share sheet */
    }
  };

  const handleCopy = () => {
    if (!target?.link) return;
    try {
      Clipboard.setString(target.link);
      close();
      toast.success(t('feed.linkCopied'));
    } catch {
      close();
      toast.error(t('feed.linkCopyFailed'));
    }
  };

  const handleReport = async (reason: string) => {
    if (!target || busy) return;
    setBusy(true);
    try {
      await reportContent(target.kind, target.id, reason, details.trim() || undefined);
      close();
      toast.success(t('feed.reportThanks'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleBlock = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      await blockUser(target.authorId);
      const blockedId = target.authorId;
      close();
      toast.success(t('feed.blockedToast', { name }));
      onBlocked?.(blockedId);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      if (target.kind === 'post') await deletePost(target.id);
      else await deleteComment(target.id);
      const deleted = target;
      close();
      toast.success(
        target.kind === 'post' ? t('feed.postDeleted') : t('feed.commentDeleted'),
      );
      onDeleted?.(deleted);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Sheet
        visible={step === 'menu'}
        onClose={close}
        title={
          target?.isOwn
            ? isComment
              ? t('feed.actionsOwnComment')
              : t('feed.actionsOwnPost')
            : isComment
              ? t('feed.actionsComment')
              : t('feed.actionsPost')
        }
        scrollable={false}
      >
        <View style={{ paddingBottom: spacing.sm }}>
          {target?.link ? (
            <>
              <ListItem
                title={t('common.copyLink')}
                left={<Link2 size={20} color={colors.textSecondary} />}
                onPress={handleCopy}
                showChevron={false}
              />
              <Divider />
              <ListItem
                title={t('common.share')}
                left={<Share2 size={20} color={colors.textSecondary} />}
                onPress={handleShare}
                showChevron={false}
              />
              <Divider />
            </>
          ) : null}

          {target?.isOwn ? (
            <ListItem
              title={
                target.kind === 'post' ? t('feed.deletePost') : t('feed.deleteComment')
              }
              left={<Trash2 size={20} color={colors.danger} />}
              destructive
              onPress={() => goTo('delete')}
              showChevron={false}
            />
          ) : (
            <>
              <ListItem
                title={isComment ? t('feed.reportComment') : t('feed.reportPost')}
                subtitle={t('feed.reportHint')}
                left={<Flag size={20} color={colors.textSecondary} />}
                onPress={() => goTo('report')}
                showChevron={false}
              />
              <Divider />
              <ListItem
                title={t('feed.blockPerson', { name })}
                subtitle={t('feed.blockHint')}
                left={<Ban size={20} color={colors.danger} />}
                destructive
                onPress={() => goTo('block')}
                showChevron={false}
              />
            </>
          )}
        </View>
      </Sheet>

      <Sheet
        visible={step === 'report'}
        onClose={close}
        title={isComment ? t('feed.reportThisComment') : t('feed.reportThisPost')}
        subtitle={t('feed.reportReasonPrompt')}
        height={0.88}
        footer={
          <Button label={t('common.cancel')} variant="ghost" fullWidth onPress={close} />
        }
      >
        <View>
          {REPORT_REASONS.map((reason, index) => (
            <View key={reason.value}>
              {index > 0 ? <Divider /> : null}
              <ListItem
                title={t(reason.labelKey)}
                left={
                  reason.value === 'child_safety' ? (
                    <AlertTriangle size={20} color={colors.danger} />
                  ) : (
                    <Flag size={20} color={colors.textSecondary} />
                  )
                }
                onPress={() => handleReport(reason.value)}
                disabled={busy}
                showChevron={false}
              />
            </View>
          ))}

          <Input
            label={t('feed.reportDetailsLabel')}
            placeholder={t('common.optional')}
            value={details}
            onChangeText={setDetails}
            multiline
            maxLength={2000}
            containerStyle={{ marginTop: spacing.lg }}
          />

          <Text variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
            {t('feed.reportEmergencyNote')}
          </Text>
        </View>
      </Sheet>

      <ConfirmSheet
        visible={step === 'block'}
        title={t('feed.blockConfirmTitle', { name })}
        message={t('feed.blockConfirmBody')}
        confirmLabel={t('common.block')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={busy}
        onConfirm={handleBlock}
        onCancel={close}
      />

      <ConfirmSheet
        visible={step === 'delete'}
        title={
          isComment
            ? t('feed.deleteCommentConfirmTitle')
            : t('feed.deletePostConfirmTitle')
        }
        message={t('feed.deleteConfirmBody')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('feed.keepIt')}
        destructive
        loading={busy}
        onConfirm={handleDelete}
        onCancel={close}
      />
    </>
  );
}
