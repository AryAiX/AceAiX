import React from 'react';
import { I18nManager } from 'react-native';
import { ChevronLeft, ChevronRight, type LucideProps } from 'lucide-react-native';

/**
 * Right-to-left only takes effect after a restart, so reading the flag once at
 * module load is enough.
 */
export const isRTL = I18nManager.isRTL;

/* A scaleX transform on the icon flips the SVG about its origin, out of view,
   so direction is chosen by picking the other glyph instead. */

/** Points the way "back" reads: left in LTR, right in RTL. */
export function ChevronBack(props: LucideProps) {
  return isRTL ? <ChevronRight {...props} /> : <ChevronLeft {...props} />;
}

/** Points the way "forward" reads: right in LTR, left in RTL. */
export function ChevronForward(props: LucideProps) {
  return isRTL ? <ChevronLeft {...props} /> : <ChevronRight {...props} />;
}
