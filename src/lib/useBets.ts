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
const STORAGE_KEY = 'fifa-wc-2026-bets';

function generateId(): string {
  return `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function loadBetsFromStorage(): Bet[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('Failed to load bets from localStorage');
  }
  return [];
}

function saveBetsToStorage(bets: Bet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
  } catch {
    console.warn('Failed to save bets to localStorage');
  }
}

function calculateSummary(bets: Bet[]): BetsSummary {
  const totalBet = bets.reduce((sum, b) => sum + b.stake, 0);
  const totalWon = bets.filter(b => b.status === 'won').reduce((sum, b) => sum + b.stake, 0);
  const totalLost = bets.filter(b => b.status === 'lost').reduce((sum, b) => sum + b.stake, 0);
  const netProfit = totalWon - totalLost;
  return { totalBet, totalWon, totalLost, netProfit };
}

export function useBets() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [summary, setSummary] = useState<BetsSummary>({ totalBet: 0, totalWon: 0, totalLost: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [useApi, setUseApi] = useState(true);

  const refreshLocalSummary = useCallback((betsData: Bet[]) => {
    setSummary(calculateSummary(betsData));
  }, []);

  const fetchBets = useCallback(async () => {
    setLoading(true);
    setError('');
    
    // Try API first (Docker mode)
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('API not available');
      const data: BetsData = await res.json();
      setBets(data.bets);
      setSummary(data.summary);
      setUseApi(true);
      setLoading(false);
      return;
    } catch {
      // API not available, fall back to localStorage
      setUseApi(false);
    }
    
    // Fallback to localStorage
    try {
      const storedBets = loadBetsFromStorage();
      setBets(storedBets);
      refreshLocalSummary(storedBets);
      if (storedBets.length === 0) {
        setError('Using local storage (API not available). Your bets are saved in your browser.');
      }
    } catch {
      setError('Could not load bets');
    } finally {
      setLoading(false);
    }
  }, [refreshLocalSummary]);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  const addBet = useCallback(async (bet: Omit<Bet, 'id' | 'createdAt'>) => {
    // Try API first
    if (useApi) {
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
        setError('Failed to add bet to API');
        return false;
      }
    }
    
    // localStorage fallback
    try {
      const newBet: Bet = {
        ...bet,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      const updatedBets = [...bets, newBet];
      saveBetsToStorage(updatedBets);
      setBets(updatedBets);
      refreshLocalSummary(updatedBets);
      return true;
    } catch {
      setError('Failed to add bet');
      return false;
    }
  }, [useApi, bets, fetchBets, refreshLocalSummary]);

  const updateBet = useCallback(async (id: string, updates: Partial<Bet>) => {
    // Try API first
    if (useApi) {
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
    }
    
    // localStorage fallback
    try {
      const updatedBets = bets.map(b => 
        b.id === id ? { ...b, ...updates } : b
      );
      saveBetsToStorage(updatedBets);
      setBets(updatedBets);
      refreshLocalSummary(updatedBets);
      return true;
    } catch {
      setError('Failed to update bet');
      return false;
    }
  }, [useApi, bets, fetchBets, refreshLocalSummary]);

  const deleteBet = useCallback(async (id: string) => {
    // Try API first
    if (useApi) {
      try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete');
        await fetchBets();
        return true;
      } catch {
        setError('Failed to delete bet');
        return false;
      }
    }
    
    // localStorage fallback
    try {
      const updatedBets = bets.filter(b => b.id !== id);
      saveBetsToStorage(updatedBets);
      setBets(updatedBets);
      refreshLocalSummary(updatedBets);
      return true;
    } catch {
      setError('Failed to delete bet');
      return false;
    }
  }, [useApi, bets, fetchBets, refreshLocalSummary]);

  const settleBet = useCallback(async (id: string, won: boolean) => {
    const bet = bets.find(b => b.id === id);
    if (!bet) return false;
    const payout = won ? bet.stake : 0;
    return updateBet(id, { status: won ? 'won' : 'lost', payout });
  }, [bets, updateBet]);

  return { bets, summary, loading, error, useApi, addBet, updateBet, deleteBet, settleBet, refresh: fetchBets };
}
