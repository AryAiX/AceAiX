import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CheckCircle2, MailCheck } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import {
  Button,
  Card,
  ConfirmSheet,
  ErrorState,
  Loader,
  Screen,
  Text,
  useToast,
} from '@/components/ui';
import { useT } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { errorMessage } from '@/lib/errors';
import { firstName as firstNameOf } from '@/lib/format';
import {
  completeOnboarding,
  getGuardianConsents,
  getMatchPreferences,
  getMyProfile,
  refreshMyTalentScore,
  requestGuardianConsent,
  saveMatchPreferences,
  setFavoriteTeams as saveFavoriteTeams,
  setFavoriteVenue as saveFavoriteVenue,
  updateAthleteProfile,
  updateUserProfile,
} from '@/lib/api';
import {
  applyPendingDateOfBirth,
  updateCoachProfile,
  updateScoutProfile,
  uploadAvatar,
} from '@/lib/api.auth';
import type { FullTalentScore, GuardianConsent, Team } from '@/types/models';
import { WizardTopBar, isValidEmail } from '@/components/onboarding/Shared';
import {
  HEIGHT_RANGE_CM,
  LevelStep,
  PhysicalStep,
  PlaceStep,
  PositionStep,
  SportStep,
  WEIGHT_RANGE_KG,
} from '@/components/onboarding/AthleteSteps';
import {
  GuardianConsentStep,
  type GuardianRelationship,
} from '@/components/onboarding/GuardianConsentStep';
import { GuardianIntroStep } from '@/components/onboarding/GuardianIntroStep';
import { PhotoStep, type PickedPhoto } from '@/components/onboarding/PhotoStep';
import { TeamsStep } from '@/components/onboarding/TeamsStep';
import { AthleteFinishStep, SimpleFinishStep } from '@/components/onboarding/FinishStep';
import {
  RECRUITER_AGE_BANDS,
  RecruiterPlaceStep,
  RecruiterRoleStep,
  RecruiterSportsStep,
  RecruiterTargetStep,
} from '@/components/onboarding/RecruiterSteps';
import { positionsFor } from '@/constants/sports';

/**
 * The profile wizard. Runs once, for an account whose profile still has
 * `onboarding_completed = false`.
 *
 * Two rules hold the whole screen together:
 *
 *  1. Every answer is written to the database when the person moves forward,
 *     so closing the app halfway loses nothing.
 *  2. The last step calls `completeOnboarding()`. Without it the gate in
 *     app/_layout.tsx sends the person straight back here, forever.
 */

type StepKey =
  | 'sport'
  | 'position'
  | 'level'
  | 'place'
  | 'physical'
  | 'guardian'
  | 'photo'
  | 'teams'
  | 'sports'
  | 'role'
  | 'target'
  | 'intro'
  | 'done';

type Path = 'athlete' | 'recruiter' | 'guardian' | 'basic';

