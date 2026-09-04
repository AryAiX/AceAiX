import React from 'react';

import { LegalDocument } from '@/components/settings/LegalDocument';
import { useT } from '@/i18n';
import { CHILD_SAFETY_MD } from '@/lib/legal';

/**
 * Google Play requires a social app that hosts user-generated content to
 * publish child-safety standards. This screen is the in-app copy of them.
 *
 * Like the other three documents it is published in English and is not
 * translated; only the screen around it is.
 */
export default function ChildSafetyScreen() {
  const t = useT();
  return (
    <LegalDocument
      title={t('common.childSafety')}
      markdown={CHILD_SAFETY_MD}
      testID="legal-child-safety"
    />
  );
}
