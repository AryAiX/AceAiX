import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass } from 'lucide-react-native';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.root}>
        <LinearGradient
          colors={['#0B0F17', '#0D1420', '#0B0F17']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Compass color={Colors.warning} size={48} strokeWidth={1.5} />
          </View>

          <Text style={styles.title}>Page not found</Text>
          <Text style={styles.subtitle}>
            The screen you&apos;re looking for doesn&apos;t exist or may have moved.
          </Text>

          <Link href="/" style={styles.primaryBtn} asChild>
            <View>
              <LinearGradient
                colors={[Colors.primary, '#1A6AD4']}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>Back to Dashboard</Text>
              </LinearGradient>
            </View>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
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
    fontSize: Typography.size.xxl,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Typography.family.regular,
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xxxl,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: Radii.md,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
  },
  btnText: {
    fontFamily: Typography.family.bold,
    fontSize: Typography.size.md,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
