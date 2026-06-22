export const colors = {
  navy900: '#07111F',
  navy800: '#0C1A2B',
  navy700: '#13263D',
  navy600: '#1B3352',
  slate: '#8CA0B8',
  muted: '#5F748C',
  white: '#FFFFFF',
  azure: '#2F80ED',
  volt: '#B8F135',
  emerald: '#1FB57A',
  warning: '#F5A524',
  danger: '#EF5350',
};

export const spacing = {
  page: 20,
  card: 16,
  radius: 24,
};

export function scoreColor(score: number) {
  if (score >= 80) return colors.volt;
  if (score >= 60) return colors.azure;
  if (score >= 35) return colors.warning;
  return colors.muted;
}
