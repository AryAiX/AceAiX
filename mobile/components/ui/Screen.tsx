import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. Set false for FlatList screens. */
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Sticky element rendered above the scroll area (a header). */
  header?: React.ReactNode;
  /** Sticky element pinned to the bottom (a CTA bar). */
  footer?: React.ReactNode;
  background?: 'bg' | 'surface';
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  testID?: string;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  onRefresh,
  refreshing = false,
  header,
  footer,
  background = 'bg',
  contentStyle,
  keyboardAvoiding = false,
  testID,
}: Props) {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const insets = useSafeAreaInsets();

  const bg = background === 'surface' ? colors.surface : colors.bg;

  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        padded ? { paddingHorizontal: spacing.lg } : null,
        { paddingBottom: spacing.giant },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded ? { paddingHorizontal: spacing.lg } : null, contentStyle]}>
      {children}
    </View>
  );

  const inner = (
    <>
      {header}
      {body}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: bg,
              borderTopColor: colors.divider,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: bg }}
      edges={edges}
      testID={testID}
      /* On web a screen is the page's main region. Without it there is no
         landmark to jump to, so a screen-reader user walks the header and the
         tab bar again on every screen. Hidden screens carry the role too, but
         they are `aria-hidden`, so assistive tech only ever sees the live one.
         Native has no landmarks and ignores the prop. */
      {...(Platform.OS === 'web' ? { role: 'main' as const } : null)}
    >
      <StatusBar style={colors.statusBar} />
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          {inner}
        </KeyboardAvoidingView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
