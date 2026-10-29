import React from 'react';

import { CoachingHome } from '@/components/coaching/CoachingHome';

/**
 * Coaching, pushed on the stack.
 *
 * Every role keeps this header and back button. The body is shared with the
 * guardian's Children tab, which draws it without a second screen.
 */
export default function CoachingScreen() {
  return <CoachingHome />;
}
