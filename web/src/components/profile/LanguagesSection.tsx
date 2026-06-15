import { Languages } from 'lucide-react';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface LanguagesSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

const LEVEL_WIDTH: Record<string, string> = {
  Native:         'w-full',
  Fluent:         'w-5/6',
  Professional:   'w-4/5',
  Conversational: 'w-3/5',
  Elementary:     'w-2/5',
};

const LEVEL_COLOR: Record<string, string> = {
  Native:         '#B8F135',
  Fluent:         '#2F80ED',
  Professional:   '#2F80ED',
  Conversational: '#F5A623',
  Elementary:     '#7C8DA6',
};

export default function LanguagesSection({ athlete, isOwner }: LanguagesSectionProps) {
  return (
    <SectionCard title="Languages" icon={<Languages size={15} />} isOwner={isOwner}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {athlete.languages.map(lang => (
          <div key={lang.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{lang.name}</p>
              <p className="text-xs text-muted">{lang.level}</p>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${LEVEL_WIDTH[lang.level]}`}
                style={{ background: LEVEL_COLOR[lang.level] }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
