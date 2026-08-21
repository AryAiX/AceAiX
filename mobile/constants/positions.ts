export const POSITIONS_BY_SPORT: Record<string, string[]> = {
  football: [
    'Goalkeeper', 'Right Back', 'Left Back', 'Centre Back',
    'Defensive Midfielder', 'Central Midfielder', 'Attacking Midfielder',
    'Right Winger', 'Left Winger', 'Striker', 'Centre Forward',
  ],
  basketball: [
    'Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center',
  ],
  volleyball: [
    'Setter', 'Outside Hitter', 'Opposite Hitter', 'Middle Blocker', 'Libero', 'Defensive Specialist',
  ],
};

export const POSITION_GROUPS: Record<string, Record<string, string>> = {
  football: {
    'Goalkeeper': 'Goalkeeper',
    'Right Back': 'Defense',
    'Left Back': 'Defense',
    'Centre Back': 'Defense',
    'Defensive Midfielder': 'Midfield',
    'Central Midfielder': 'Midfield',
    'Attacking Midfielder': 'Midfield',
    'Right Winger': 'Attack',
    'Left Winger': 'Attack',
    'Striker': 'Attack',
    'Centre Forward': 'Attack',
  },
  basketball: {
    'Point Guard': 'Guard',
    'Shooting Guard': 'Guard',
    'Small Forward': 'Forward',
    'Power Forward': 'Forward',
    'Center': 'Center',
  },
  volleyball: {
    'Setter': 'Setter',
    'Outside Hitter': 'Attack',
    'Opposite Hitter': 'Attack',
    'Middle Blocker': 'Attack',
    'Libero': 'Defense',
    'Defensive Specialist': 'Defense',
  },
};

export function getPositionGroup(sport: string, position: string | null | undefined): string | null {
  if (!position) return null;
  const sportGroups = POSITION_GROUPS[sport.toLowerCase()];
  if (!sportGroups) return null;
  return sportGroups[position] ?? null;
}
