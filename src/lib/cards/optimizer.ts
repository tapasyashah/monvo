import {
  CANADIAN_CARDS,
  type CanadianCard,
  mapTransactionCategory,
  getEffectiveRate,
} from "./canadian-cards";

export interface OptimizationResult {
  category: string;
  monthly_spend: number;
  current_card: string | null;
  recommended_card: string;
  current_rewards_value: number;
  potential_rewards_value: number;
  monthly_gain: number;
  annual_gain: number;
  reasoning: string;
}

/**
 * For each spending category, find the card that maximizes rewards value
 * after factoring in the annual fee amortized across all categories.
 *
 * @param spendingByCategory - Monthly average spend per Monvo category (positive values)
 * @param userCards - Array of card IDs the user currently holds
 * @returns Optimization results sorted by annual gain (descending)
 */
export function optimizeCards(
  spendingByCategory: Record<string, number>,
  userCards: string[]
): OptimizationResult[] {
  const categories = Object.keys(spendingByCategory).filter(
    (cat) => spendingByCategory[cat] > 0
  );

  if (categories.length === 0) return [];

  const totalMonthlySpend = Object.values(spendingByCategory).reduce(
    (sum, v) => sum + v,
    0
  );

  // Resolve user's current cards (if any match our database)
  const currentCards = userCards
    .map((id) => CANADIAN_CARDS.find((c) => c.id === id))
    .filter((c): c is CanadianCard => c !== undefined);

  const results: OptimizationResult[] = [];

  for (const monvoCategory of categories) {
    const monthlySpend = spendingByCategory[monvoCategory];
    const cardCategory = mapTransactionCategory(monvoCategory);

    // Determine current rewards value (best among user's cards for this category)
    let currentRewardsValue = 0;
    let currentCardName: string | null = null;

    for (const card of currentCards) {
      const rate = getEffectiveRate(card, cardCategory);
      const monthlyReward = monthlySpend * rate;
      // Amortize annual fee proportionally to this category's share of spend
      const feeShare =
        totalMonthlySpend > 0
          ? (card.annual_fee / 12) * (monthlySpend / totalMonthlySpend)
          : 0;
      const netReward = monthlyReward - feeShare;

      if (netReward > currentRewardsValue || currentCardName === null) {
        currentRewardsValue = Math.max(0, netReward);
        currentCardName =
          netReward >= 0 ? card.name : currentCards[0]?.name ?? null;
      }
    }

    // Find best card across all Canadian cards
    let bestCard = CANADIAN_CARDS[0];
    let bestNetReward = -Infinity;

    for (const card of CANADIAN_CARDS) {
      const rate = getEffectiveRate(card, cardCategory);
      const monthlyReward = monthlySpend * rate;
      const feeShare =
        totalMonthlySpend > 0
          ? (card.annual_fee / 12) * (monthlySpend / totalMonthlySpend)
          : 0;
      const netReward = monthlyReward - feeShare;

      if (netReward > bestNetReward) {
        bestNetReward = netReward;
        bestCard = card;
      }
    }

    const potentialRewardsValue = Math.max(0, bestNetReward);
    const monthlyGain = potentialRewardsValue - currentRewardsValue;
    const annualGain = monthlyGain * 12;

    const bestRate = getEffectiveRate(bestCard, cardCategory);
    const reasoning = buildReasoning(
      bestCard,
      cardCategory,
      bestRate,
      monthlySpend,
      currentCardName,
      monthlyGain
    );

    results.push({
      category: monvoCategory,
      monthly_spend: round2(monthlySpend),
      current_card: currentCardName,
      recommended_card: bestCard.name,
      current_rewards_value: round2(currentRewardsValue),
      potential_rewards_value: round2(potentialRewardsValue),
      monthly_gain: round2(monthlyGain),
      annual_gain: round2(annualGain),
      reasoning,
    });
  }

  // Sort by annual gain descending
  results.sort((a, b) => b.annual_gain - a.annual_gain);

  return results;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildReasoning(
  card: CanadianCard,
  cardCategory: string,
  rate: number,
  monthlySpend: number,
  currentCardName: string | null,
  monthlyGain: number
): string {
  const pct = (rate * 100).toFixed(1);
  const feeNote =
    card.annual_fee > 0
      ? ` (after $${card.annual_fee}/yr fee amortization)`
      : " (no annual fee)";

  if (monthlyGain <= 0 && currentCardName) {
    return `You're already optimized for ${cardCategory}. ${currentCardName} is your best option.`;
  }

  const parts = [
    `${card.name} earns ~${pct}% on ${cardCategory}${feeNote}.`,
  ];

  if (monthlyGain > 0) {
    parts.push(
      `Switching saves ~$${round2(monthlyGain)}/mo on $${round2(monthlySpend)} spend.`
    );
  }

  return parts.join(" ");
}
