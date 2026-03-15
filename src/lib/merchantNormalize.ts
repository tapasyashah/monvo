/**
 * Comprehensive merchant normalization for Canadian personal finance.
 *
 * Resolves variant merchant names (e.g. "LOBLAWS #4421", "loblaws",
 * "Walmart Canada", "walmart.ca") to a single canonical form so analytics,
 * recurring detection, and Top Merchants charts aggregate correctly.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NormalizedMerchant {
  canonical_name: string;
  display_name: string;
  category: string;
  is_canadian: boolean;
}

export interface NormalizationRule {
  patterns: string[];
  normalized: NormalizedMerchant;
}

// ---------------------------------------------------------------------------
// Rules — 30+ merchants across major Canadian spending categories
// ---------------------------------------------------------------------------

export const NORMALIZATION_RULES: NormalizationRule[] = [
  // ── Groceries ──────────────────────────────────────────────────────────
  {
    patterns: ["loblaws", "loblaw"],
    normalized: {
      canonical_name: "Loblaws",
      display_name: "Loblaws",
      category: "Groceries",
      is_canadian: true,
    },
  },
  {
    patterns: ["no frills", "nofrills"],
    normalized: {
      canonical_name: "No Frills",
      display_name: "No Frills",
      category: "Groceries",
      is_canadian: true,
    },
  },
  {
    patterns: ["metro inc", "metro grocery", "metro #"],
    normalized: {
      canonical_name: "Metro",
      display_name: "Metro",
      category: "Groceries",
      is_canadian: true,
    },
  },
  {
    patterns: ["sobeys", "sobey"],
    normalized: {
      canonical_name: "Sobeys",
      display_name: "Sobeys",
      category: "Groceries",
      is_canadian: true,
    },
  },
  {
    patterns: ["freshco", "fresh co"],
    normalized: {
      canonical_name: "FreshCo",
      display_name: "FreshCo",
      category: "Groceries",
      is_canadian: true,
    },
  },
  {
    patterns: ["food basics"],
    normalized: {
      canonical_name: "Food Basics",
      display_name: "Food Basics",
      category: "Groceries",
      is_canadian: true,
    },
  },
  {
    patterns: ["costco"],
    normalized: {
      canonical_name: "Costco",
      display_name: "Costco",
      category: "Groceries",
      is_canadian: true,
    },
  },

  // ── Restaurants / Fast Food ────────────────────────────────────────────
  {
    patterns: ["mcdonald", "mcdonalds", "mcdonald's", "mcd's"],
    normalized: {
      canonical_name: "McDonald's",
      display_name: "McDonald's",
      category: "Restaurants",
      is_canadian: false,
    },
  },
  {
    patterns: ["tim horton", "timhorton", "tims"],
    normalized: {
      canonical_name: "Tim Hortons",
      display_name: "Tim Hortons",
      category: "Restaurants",
      is_canadian: true,
    },
  },
  {
    patterns: ["starbucks"],
    normalized: {
      canonical_name: "Starbucks",
      display_name: "Starbucks",
      category: "Restaurants",
      is_canadian: false,
    },
  },
  {
    patterns: ["subway"],
    normalized: {
      canonical_name: "Subway",
      display_name: "Subway",
      category: "Restaurants",
      is_canadian: false,
    },
  },
  {
    patterns: ["a&w", "a & w"],
    normalized: {
      canonical_name: "A&W",
      display_name: "A&W",
      category: "Restaurants",
      is_canadian: true,
    },
  },
  {
    patterns: ["popeyes", "popeye's"],
    normalized: {
      canonical_name: "Popeyes",
      display_name: "Popeyes",
      category: "Restaurants",
      is_canadian: false,
    },
  },

  // ── Retail ─────────────────────────────────────────────────────────────
  {
    patterns: ["walmart", "wal-mart", "wal mart"],
    normalized: {
      canonical_name: "Walmart",
      display_name: "Walmart",
      category: "Retail",
      is_canadian: false,
    },
  },
  // Canadian Tire Gas must appear before general Canadian Tire (first-match-wins)
  {
    patterns: ["canadian tire gas", "cdn tire gas"],
    normalized: {
      canonical_name: "Canadian Tire Gas",
      display_name: "Canadian Tire Gas",
      category: "Gas",
      is_canadian: true,
    },
  },
  {
    patterns: ["canadian tire", "cdn tire", "canadiantire"],
    normalized: {
      canonical_name: "Canadian Tire",
      display_name: "Canadian Tire",
      category: "Retail",
      is_canadian: true,
    },
  },
  {
    patterns: ["home depot"],
    normalized: {
      canonical_name: "Home Depot",
      display_name: "Home Depot",
      category: "Retail",
      is_canadian: false,
    },
  },
  {
    patterns: ["ikea"],
    normalized: {
      canonical_name: "IKEA",
      display_name: "IKEA",
      category: "Retail",
      is_canadian: false,
    },
  },
  {
    patterns: ["dollarama"],
    normalized: {
      canonical_name: "Dollarama",
      display_name: "Dollarama",
      category: "Retail",
      is_canadian: true,
    },
  },
  {
    patterns: ["winners"],
    normalized: {
      canonical_name: "Winners",
      display_name: "Winners",
      category: "Retail",
      is_canadian: true,
    },
  },

  // ── Telecom ────────────────────────────────────────────────────────────
  {
    patterns: ["rogers"],
    normalized: {
      canonical_name: "Rogers",
      display_name: "Rogers",
      category: "Telecom",
      is_canadian: true,
    },
  },
  {
    patterns: ["bell canada", "bell mobility", "bell media"],
    normalized: {
      canonical_name: "Bell",
      display_name: "Bell",
      category: "Telecom",
      is_canadian: true,
    },
  },
  {
    patterns: ["telus"],
    normalized: {
      canonical_name: "Telus",
      display_name: "Telus",
      category: "Telecom",
      is_canadian: true,
    },
  },
  {
    patterns: ["fido"],
    normalized: {
      canonical_name: "Fido",
      display_name: "Fido",
      category: "Telecom",
      is_canadian: true,
    },
  },
  {
    patterns: ["koodo"],
    normalized: {
      canonical_name: "Koodo",
      display_name: "Koodo",
      category: "Telecom",
      is_canadian: true,
    },
  },

  // ── Streaming ──────────────────────────────────────────────────────────
  {
    patterns: ["netflix"],
    normalized: {
      canonical_name: "Netflix",
      display_name: "Netflix",
      category: "Streaming",
      is_canadian: false,
    },
  },
  {
    patterns: ["spotify"],
    normalized: {
      canonical_name: "Spotify",
      display_name: "Spotify",
      category: "Streaming",
      is_canadian: false,
    },
  },
  {
    patterns: ["disney+", "disneyplus", "disney plus"],
    normalized: {
      canonical_name: "Disney+",
      display_name: "Disney+",
      category: "Streaming",
      is_canadian: false,
    },
  },
  {
    patterns: ["crave"],
    normalized: {
      canonical_name: "Crave",
      display_name: "Crave",
      category: "Streaming",
      is_canadian: true,
    },
  },
  {
    patterns: ["apple tv"],
    normalized: {
      canonical_name: "Apple TV+",
      display_name: "Apple TV+",
      category: "Streaming",
      is_canadian: false,
    },
  },
  {
    patterns: ["youtube premium", "youtube music"],
    normalized: {
      canonical_name: "YouTube Premium",
      display_name: "YouTube Premium",
      category: "Streaming",
      is_canadian: false,
    },
  },

  // ── Food Delivery ─────────────────────────────────────────────────────
  {
    patterns: ["skipthedishes", "skip the dishes", "skip dish"],
    normalized: {
      canonical_name: "SkipTheDishes",
      display_name: "SkipTheDishes",
      category: "Food Delivery",
      is_canadian: true,
    },
  },
  {
    patterns: ["doordash", "door dash"],
    normalized: {
      canonical_name: "DoorDash",
      display_name: "DoorDash",
      category: "Food Delivery",
      is_canadian: false,
    },
  },
  {
    patterns: ["uber eat", "ubereats"],
    normalized: {
      canonical_name: "Uber Eats",
      display_name: "Uber Eats",
      category: "Food Delivery",
      is_canadian: false,
    },
  },

  // ── Gas ────────────────────────────────────────────────────────────────
  {
    patterns: ["petro-can", "petro can", "petrocan", "petro canada"],
    normalized: {
      canonical_name: "Petro-Canada",
      display_name: "Petro-Canada",
      category: "Gas",
      is_canadian: true,
    },
  },
  {
    patterns: ["shell"],
    normalized: {
      canonical_name: "Shell",
      display_name: "Shell",
      category: "Gas",
      is_canadian: false,
    },
  },
  {
    patterns: ["esso", "imperial oil"],
    normalized: {
      canonical_name: "Esso",
      display_name: "Esso",
      category: "Gas",
      is_canadian: false,
    },
  },
  // ── Insurance ──────────────────────────────────────────────────────────
  {
    patterns: ["westland"],
    normalized: {
      canonical_name: "Westland Insurance",
      display_name: "Westland Insurance",
      category: "Insurance",
      is_canadian: true,
    },
  },
  {
    patterns: ["intact"],
    normalized: {
      canonical_name: "Intact Insurance",
      display_name: "Intact Insurance",
      category: "Insurance",
      is_canadian: true,
    },
  },
  {
    patterns: ["aviva"],
    normalized: {
      canonical_name: "Aviva",
      display_name: "Aviva",
      category: "Insurance",
      is_canadian: false,
    },
  },

  // ── Tech / Software ───────────────────────────────────────────────────
  {
    patterns: ["openai", "chatgpt"],
    normalized: {
      canonical_name: "OpenAI",
      display_name: "OpenAI",
      category: "Tech",
      is_canadian: false,
    },
  },
  {
    patterns: ["shopify"],
    normalized: {
      canonical_name: "Shopify",
      display_name: "Shopify",
      category: "Tech",
      is_canadian: true,
    },
  },
  {
    patterns: ["amazon", "amzn"],
    normalized: {
      canonical_name: "Amazon",
      display_name: "Amazon",
      category: "Retail",
      is_canadian: false,
    },
  },
  {
    patterns: ["google"],
    normalized: {
      canonical_name: "Google",
      display_name: "Google",
      category: "Tech",
      is_canadian: false,
    },
  },
  {
    patterns: ["apple.com", "apple store", "apple inc"],
    normalized: {
      canonical_name: "Apple",
      display_name: "Apple",
      category: "Tech",
      is_canadian: false,
    },
  },
  {
    patterns: ["microsoft"],
    normalized: {
      canonical_name: "Microsoft",
      display_name: "Microsoft",
      category: "Tech",
      is_canadian: false,
    },
  },

  // ── Banking ────────────────────────────────────────────────────────────
  {
    patterns: ["cibc"],
    normalized: {
      canonical_name: "CIBC",
      display_name: "CIBC",
      category: "Banking",
      is_canadian: true,
    },
  },
  {
    patterns: ["td bank", "td canada"],
    normalized: {
      canonical_name: "TD",
      display_name: "TD",
      category: "Banking",
      is_canadian: true,
    },
  },
  {
    patterns: ["rbc ", "royal bank"],
    normalized: {
      canonical_name: "RBC",
      display_name: "RBC",
      category: "Banking",
      is_canadian: true,
    },
  },
  {
    patterns: ["scotiabank", "scotia bank", "bns"],
    normalized: {
      canonical_name: "Scotiabank",
      display_name: "Scotiabank",
      category: "Banking",
      is_canadian: true,
    },
  },

  // ── Alcohol ────────────────────────────────────────────────────────────
  {
    patterns: ["lcbo"],
    normalized: {
      canonical_name: "LCBO",
      display_name: "LCBO",
      category: "Alcohol",
      is_canadian: true,
    },
  },
  {
    patterns: ["beer store"],
    normalized: {
      canonical_name: "Beer Store",
      display_name: "Beer Store",
      category: "Alcohol",
      is_canadian: true,
    },
  },
];

// ---------------------------------------------------------------------------
// Pre-build a lookup-friendly structure (runs once at module load)
// ---------------------------------------------------------------------------

const COMPILED_RULES = NORMALIZATION_RULES.map((rule) => ({
  patterns: rule.patterns.map((p) => p.toLowerCase()),
  normalized: rule.normalized,
}));

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Attempt to normalize a raw merchant string against the rule set.
 *
 * Matching is case-insensitive substring: if any pattern from a rule appears
 * anywhere in the lowered raw name, that rule wins (first match).
 *
 * @returns The matching NormalizedMerchant, or null if no rule matched.
 */
export function normalizeMerchant(rawName: string): NormalizedMerchant | null {
  if (!rawName) return null;
  const lower = rawName.trim().toLowerCase();
  if (!lower) return null;

  for (const rule of COMPILED_RULES) {
    for (const pattern of rule.patterns) {
      if (lower.includes(pattern)) {
        return rule.normalized;
      }
    }
  }

  return null;
}

/**
 * Backward-compatible wrapper used by analytics and upload routes.
 *
 * Returns the canonical_name for a matched merchant, or the original string
 * unchanged when no rule matches. Preserves null pass-through.
 */
export function canonicalMerchant(merchant: string | null): string | null {
  if (merchant == null || merchant === "") return merchant;
  const result = normalizeMerchant(merchant);
  return result ? result.canonical_name : merchant;
}
