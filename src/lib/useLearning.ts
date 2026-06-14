import { useCallback, useEffect, useState } from 'react';
import { predictMatch, type FactorWeights, type PredictionResult, DEFAULT_WEIGHTS } from './predictionEngine';

const API_URL = 'http://localhost:3001/api/learning';

export interface MatchOutcome {
  id: string;
  matchId: string;
  teamA: string;
  teamB: string;
  predictedWinner: string;
  actualWinner: string;
  wasCorrect: boolean;
  factors: PredictionResult['factors'];
  timestamp: string;
}

export interface FactorAccuracy {
  correct: number;
  total: number;
  accuracy: number;
}

export interface LearningData {
  weights: FactorWeights;
  outcomes: MatchOutcome[];
  factorAccuracy: Record<keyof FactorWeights, FactorAccuracy>;
  lastUpdated: string;
}

export function useLearning() {
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLearning = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const learningData = await res.json();
      setData(learningData);
      setError('');
    } catch {
      setError('Could not load learning data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLearning();
  }, [fetchLearning]);

  const recordOutcome = useCallback(async (
    matchId: string,
    teamA: string,
    teamB: string,
    actualWinner: string,
  ) => {
    try {
      // Get prediction for this match
      const weights = data?.weights ?? DEFAULT_WEIGHTS;
      const prediction = predictMatch(teamA, teamB, weights);

      const outcome = {
        matchId,
        teamA,
        teamB,
        predictedWinner: prediction.predictedWinner,
        actualWinner,
        wasCorrect: prediction.predictedWinner === actualWinner,
        factors: prediction.factors,
      };

      const res = await fetch(`${API_URL}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcome),
      });

      if (!res.ok) throw new Error('Failed to record');
      await fetchLearning();
      return true;
    } catch {
      setError('Failed to record outcome');
      return false;
    }
  }, [data?.weights, fetchLearning]);

  const updateWeights = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/update-weights`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchLearning();
      return true;
    } catch {
      setError('Failed to update weights');
      return false;
    }
  }, [fetchLearning]);

  const resetLearning = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/reset`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to reset');
      await fetchLearning();
      return true;
    } catch {
      setError('Failed to reset');
      return false;
    }
  }, [fetchLearning]);

  const getPrediction = useCallback((teamA: string, teamB: string): PredictionResult => {
    const weights = data?.weights ?? DEFAULT_WEIGHTS;
    return predictMatch(teamA, teamB, weights);
  }, [data?.weights]);

  return {
    data,
    loading,
    error,
    recordOutcome,
    updateWeights,
    resetLearning,
    getPrediction,
    refresh: fetchLearning,
  };
}
