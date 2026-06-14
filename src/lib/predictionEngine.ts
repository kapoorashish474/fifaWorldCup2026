/**
 * Prediction Engine v2.0
 * 
 * A learning prediction system that:
 * 1. Uses multiple weighted factors to predict match outcomes
 * 2. Tracks prediction accuracy per factor
 * 3. Auto-adjusts weights based on what's working
 */

// Factor weights (sum to 100)
export interface FactorWeights {
  fifaRanking: number;        // FIFA ranking difference
  groupPosition: number;      // Current group stage position
  tournamentForm: number;     // Goals scored - conceded in tournament
  worldCupHistory: number;    // Past World Cup performance
  squadValue: number;         // Overall squad strength/depth
  recentForm: number;         // Last 5 international matches
  homeContinent: number;      // Playing on home continent
  upsetPotential: number;     // Underdog factor (lower ranked teams often surprise)
}

// Default starting weights
export const DEFAULT_WEIGHTS: FactorWeights = {
  fifaRanking: 20,
  groupPosition: 15,
  tournamentForm: 20,
  worldCupHistory: 10,
  squadValue: 15,
  recentForm: 10,
  homeContinent: 5,
  upsetPotential: 5,
};

// Team data for calculations
export interface TeamStats {
  name: string;
  fifaRanking: number;
  continent: string;
  groupPosition?: number;  // 1-4 based on current standings
  goalsFor?: number;
  goalsAgainst?: number;
  matchesPlayed?: number;
  lastMatchDate?: string;
}

// FIFA Rankings (approximate, June 2026)
export const FIFA_RANKINGS: Record<string, number> = {
  'Argentina': 1, 'France': 2, 'Brazil': 3, 'England': 4, 'Belgium': 5,
  'Netherlands': 6, 'Portugal': 7, 'Spain': 8, 'Germany': 9, 'Italy': 10,
  'Croatia': 11, 'USA': 12, 'Morocco': 13, 'Mexico': 14, 'Switzerland': 15,
  'Colombia': 16, 'Uruguay': 17, 'Japan': 18, 'Senegal': 19, 'Iran': 20,
  'South Korea': 21, 'Australia': 22, 'Turkey': 23, 'Sweden': 24, 'Austria': 25,
  'Norway': 26, 'Egypt': 27, 'Algeria': 28, 'Ecuador': 29, 'Ivory Coast': 30,
  'Tunisia': 31, 'Ghana': 32, 'Scotland': 33, 'Panama': 34, 'Iraq': 35,
  'Czechia': 36, 'Saudi Arabia': 37, 'Canada': 38, 'Qatar': 39, 'DR Congo': 40,
  'Uzbekistan': 41, 'Jordan': 42, 'Bosnia & Herzegovina': 43, 'Cape Verde': 44,
  'Paraguay': 45, 'Haiti': 46, 'New Zealand': 47, 'South Africa': 48, 'Curacao': 49,
};

// Continent mapping
export const TEAM_CONTINENTS: Record<string, string> = {
  'Argentina': 'SA', 'Brazil': 'SA', 'Colombia': 'SA', 'Uruguay': 'SA', 'Ecuador': 'SA', 'Paraguay': 'SA',
  'France': 'EU', 'England': 'EU', 'Belgium': 'EU', 'Netherlands': 'EU', 'Portugal': 'EU', 'Spain': 'EU',
  'Germany': 'EU', 'Italy': 'EU', 'Croatia': 'EU', 'Switzerland': 'EU', 'Sweden': 'EU', 'Austria': 'EU',
  'Norway': 'EU', 'Scotland': 'EU', 'Czechia': 'EU', 'Bosnia & Herzegovina': 'EU',
  'USA': 'NA', 'Mexico': 'NA', 'Canada': 'NA', 'Panama': 'NA', 'Haiti': 'NA', 'Curacao': 'NA',
  'Morocco': 'AF', 'Senegal': 'AF', 'Egypt': 'AF', 'Algeria': 'AF', 'Ivory Coast': 'AF',
  'Tunisia': 'AF', 'Ghana': 'AF', 'DR Congo': 'AF', 'Cape Verde': 'AF', 'South Africa': 'AF',
  'Japan': 'AS', 'Iran': 'AS', 'South Korea': 'AS', 'Australia': 'AS', 'Turkey': 'AS',
  'Iraq': 'AS', 'Saudi Arabia': 'AS', 'Qatar': 'AS', 'Uzbekistan': 'AS', 'Jordan': 'AS',
  'New Zealand': 'OC',
};

