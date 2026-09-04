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
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
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
              paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={edges} testID={testID}>
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
