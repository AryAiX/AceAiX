import React from 'react';

import { SponsorshipPortal } from '@/components/sponsorship/SponsorshipPortal';

/**
 * The sponsor's tab. The same portal as `/sponsorship`, without a back
 * button, because this is a tab rather than a page stacked on top of one.
 */
export default function SponsorshipTab() {
  return <SponsorshipPortal back={false} />;
}