// Host countries (NA = North America)
const HOST_CONTINENT = 'NA';

// World Cup History (titles won)
export const WORLD_CUP_TITLES: Record<string, number> = {
  'Brazil': 5, 'Germany': 4, 'Italy': 4, 'Argentina': 3, 'France': 2,
  'Uruguay': 2, 'England': 1, 'Spain': 1,
};

// Squad Value Tier (1=Elite, 2=Strong, 3=Good, 4=Average, 5=Developing)
export const SQUAD_TIERS: Record<string, number> = {
  'France': 1, 'England': 1, 'Brazil': 1, 'Argentina': 1, 'Spain': 1,
  'Germany': 1, 'Portugal': 1, 'Netherlands': 2, 'Belgium': 2, 'Italy': 2,
  'Croatia': 2, 'USA': 2, 'Uruguay': 2, 'Colombia': 2, 'Mexico': 2,
  'Switzerland': 2, 'Japan': 3, 'South Korea': 3, 'Morocco': 3, 'Senegal': 3,
  'Australia': 3, 'Canada': 3, 'Ecuador': 3, 'Turkey': 3, 'Austria': 3,
  'Norway': 3, 'Sweden': 3, 'Iran': 3, 'Ivory Coast': 3, 'Algeria': 3,
  'Ghana': 3, 'Egypt': 3, 'Tunisia': 3, 'Scotland': 3, 'Czechia': 3,
  'Saudi Arabia': 4, 'Qatar': 4, 'Iraq': 4, 'Jordan': 4, 'Uzbekistan': 4,
  'Bosnia & Herzegovina': 4, 'Panama': 4, 'Paraguay': 4, 'DR Congo': 4,
  'Cape Verde': 4, 'New Zealand': 4, 'South Africa': 4, 'Haiti': 5, 'Curacao': 5,
};

// Recent Form Score (-2 to +2 scale based on last 5 matches)
export const RECENT_FORM: Record<string, number> = {
  'Spain': 2, 'Argentina': 2, 'France': 1.5, 'England': 1.5, 'Germany': 1,
  'Brazil': 1, 'Netherlands': 1, 'Portugal': 1, 'Morocco': 1.5, 'Japan': 1,
  'South Korea': 0.5, 'USA': 1, 'Mexico': 0.5, 'Canada': 0.5, 'Belgium': 0,
  'Croatia': 0.5, 'Switzerland': 0.5, 'Uruguay': 0, 'Colombia': 1,
  'Senegal': 0.5, 'Ivory Coast': 0.5, 'Egypt': 0, 'Algeria': 0, 'Tunisia': 0,
  'Ghana': -0.5, 'Ecuador': 0.5, 'Turkey': 1, 'Austria': 0.5, 'Norway': 0.5,
  'Sweden': 0, 'Iran': 0, 'Australia': 0, 'Saudi Arabia': 0, 'Qatar': -0.5,
  'Iraq': 0, 'Jordan': 0, 'Uzbekistan': 0.5, 'Scotland': 0, 'Czechia': 0,
  'Bosnia & Herzegovina': 0, 'Panama': -0.5, 'Paraguay': -0.5, 'DR Congo': 0,
  'Cape Verde': 0, 'New Zealand': -0.5, 'South Africa': -0.5, 'Haiti': -1, 'Curacao': -1,
};

