import { useCallback, useEffect, useState } from 'react';

export type BetStatus = 'pending' | 'won' | 'lost';

export interface Bet {
  id: string;
  createdAt: string;
  matchId: string;
  matchLabel: string;
  kickoff: string;
  predictedWinner: string;
  stake: number;
  odds: number;
  status: BetStatus;
  payout: number;
  notes?: string;
}

export interface BetsSummary {
  totalBet: number;
  totalWon: number;
  totalLost: number;
  netProfit: number;
}

export interface BetsData {
  bets: Bet[];
  summary: BetsSummary;
}

const API_URL = 'http://localhost:3001/api/bets';

export function useBets() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [summary, setSummary] = useState<BetsSummary>({ totalBet: 0, totalWon: 0, totalLost: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: BetsData = await res.json();
      setBets(data.bets);
      setSummary(data.summary);
    } catch {
      setError('Could not load bets — is the API running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  const addBet = useCallback(async (bet: Omit<Bet, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bet),
      });
      if (!res.ok) throw new Error('Failed to add');
      await fetchBets();
      return true;
    } catch {
      setError('Failed to add bet');
      return false;
    }
  }, [fetchBets]);

  const updateBet = useCallback(async (id: string, updates: Partial<Bet>) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Failed to update');
      await fetchBets();
      return true;
    } catch {
      setError('Failed to update bet');
      return false;
    }
  }, [fetchBets]);

  const deleteBet = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchBets();
      return true;
    } catch {
      setError('Failed to delete bet');
      return false;
    }
  }, [fetchBets]);

  const settleBet = useCallback(async (id: string, won: boolean) => {
    const bet = bets.find(b => b.id === id);
    if (!bet) return false;
    const payout = won ? bet.stake : 0;
    return updateBet(id, { status: won ? 'won' : 'lost', payout });
  }, [bets, updateBet]);

  return { bets, summary, loading, error, addBet, updateBet, deleteBet, settleBet, refresh: fetchBets };
}
