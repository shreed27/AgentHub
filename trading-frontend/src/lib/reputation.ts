/**
 * Reputation System for Trading Platform
 *
 * Provides rank system: novice -> hunter -> expert -> elite -> legend
 * Badge achievements and leaderboard generation
 */

export interface HunterReputation {
  wallet: string;
  totalBounties: number;
  successfulBounties: number;
  failedBounties: number;
  totalEarnings: number;
  successRate: number;
  rank: 'novice' | 'hunter' | 'expert' | 'elite' | 'legend';
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

// Rank thresholds
export const RANK_THRESHOLDS = {
  novice: { minBounties: 0, minSuccessRate: 0 },
  hunter: { minBounties: 3, minSuccessRate: 0.5 },
  expert: { minBounties: 10, minSuccessRate: 0.7 },
  elite: { minBounties: 25, minSuccessRate: 0.8 },
  legend: { minBounties: 50, minSuccessRate: 0.9 },
};

// Badge definitions
export const BADGES = {
  first_blood: { name: 'First Blood', description: 'Completed first bounty' },
  speed_demon: { name: 'Speed Demon', description: 'Completed bounty in under 1 hour' },
  perfectionist: { name: 'Perfectionist', description: '10 bounties with 90%+ confidence' },
  whale_hunter: { name: 'Whale Hunter', description: 'Completed a bounty worth 10+ SOL' },
  streak_5: { name: 'Hot Streak', description: '5 successful bounties in a row' },
  streak_10: { name: 'Unstoppable', description: '10 successful bounties in a row' },
  early_adopter: { name: 'Early Adopter', description: 'Joined in first week' },
};

/**
 * Calculate rank based on stats
 */
export function calculateRank(totalBounties: number, successRate: number): HunterReputation['rank'] {
  if (totalBounties >= RANK_THRESHOLDS.legend.minBounties && successRate >= RANK_THRESHOLDS.legend.minSuccessRate) {
    return 'legend';
  }
  if (totalBounties >= RANK_THRESHOLDS.elite.minBounties && successRate >= RANK_THRESHOLDS.elite.minSuccessRate) {
    return 'elite';
  }
  if (totalBounties >= RANK_THRESHOLDS.expert.minBounties && successRate >= RANK_THRESHOLDS.expert.minSuccessRate) {
    return 'expert';
  }
  if (totalBounties >= RANK_THRESHOLDS.hunter.minBounties && successRate >= RANK_THRESHOLDS.hunter.minSuccessRate) {
    return 'hunter';
  }
  return 'novice';
}

/**
 * Get rank display info
 */
export function getRankInfo(rank: HunterReputation['rank']): { name: string; color: string; emoji: string } {
  switch (rank) {
    case 'legend':
      return { name: 'Legend', color: '#FFD700', emoji: '👑' };
    case 'elite':
      return { name: 'Elite', color: '#9B59B6', emoji: '💎' };
    case 'expert':
      return { name: 'Expert', color: '#3498DB', emoji: '⭐' };
    case 'hunter':
      return { name: 'Hunter', color: '#2ECC71', emoji: '🎯' };
    case 'novice':
    default:
      return { name: 'Novice', color: '#95A5A6', emoji: '🌱' };
  }
}

/**
 * Get badge definitions for frontend display
 */
export function getBadgeDefinitions() {
  return BADGES;
}

/**
 * Get badge display info
 */
export function getBadgeInfo(badgeType: string): { name: string; description: string; emoji: string } | null {
  const badge = BADGES[badgeType as keyof typeof BADGES];
  if (!badge) return null;

  const emojiMap: Record<string, string> = {
    first_blood: '🩸',
    speed_demon: '⚡',
    perfectionist: '✨',
    whale_hunter: '🐋',
    streak_5: '🔥',
    streak_10: '💥',
    early_adopter: '🌅',
  };

  return {
    name: badge.name,
    description: badge.description,
    emoji: emojiMap[badgeType] || '🏆',
  };
}

/**
 * Format reputation stats for display
 */
export function formatReputationStats(rep: HunterReputation): {
  winRate: string;
  earnings: string;
  rankProgress: number;
} {
  const winRate = rep.totalBounties > 0
    ? `${(rep.successRate * 100).toFixed(1)}%`
    : '0%';

  const earnings = rep.totalEarnings >= 1000
    ? `${(rep.totalEarnings / 1000).toFixed(1)}K SOL`
    : `${rep.totalEarnings.toFixed(2)} SOL`;

  // Calculate progress to next rank
  const currentRank = rep.rank;
  let nextRankThreshold = RANK_THRESHOLDS.hunter;

  if (currentRank === 'hunter') nextRankThreshold = RANK_THRESHOLDS.expert;
  else if (currentRank === 'expert') nextRankThreshold = RANK_THRESHOLDS.elite;
  else if (currentRank === 'elite') nextRankThreshold = RANK_THRESHOLDS.legend;
  else if (currentRank === 'legend') nextRankThreshold = { minBounties: 100, minSuccessRate: 1 };

  const bountyProgress = Math.min(1, rep.totalBounties / nextRankThreshold.minBounties);
  const successProgress = Math.min(1, rep.successRate / nextRankThreshold.minSuccessRate);
  const rankProgress = (bountyProgress + successProgress) / 2;

  return { winRate, earnings, rankProgress };
}
