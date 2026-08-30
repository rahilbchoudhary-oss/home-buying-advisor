import type { Answers } from "./questions";

export type ScoringProduct = {
  capacity: number;
  star_rating: number;
  price: number;
  iseer: number;
  noise_db: number;
  smart: boolean;
  air_quality: boolean;
};

export type MatchReasonType = "positive" | "negative" | "neutral";

export type MatchReason = {
  type: MatchReasonType;
  text: string;
};

export type MatchBreakdown = {
  rawScore: number;
  finalScore: number;
  reasons: MatchReason[];
};

export function targetCapacity(answers: Answers) {
  if (
    answers.room === "300+ sq ft" ||
    answers.room === "200–300 sq ft"
  ) {
    return 2;
  }

  if (
    answers.room === "150–200 sq ft" ||
    answers.room === "100–150 sq ft"
  ) {
    return 1.5;
  }

  return 1.2;
}

function budgetLimit(answers: Answers): number {
  const budgets: Record<string, number> = {
    "₹30,000": 30000,
    "₹40,000": 40000,
    "₹50,000": 50000,
    "₹60,000": 60000,
    "₹75,000+": 75000,
  };

  return budgets[answers.budget ?? ""] ?? 50000;
}

function formatPrice(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/**
 * Single source of truth for scoring + explanations.
 *
 * Every point awarded here is also represented by a reason.
 */
export function getMatchBreakdown(
  p: ScoringProduct,
  a: Answers
): MatchBreakdown {
  const cap = targetCapacity(a);
  const budget = budgetLimit(a);

  let score = 50;

  const positive: MatchReason[] = [];
  const negative: MatchReason[] = [];

  /* =========================================================
     1. CAPACITY / ROOM FIT
     ========================================================= */

  if (p.capacity === cap) {
    score += 22;

    positive.push({
      type: "positive",
      text: `${p.capacity} Ton capacity suits your ${a.room} room size.`,
    });
  } else if (Math.abs(p.capacity - cap) === 0.5) {
    score += 8;

    positive.push({
      type: "positive",
      text: `${p.capacity} Ton is reasonably close to the ${cap} Ton capacity target for your room.`,
    });
  } else {
    negative.push({
      type: "negative",
      text: `${p.capacity} Ton differs from the ${cap} Ton capacity target for your room.`,
    });
  }

  /* =========================================================
     2. BUDGET
     ========================================================= */

  if (p.price <= budget) {
    score += 15;

    positive.push({
      type: "positive",
      text: `${formatPrice(p.price)} is within your ${formatPrice(
        budget
      )} maximum budget.`,
    });
  } else {
    score -= 25;

    negative.push({
      type: "negative",
      text: `${formatPrice(p.price)} is above your ${formatPrice(
        budget
      )} maximum budget, so budget fit is reduced.`,
    });
  }

  /* =========================================================
     3. STAR RATING
     ========================================================= */

  if (
    a.star === "Must have 5 Star" &&
    p.star_rating === 5
  ) {
    score += 9;

    positive.push({
      type: "positive",
      text: "5 Star rating matches your requirement for maximum efficiency.",
    });
  }

  if (
    a.star === "Prefer 5 Star" &&
    p.star_rating === 5
  ) {
    score += 5;

    positive.push({
      type: "positive",
      text: "5 Star rating matches your preference for higher efficiency.",
    });
  }

  if (
    a.star === "Must have 5 Star" &&
    p.star_rating !== 5
  ) {
    negative.push({
      type: "negative",
      text: `${p.star_rating} Star rating does not meet your 5 Star requirement.`,
    });
  }

  /* =========================================================
     4. DAILY USAGE
     ========================================================= */

  if (
    a.hours === "8–12 hours" ||
    a.hours === "12+ hours"
  ) {
    if (p.star_rating === 5) {
      score += 7;

      positive.push({
        type: "positive",
        text: "5 Star efficiency is valuable for your long daily AC usage.",
      });
    }
  }

  /* =========================================================
     5. PRIMARY PRIORITY
     ========================================================= */

  if (a.priority === "Electricity savings") {
    if (p.iseer >= 5) {
      score += 8;

      positive.push({
        type: "positive",
        text: `ISEER ${p.iseer} supports your electricity-saving priority.`,
      });
    } else {
      negative.push({
        type: "negative",
        text: `ISEER ${p.iseer} is below the 5.0 level used for your electricity-saving priority.`,
      });
    }
  }

  if (a.priority === "Quiet operation") {
    if (p.noise_db <= 31) {
      score += 8;

      positive.push({
        type: "positive",
        text: `${p.noise_db} dB is a strong fit for your quiet-operation priority.`,
      });
    } else {
      negative.push({
        type: "negative",
        text: `${p.noise_db} dB is less suited to your quiet-operation priority.`,
      });
    }
  }

  if (a.priority === "Air quality") {
    if (p.air_quality) {
      score += 8;

      positive.push({
        type: "positive",
        text: "Air-quality features match your air-quality priority.",
      });
    } else {
      negative.push({
        type: "negative",
        text: "This model does not have the air-quality feature used by your priority.",
      });
    }
  }

  if (a.priority === "Smart features") {
    if (p.smart) {
      score += 7;

      positive.push({
        type: "positive",
        text: "Smart features match your preference for connected controls.",
      });
    } else {
      negative.push({
        type: "negative",
        text: "This model does not provide the smart features you prioritised.",
      });
    }
  }

  if (a.priority === "Fast cooling") {
    if (p.capacity >= cap) {
      score += 5;

      positive.push({
        type: "positive",
        text: `${p.capacity} Ton capacity supports your fast-cooling priority.`,
      });
    } else {
      negative.push({
        type: "negative",
        text: `The ${p.capacity} Ton capacity is below your ${cap} Ton target for fast cooling.`,
      });
    }
  }

  /* =========================================================
     6. OCCUPANCY / COOLING LOAD
     ========================================================= */

  if (
    (a.people === "5+" || a.people === "3–4") &&
    p.capacity >= cap
  ) {
    score += 4;

    positive.push({
      type: "positive",
      text: `${p.capacity} Ton capacity is appropriate for your higher occupancy level.`,
    });
  }

  const rawScore = score;

  const finalScore = Math.max(
    50,
    Math.min(98, Math.round(score))
  );

  /*
   * Show the most decision-relevant reasons first.
   *
   * We don't want a wall of text.
   */
  const reasons = [
    ...positive.slice(0, 5),
    ...negative.slice(0, 2),
  ];

  return {
    rawScore,
    finalScore,
    reasons,
  };
}

/**
 * Existing public scoring function.
 *
 * IMPORTANT:
 * It now uses getMatchBreakdown(), so the displayed score and
 * explanation can never use different scoring rules.
 */
export function scoreProduct(
  p: ScoringProduct,
  a: Answers
): number {
  return getMatchBreakdown(p, a).finalScore;
}

/**
 * Convenience function for the UI.
 */
export function explainMatch(
  p: ScoringProduct,
  a: Answers
): MatchReason[] {
  return getMatchBreakdown(p, a).reasons;
}
