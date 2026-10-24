import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Pressable, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Download, Sparkles, X } from 'lucide-react-native';

import { Button, Sheet, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { en } from '@/i18n/locales/en';
import {
  chooseLaunchPrompt,
  decideUpdate,
  decideWhatsNew,
  versionNotesKey,
  type PlatformVersion,
} from '@/lib/appVersion';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Update and "what's new" sheets.
 *
 * Mounted once, next to push registration, and only after the language gate
 * so the copy is in the language they chose. iOS and Android only: the web
 * build has no store page, and a native version API would report Expo Go's
 * own version rather than AceAiX.
 *
 * One sheet per launch. A forced update wins, then release notes, then an
 * update they can postpone. A missing row or a failed read stays silent.
 */

const DISMISSED_KEY = 'aceaix.update-dismissed';
const SEEN_KEY = 'aceaix.last-seen-version';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

type Prompt =
  | { kind: 'required'; storeUrl: string; latest: string | null }
  | { kind: 'available'; storeUrl: string; latest: string }
  | { kind: 'whatsNew'; version: string; noteIds: string[] };

interface StoreRecord extends PlatformVersion {
  storeUrl: string | null;
}

export function useAppVersionPrompts(enabled: boolean) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const shownRef = useRef(false);
  const lastCheckAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

    let cancelled = false;
    const os = Platform.OS;

    const evaluate = async () => {
      if (cancelled || shownRef.current) return;

      const installed = Constants.expoConfig?.version?.trim() ?? '';
      if (!installed) return;

      let dismissed: string | null;
      let lastSeen: string | null;
      try {
        const [storedDismissed, storedSeen] = await Promise.all([
          AsyncStorage.getItem(DISMISSED_KEY),
          AsyncStorage.getItem(SEEN_KEY),
        ]);
        dismissed = storedDismissed?.trim() || null;
        lastSeen = storedSeen?.trim() || null;
      } catch {
        return;
      }
      if (cancelled || shownRef.current) return;

      /* First launch: remember this build and do not announce it as news. */
      if (!lastSeen) {
        try {
          await AsyncStorage.setItem(SEEN_KEY, installed);
        } catch {
          /* What's new stays skipped either way; try again next launch. */
        }
      }

      const record = await readStoreRecord(os);
      if (!record || cancelled || shownRef.current) return;

      const noteIds = releaseNoteIds(installed);
      const choice = chooseLaunchPrompt(
        decideUpdate(installed, record, dismissed),
        decideWhatsNew(installed, lastSeen, noteIds.length > 0),
      );

      if (choice === 'required') {
        if (!isHttpUrl(record.storeUrl)) return;
        shownRef.current = true;
        if (!cancelled) {
          setPrompt({
            kind: 'required',
            storeUrl: record.storeUrl,
            latest: record.latest ?? null,
          });
        }
        return;
      }

      if (choice === 'whatsNew') {
        /* Record it before the sheet paints, so a crash cannot show it twice. */
        try {
          await AsyncStorage.setItem(SEEN_KEY, installed);
        } catch {
          return;
        }
        if (cancelled || shownRef.current) return;
        shownRef.current = true;
        setPrompt({ kind: 'whatsNew', version: installed, noteIds });
        return;
      }

      if (choice === 'available' && record.latest && isHttpUrl(record.storeUrl)) {
        shownRef.current = true;
        if (!cancelled) {
          setPrompt({ kind: 'available', storeUrl: record.storeUrl, latest: record.latest });
        }
      }
    };

    const run = () => {
      if (cancelled || shownRef.current) return;
      const now = Date.now();
      if (lastCheckAt.current > 0 && now - lastCheckAt.current < SIX_HOURS_MS) return;
      lastCheckAt.current = now;
      void evaluate();
    };

    run();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled]);

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  if (!prompt) return null;

  return <VersionPrompt prompt={prompt} onDismiss={() => setPrompt(null)} />;
}

