import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = 3001;
const DATA_FILE = '/data/bets.json';
const LEARNING_FILE = '/data/learning.json';

app.use(cors());
app.use(express.json());

// Default factor weights
const DEFAULT_WEIGHTS = {
  fifaRanking: 20,
  groupPosition: 15,
  tournamentForm: 20,
  worldCupHistory: 10,
  squadValue: 15,
  recentForm: 10,
  homeContinent: 5,
  upsetPotential: 5,
};

function loadLearning() {
  if (!existsSync(LEARNING_FILE)) {
    const initial = {
      weights: DEFAULT_WEIGHTS,
      outcomes: [],
      factorAccuracy: {},
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(LEARNING_FILE, JSON.stringify(initial, null, 2));
  }
  return JSON.parse(readFileSync(LEARNING_FILE, 'utf-8'));
}

function saveLearning(data) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(LEARNING_FILE, JSON.stringify(data, null, 2));
}

function loadBets() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ bets: [], summary: { totalBet: 0, totalWon: 0, totalLost: 0 } }, null, 2));
  }
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function saveBets(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function recalculateSummary(bets) {
  const settled = bets.filter(b => b.status !== 'pending');
  const totalBet = settled.reduce((sum, b) => sum + b.stake, 0);
  const totalWon = settled.filter(b => b.status === 'won').reduce((sum, b) => sum + b.payout, 0);
  const totalLost = settled.filter(b => b.status === 'lost').reduce((sum, b) => sum + b.stake, 0);
  return { totalBet, totalWon, totalLost, netProfit: totalWon - totalLost };
}

app.get('/api/bets', (req, res) => {
  try {
    const data = loadBets();
    data.summary = recalculateSummary(data.bets);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load bets' });
  }
});

app.post('/api/bets', (req, res) => {
  try {
    const data = loadBets();
    const bet = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...req.body,
      status: req.body.status || 'pending',
      payout: req.body.payout || 0,
    };
    data.bets.unshift(bet);
    data.summary = recalculateSummary(data.bets);
    saveBets(data);
    res.status(201).json(bet);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save bet' });
  }
});

app.put('/api/bets/:id', (req, res) => {
  try {
    const data = loadBets();
    const idx = data.bets.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Bet not found' });
    
    data.bets[idx] = { ...data.bets[idx], ...req.body };
    data.summary = recalculateSummary(data.bets);
    saveBets(data);
    res.json(data.bets[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update bet' });
  }
});

app.delete('/api/bets/:id', (req, res) => {
  try {
    const data = loadBets();
    const idx = data.bets.findIndex(b => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Bet not found' });
    
    data.bets.splice(idx, 1);
    data.summary = recalculateSummary(data.bets);
    saveBets(data);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete bet' });
  }
});

// ============================================
// LEARNING API ENDPOINTS
// ============================================

// Get learning data (weights, outcomes, accuracy)
app.get('/api/learning', (req, res) => {
  try {
    const data = loadLearning();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load learning data' });
  }
});

// Record a match outcome for learning
app.post('/api/learning/outcome', (req, res) => {
  try {
    const data = loadLearning();
    const outcome = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...req.body,
    };
    data.outcomes.push(outcome);
    
    // Recalculate factor accuracy
    data.factorAccuracy = calculateFactorAccuracy(data.outcomes);
    
    saveLearning(data);
    res.status(201).json(outcome);
  } catch (err) {
    res.status(500).json({ error: 'Failed to record outcome' });
  }
});

// Update weights based on learning
app.post('/api/learning/update-weights', (req, res) => {
  try {
    const data = loadLearning();
    
    // Recalculate weights based on factor accuracy
    const newWeights = updateWeightsFromAccuracy(data.weights, data.factorAccuracy);
    data.weights = newWeights;
    
    saveLearning(data);
    res.json({ weights: newWeights, factorAccuracy: data.factorAccuracy });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update weights' });
  }
});

// Reset learning data
app.post('/api/learning/reset', (req, res) => {
  try {
    const data = {
      weights: DEFAULT_WEIGHTS,
      outcomes: [],
      factorAccuracy: {},
      lastUpdated: new Date().toISOString(),
    };
    saveLearning(data);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset learning data' });
  }
});

// Helper: Calculate factor accuracy from outcomes
function calculateFactorAccuracy(outcomes) {
  const stats = {};
  for (const key of Object.keys(DEFAULT_WEIGHTS)) {
    stats[key] = { correct: 0, total: 0, accuracy: 0 };
  }

  for (const outcome of outcomes) {
    if (!outcome.actualWinner || !outcome.factors) continue;

    for (const factor of outcome.factors) {
      if (factor.score === 0) continue;
      
      const favored = factor.score > 0 ? outcome.teamA : outcome.teamB;
      const wasCorrect = favored === outcome.actualWinner || 
        (outcome.actualWinner === 'Draw' && Math.abs(factor.score) < 20);
      
      stats[factor.name].total++;
      if (wasCorrect) {
        stats[factor.name].correct++;
      }
    }
  }

  for (const key of Object.keys(stats)) {
    const s = stats[key];
    s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  }

  return stats;
}

// Helper: Update weights based on accuracy
function updateWeightsFromAccuracy(currentWeights, factorAccuracy) {
  const newWeights = { ...currentWeights };
  let totalWeight = 0;

  for (const [key, stats] of Object.entries(factorAccuracy)) {
    if (stats.total === 0) continue;
    
    const accuracy = stats.correct / stats.total;
    // Boost successful factors, reduce unsuccessful ones
    const adjustment = 1 + (accuracy - 0.5) * 0.4;
    newWeights[key] = Math.max(5, Math.round(newWeights[key] * adjustment));
    totalWeight += newWeights[key];
  }

  // Normalize to sum to 100
  if (totalWeight > 0) {
    for (const key of Object.keys(newWeights)) {
      newWeights[key] = Math.round((newWeights[key] / totalWeight) * 100);
    }
  }

  return newWeights;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
});
