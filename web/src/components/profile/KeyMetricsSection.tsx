import ScoreRing from '../ui/ScoreRing';
import StatTile from '../ui/StatTile';
import SectionCard from './SectionCard';
import type { AthleteProfileData } from '../../types/profileSections';

interface KeyMetricsSectionProps {
  athlete: AthleteProfileData;
  isOwner?: boolean;
}

export default function KeyMetricsSection({ athlete, isOwner }: KeyMetricsSectionProps) {
  const tiles = [
    { value: athlete.height, label: 'Height', accent: 'azure' as const },
    { value: athlete.weight, label: 'Weight', accent: 'azure' as const },
    { value: athlete.preferredFoot, label: 'Foot', accent: 'azure' as const },
    { value: athlete.age, label: 'Age', accent: 'azure' as const },
    { value: athlete.career.reduce((s, c) => s + c.appearances, 0), label: 'Apps', accent: 'volt' as const },
    { value: athlete.career.reduce((s, c) => s + c.goals, 0), label: 'Goals', accent: 'volt' as const },
  ];

  return (
    <SectionCard title="Key Metrics" isOwner={isOwner} delay={0.05}>
      <div className="flex flex-col gap-5">
        {/* Score rings */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-2">
            <ScoreRing value={athlete.performanceScore} size={96} label="Performance" isTopTier />
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing value={athlete.visibilityScore} size={96} label="Visibility" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <ScoreRing value={athlete.fitnessScore} size={96} label="Fitness" />
          </div>
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Stat tiles */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="text-center">
              <StatTile value={t.value} label={t.label} accent={t.accent} />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
