# FIFA World Cup 2026 - Prediction Algorithm

## Current State (v1.0)
The current algorithm is simplistic: **higher-ranked team always wins**.

```
Winner = team with lower group position (1 > 2 > 3 > 4)
```

**Problems:**
- Doesn't account for upsets (very common in World Cup)
- Ignores form, tactics, motivation
- All models use same group rankings = same predictions

---

## Improvement Strategy (v2.0)

### 1. Override Rules
We can define specific match overrides based on patterns we observe.

```typescript
interface MatchOverride {
  teamA: string;
  teamB: string;
  predictedWinner: string;  // or "Draw"
  reason: string;
  confidence: 'high' | 'moderate' | 'low';
  source?: string;  // e.g., "Twitter consensus", "Historical H2H"
}
```

### 2. Factors to Consider

| Factor | Weight | Notes |
|--------|--------|-------|
| FIFA Ranking difference | 20% | Small gaps = more unpredictable |
| Historical H2H | 15% | Some teams consistently beat others |
| Tournament form | 25% | How team performed in prior matches |
| Rest days | 10% | Less rest = higher upset chance |
| Knockout pressure | 15% | Underdogs often rise in knockouts |
| Twitter/Expert consensus | 15% | Wisdom of crowds |

### 3. Upset Probability Rules

```
IF rank_difference <= 1:
  upset_chance = 40%
IF rank_difference == 2:
  upset_chance = 25%
IF rank_difference >= 3:
  upset_chance = 15%

IF team_is_african_or_asian AND opponent_is_european:
  upset_chance += 10%  // World Cup magic

IF match_is_knockout:
  upset_chance += 5%  // Higher stakes = more unpredictable
```

---

## Match Override Registry

Add overrides here for upcoming matches. Format:
```
| Match | Override Winner | Reason | Source |
```

### Group Stage - Remaining Matches

| Match | Current Prediction | Override | Reason | Confidence |
|-------|-------------------|----------|--------|------------|
| _Add overrides here as tournament progresses_ | | | | |

### Round of 32 (starts June 28)

| Match | Current Prediction | Override | Reason | Confidence |
|-------|-------------------|----------|--------|------------|
| _To be filled after group stage_ | | | | |

---

## External Data Sources

### Twitter/X Signals
- Follow: @FiveThirtyEight, @OptaJoe, @Squawka
- Look for: betting line movements, expert picks, statistical models

### Betting Odds
- Odds movement can signal insider knowledge
- Sharp money vs public money divergence

### Key Stats to Track
- xG (Expected Goals) from group matches
- Shots on target ratio
- Defensive solidity (clean sheets)
- Set piece threat

---

## Implementation Plan

### Phase 1: Manual Overrides (Current)
- Manually add overrides to this doc
- Before each matchday, review and update predictions.ts

### Phase 2: Override System in Code
- Create `overrides.ts` file
- Automatically apply overrides to predictions
- Keep original algorithm as fallback

### Phase 3: External Data Integration
- Fetch Twitter sentiment (requires API)
- Scrape betting odds
- Weight predictions by multiple sources

---

## Notes & Learnings

### What Went Wrong (Track here)
| Date | Match | Prediction | Actual | Lesson |
|------|-------|------------|--------|--------|
| _Add after each matchday_ | | | | |

### What Went Right
| Date | Match | Prediction | Actual | Why it worked |
|------|-------|------------|--------|---------------|
| _Add after each matchday_ | | | | |

---

## Quick Override Commands

To quickly override a prediction, add to `src/data/overrides.ts`:

```typescript
export const OVERRIDES: Record<string, { winner: string; confidence: string }> = {
  // Format: "TeamA|TeamB": { winner: "TeamA", confidence: "moderate" }
  // Example:
  // "Morocco|Brazil": { winner: "Morocco", confidence: "low" },
};
```

---

*Last updated: June 14, 2026*
*Tournament Day: 4*
