import React from 'react';

import { LegalDocument } from '@/components/settings/LegalDocument';
import { useT } from '@/i18n';
import { GUIDELINES_MD } from '@/lib/legal';

/** English-only document; the chrome around it is translated. */
export default function GuidelinesScreen() {
  const t = useT();
  return (
    <LegalDocument
      title={t('common.communityGuidelines')}
      markdown={GUIDELINES_MD}
      testID="legal-guidelines"
    />
  );
}
