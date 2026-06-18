import { useState, useCallback } from 'react';
import { EspnResult } from '../lib/espnResults';
import { TEAM_CONTINENTS } from '../lib/predictionEngine';
import { computeDynamicFactors, MatchDynamicFactors } from '../lib/dynamicFactors';

interface DynamicFactorsState {
  factors: Map<string, MatchDynamicFactors>;
  loading: boolean;
  lastUpdated: number | null;
}

export function useDynamicFactors() {
  const [state, setState] = useState<DynamicFactorsState>({
    factors: new Map(),
    loading: false,
    lastUpdated: null,
  });

  const computeForMatches = useCallback(async (
    matches: { id: string; teamA: string; teamB: string; kickoff: string; venue?: string }[],
    results: Map<string, EspnResult>
  ) => {
    setState(prev => ({ ...prev, loading: true }));
    
    const newFactors = new Map<string, MatchDynamicFactors>();
    
    // Only compute for upcoming/live matches
    const today = new Date().toISOString().split('T')[0];
    const upcomingMatches = matches.filter(m => {
      const matchDate = m.kickoff.split('T')[0];
      return matchDate >= today;
    });
    
    // Compute factors for each match (limit to avoid too many)
    const toCompute = upcomingMatches.slice(0, 20);
    
    for (const match of toCompute) {
      try {
        const factors = await computeDynamicFactors(
          match.id,
          match.teamA,
          match.teamB,
          match.kickoff,
          match.venue,
          results,
          TEAM_CONTINENTS
        );
        newFactors.set(match.id, factors);
      } catch (e) {
        console.warn(`Failed to compute dynamic factors for ${match.id}:`, e);
      }
    }
    
    setState({
      factors: newFactors,
      loading: false,
      lastUpdated: Date.now(),
    });
    
    return newFactors;
  }, []);

  const getFactors = useCallback((matchId: string): MatchDynamicFactors | undefined => {
    return state.factors.get(matchId);
  }, [state.factors]);

  return {
    factors: state.factors,
    loading: state.loading,
    lastUpdated: state.lastUpdated,
    computeForMatches,
    getFactors,
  };
}
