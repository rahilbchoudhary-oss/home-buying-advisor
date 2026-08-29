import type { Answers } from "./questions";

const BUDGETS: Record<string, number> = {
  "₹30,000": 30000,
  "₹40,000": 40000,
  "₹50,000": 50000,
  "₹60,000": 60000,
  "₹75,000+": 75000,
};

type Product = {
  capacity?: number;
  price?: number;
  star_rating?: number;
  iseer?: number;
  noise_db?: number;
  smart?: boolean;
  air_quality?: boolean;
};

export type ScoreBreakdown = {
  capacity: number;
  budget: number;
  efficiency: number;
  priority: number;
  occupancy: number;
  noise: number;
  features: number;
  total: number;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function numeric(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

/*
 * Climate adjustment.
 *
 * City is deliberately a secondary signal.
 * We do not award arbitrary "city points".
 *
 * Instead, climate slightly changes the estimated
 * cooling requirement.
 */
function climateAdjustment(city?: string) {
  switch (city) {
    case "Delhi NCR":
      return 0.15;

    case "Mumbai":
    case "Chennai":
    case "Kolkata":
      return 0.10;

    case "Bengaluru":
      return 0;

    default:
      return 0.05;
  }
}

/*
 * Estimate the required AC capacity from:
 *
 * 1. Room size
 * 2. Occupancy
 * 3. Climate
 *
 * Room size remains the dominant signal.
 */
export function targetCapacity(answers: Answers) {
  let capacity = 1.2;

  // Base capacity from room size.
  if (answers.room === "<100 sq ft") {
    capacity = 1.2;
  } else if (answers.room === "100–150 sq ft") {
    capacity = 1.5;
  } else if (answers.room === "150–200 sq ft") {
    capacity = 1.5;
  } else if (answers.room === "200–300 sq ft") {
    capacity = 2;
  } else if (answers.room === "300+ sq ft") {
    capacity = 2;
  }

  // Occupancy adjustment.
  if (answers.people === "3–4") {
    capacity += 0.10;
  }

  if (answers.people === "5+") {
    capacity += 0.20;
  }

  // Climate adjustment.
  capacity += climateAdjustment(answers.city);

  // AC products in our current catalogue are
  // generally around 1.2–2 Ton, so don't let
  // the calculated target become unrealistic.
  return Math.min(2.5, Number(capacity.toFixed(2)));
}

/*
 * Capacity contributes 30 points.
 *
 * Exact / very close matches score highest.
 * Oversizing or undersizing progressively reduces
 * the score.
 */
function capacityScore(
  productCapacity: number | null,
  target: number
) {
  if (productCapacity === null) return 0;

  const difference = Math.abs(productCapacity - target);

  if (difference <= 0.10) return 30;
  if (difference <= 0.25) return 27;
  if (difference <= 0.40) return 23;
  if (difference <= 0.60) return 17;
  if (difference <= 0.80) return 10;
  if (difference <= 1.00) return 4;

  return 0;
}

/*
 * Budget contributes 20 points.
 *
 * Staying within budget is strongly preferred.
 * Slightly exceeding the budget is allowed as a
 * fallback, but receives a significant penalty.
 */
function budgetScore(
  price: number | null,
  budget: number
) {
  if (price === null || budget <= 0) return 0;

  const ratio = price / budget;

  if (ratio <= 0.75) return 20;
  if (ratio <= 0.90) return 19;
  if (ratio <= 1.00) return 18;
  if (ratio <= 1.05) return 14;
  if (ratio <= 1.15) return 8;
  if (ratio <= 1.30) return 3;

  return 0;
}

/*
 * Energy efficiency contributes 15 points.
 *
 * ISEER gives us a continuous efficiency signal.
 * Star rating captures the user's stated preference.
 */
function efficiencyScore(
  product: Product,
  answers: Answers,
  usageWeight: number
) {
  const iseer = numeric(product.iseer);
  const stars = numeric(product.star_rating);

  let score = 0;

  if (iseer !== null) {
    if (iseer >= 5.5) score += 8;
    else if (iseer >= 5.0) score += 7;
    else if (iseer >= 4.5) score += 5;
    else if (iseer >= 4.0) score += 3;
    else score += 1;
  }

  if (answers.star === "Must have 5 Star") {
    if (stars === 5) score += 5;
    else if (stars !== null && stars >= 4) score += 2;
  } else if (answers.star === "Prefer 5 Star") {
    if (stars === 5) score += 4;
    else if (stars !== null && stars >= 4) score += 2;
  } else if (answers.star === "Either is fine") {
    if (stars === 5) score += 2;
  } else if (answers.star === "Lowest price first") {
    // Price is already handled separately.
    if (stars === 5) score += 1;
  }

  // Longer usage increases the importance
  // of efficiency.
  score += usageWeight;

  return clamp(score, 0, 15);
}

/*
 * User-selected priority contributes 15 points.
 */
function priorityScore(
  product: Product,
  answers: Answers,
  target: number
) {
  switch (answers.priority) {
    case "Electricity savings": {
      const iseer = numeric(product.iseer);

      if (iseer === null) return 0;

      if (iseer >= 5.5) return 15;
      if (iseer >= 5.0) return 12;
      if (iseer >= 4.5) return 8;
      if (iseer >= 4.0) return 4;

      return 1;
    }

    case "Fast cooling": {
      const capacity = numeric(product.capacity);

      if (capacity === null) return 0;

      if (capacity >= target) return 15;
      if (capacity >= target - 0.25) return 10;
      if (capacity >= target - 0.50) return 5;

      return 0;
    }

    case "Quiet operation": {
      const noise = numeric(product.noise_db);

      if (noise === null) return 0;

      if (noise <= 30) return 15;
      if (noise <= 32) return 12;
      if (noise <= 34) return 8;
      if (noise <= 36) return 4;

      return 0;
    }

    case "Air quality":
      return product.air_quality === true ? 15 : 0;

    case "Smart features":
      return product.smart === true ? 15 : 0;

    case "Low maintenance":
      /*
       * We don't currently have a maintenance field.
       * Therefore we intentionally don't invent a
       * product-specific maintenance score.
       */
      return 7.5;

    default:
      return 7.5;
  }
}

/*
 * Occupancy contributes 10 points.
 */
function occupancyScore(
  productCapacity: number | null,
  answers: Answers
) {
  if (productCapacity === null) return 0;

  const minimumCapacity =
    answers.people === "5+"
      ? 1.8
      : answers.people === "3–4"
        ? 1.5
        : 1.0;

  if (productCapacity >= minimumCapacity) return 10;
  if (productCapacity >= minimumCapacity - 0.20) return 7;
  if (productCapacity >= minimumCapacity - 0.50) return 4;

  return 0;
}

/*
 * Noise contributes 5 points.
 */
function noiseScore(noise: number | null) {
  if (noise === null) return 0;

  if (noise <= 30) return 5;
  if (noise <= 32) return 4;
  if (noise <= 34) return 3;
  if (noise <= 36) return 1.5;

  return 0;
}

/*
 * General feature fit contributes 5 points.
 *
 * These features should not dominate the decision
 * unless the user explicitly selected them as a priority.
 */
function featureScore(product: Product) {
  let score = 0;

  if (product.smart === true) {
    score += 2.5;
  }

  if (product.air_quality === true) {
    score += 2.5;
  }

  return score;
}

/*
 * Full explainable scoring breakdown.
 */
export function scoreProductBreakdown(
  product: Product,
  answers: Answers
): ScoreBreakdown {
  const target = targetCapacity(answers);

  const price = numeric(product.price);
  const capacity = numeric(product.capacity);

  const budget =
    BUDGETS[answers.budget] ?? 50000;

  const usageWeight =
    answers.hours === "12+ hours"
      ? 2
      : answers.hours === "8–12 hours"
        ? 1.5
        : answers.hours === "4–8 hours"
          ? 0.75
          : 0;

  const breakdown = {
    capacity: capacityScore(
      capacity,
      target
    ),

    budget: budgetScore(
      price,
      budget
    ),

    efficiency: efficiencyScore(
      product,
      answers,
      usageWeight
    ),

    priority: priorityScore(
      product,
      answers,
      target
    ),

    occupancy: occupancyScore(
      capacity,
      answers
    ),

    noise: noiseScore(
      numeric(product.noise_db)
    ),

    features: featureScore(product),
  };

  const total = Math.round(
    breakdown.capacity +
      breakdown.budget +
      breakdown.efficiency +
      breakdown.priority +
      breakdown.occupancy +
      breakdown.noise +
      breakdown.features
  );

  return {
    ...breakdown,
    total: clamp(total, 0, 100),
  };
}

/*
 * Public function used by the recommendation API.
 *
 * Keeps the existing API contract unchanged.
 */
export function scoreProduct(
  product: Product,
  answers: Answers
) {
  return scoreProductBreakdown(
    product,
    answers
  ).total;
}
