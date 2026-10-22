import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button, ErrorState, Loader, Screen, useToast } from '@/components/ui';
import { useT } from '@/i18n';
import { StepHeading, WizardTopBar } from '@/components/onboarding/Shared';
import { addCustomCity, saveMatchPreferences } from '@/lib/api';
import {
  createClubPage,
  getClubMapUrl,
  getClubPage,
  getMyManagedClub,
  setClubMapUrl,
  submitClubVerification,
  updateClubPage,
} from '@/lib/api.club';
import { errorMessage } from '@/lib/errors';
import {
  SETUP_STEPS,
  basicsErrors,
  basicsInput,
  basicsPatch,
  brandingPatch,
  contactErrors,
  contactPatch,
  draftFromPage,
  emptyDraft,
  emptyVerification,
  firstIncompleteStep,
  readMapPin,
  sportsPatch,
  verificationFromPage,
  whereErrors,
  wherePatch,
  withAccountContactName,
  withCatalogueCities,
  type BasicsError,
  type ClubDraft,
  type ContactError,
  type SetupStep,
  type VerificationDraft,
  type WhereError,
} from '@/lib/clubSetup';
import { useAuth } from '@/providers/AuthProvider';
import { BasicsFields } from './BasicsStep';
import { WhereFields } from './WhereStep';
import { SportsFields } from './SportsStep';
import { ContactFields } from './ContactStep';
import { BrandingFields } from './BrandingStep';
import { VerificationFields, verificationErrors, type VerificationError } from './VerificationStep';
import { ClubSetupDone } from './DoneStep';

interface Errors {
  basics: Partial<Record<BasicsError, true>>;
  where: Partial<Record<WhereError, true>>;
  sports: boolean;
  contact: Partial<Record<ContactError, true>>;
  verify: Partial<Record<VerificationError, true>>;
}

const NO_ERRORS: Errors = { basics: {}, where: {}, sports: false, contact: {}, verify: {} };

/**
 * Setting up a club or academy page, one screen per step.
 *
 * Same two rules as the profile wizard: every step is written when the person
 * moves forward (closing halfway loses nothing), and an account that already
 * has a page picks up at the first step still missing something.
 *
 * `mode="onboarding"` runs inside the first-run wizard; `mode="standalone"`
 * is the /club/setup screen for club accounts that finished onboarding
 * before pages existed.
 */
