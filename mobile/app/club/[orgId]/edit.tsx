import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExternalLink, Lock, SearchX, Send, ShieldCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Header,
  IconButton,
  Screen,
  SkeletonList,
  Text,
  useToast,
} from '@/components/ui';
import {
  AboutFields,
  BasicsFields,
  BrandingFields,
  ContactFields,
  EditSection,
  SportsFields,
  VERIFICATION_TONE,
  VerificationFields,
  WhereFields,
  verificationErrors,
  type VerificationError,
} from '@/components/club/setup';
import { InfoNote } from '@/components/settings/Notes';
import { useAsync } from '@/hooks/useAsync';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { saveMatchPreferences } from '@/lib/api';
import {
  getClubPage,
  submitClubVerification,
  updateClubPage,
  type ClubPageUpdate,
  type VerificationStatus,
} from '@/lib/api.club';
import { clubLabel } from '@/lib/clubLabels';
import {
  aboutPatch,
  basicsErrors,
  basicsPatch,
  brandingPatch,
  contactErrors,
  contactPatch,
  draftFromPage,
  emptyDraft,
  emptyVerification,
  sportsPatch,
  verificationFromPage,
  whereErrors,
  wherePatch,
  type BasicsError,
  type ClubDraft,
  type ContactError,
  type VerificationDraft,
  type WhereError,
} from '@/lib/clubSetup';
import { errorMessage } from '@/lib/errors';
import { Routes } from '@/lib/routes';

type Section = 'basics' | 'where' | 'sports' | 'contact' | 'branding' | 'about' | 'verify';

/**
 * Everything on a club page, editable later: the same pieces as the setup
 * wizard, one card each with its own Save, plus the About texts and the
 * verification papers on top.
 */
