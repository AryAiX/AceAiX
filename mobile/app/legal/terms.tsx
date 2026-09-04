import React from 'react';

import { LegalDocument } from '@/components/settings/LegalDocument';
import { useT } from '@/i18n';
import { TERMS_MD } from '@/lib/legal';

/**
 * The document itself is published in English and is not translated — only the
 * screen around it is. `LegalDocument` says so above the text whenever the app
 * is being read in another language.
 */
export default function TermsScreen() {
  const t = useT();
  return (
    <LegalDocument title={t('common.terms')} markdown={TERMS_MD} testID="legal-terms" />
  );
}
