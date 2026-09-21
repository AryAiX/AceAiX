import React from 'react';

import { BrandSplash } from '@/components/common/BrandSplash';

/**
 * Entry route. The gate in `_layout.tsx` decides where to send the person
 * once the session and profile have loaded; this screen is just the moment
 * in between.
 *
 * It was a spinner on an empty page. The native splash has just shown the
 * logo, so a spinner reads as the app having lost it — this holds the same
 * logo instead, and the launch looks like one screen rather than three.
 */
export default function Index() {
  return <BrandSplash testID="entry-splash" />;
}
