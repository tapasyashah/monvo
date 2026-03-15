export interface CanadianCard {
  id: string;
  name: string;
  issuer: string;
  annual_fee: number;
  rewards_type: "cashback" | "points" | "miles";
  earn_rates: Array<{
    category: string;
    rate: number;
    rate_type: "multiplier" | "percent";
    cap?: number;
  }>;
  signup_bonus?: { value: number; spend_required: number; months: number };
  notable_perks: string[];
  best_for: string[];
}

export const CANADIAN_CARDS: CanadianCard[] = [
  {
    id: "amex-cobalt",
    name: "American Express Cobalt Card",
    issuer: "American Express",
    annual_fee: 155.88, // $12.99/month
    rewards_type: "points",
    earn_rates: [
      { category: "Groceries", rate: 5, rate_type: "multiplier" },
      { category: "Dining", rate: 5, rate_type: "multiplier" },
      { category: "Streaming", rate: 3, rate_type: "multiplier" },
      { category: "Transit", rate: 2, rate_type: "multiplier" },
      { category: "Gas", rate: 2, rate_type: "multiplier" },
      { category: "Travel", rate: 2, rate_type: "multiplier" },
      { category: "Other", rate: 1, rate_type: "multiplier" },
    ],
    signup_bonus: { value: 300, spend_required: 750, months: 3 },
    notable_perks: [
      "Membership Rewards points transferable to Aeroplan, Marriott Bonvoy",
      "No foreign transaction fee (2.5% markup waived on Cobalt earn)",
      "Monthly fee structure vs annual",
    ],
    best_for: ["Groceries", "Dining"],
  },
  {
    id: "scotiabank-passport-vi",
    name: "Scotiabank Passport Visa Infinite",
    issuer: "Scotiabank",
    annual_fee: 150,
    rewards_type: "points",
    earn_rates: [
      { category: "Dining", rate: 3, rate_type: "multiplier" },
      { category: "Entertainment", rate: 3, rate_type: "multiplier" },
      { category: "Transit", rate: 3, rate_type: "multiplier" },
      { category: "Groceries", rate: 2, rate_type: "multiplier" },
      { category: "Gas", rate: 2, rate_type: "multiplier" },
      { category: "Recurring", rate: 2, rate_type: "multiplier" },
      { category: "Other", rate: 1, rate_type: "multiplier" },
    ],
    signup_bonus: { value: 350, spend_required: 1000, months: 3 },
    notable_perks: [
      "No foreign transaction fees",
      "6 airport lounge passes per year",
      "Comprehensive travel insurance",
    ],
    best_for: ["Travel", "Dining", "Entertainment"],
  },
  {
    id: "cibc-dividend-vi",
    name: "CIBC Dividend Visa Infinite",
    issuer: "CIBC",
    annual_fee: 99,
    rewards_type: "cashback",
    earn_rates: [
      { category: "Groceries", rate: 4, rate_type: "percent" },
      { category: "Gas", rate: 4, rate_type: "percent" },
      { category: "Transit", rate: 2, rate_type: "percent" },
      { category: "Dining", rate: 2, rate_type: "percent" },
      { category: "Recurring", rate: 2, rate_type: "percent" },
      { category: "Other", rate: 1, rate_type: "percent" },
    ],
    notable_perks: [
      "Straightforward cashback (no points conversion)",
      "Mobile device insurance",
      "Extended warranty",
    ],
    best_for: ["Groceries", "Gas"],
  },
  {
    id: "td-cashback-vi",
    name: "TD Cash Back Visa Infinite",
    issuer: "TD",
    annual_fee: 89,
    rewards_type: "cashback",
    earn_rates: [
      { category: "Groceries", rate: 3, rate_type: "percent" },
      { category: "Gas", rate: 3, rate_type: "percent" },
      { category: "Recurring", rate: 3, rate_type: "percent" },
      { category: "Other", rate: 1, rate_type: "percent" },
    ],
    notable_perks: [
      "Auto-redeems cashback to statement credit",
      "Purchase security and extended warranty",
      "Common carrier travel accident insurance",
    ],
    best_for: ["Groceries", "Gas", "Recurring bills"],
  },
  {
    id: "rogers-world-elite",
    name: "Rogers World Elite Mastercard",
    issuer: "Rogers Bank",
    annual_fee: 0,
    rewards_type: "cashback",
    earn_rates: [
      { category: "Foreign", rate: 4, rate_type: "percent" },
      { category: "Rogers", rate: 3, rate_type: "percent" },
      { category: "Other", rate: 1.5, rate_type: "percent" },
    ],
    notable_perks: [
      "No annual fee",
      "No foreign transaction fee (net positive with 4% earn on USD)",
      "Extended warranty and purchase protection",
    ],
    best_for: ["Foreign purchases", "Everyday spending (no fee)"],
  },
  {
    id: "pc-financial-we",
    name: "PC Financial World Elite Mastercard",
    issuer: "PC Financial",
    annual_fee: 0,
    rewards_type: "points",
    earn_rates: [
      { category: "Groceries", rate: 3, rate_type: "percent" }, // 30 pts/$1 at Loblaw stores ≈ 3%
      { category: "Shoppers", rate: 4.5, rate_type: "percent" }, // 45 pts/$1 at Shoppers
      { category: "Gas", rate: 3, rate_type: "percent" }, // 30 pts/$1 at Esso/Mobil
      { category: "Other", rate: 1, rate_type: "percent" }, // 10 pts/$1 everywhere else
    ],
    notable_perks: [
      "No annual fee",
      "PC Optimum points redeemable at Loblaw, Shoppers, Esso",
      "Strong earn rate at Loblaw banner grocery stores",
    ],
    best_for: ["Loblaw groceries", "Shoppers Drug Mart"],
  },
  {
    id: "tangerine-world",
    name: "Tangerine World Mastercard",
    issuer: "Tangerine",
    annual_fee: 0,
    rewards_type: "cashback",
    earn_rates: [
      { category: "Selected2", rate: 2, rate_type: "percent" }, // 2 categories of your choice
      { category: "Other", rate: 0.5, rate_type: "percent" },
    ],
    notable_perks: [
      "No annual fee",
      "Choose 2 categories for 2% (3 with Tangerine savings account)",
      "Cashback deposited to Tangerine savings",
    ],
    best_for: ["Flexible category optimization (no fee)"],
  },
  {
    id: "bmo-cashback-we",
    name: "BMO CashBack World Elite Mastercard",
    issuer: "BMO",
    annual_fee: 120,
    rewards_type: "cashback",
    earn_rates: [
      { category: "Groceries", rate: 5, rate_type: "percent" },
      { category: "Transit", rate: 5, rate_type: "percent" },
      { category: "Gas", rate: 3, rate_type: "percent" },
      { category: "Other", rate: 1, rate_type: "percent" },
    ],
    signup_bonus: { value: 400, spend_required: 4000, months: 3 },
    notable_perks: [
      "5% on groceries and transit (high combined earn)",
      "Extended warranty and purchase protection",
      "Roadside assistance",
    ],
    best_for: ["Groceries", "Transit"],
  },
];