function VersionPrompt({ prompt, onDismiss }: { prompt: Prompt; onDismiss: () => void }) {
  const t = useT();

  if (prompt.kind === 'whatsNew') {
    const key = versionNotesKey(prompt.version);
    return (
      <PromptSheet
        testID="app-whats-new"
        icon={Sparkles}
        title={t('whatsNew.title', { version: readableVersion(prompt.version) })}
        notes={prompt.noteIds.map((id) => ({ id, text: t(`whatsNew.${key}.${id}`) }))}
        primaryLabel={t('whatsNew.gotIt')}
        onPrimary={onDismiss}
        onClose={onDismiss}
        showClose
      />
    );
  }

  const required = prompt.kind === 'required';
  const postpone = () => {
    if (prompt.kind !== 'available') return;
    const latest = prompt.latest;
    void AsyncStorage.setItem(DISMISSED_KEY, latest)
      .catch(() => {})
      .finally(onDismiss);
  };

  return (
    <PromptSheet
      testID={required ? 'app-update-required' : 'app-update-available'}
      icon={Download}
      title={t(required ? 'whatsNew.updateRequiredTitle' : 'whatsNew.updateTitle')}
      version={prompt.latest}
      body={t(required ? 'whatsNew.updateRequiredBody' : 'whatsNew.updateBody')}
      primaryLabel={t('whatsNew.update')}
      onPrimary={() => {
        Linking.openURL(prompt.storeUrl).catch(() => {});
      }}
      secondaryLabel={required ? undefined : t('whatsNew.later')}
      onSecondary={required ? undefined : postpone}
      dismissable={!required}
      hideClose
      swipeToDismiss={!required}
      onClose={required ? () => {} : postpone}
    />
  );
}

function PromptSheet({
  testID,
  icon: Icon,
  title,
  version,
  body,
  notes,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  dismissable = true,
  hideClose = false,
  swipeToDismiss = false,
  showClose = false,
  onClose,
}: {
  testID: string;
  icon: typeof Download;
  title: string;
  version?: string | null;
  body?: string;
  notes?: { id: string; text: string }[];
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  dismissable?: boolean;
  hideClose?: boolean;
  swipeToDismiss?: boolean;
  showClose?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const { colors, radii, spacing, size, lineHeight } = theme;

  return (
    <Sheet
      visible
      testID={testID}
      onClose={onClose}
      dismissable={dismissable}
      hideClose={hideClose || !showClose}
      swipeToDismiss={swipeToDismiss}
      scrollable={Boolean(notes)}
      footerDivider={false}
      footer={
        <View style={{ gap: spacing.sm }}>
          <Button label={primaryLabel} fullWidth onPress={onPrimary} />
          {secondaryLabel && onSecondary ? (
            <Button label={secondaryLabel} variant="ghost" fullWidth onPress={onSecondary} />
          ) : null}
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.xs }}>
        {showClose ? (
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surfaceAlt,
              }}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}

        <LinearGradient
          colors={theme.gradients.action}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={32} color={colors.textOnBrand} />
        </LinearGradient>

        <Text
          variant="heading"
          align="center"
          accessibilityRole="header"
          style={{ fontSize: size.xl, lineHeight: size.xl * lineHeight.snug }}
        >
          {title}
        </Text>

        {version ? (
          <View
            style={{
              backgroundColor: colors.primarySoft,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
            }}
          >
            <Text variant="captionStrong" tone="primary" align="center">
              {t('whatsNew.version', { version: readableVersion(version) })}
            </Text>
          </View>
        ) : null}

        {body ? (
          <Text variant="body" tone="secondary" align="center">
            {body}
          </Text>
        ) : null}

        {notes ? (
          <View style={{ alignSelf: 'stretch', gap: spacing.md }}>
            {notes.map((note) => (
              <View
                key={note.id}
                accessible
                accessibilityRole="text"
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
              >
                <View style={{ marginTop: 2 }}>
                  <Check size={18} color={colors.primary} />
                </View>
                <Text variant="body" tone="secondary" style={{ flex: 1 }}>
                  {note.text}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

function readableVersion(version: string): string {
  /* Keep 2.0.6 in order inside Arabic, where neutral dots would otherwise flip it. */
  return `\u2066${version}\u2069`;
}

function releaseNoteIds(version: string): string[] {
  const block = (en.whatsNew as Record<string, unknown>)[versionNotesKey(version)];
  if (!block || typeof block !== 'object' || Array.isArray(block)) return [];
  return Object.keys(block).filter(
    (id) => typeof (block as Record<string, unknown>)[id] === 'string',
  );
}

async function readStoreRecord(os: 'ios' | 'android'): Promise<StoreRecord | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'app_version')
      .maybeSingle();
    if (error || !data) return null;

    let value: unknown = data.value;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (!value || typeof value !== 'object') return null;

    const raw = (value as Record<string, unknown>)[os];
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const latest = typeof rec.latest === 'string' && rec.latest.trim() ? rec.latest.trim() : null;
    const minimum =
      typeof rec.minimum === 'string' && rec.minimum.trim() ? rec.minimum.trim() : null;
    const storeUrl =
      typeof rec.store_url === 'string' && rec.store_url.trim() ? rec.store_url.trim() : null;
    if (!latest && !minimum) return null;
    return { latest, minimum, storeUrl };
  } catch {
    return null;
  }
}

function isHttpUrl(url: string | null): url is string {
  return !!url && /^https?:\/\//i.test(url);
}