export interface PredictionResult {
  teamA: string;
  teamB: string;
  predictedWinner: string;  // Team name or "Draw"
  confidence: number;       // 0-100
  factors: {
    name: string;
    favoredTeam: string;
    score: number;          // -100 to +100 (negative = favors B, positive = favors A)
    weight: number;
    reason?: string;        // Human-readable explanation
  }[];
  totalScore: number;       // Weighted sum
}

export interface MatchOutcome {
  matchId: string;
  teamA: string;
  teamB: string;
  predictedWinner: string;
  actualWinner: string;     // Team name, "Draw", or empty if not played
  wasCorrect: boolean | null;
  factors: PredictionResult['factors'];
  timestamp: string;
}

export interface LearningData {
  weights: FactorWeights;
  outcomes: MatchOutcome[];
  factorAccuracy: Record<keyof FactorWeights, { correct: number; total: number }>;
  lastUpdated: string;
}

/**
 * Calculate factor score for a match (-100 to +100)
 * Positive = favors teamA, Negative = favors teamB
 */
function calculateFactorScores(
  teamA: string,
  teamB: string,
  statsA?: Partial<TeamStats>,
  statsB?: Partial<TeamStats>,
): PredictionResult['factors'] {
  const factors: PredictionResult['factors'] = [];

  // 1. FIFA Ranking (lower = better)
  const rankA = FIFA_RANKINGS[teamA] ?? 50;
  const rankB = FIFA_RANKINGS[teamB] ?? 50;
  const rankDiff = rankB - rankA;
  const rankScore = Math.max(-100, Math.min(100, rankDiff * 3));
  factors.push({
    name: 'fifaRanking',
    favoredTeam: rankScore > 0 ? teamA : rankScore < 0 ? teamB : 'Even',
    score: rankScore,
    weight: 0,
    reason: `${teamA} ranked #${rankA}, ${teamB} ranked #${rankB}`,
  });

  // 2. Group Position (if available)
  const posA = statsA?.groupPosition ?? 0;
  const posB = statsB?.groupPosition ?? 0;
  let posScore = 0;
  let posReason = 'No group data yet';
  if (posA && posB) {
    posScore = (posB - posA) * 25;
    posReason = `${teamA} in ${posA}${posA===1?'st':posA===2?'nd':posA===3?'rd':'th'}, ${teamB} in ${posB}${posB===1?'st':posB===2?'nd':posB===3?'rd':'th'}`;
  }
  factors.push({
    name: 'groupPosition',
    favoredTeam: posScore > 0 ? teamA : posScore < 0 ? teamB : 'Even',
    score: Math.max(-100, Math.min(100, posScore)),
    weight: 0,
    reason: posReason,
  });

  // 3. Tournament Form (goal difference in tournament)
  const gdA = (statsA?.goalsFor ?? 0) - (statsA?.goalsAgainst ?? 0);
  const gdB = (statsB?.goalsFor ?? 0) - (statsB?.goalsAgainst ?? 0);
  const formScore = Math.max(-100, Math.min(100, (gdA - gdB) * 15));
  factors.push({
    name: 'tournamentForm',
    favoredTeam: formScore > 0 ? teamA : formScore < 0 ? teamB : 'Even',
    score: formScore,
    weight: 0,
    reason: `Tournament GD: ${teamA} ${gdA >= 0 ? '+' : ''}${gdA}, ${teamB} ${gdB >= 0 ? '+' : ''}${gdB}`,
  });

  // 4. World Cup History
  const titlesA = WORLD_CUP_TITLES[teamA] ?? 0;
  const titlesB = WORLD_CUP_TITLES[teamB] ?? 0;
  const historyScore = Math.max(-100, Math.min(100, (titlesA - titlesB) * 20));
  factors.push({
    name: 'worldCupHistory',
    favoredTeam: historyScore > 0 ? teamA : historyScore < 0 ? teamB : 'Even',
    score: historyScore,
    weight: 0,
    reason: `WC titles: ${teamA} (${titlesA}), ${teamB} (${titlesB})`,
  });

  // 5. Squad Value/Depth
  const tierA = SQUAD_TIERS[teamA] ?? 4;
  const tierB = SQUAD_TIERS[teamB] ?? 4;
  const squadScore = Math.max(-100, Math.min(100, (tierB - tierA) * 25));
  const tierNames = ['', 'Elite', 'Strong', 'Good', 'Average', 'Developing'];
  factors.push({
    name: 'squadValue',
    favoredTeam: squadScore > 0 ? teamA : squadScore < 0 ? teamB : 'Even',
    score: squadScore,
    weight: 0,
    reason: `Squad: ${teamA} (${tierNames[tierA]}), ${teamB} (${tierNames[tierB]})`,
  });

  // 6. Recent Form (last 5 internationals)
  const recentA = RECENT_FORM[teamA] ?? 0;
  const recentB = RECENT_FORM[teamB] ?? 0;
  const recentScore = Math.max(-100, Math.min(100, (recentA - recentB) * 40));
  factors.push({
    name: 'recentForm',
    favoredTeam: recentScore > 0 ? teamA : recentScore < 0 ? teamB : 'Even',
    score: recentScore,
    weight: 0,
    reason: `Recent form: ${teamA} (${recentA > 0 ? '+' : ''}${recentA}), ${teamB} (${recentB > 0 ? '+' : ''}${recentB})`,
  });

  // 7. Home Continent Advantage
  const contA = TEAM_CONTINENTS[teamA];
  const contB = TEAM_CONTINENTS[teamB];
  let homeScore = 0;
  let homeReason = 'Neither team playing at home';
  if (contA === HOST_CONTINENT && contB !== HOST_CONTINENT) {
    homeScore = 50;
    homeReason = `${teamA} playing on home continent (North America)`;
  } else if (contB === HOST_CONTINENT && contA !== HOST_CONTINENT) {
    homeScore = -50;
    homeReason = `${teamB} playing on home continent (North America)`;
  } else if (contA === HOST_CONTINENT && contB === HOST_CONTINENT) {
    homeReason = 'Both teams from North America';
  }
  factors.push({
    name: 'homeContinent',
    favoredTeam: homeScore > 0 ? teamA : homeScore < 0 ? teamB : 'Even',
    score: homeScore,
    weight: 0,
    reason: homeReason,
  });

  // 8. Upset Potential (lower ranked teams have "nothing to lose" factor)
  let upsetScore = 0;
  let upsetReason = 'Similar rankings';
  if (rankDiff > 15) {
    // Team B is significantly lower ranked - might cause upset
    upsetScore = -20;
    upsetReason = `${teamB} as underdog may overperform`;
  } else if (rankDiff < -15) {
    // Team A is significantly lower ranked - might cause upset
    upsetScore = 20;
    upsetReason = `${teamA} as underdog may overperform`;
  }
  factors.push({
    name: 'upsetPotential',
    favoredTeam: upsetScore > 0 ? teamA : upsetScore < 0 ? teamB : 'Even',
    score: upsetScore,
    weight: 0,
    reason: upsetReason,
  });

  return factors;
}

