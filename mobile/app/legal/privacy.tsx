import React from 'react';

import { LegalDocument } from '@/components/settings/LegalDocument';
import { useT } from '@/i18n';
import { PRIVACY_MD } from '@/lib/legal';

/** English-only document; the chrome around it is translated. */
export default function PrivacyPolicyScreen() {
  const t = useT();
  return (
    <LegalDocument
      title={t('common.privacyPolicy')}
      markdown={PRIVACY_MD}
      testID="legal-privacy"
    />
  );
}
