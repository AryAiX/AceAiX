import type { ViewStyle } from 'react-native';

interface Palette {
  surface: string;
  border: string;
  divider: string;
}

/**
 * One row of a list drawn as a single white card: the first row rounds the
 * top, the last rounds the bottom, and a thin line sits between rows. The
 * rows are separate list items, so the card is drawn a row at a time.
 */
export function groupedRowStyle(
  index: number,
  count: number,
  colors: Palette,
  radius: number,
  background?: string,
): ViewStyle {
  const first = index === 0;
  const last = index === count - 1;
  return {
    backgroundColor: background ?? colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: last ? 1 : 0,
    borderColor: colors.border,
    borderTopColor: first ? colors.border : colors.divider,
    borderTopLeftRadius: first ? radius : 0,
    borderTopRightRadius: first ? radius : 0,
    borderBottomLeftRadius: last ? radius : 0,
    borderBottomRightRadius: last ? radius : 0,
  };
}
