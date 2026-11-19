import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';
import { Header, Screen, TextTabs } from '@/components/ui';
import { ChildProfilesSection } from '@/components/children/ChildProfilesSection';
import { CoachingHome } from '@/components/coaching/CoachingHome';
import { SponsorshipPortal } from '@/components/sponsorship/SponsorshipPortal';
import { useT } from '@/i18n';

type Section = 'sessions' | 'sponsorship';

function sectionOf(value: string | string[] | undefined): Section | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'sessions' || raw === 'sponsorship' ? raw : null;
}

/**
 * Children — a guardian's tab.
 *
 * Sessions and sponsorship are the two things a guardian does here, shown
 * in place rather than as links. Each half is the same body as `/coaching`
 * or `/sponsorship`, including its empty states, and each refetches when
 * this tab is focused. `?section=sessions` or `?section=sponsorship` picks
 * the section. There is no back button: this is a tab.
 *
 * The switch is the underlined text tabs used on Trials and Challenges:
 * full width, the same space above and below, labels centred in each tab.
 * The options stay Sessions then Sponsorship; the row already mirrors in
 * Arabic, so reversing them would fight that flip.
 */
export default function ChildrenTab() {
  const theme = useTheme();
  const { spacing } = theme;
  const t = useT();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const requested = sectionOf(params.section);
  const [section, setSection] = useState<Section>(requested ?? 'sessions');

  useEffect(() => {
    if (requested) setSection(requested);
  }, [requested]);

  return (
    <Screen header={<Header title={t('common.tabChildren')} large />} testID="children-tab">
      <View style={{ paddingTop: spacing.lg, gap: spacing.lg }}>
        {/* Children under 13 (QA-174). Renders nothing while the switch is off. */}
        <ChildProfilesSection />
        <TextTabs<Section>
          testID="children-section"
          value={section}
          onChange={setSection}
          options={[
            { value: 'sessions', label: t('coaching.sessions') },
            { value: 'sponsorship', label: t('sponsorship.title') },
          ]}
        />
        {section === 'sessions' ? <CoachingHome embedded /> : <SponsorshipPortal embedded />}
      </View>
    </Screen>
  );
}
