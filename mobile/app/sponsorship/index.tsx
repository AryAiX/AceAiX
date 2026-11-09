import React from 'react';

import { SponsorshipPortal } from '@/components/sponsorship/SponsorshipPortal';

/**
 * The sponsorship portal, pushed on the stack.
 *
 * Athletes, guardians, and a sponsor's "Open portal" button all land here,
 * so this screen keeps its back button.
 */
export default function SponsorshipPortalScreen() {
  return <SponsorshipPortal />;
}