/**
 * Make a prediction for a match
 */
export function predictMatch(
  teamA: string,
  teamB: string,
  weights: FactorWeights = DEFAULT_WEIGHTS,
  statsA?: Partial<TeamStats>,
  statsB?: Partial<TeamStats>,
): PredictionResult {
  const factors = calculateFactorScores(teamA, teamB, statsA, statsB);

  // Apply weights to factors
  const weightMap: Record<string, number> = weights as unknown as Record<string, number>;
  let totalScore = 0;
  
  for (const factor of factors) {
    factor.weight = weightMap[factor.name] ?? 0;
    totalScore += (factor.score * factor.weight) / 100;
  }

  // Determine winner and confidence
  let predictedWinner: string;
  let confidence: number;

  if (Math.abs(totalScore) < 10) {
    predictedWinner = 'Draw';
    confidence = 30 + Math.abs(totalScore);
  } else if (totalScore > 0) {
    predictedWinner = teamA;
    confidence = Math.min(95, 50 + totalScore * 0.5);
  } else {
    predictedWinner = teamB;
    confidence = Math.min(95, 50 + Math.abs(totalScore) * 0.5);
  }

  return {
    teamA,
    teamB,
    predictedWinner,
    confidence: Math.round(confidence),
    factors,
    totalScore: Math.round(totalScore),
  };
}

