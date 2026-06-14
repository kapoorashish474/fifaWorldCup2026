/**
 * Match Prediction Overrides
 * 
 * Add overrides here for upcoming matches. These will replace the default
 * algorithm-based predictions. DO NOT modify overrides for completed matches.
 * 
 * Key format: "TeamA|TeamB" (alphabetically sorted)
 * 
 * Usage:
 *   1. Find the match you want to override
 *   2. Add entry with teams sorted alphabetically: "Brazil|Morocco" not "Morocco|Brazil"
 *   3. Set winner to one of the teams or "Draw"
 *   4. Add reason for tracking
 */

import type { Confidence } from './predictions';

export interface MatchOverride {
  winner: string;  // Team name or "Draw"
  confidence: Confidence;
  reason: string;
  source?: string;
}

/**
 * Create a consistent key for any team pair
 */
export function overrideKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('|');
}

/**
 * PREDICTION OVERRIDES
 * 
 * Add your overrides below. Key must be alphabetically sorted team names.
 * 
 * Example:
 *   'Brazil|Morocco': { winner: 'Morocco', confidence: 'low', reason: 'Morocco in great form' }
 */
export const OVERRIDES: Record<string, MatchOverride> = {
  // ============================================
  // GROUP STAGE REMAINING MATCHES
  // ============================================
  
  // Group A
  // 'Czechia|Mexico': { winner: 'Draw', confidence: 'low', reason: 'Both teams evenly matched' },
  
  // Group B
  // Add overrides as needed...
  
  // Group C
  // Add overrides as needed...
  
  // Group D
  // Add overrides as needed...
  
  // Group E
  // Add overrides as needed...
  
  // Group F
  // Add overrides as needed...
  
  // Group G
  // Add overrides as needed...
  
  // Group H
  // Add overrides as needed...
  
  // Group I
  // Add overrides as needed...
  
  // Group J
  // Add overrides as needed...
  
  // Group K
  // Add overrides as needed...
  
  // Group L
  // Add overrides as needed...

  // ============================================
  // KNOCKOUT STAGE (fill after group stage ends)
  // ============================================
  
  // Round of 32
  
  // Round of 16
  
  // Quarterfinals
  
  // Semifinals
  
  // Final
};

/**
 * Check if an override exists for a match
 */
export function getOverride(teamA: string, teamB: string): MatchOverride | undefined {
  const key = overrideKey(teamA, teamB);
  return OVERRIDES[key];
}

/**
 * Apply override to a prediction if it exists
 */
export function applyOverride(
  teamA: string,
  teamB: string,
  defaultWinner: string,
  defaultConfidence: Confidence,
): { winner: string; confidence: Confidence } {
  const override = getOverride(teamA, teamB);
  if (override) {
    return { winner: override.winner, confidence: override.confidence };
  }
  return { winner: defaultWinner, confidence: defaultConfidence };
}
