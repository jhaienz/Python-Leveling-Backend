export enum Tier {
  NEWBIE = 'NEWBIE',
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
  MASTER = 'MASTER',
}

export interface TierDefinition {
  name: string;
  minLevel: number;
  maxLevel: number;
  color: string;
}

export const TIER_DEFINITIONS: Record<Tier, TierDefinition> = {
  [Tier.NEWBIE]: {
    name: 'Newbie',
    minLevel: 0,
    maxLevel: 10,
    color: '#808080',
  },
  [Tier.BEGINNER]: {
    name: 'Beginner',
    minLevel: 11,
    maxLevel: 20,
    color: '#32CD32',
  },
  [Tier.INTERMEDIATE]: {
    name: 'Intermediate',
    minLevel: 21,
    maxLevel: 30,
    color: '#1E90FF',
  },
  [Tier.ADVANCED]: {
    name: 'Advanced',
    minLevel: 31,
    maxLevel: 40,
    color: '#9932CC',
  },
  [Tier.EXPERT]: {
    name: 'Expert',
    minLevel: 41,
    maxLevel: 50,
    color: '#FFD700',
  },
  [Tier.MASTER]: {
    name: 'Master',
    minLevel: 51,
    maxLevel: 60,
    color: '#FF4500',
  },
};

export function getTierForLevel(level: number): TierDefinition {
  for (const tier of Object.values(TIER_DEFINITIONS)) {
    if (level >= tier.minLevel && level <= tier.maxLevel) {
      return tier;
    }
  }
  return TIER_DEFINITIONS[Tier.MASTER];
}