export default function ClubEditScreen() {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ orgId?: string }>();
  const orgId = typeof params.orgId === 'string' && params.orgId ? params.orgId : null;

  const state = useAsync(() => getClubPage(orgId as string), [orgId], { enabled: !!orgId });

  const [draft, setDraft] = useState<ClubDraft>(emptyDraft);
  const [papers, setPapers] = useState<VerificationDraft>(emptyVerification);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [filled, setFilled] = useState(false);
  const [saving, setSaving] = useState<Section | null>(null);
  const [busy, setBusy] = useState(false);
  const [basicsErr, setBasicsErr] = useState<Partial<Record<BasicsError, true>>>({});
  const [whereErr, setWhereErr] = useState<Partial<Record<WhereError, true>>>({});
  const [sportsErr, setSportsErr] = useState(false);
  const [contactErr, setContactErr] = useState<Partial<Record<ContactError, true>>>({});
  const [verifyErr, setVerifyErr] = useState<Partial<Record<VerificationError, true>>>({});

  useEffect(() => {
    if (filled || !state.data) return;
    setDraft(draftFromPage(state.data));
    setPapers(verificationFromPage(state.data));
    setStatus(state.data.organization.verification_status);
    setFilled(true);
  }, [state.data, filled]);

  const change = (patch: Partial<ClubDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const close = () => {
    if (router.canGoBack()) router.back();
    else if (orgId) router.replace(Routes.organization(orgId));
    else router.replace(Routes.home);
  };

  const save = async (section: Section, patch: ClubPageUpdate, after?: () => Promise<void>) => {
    if (!orgId || saving) return;
    setSaving(section);
    try {
      await updateClubPage(orgId, patch);
      if (after) await after();
      toast.success(t('clubSetup.edit.saved'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  const header = (
    <Header
      title={t('clubSetup.edit.title')}
      back
      onBack={close}
      right={
        orgId ? (
          <IconButton
            icon={<ExternalLink size={20} color={colors.text} />}
            label={t('clubSetup.edit.viewPage')}
            tone="transparent"
            onPress={() => router.push(Routes.organization(orgId))}
          />
        ) : undefined
      }
    />
  );

  if (!orgId || (!state.loading && !state.error && !state.data)) {
    return (
      <Screen header={header} testID="club-edit-screen">
        <EmptyState
          icon={<SearchX size={28} color={colors.textMuted} />}
          title={t('clubSetup.edit.notFoundTitle')}
          body={t('clubSetup.edit.notFoundBody')}
          actionLabel={t('clubSetup.screen.backHome')}
          onAction={() => router.replace(Routes.home)}
        />
      </Screen>
    );
  }
  if (state.loading && !state.data) {
    return (
      <Screen header={header} testID="club-edit-screen">
        <SkeletonList count={4} variant="card" />
      </Screen>
    );
  }
  if (!state.data) {
    return (
      <Screen header={header} testID="club-edit-screen">
        <ErrorState message={state.error ?? t('common.somethingWentWrong')} onRetry={state.reload} />
      </Screen>
    );
  }

  const page = state.data;
  if (!page.viewer.can_manage) {
    return (
      <Screen header={header} testID="club-edit-screen">
        <EmptyState
          icon={<Lock size={28} color={colors.textMuted} />}
          title={t('clubSetup.edit.noPermissionTitle')}
          body={t('clubSetup.edit.noPermissionBody')}
          actionLabel={t('clubSetup.edit.viewPage')}
          onAction={() => router.replace(Routes.organization(orgId))}
        />
      </Screen>
    );
  }

  const currentStatus = status ?? page.organization.verification_status;
  const reviewNote = page.verification?.review_note ?? null;
  // Only the club account's own matching preferences follow its sports.
  const ownsAccount = page.viewer.role === 'owner' && profile?.role === 'club';

  const sendPapers = async () => {
    if (saving || busy) return;
    const found = verificationErrors(papers);
    setVerifyErr(found);
    if (Object.keys(found).length > 0) return;
    setSaving('verify');
    try {
      const next = await submitClubVerification(orgId, {
        contact_person_name: papers.contact_person_name.trim(),
        contact_person_title: papers.contact_person_title.trim() || null,
        license_number: papers.license_number.trim() || null,
        document_path: papers.document_path,
        accept_terms: papers.accept_terms,
      });
      setStatus(next);
      setPapers((p) => ({ ...p, has_document: p.has_document || !!p.document_path, document_path: null }));
      toast.success(t('clubSetup.edit.papersSent'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen header={header} keyboardAvoiding testID="club-edit-screen">
      <View style={{ gap: spacing.xl, paddingBottom: spacing.xxl }}>
        {/* Verification first: it is what unlocks reaching under-18s. */}
        <Card level={1} style={{ gap: spacing.lg }} testID="club-edit-verify">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <ShieldCheck size={20} color={currentStatus === 'approved' ? colors.success : colors.primary} />
            <Text variant="heading" accessibilityRole="header" style={{ flex: 1 }}>
              {t('clubSetup.edit.verifyTitle')}
            </Text>
            <Badge
              label={clubLabel(t, 'verification', currentStatus)}
              tone={VERIFICATION_TONE[currentStatus] ?? 'neutral'}
            />
          </View>
          {reviewNote && currentStatus !== 'approved' ? (
            <InfoNote tone="warning" icon="warning">
              {t('clubSetup.edit.reviewNote', { note: reviewNote })}
            </InfoNote>
          ) : null}
          {currentStatus === 'approved' ? (
            <Text variant="caption" tone="secondary">
              {t('clubSetup.edit.verifiedBody')}
            </Text>
          ) : null}
          <VerificationFields
            value={papers}
            errors={verifyErr}
            onChange={(patch) => {
              setPapers((p) => ({ ...p, ...patch }));
              setVerifyErr({});
            }}
            onBusyChange={setBusy}
            showIntro={currentStatus !== 'approved'}
          />
          <Button
            label={t('clubSetup.edit.sendPapers')}
            fullWidth
            loading={saving === 'verify'}
            disabled={busy}
            icon={<Send size={18} color={colors.textOnBrand} />}
            onPress={() => void sendPapers()}
            testID="club-edit-verify-send"
          />
        </Card>

        <EditSection
          title={t('clubSetup.edit.basicsTitle')}
          saving={saving === 'basics'}
          onSave={() => {
            const found = basicsErrors(draft);
            setBasicsErr(found);
            if (Object.keys(found).length === 0) void save('basics', basicsPatch(draft));
          }}
          testID="club-edit-basics"
        >
          <BasicsFields
            draft={draft}
            errors={basicsErr}
            onChange={(p) => {
              change(p);
              setBasicsErr({});
            }}
          />
        </EditSection>

        <EditSection
          title={t('clubSetup.edit.whereTitle')}
          saving={saving === 'where'}
          onSave={() => {
            const found = whereErrors(draft);
            setWhereErr(found);
            if (Object.keys(found).length === 0) void save('where', wherePatch(draft));
          }}
          testID="club-edit-where"
        >
          <WhereFields
            draft={draft}
            errors={whereErr}
            onChange={(p) => {
              change(p);
              setWhereErr({});
            }}
          />
        </EditSection>

        <EditSection
          title={t('clubSetup.edit.sportsTitle')}
          saving={saving === 'sports'}
          onSave={() => {
            const missing = draft.sports.length === 0;
            setSportsErr(missing);
            if (missing) return;
            void save('sports', sportsPatch(draft), async () => {
              if (ownsAccount) await saveMatchPreferences({ sports: draft.sports.map((s) => s.sport) });
            });
          }}
          testID="club-edit-sports"
        >
          <SportsFields
            draft={draft}
            showError={sportsErr}
            onChange={(p) => {
              change(p);
              setSportsErr(false);
            }}
          />
        </EditSection>

        <EditSection
          title={t('clubSetup.edit.contactTitle')}
          saving={saving === 'contact'}
          onSave={() => {
            const found = contactErrors(draft);
            setContactErr(found);
            if (Object.keys(found).length === 0) void save('contact', contactPatch(draft));
          }}
          testID="club-edit-contact"
        >
          <ContactFields
            draft={draft}
            errors={contactErr}
            onChange={(p) => {
              change(p);
              setContactErr({});
            }}
          />
        </EditSection>

        <EditSection
          title={t('clubSetup.edit.brandingTitle')}
          subtitle={t('clubSetup.branding.subtitle')}
          saving={saving === 'branding'}
          onSave={() => {
            if (!busy) void save('branding', brandingPatch(draft));
          }}
          testID="club-edit-branding"
        >
          <BrandingFields draft={draft} onChange={change} onBusyChange={setBusy} />
        </EditSection>

        <EditSection
          title={t('clubSetup.edit.aboutTitle')}
          subtitle={t('clubSetup.edit.aboutSubtitle')}
          saving={saving === 'about'}
          onSave={() => void save('about', aboutPatch(draft))}
          testID="club-edit-about"
        >
          <AboutFields draft={draft} onChange={change} />
        </EditSection>
      </View>
    </Screen>
  );
}