export function ClubSetupWizard({
  mode,
  onFinished,
  onExit,
  firstStepRight,
}: {
  mode: 'onboarding' | 'standalone';
  /** "Open my page" on the last step. */
  onFinished: (orgId: string) => Promise<void> | void;
  /** Standalone only: the back arrow on the first step leaves the wizard. */
  onExit?: () => void;
  /** Drawn at the end of the top bar on the first step (e.g. Sign out). */
  firstStepRight?: React.ReactNode;
}) {
  const theme = useTheme();
  const t = useT();
  const { spacing } = theme;
  const toast = useToast();
  const { profile } = useAuth();
  // Read once. A later profile refresh must not put the name back after a clear.
  const account = useRef(profile);

  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClubDraft>(emptyDraft);
  const [papers, setPapers] = useState<VerificationDraft>(() =>
    withAccountContactName(emptyVerification(), account.current),
  );
  const [papersSent, setPapersSent] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [brandingTouched, setBrandingTouched] = useState(false);
  /** The map link last loaded or saved, so an unchanged pin does not write again. */
  const savedMapUrl = useRef<string | null>(null);

  const step: SetupStep = SETUP_STEPS[Math.min(stepIndex, SETUP_STEPS.length - 1)];

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    try {
      const mine = await getMyManagedClub();
      if (mine) {
        const [page, mapUrl] = await Promise.all([getClubPage(mine.id), getClubMapUrl(mine.id)]);
        if (page) {
          setOrgId(mine.id);
          savedMapUrl.current = mapUrl;
          setDraft(draftFromPage(page, mapUrl));
          setPapers(withAccountContactName(verificationFromPage(page), account.current));
          setPapersSent(!!page.verification?.terms_accepted);
          setStepIndex(SETUP_STEPS.indexOf(firstIncompleteStep(page)));
        }
      }
    } catch (err) {
      setBootError(errorMessage(err));
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  const change = (patch: Partial<ClubDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    if ('logo_url' in patch || 'cover_url' in patch) setBrandingTouched(true);
    // Only one step is on screen: its errors go as soon as the person edits.
    setErrors(NO_ERRORS);
  };

  const changePapers = (patch: Partial<VerificationDraft>) => {
    setPapers((p) => ({ ...p, ...patch }));
    setErrors(NO_ERRORS);
  };

  const goNext = () => setStepIndex((i) => Math.min(i + 1, SETUP_STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  /** Checks the step; false (and errors shown) when something is missing. */
  const validate = (): boolean => {
    switch (step) {
      case 'basics': {
        const found = basicsErrors(draft);
        setErrors((e) => ({ ...e, basics: found }));
        return Object.keys(found).length === 0;
      }
      case 'where': {
        const found = whereErrors(draft);
        setErrors((e) => ({ ...e, where: found }));
        return Object.keys(found).length === 0;
      }
      case 'sports': {
        const missing = draft.sports.length === 0;
        setErrors((e) => ({ ...e, sports: missing }));
        return !missing;
      }
      case 'contact': {
        const found = contactErrors(draft);
        setErrors((e) => ({ ...e, contact: found }));
        return Object.keys(found).length === 0;
      }
      case 'verify': {
        const found = verificationErrors(papers);
        setErrors((e) => ({ ...e, verify: found }));
        return Object.keys(found).length === 0;
      }
      default:
        return true;
    }
  };

  /** Writes the step. Returns false (with a toast) when the save failed. */
  const persist = async (): Promise<boolean> => {
    try {
      if (step === 'basics') {
        if (orgId) {
          await updateClubPage(orgId, basicsPatch(draft));
        } else {
          setOrgId(await createClubPage(basicsInput(draft)));
        }
        return true;
      }
      if (!orgId) return false;
      switch (step) {
        case 'where': {
          const next = await withCatalogueCities(draft, addCustomCity);
          setDraft(next);
          await updateClubPage(orgId, wherePatch(next));
          const nextUrl = readMapPin(next.pin)?.mapUrl ?? null;
          if (nextUrl !== savedMapUrl.current) {
            await setClubMapUrl(orgId, nextUrl);
            savedMapUrl.current = nextUrl;
          }
          break;
        }
        case 'sports':
          await updateClubPage(orgId, sportsPatch(draft));
          // Keeps athlete matching working, as the old club onboarding did.
          await saveMatchPreferences({ sports: draft.sports.map((s) => s.sport) });
          break;
        case 'contact':
          await updateClubPage(orgId, contactPatch(draft));
          break;
        case 'branding':
          await updateClubPage(orgId, brandingPatch(draft));
          break;
        case 'verify':
          await submitClubVerification(orgId, {
            contact_person_name: papers.contact_person_name.trim(),
            contact_person_title: papers.contact_person_title.trim() || null,
            license_number: papers.license_number.trim() || null,
            document_path: papers.document_path,
            accept_terms: papers.accept_terms,
          });
          setPapersSent(true);
          setPapers((p) => ({ ...p, has_document: p.has_document || !!p.document_path }));
          break;
        default:
          break;
      }
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  };

  const advance = async () => {
    if (saving || busy) return;
    if (step === 'done') {
      if (!orgId) return;
      setSaving(true);
      try {
        await onFinished(orgId);
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!validate()) return;
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (ok) goNext();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <Screen testID="club-setup-loading">
        <Loader label={t('clubSetup.wizard.loading')} style={{ paddingTop: spacing.giant }} />
      </Screen>
    );
  }

  if (bootError) {
    return (
      <Screen testID="club-setup-error">
        <View style={{ paddingTop: spacing.giant }}>
          <ErrorState message={bootError} onRetry={() => void boot()} />
        </View>
      </Screen>
    );
  }

  const first = stepIndex === 0;
  const canLeave = mode === 'standalone' && !!onExit;

  const heading = (() => {
    switch (step) {
      case 'basics':
        return { title: t('clubSetup.basics.title'), subtitle: t('clubSetup.basics.subtitle') };
      case 'where':
        return { title: t('clubSetup.where.title'), subtitle: t('clubSetup.where.subtitle') };
      case 'sports':
        return { title: t('clubSetup.sports.title'), subtitle: t('clubSetup.sports.subtitle') };
      case 'contact':
        return { title: t('clubSetup.contact.title'), subtitle: t('clubSetup.contact.subtitle') };
      case 'branding':
        return { title: t('clubSetup.branding.title'), subtitle: t('clubSetup.branding.subtitle') };
      case 'verify':
        return { title: t('clubSetup.verify.title'), subtitle: t('clubSetup.verify.subtitle') };
      default:
        return null;
    }
  })();

  const continueLabel =
    step === 'basics' && !orgId
      ? t('clubSetup.wizard.create')
      : step === 'verify'
        ? t('clubSetup.wizard.sendPapers')
        : step === 'done'
          ? t('clubSetup.wizard.openPage')
          : t('clubSetup.wizard.next');

  const skipLabel =
    step === 'branding' && !brandingTouched
      ? t('clubSetup.wizard.skip')
      : step === 'verify'
        ? t('clubSetup.wizard.later')
        : null;

  return (
    <Screen
      keyboardAvoiding
      header={
        <WizardTopBar
          step={stepIndex}
          total={SETUP_STEPS.length}
          hideBack={first && !canLeave}
          onBack={first ? (onExit ?? (() => {})) : goBack}
          backLabel={first && canLeave ? t('clubSetup.wizard.exit') : undefined}
          right={first ? firstStepRight : undefined}
        />
      }
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            label={continueLabel}
            size="lg"
            fullWidth
            loading={saving}
            disabled={busy}
            onPress={() => void advance()}
            testID="club-setup-continue"
          />
          {skipLabel ? (
            <Button
              label={skipLabel}
              variant="ghost"
              fullWidth
              disabled={saving || busy}
              onPress={goNext}
              testID="club-setup-skip"
            />
          ) : null}
        </View>
      }
      testID="club-setup-screen"
    >
      <View style={{ paddingTop: spacing.md }}>
        {heading ? <StepHeading title={heading.title} subtitle={heading.subtitle} /> : null}

        {step === 'basics' ? <BasicsFields draft={draft} errors={errors.basics} onChange={change} /> : null}
        {step === 'where' ? (
          <WhereFields draft={draft} errors={errors.where} onChange={change} />
        ) : null}
        {step === 'sports' ? <SportsFields draft={draft} showError={errors.sports} onChange={change} /> : null}
        {step === 'contact' ? <ContactFields draft={draft} errors={errors.contact} onChange={change} /> : null}
        {step === 'branding' ? (
          <BrandingFields draft={draft} onChange={change} onBusyChange={setBusy} />
        ) : null}
        {step === 'verify' ? (
          <VerificationFields
            value={papers}
            errors={errors.verify}
            onChange={changePapers}
            onBusyChange={setBusy}
          />
        ) : null}
        {step === 'done' ? <ClubSetupDone draft={draft} papersSent={papersSent} /> : null}
      </View>
    </Screen>
  );
}
