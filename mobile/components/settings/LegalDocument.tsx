import React, { useMemo } from 'react';
import { Text as RNText, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Linking from 'expo-linking';

import { useTheme } from '@/theme/ThemeProvider';
import { Header, Screen, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { LAST_UPDATED_LABEL } from '@/lib/legal';
import { Routes } from '@/lib/routes';

/**
 * A very small Markdown renderer, written here on purpose.
 *
 * No Markdown library is installed, and the four legal documents only ever use
 * five constructs. Parsing exactly those five keeps the documents readable as
 * source, keeps the bundle honest, and means a reviewer sees the same text we
 * ship rather than something a library reflowed.
 *
 * Supported: `#`, `##`, `###` headings; blank-line separated paragraphs;
 * `-` bullets; `**bold**`; `[text](url)`. Everything else is literal text.
 */

type Span =
  | { kind: 'text'; text: string; bold: boolean }
  | { kind: 'link'; text: string; url: string };

type Block =
  | { kind: 'h1' | 'h2' | 'h3' | 'p' | 'li'; spans: Span[] };

/** Matches `**bold**` or `[label](url)`, whichever comes first. */
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(line: string): Span[] {
  const spans: Span[] = [];
  let cursor = 0;

  // `exec` in a loop rather than matchAll so the untouched text between two
  // matches is captured as well.
  INLINE.lastIndex = 0;
  let match = INLINE.exec(line);
  while (match) {
    if (match.index > cursor) {
      spans.push({ kind: 'text', text: line.slice(cursor, match.index), bold: false });
    }
    if (match[1] !== undefined) {
      spans.push({ kind: 'text', text: match[1], bold: true });
    } else if (match[2] !== undefined && match[3] !== undefined) {
      spans.push({ kind: 'link', text: match[2], url: match[3] });
    }
    cursor = match.index + match[0].length;
    match = INLINE.exec(line);
  }

  if (cursor < line.length) {
    spans.push({ kind: 'text', text: line.slice(cursor), bold: false });
  }
  return spans;
}

export function parseDocument(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'p', spans: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trim();

    if (line === '') {
      flush();
      continue;
    }
    if (line.startsWith('### ')) {
      flush();
      blocks.push({ kind: 'h3', spans: parseInline(line.slice(4)) });
      continue;
    }
    if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'h2', spans: parseInline(line.slice(3)) });
      continue;
    }
    if (line.startsWith('# ')) {
      flush();
      blocks.push({ kind: 'h1', spans: parseInline(line.slice(2)) });
      continue;
    }
    if (line.startsWith('- ')) {
      flush();
      blocks.push({ kind: 'li', spans: parseInline(line.slice(2)) });
      continue;
    }
    // Numbered steps read fine as their own line; keep the number visible.
    if (/^\d+\.\s/.test(line)) {
      flush();
      blocks.push({ kind: 'li', spans: parseInline(line) });
      continue;
    }
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/**
 * A document that cites a sibling policy by its public URL should still open
 * the screen the reader already has, not a browser tab of the same words.
 */
const IN_APP_LINKS: Record<string, Href> = {
  'https://aceaix.com/terms': Routes.terms,
  'https://aceaix.com/privacy': Routes.privacy,
  'https://aceaix.com/guidelines': Routes.guidelines,
  'https://aceaix.com/child-safety': Routes.childSafety,
};

/**
 * Inline spans use React Native's own Text, not the design-system one.
 *
 * Ours applies a full variant style — including a font size — and a nested
 * child style wins over the parent's, so a bold word inside a heading would
 * silently drop back to body size. A bare RNText inherits everything and
 * overrides only what the span actually needs.
 */
function Spans({ spans }: { spans: Span[] }) {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useI18n();

  const follow = (url: string) => {
    const internal = IN_APP_LINKS[url];
    if (internal) {
      router.push(internal);
      return;
    }
    Linking.openURL(url).catch(() => {
      /* no mail client, or the link is unreachable — nothing useful to say */
    });
  };

  return (
    <>
      {spans.map((span, i) =>
        span.kind === 'link' ? (
          <RNText
            key={i}
            accessibilityRole="link"
            accessibilityLabel={
              IN_APP_LINKS[span.url]
                ? span.text
                : t('settings.legalLinkExternal', { label: span.text })
            }
            onPress={() => follow(span.url)}
            style={{
              color: theme.colors.info,
              fontFamily: theme.font.semibold,
              textDecorationLine: 'underline',
            }}
          >
            {span.text}
          </RNText>
        ) : span.bold ? (
          <RNText key={i} style={{ fontFamily: theme.font.semibold }}>
            {span.text}
          </RNText>
        ) : (
          <RNText key={i}>{span.text}</RNText>
        ),
      )}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  const theme = useTheme();
  const { colors, spacing } = theme;

  switch (block.kind) {
    case 'h1':
      return (
        <Text variant="title" style={{ marginBottom: spacing.xs }}>
          <Spans spans={block.spans} />
        </Text>
      );
    case 'h2':
      return (
        <Text variant="heading" style={{ marginTop: spacing.xl, marginBottom: spacing.xs }}>
          <Spans spans={block.spans} />
        </Text>
      );
    case 'h3':
      return (
        <Text variant="subheading" style={{ marginTop: spacing.lg, marginBottom: spacing.xxs }}>
          <Spans spans={block.spans} />
        </Text>
      );
    case 'li':
      return (
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
          <View
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.primary,
              marginTop: 8,
            }}
          />
          <Text variant="body" tone="secondary" style={{ flex: 1 }}>
            <Spans spans={block.spans} />
          </Text>
        </View>
      );
    default:
      return (
        <Text variant="body" tone="secondary" style={{ marginTop: spacing.md }}>
          <Spans spans={block.spans} />
        </Text>
      );
  }
}

interface Props {
  /** Shown in the sticky header. The document's own `#` heading is separate. */
  title: string;
  markdown: string;
  testID?: string;
}

export function LegalDocument({ title, markdown, testID }: Props) {
  const theme = useTheme();
  const { colors, radii, spacing } = theme;
  const { t, language } = useI18n();
  const blocks = useMemo(() => parseDocument(markdown), [markdown]);

  let updatedPlaced = false;

  return (
    <Screen
      testID={testID}
      header={<Header title={title} back bordered />}
      contentStyle={{ paddingTop: spacing.md, paddingBottom: spacing.giant }}
    >
      {/* The document below is published in English and is never translated.
          Anyone reading the app in another language is told so first. */}
      {language !== 'en' ? (
        <Text variant="caption" tone="muted" style={{ marginBottom: spacing.md }}>
          {t('language.legalEnglishOnly')}
        </Text>
      ) : null}

      {blocks.map((block, i) => {
        const showUpdated = !updatedPlaced && block.kind === 'h1';
        if (showUpdated) updatedPlaced = true;

        return (
          <View key={i}>
            <BlockView block={block} />
            {showUpdated ? (
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 5,
                  marginTop: spacing.sm,
                  marginBottom: spacing.xs,
                }}
              >
                <Text variant="overline" tone="muted">
                  {t('settings.legalUpdated', { date: LAST_UPDATED_LABEL })}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}
