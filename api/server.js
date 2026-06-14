import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = 3001;
const DATA_FILE = '/data/bets.json';

app.use(cors());
app.use(express.json());

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bets API running on port ${PORT}`);
});