export default function OnboardingScreen() {
  const theme = useTheme();
  const t = useT();
  const { colors, spacing } = theme;
  const toast = useToast();
  const { profile, signOut, refreshProfile } = useAuth();

  const role = profile?.role ?? 'athlete';
  const path: Path =
    role === 'athlete'
      ? 'athlete'
      : role === 'coach' || role === 'club' || role === 'scout'
        ? 'recruiter'
        : role === 'guardian'
          ? 'guardian'
          : 'basic';
  const isClub = role === 'club';
  const isMinor = profile?.is_minor === true;

  // ── Boot ───────────────────────────────────────────────────────────────────
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  // ── Draft ──────────────────────────────────────────────────────────────────
  const [sport, setSport] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [club, setClub] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [side, setSide] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [favoriteTeams, setFavoriteTeams] = useState<Team[]>([]);
  const [venue, setVenue] = useState('');

  const [guardianName, setGuardianName] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState<GuardianRelationship>('parent');
  const [guardianNameError, setGuardianNameError] = useState<string | null>(null);
  const [guardianEmailError, setGuardianEmailError] = useState<string | null>(null);
  const [guardianConsent, setGuardianConsent] = useState<GuardianConsent | null>(null);
  const [guardianRequested, setGuardianRequested] = useState(false);
  const [confirmingSkip, setConfirmingSkip] = useState(false);

  const [sports, setSports] = useState<string[]>([]);
  const [specialty, setSpecialty] = useState('');
  const [specialtyError, setSpecialtyError] = useState<string | null>(null);
  const [positions, setPositions] = useState<string[]>([]);
  const [ageBandKey, setAgeBandKey] = useState('any');

  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [score, setScore] = useState<FullTalentScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const guardianGranted = guardianConsent?.status === 'granted';

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    try {
      // The date of birth was collected at sign-up but can only be written with
      // a session. Everything about minor safety hangs off it, so it goes first
      // and a failure stops the wizard rather than quietly skipping the
      // guardian step.
      const appliedDate = await applyPendingDateOfBirth();

      const [account, bundle] = await Promise.all([refreshProfile(), getMyProfile()]);

      // Discovery filters and the Talent Score both read the athlete record's
      // own birth date, so it is written there as well as in user_private.
      if (appliedDate && account?.role === 'athlete') {
        await updateAthleteProfile({ birth_date: appliedDate });
      }

      setCountry(bundle.user.country ?? null);
      setCity(bundle.user.city ?? '');
      setAvatarUri(bundle.user.avatar_url ?? null);

      if (bundle.athlete) {
        setSport(bundle.athlete.sport ?? null);
        setPosition(bundle.athlete.position ?? null);
        // 'amateur' is the column default, not an answer anybody gave — leaving
        // it unset makes the person choose their level on purpose.
        setLevel(
          bundle.athlete.level && bundle.athlete.level !== 'amateur' ? bundle.athlete.level : null,
        );
        setClub(bundle.athlete.club ?? '');
        setSide(bundle.athlete.dominant_foot ?? null);
        setHeight(bundle.athlete.height_cm ? String(Math.round(bundle.athlete.height_cm)) : '');
        setWeight(bundle.athlete.weight_kg ? String(Math.round(bundle.athlete.weight_kg)) : '');
      }

      if (account?.is_minor) {
        const consents = await getGuardianConsents();
        const granted = consents.find((c) => c.status === 'granted');
        const pending = consents.find((c) => c.status === 'pending');
        const existing = granted ?? pending ?? null;
        setGuardianConsent(existing);
        if (existing) {
          setGuardianName(existing.guardian_name);
          setGuardianEmail(existing.guardian_email);
          if (existing.relationship === 'guardian') setGuardianRelationship('guardian');
        }
      }

      if (account?.role === 'coach' || account?.role === 'club' || account?.role === 'scout') {
        const prefs = await getMatchPreferences();
        if (prefs) {
          setSports(prefs.sports ?? []);
          setPositions(prefs.positions ?? []);
        }
      }
    } catch (err) {
      setBootError(errorMessage(err));
    } finally {
      setBooting(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    void boot();
  }, [boot]);

  // ── Steps ──────────────────────────────────────────────────────────────────
  const steps: StepKey[] = useMemo(() => {
    switch (path) {
      case 'athlete':
        return [
          'sport',
          'position',
          'level',
          'place',
          'physical',
          // Only a minor without an approval already on file needs this.
          ...(isMinor && !guardianGranted ? (['guardian'] as StepKey[]) : []),
          'photo',
          /* The easy question, last: after a wizard of measurements and
             consent forms, "who do you support?" is the one a fourteen-year-old
             answers without thinking, and it is what the feed uses on day one. */
          'teams',
          'done',
        ];
      case 'recruiter':
        return ['sports', 'role', 'place', 'target', 'teams', 'done'];
      case 'guardian':
        return ['intro', 'done'];
      default:
        return ['done'];
    }
  }, [path, isMinor, guardianGranted]);

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex];

  const heightError =
    height && (Number(height) < HEIGHT_RANGE_CM.min || Number(height) > HEIGHT_RANGE_CM.max)
      ? t('onboarding.heightOutOfRange', {
          min: HEIGHT_RANGE_CM.min,
          max: HEIGHT_RANGE_CM.max,
        })
      : null;
  const weightError =
    weight && (Number(weight) < WEIGHT_RANGE_KG.min || Number(weight) > WEIGHT_RANGE_KG.max)
      ? t('onboarding.weightOutOfRange', {
          min: WEIGHT_RANGE_KG.min,
          max: WEIGHT_RANGE_KG.max,
        })
      : null;

  // ── Score, on the last athlete step ────────────────────────────────────────
  const loadScore = useCallback(async () => {
    setScoreLoading(true);
    setScoreError(null);
    try {
      setScore(await refreshMyTalentScore());
    } catch (err) {
      setScoreError(errorMessage(err));
    } finally {
      setScoreLoading(false);
    }
  }, []);

  useEffect(() => {
    if (path === 'athlete' && step === 'done') void loadScore();
  }, [path, step, loadScore]);

  // ── Persisting ─────────────────────────────────────────────────────────────
  const ageBand = RECRUITER_AGE_BANDS.find((band) => band.key === ageBandKey);

  const persist = useCallback(async (): Promise<boolean> => {
    try {
      switch (step) {
        case 'sport':
          // Changing sport invalidates a position from the old one.
          await updateAthleteProfile({ sport });
          break;
        case 'position':
          await updateAthleteProfile({ position_primary: position, position });
          break;
        case 'level':
          await updateAthleteProfile({ level });
          break;
        case 'place':
          await updateAthleteProfile({ current_club: club.trim() || null });
          await updateUserProfile({ country, city: city.trim() || null });
          break;
        case 'physical':
          await updateAthleteProfile({
            height_cm: height ? Number(height) : null,
            weight_kg: weight ? Number(weight) : null,
            dominant_foot: side,
          });
          break;
        case 'guardian': {
          const consent = await requestGuardianConsent(
            guardianName.trim(),
            guardianEmail.trim().toLowerCase(),
            guardianRelationship,
          );
          setGuardianConsent(consent);
          setGuardianRequested(true);
          break;
        }
        case 'teams':
          /* Both are optional, and both are written even when empty so that
             clearing a choice on a second pass through the wizard sticks. */
          await saveFavoriteTeams(favoriteTeams.map((team) => team.id));
          await saveFavoriteVenue(venue.trim() || null);
          break;
        case 'sports':
          await saveMatchPreferences({ sports });
          break;
        case 'role':
          if (isClub) {
            await updateScoutProfile({
              credentials: [specialty.trim(), club.trim()].filter(Boolean).join(' — ') || null,
            });
          } else {
            await updateCoachProfile({
              specialty: specialty.trim() || null,
              current_club: club.trim() || null,
            });
          }
          break;
        case 'target':
          await saveMatchPreferences({
            sports,
            positions,
            age_min: ageBand?.min ?? null,
            age_max: ageBand?.max ?? null,
          });
          break;
        default:
          break;
      }
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }, [
    step,
    sport,
    position,
    level,
    club,
    country,
    city,
    height,
    weight,
    side,
    favoriteTeams,
    venue,
    guardianName,
    guardianEmail,
    guardianRelationship,
    sports,
    positions,
    specialty,
    isClub,
    ageBand,
    toast,
  ]);

  // The recruiter "where are you based" step writes the same two fields as the
  // athlete one, plus the coach record.
  const persistRecruiterPlace = useCallback(async (): Promise<boolean> => {
    try {
      await updateUserProfile({ country, city: city.trim() || null });
      if (!isClub) await updateCoachProfile({ country });
      return true;
    } catch (err) {
      toast.error(errorMessage(err));
      return false;
    }
  }, [country, city, isClub, toast]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const canContinue = (): boolean => {
    switch (step) {
      case 'sport':
        return sport !== null;
      case 'position':
        return positionsFor(sport).length === 0 || position !== null;
      case 'level':
        return level !== null;
      case 'physical':
        return !heightError && !weightError;
      case 'guardian':
        return guardianName.trim().length >= 2 && isValidEmail(guardianEmail);
      case 'sports':
        return sports.length > 0;
      case 'role':
        return specialty.trim().length >= 2;
      default:
        return true;
    }
  };

  const validateStep = (): boolean => {
    if (step === 'guardian') {
      const nameError =
        guardianName.trim().length < 2 ? t('onboarding.guardianNameRequired') : null;
      const emailError = !guardianEmail.trim()
        ? t('onboarding.guardianEmailRequired')
        : isValidEmail(guardianEmail)
          ? null
          : t('onboarding.guardianEmailInvalid');
      setGuardianNameError(nameError);
      setGuardianEmailError(emailError);
      return !nameError && !emailError;
    }
    if (step === 'role') {
      const error = specialty.trim().length < 2 ? t('onboarding.recruiterRoleRequired') : null;
      setSpecialtyError(error);
      return !error;
    }
    return true;
  };

  const finish = async () => {
    setSaving(true);
    try {
      await completeOnboarding();
      // Without the refresh the gate still sees an unfinished profile and
      // sends the person back to step one.
      await refreshProfile();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const advance = async () => {
    if (saving) return;
    if (step === 'done') {
      await finish();
      return;
    }
    if (!validateStep()) return;

    setSaving(true);
    const ok =
      path === 'recruiter' && step === 'place' ? await persistRecruiterPlace() : await persist();
    setSaving(false);
    if (!ok) return;

    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const skipGuardian = () => {
    setConfirmingSkip(false);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const pickPhoto = async (photo: PickedPhoto) => {
    setPhotoError(null);
    setAvatarUri(photo.uri);
    setUploading(true);
    try {
      const url = await uploadAvatar({
        base64: photo.base64,
        fileName: photo.fileName,
        mimeType: photo.mimeType,
      });
      await updateUserProfile({ avatar_url: url });
      setAvatarUri(url);
      await refreshProfile();
    } catch (err) {
      setPhotoError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!profile || booting) {
    return (
      <Screen testID="onboarding-loading">
        <Loader label={t('onboarding.loading')} style={{ paddingTop: spacing.giant }} />
      </Screen>
    );
  }

  if (bootError) {
    return (
      <Screen testID="onboarding-error">
        <View style={{ paddingTop: spacing.giant }}>
          <ErrorState message={bootError} onRetry={() => void boot()} />
        </View>
      </Screen>
    );
  }

  const skippable = step === 'physical' || step === 'photo' || step === 'teams';
  const continueLabel = step === 'done' ? t('onboarding.finish') : t('common.continue');
  const knownName = profile.first_name ?? profile.full_name;
  const name = knownName ? firstNameOf(knownName) : '';

  return (
    <Screen
      keyboardAvoiding
      header={
        <WizardTopBar
          step={safeIndex}
          total={steps.length}
          hideBack={safeIndex === 0}
          onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
          right={
            /* The only way out of the wizard. Rare, but an account holder must
               never be trapped in a flow they cannot leave. */
            safeIndex === 0 ? (
              <Pressable
                onPress={() => void signOut()}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.signOut')}
                style={({ pressed }) => ({
                  minHeight: theme.hit.min,
                  justifyContent: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text variant="captionStrong" tone="muted">
                  {t('onboarding.signOut')}
                </Text>
              </Pressable>
            ) : undefined
          }
        />
      }
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button
            label={continueLabel}
            size="lg"
            fullWidth
            loading={saving}
            disabled={!canContinue()}
            onPress={() => void advance()}
            testID="onboarding-continue"
          />
          {skippable ? (
            <Button
              label={t('onboarding.skipForNow')}
              variant="ghost"
              fullWidth
              disabled={saving || uploading}
              onPress={() => setStepIndex((i) => Math.min(i + 1, steps.length - 1))}
              testID="onboarding-skip"
            />
          ) : null}
        </View>
      }
      testID="onboarding-screen"
    >
      <View style={{ paddingTop: spacing.md }}>
        {step === 'sport' ? (
          <SportStep
            value={sport}
            onChange={(next) => {
              setSport(next);
              // A position from a different sport would be nonsense.
              if (next !== sport) setPosition(null);
            }}
          />
        ) : null}

        {step === 'position' ? (
          <PositionStep sport={sport} value={position} onChange={setPosition} />
        ) : null}

        {step === 'level' ? <LevelStep value={level} onChange={setLevel} /> : null}

        {step === 'place' && path === 'athlete' ? (
          <PlaceStep
            club={club}
            country={country}
            city={city}
            onChangeClub={setClub}
            onChangeCountry={setCountry}
            onChangeCity={setCity}
          />
        ) : null}

        {step === 'physical' ? (
          <PhysicalStep
            height={height}
            weight={weight}
            side={side}
            heightError={heightError}
            weightError={weightError}
            onChangeHeight={setHeight}
            onChangeWeight={setWeight}
            onChangeSide={setSide}
          />
        ) : null}

        {step === 'teams' ? (
          <TeamsStep
            sport={sport}
            teams={favoriteTeams}
            venue={venue}
            onChangeTeams={setFavoriteTeams}
            onChangeVenue={setVenue}
          />
        ) : null}

        {step === 'guardian' ? (
          <GuardianConsentStep
            name={guardianName}
            email={guardianEmail}
            relationship={guardianRelationship}
            nameError={guardianNameError}
            emailError={guardianEmailError}
            onChangeName={(value) => {
              setGuardianName(value);
              if (guardianNameError) setGuardianNameError(null);
            }}
            onChangeEmail={(value) => {
              setGuardianEmail(value);
              if (guardianEmailError) setGuardianEmailError(null);
            }}
            onChangeRelationship={setGuardianRelationship}
            onSkip={() => setConfirmingSkip(true)}
          />
        ) : null}

        {step === 'photo' ? (
          <PhotoStep
            name={profile.full_name}
            previewUri={avatarUri}
            uploading={uploading}
            error={photoError}
            onPicked={(photo) => void pickPhoto(photo)}
            onError={setPhotoError}
          />
        ) : null}

        {step === 'sports' ? (
          <RecruiterSportsStep
            value={sports}
            onToggle={(next) =>
              setSports((current) =>
                current.includes(next) ? current.filter((s) => s !== next) : [...current, next],
              )
            }
          />
        ) : null}

        {step === 'role' ? (
          <RecruiterRoleStep
            isClub={isClub}
            specialty={specialty}
            club={club}
            specialtyError={specialtyError}
            onChangeSpecialty={(value) => {
              setSpecialty(value);
              if (specialtyError) setSpecialtyError(null);
            }}
            onChangeClub={setClub}
          />
        ) : null}

        {step === 'place' && path === 'recruiter' ? (
          <RecruiterPlaceStep
            country={country}
            city={city}
            onChangeCountry={setCountry}
            onChangeCity={setCity}
          />
        ) : null}

        {step === 'target' ? (
          <RecruiterTargetStep
            sports={sports}
            positions={positions}
            ageBandKey={ageBandKey}
            onTogglePosition={(next) =>
              setPositions((current) =>
                current.includes(next) ? current.filter((p) => p !== next) : [...current, next],
              )
            }
            onChangeAgeBand={setAgeBandKey}
          />
        ) : null}

        {step === 'intro' ? <GuardianIntroStep /> : null}

        {step === 'done' && path === 'athlete' ? (
          <View style={{ gap: spacing.xl }}>
            <AthleteFinishStep
              firstName={name}
              score={score}
              loading={scoreLoading}
              error={scoreError}
              onRetry={() => void loadScore()}
            />

            {guardianRequested ? (
              <Card tone="primarySoft">
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <MailCheck size={20} color={colors.primary} />
                  <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                    {t('onboarding.guardianRequested', { name: guardianName.trim() })}
                  </Text>
                </View>
              </Card>
            ) : null}

            {isMinor && !guardianRequested && !guardianGranted ? (
              <Card tone="alt">
                <Text variant="captionStrong">{t('onboarding.guardianPendingTitle')}</Text>
                <Text variant="caption" tone="secondary" style={{ marginTop: spacing.xs }}>
                  {t('onboarding.guardianPendingBody')}
                </Text>
              </Card>
            ) : null}
          </View>
        ) : null}

        {step === 'done' && path === 'recruiter' ? (
          <SimpleFinishStep
            title={
              name
                ? t('onboarding.recruiterDoneTitleNamed', { name })
                : t('onboarding.recruiterDoneTitle')
            }
            body={t('onboarding.recruiterDoneBody')}
            points={[
              t('onboarding.recruiterDonePointSearch'),
              t('onboarding.recruiterDonePointPost'),
              t('onboarding.recruiterDonePointVerified'),
            ]}
          />
        ) : null}

        {step === 'done' && (path === 'guardian' || path === 'basic') ? (
          <SimpleFinishStep
            title={t('onboarding.doneTitle')}
            body={t(
              path === 'guardian' ? 'onboarding.guardianDoneBody' : 'onboarding.basicDoneBody',
            )}
          />
        ) : null}

        {step === 'done' && path === 'guardian' ? (
          <Card tone="alt" style={{ marginTop: spacing.xl }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <CheckCircle2 size={20} color={colors.success} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {t('onboarding.guardianDoneNote')}
              </Text>
            </View>
          </Card>
        ) : null}
      </View>

      <ConfirmSheet
        visible={confirmingSkip}
        title={t('onboarding.guardianSkipSheetTitle')}
        message={t('onboarding.guardianSkipSheetMessage')}
        confirmLabel={t('onboarding.guardianSkipSheetConfirm')}
        cancelLabel={t('onboarding.guardianSkipSheetCancel')}
        onConfirm={skipGuardian}
        onCancel={() => setConfirmingSkip(false)}
      />
    </Screen>
  );
}