/**
 * Maps a Monvo transaction category to the canonical card earn-rate category.
 * Monvo categories (from merchant normalization) include: Groceries, Dining,
 * Gas, Streaming, Retail, Tech, Insurance, Housing, Income, Investments,
 * Entertainment, Transit, Travel, Subscriptions, Utilities, Health, Education.
 */
export function mapTransactionCategory(monvoCategory: string): string {
  const mapping: Record<string, string> = {
    Groceries: "Groceries",
    Dining: "Dining",
    Gas: "Gas",
    Streaming: "Streaming",
    Retail: "Other",
    Tech: "Other",
    Insurance: "Recurring",
    Housing: "Other",
    Entertainment: "Entertainment",
    Transit: "Transit",
    Travel: "Travel",
    Subscriptions: "Recurring",
    Utilities: "Recurring",
    Health: "Other",
    Education: "Other",
  };
  return mapping[monvoCategory] ?? "Other";
}

/**
 * Get the effective cashback/rewards percentage for a card in a given category.
 * For multiplier-type rates (points), we assume 1 point ≈ $0.01 (1% per 1x).
 * For percent-type rates, the rate is already a percentage.
 */
export function getEffectiveRate(card: CanadianCard, category: string): number {
  // Find the specific category rate, falling back to "Other"
  const specificRate = card.earn_rates.find((r) => r.category === category);
  const fallbackRate = card.earn_rates.find((r) => r.category === "Other");
  const rate = specificRate ?? fallbackRate;

  if (!rate) return 0;

  if (rate.rate_type === "percent") {
    return rate.rate / 100; // Convert 4% -> 0.04
  }
  // multiplier: 5x points ≈ 5% at $0.01/point
  return (rate.rate * 0.01);
}