/**
 * Update weights based on match outcomes
 * Factors that correctly predicted get weight boost, others get reduced
 */
export function updateWeights(
  currentWeights: FactorWeights,
  outcomes: MatchOutcome[],
): FactorWeights {
  const factorSuccess: Record<string, { correct: number; total: number }> = {};

  // Initialize
  for (const key of Object.keys(currentWeights)) {
    factorSuccess[key] = { correct: 0, total: 0 };
  }

  // Count successes per factor
  for (const outcome of outcomes) {
    if (outcome.wasCorrect === null) continue;

    for (const factor of outcome.factors) {
      if (factor.score === 0) continue; // Skip neutral factors
      
      const favored = factor.score > 0 ? outcome.teamA : outcome.teamB;
      const wasFactorCorrect = favored === outcome.actualWinner;
      
      factorSuccess[factor.name].total++;
      if (wasFactorCorrect) {
        factorSuccess[factor.name].correct++;
      }
    }
  }

  // Adjust weights based on accuracy
  const newWeights = { ...currentWeights };
  let totalWeight = 0;

  for (const [key, stats] of Object.entries(factorSuccess)) {
    if (stats.total === 0) continue;
    
    const accuracy = stats.correct / stats.total;
    const k = key as keyof FactorWeights;
    
    // Boost successful factors, reduce unsuccessful ones
    // Base adjustment: accuracy 0.5 = no change, >0.5 = boost, <0.5 = reduce
    const adjustment = 1 + (accuracy - 0.5) * 0.4; // ±20% max adjustment
    newWeights[k] = Math.max(5, Math.round(newWeights[k] * adjustment));
    totalWeight += newWeights[k];
  }

  // Normalize to sum to 100
  if (totalWeight > 0) {
    for (const key of Object.keys(newWeights) as (keyof FactorWeights)[]) {
      newWeights[key] = Math.round((newWeights[key] / totalWeight) * 100);
    }
  }

  return newWeights;
}

/**
 * Get factor accuracy stats from outcomes
 */
export function getFactorAccuracy(
  outcomes: MatchOutcome[],
): Record<keyof FactorWeights, { correct: number; total: number; accuracy: number }> {
  const stats: Record<string, { correct: number; total: number; accuracy: number }> = {};

  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    stats[key] = { correct: 0, total: 0, accuracy: 0 };
  }

  for (const outcome of outcomes) {
    if (outcome.wasCorrect === null || !outcome.actualWinner) continue;

    for (const factor of outcome.factors) {
      if (factor.score === 0) continue;
      
      const favored = factor.score > 0 ? outcome.teamA : outcome.teamB;
      const wasFactorCorrect = favored === outcome.actualWinner || 
        (outcome.actualWinner === 'Draw' && Math.abs(factor.score) < 20);
      
      stats[factor.name].total++;
      if (wasFactorCorrect) {
        stats[factor.name].correct++;
      }
    }
  }

  // Calculate accuracy percentages
  for (const key of Object.keys(stats)) {
    const s = stats[key];
    s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  }

  return stats as Record<keyof FactorWeights, { correct: number; total: number; accuracy: number }>;
}
