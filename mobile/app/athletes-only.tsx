import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/context/AuthContext';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { ShieldOff, Globe, LogOut } from 'lucide-react-native';

export default function AthletesOnlyScreen() {
  const { signOut } = useAuth();

  async function openWebPlatform() {
    await WebBrowser.openBrowserAsync('https://app.aceaix.com');
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0B0F17', '#0D1420', '#0B0F17']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, { top: -80, right: -60 }]} />

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <ShieldOff color={Colors.warning} size={44} strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Athletes Only</Text>
        <Text style={styles.body}>
          The AceAiX mobile app is built for athletes. Please continue on our web platform.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={openWebPlatform}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primary, '#1A6AD4']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Globe color={Colors.white} size={18} />
            <Text style={styles.btnText}>Open Web Platform</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignOut}>
          <LogOut color={Colors.textMuted} size={16} />
          <Text style={styles.secondaryBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 176, 32, 0.12)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radii.xl,
    backgroundColor: 'rgba(255, 176, 32, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 176, 32, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.xxxl,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  body: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxxl,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  btnText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  secondaryBtnText: {
    fontFamily: Typography.family.medium,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
  },
});
