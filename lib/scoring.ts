import type { Answers } from "./questions";

type Product = {
  capacity?: number | null;
  price?: number | null;
  star_rating?: number | null;
  iseer?: number | null;
  noise_db?: number | null;
  smart?: boolean | null;
  air_quality?: boolean | null;
};

/**
 * ---------------------------------------------------------
 * TARGET CAPACITY
 * ---------------------------------------------------------
 *
 * Estimates the appropriate AC capacity from room size.
 */
export function targetCapacity(answers: Answers): number {
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

/**
 * ---------------------------------------------------------
 * BUDGET
 * ---------------------------------------------------------
 */
function budgetLimit(answers: Answers): number {
  const budgets: Record<string, number> = {
    "₹30,000": 30000,
    "₹40,000": 40000,
    "₹50,000": 50000,
    "₹60,000": 60000,
    "₹75,000+": 75000,
  };

  return budgets[answers.budget] ?? 50000;
}

/**
 * ---------------------------------------------------------
 * CAPACITY FIT
 * ---------------------------------------------------------
 *
 * Capacity is one of the strongest signals because an AC
 * that is substantially undersized or oversized is not an
 * ideal recommendation.
 */
function capacityFit(
  productCapacity: number,
  target: number
): number {
  if (!productCapacity) return 0.25;

  const difference = Math.abs(productCapacity - target);

  if (difference === 0) return 1.0;
  if (difference <= 0.3) return 0.90;
  if (difference <= 0.5) return 0.75;
  if (difference <= 0.8) return 0.55;
  if (difference <= 1.0) return 0.35;

  return 0.15;
}

/**
 * ---------------------------------------------------------
 * PRICE FIT
 * ---------------------------------------------------------
 *
 * We don't want the cheapest product to automatically win.
 *
 * Products comfortably inside budget score well.
 * Slightly-over-budget products can still remain competitive.
 * Significantly-over-budget products are penalized.
 */
function priceFit(
  price: number,
  budget: number
): number {
  if (!price) return 0.5;

  if (price <= budget) {
    const savingRatio = (budget - price) / budget;

    return Math.min(
      1,
      0.88 + savingRatio * 0.20
    );
  }

  const overBudgetRatio =
    (price - budget) / budget;

  if (overBudgetRatio <= 0.05) return 0.82;
  if (overBudgetRatio <= 0.10) return 0.70;
  if (overBudgetRatio <= 0.20) return 0.50;
  if (overBudgetRatio <= 0.30) return 0.30;

  return 0.10;
}

/**
 * ---------------------------------------------------------
 * ENERGY EFFICIENCY
 * ---------------------------------------------------------
 */
function efficiencyFit(
  iseer: number
): number {
  if (!iseer) return 0.5;

  if (iseer >= 5.2) return 1.0;
  if (iseer >= 5.0) return 0.95;
  if (iseer >= 4.7) return 0.85;
  if (iseer >= 4.5) return 0.75;
  if (iseer >= 4.0) return 0.60;
  if (iseer >= 3.5) return 0.45;

  return 0.30;
}

/**
 * ---------------------------------------------------------
 * STAR RATING
 * ---------------------------------------------------------
 */
function starFit(
  rating: number,
  answers: Answers
): number {
  if (!rating) return 0.5;

  if (rating === 5) {
    if (answers.star === "Must have 5 Star") return 1.0;
    if (answers.star === "Prefer 5 Star") return 0.95;

    return 0.85;
  }

  if (rating >= 4) return 0.70;
  if (rating >= 3) return 0.45;

  return 0.25;
}

/**
 * ---------------------------------------------------------
 * NOISE
 * ---------------------------------------------------------
 */
function noiseFit(
  noise: number
): number {
  if (!noise) return 0.5;

  if (noise <= 28) return 1.0;
  if (noise <= 30) return 0.95;
  if (noise <= 32) return 0.85;
  if (noise <= 34) return 0.65;
  if (noise <= 36) return 0.45;

  return 0.25;
}

/**
 * ---------------------------------------------------------
 * PERSONAL PRIORITY FIT
 * ---------------------------------------------------------
 */
function priorityFit(
  product: Product,
  answers: Answers
): number {
  switch (answers.priority) {
    case "Electricity savings":
      return efficiencyFit(
        Number(product.iseer ?? 0)
      );

    case "Quiet operation":
      return noiseFit(
        Number(product.noise_db ?? 0)
      );

    case "Air quality":
      return product.air_quality ? 1.0 : 0.25;

    case "Smart features":
      return product.smart ? 1.0 : 0.25;

    case "Fast cooling": {
      const target = targetCapacity(answers);
      const capacity = Number(product.capacity ?? 0);

      if (capacity >= target) return 1.0;
      if (capacity >= target - 0.3) return 0.75;

      return 0.35;
    }

    default:
      return 0.60;
  }
}

/**
 * ---------------------------------------------------------
 * USAGE FIT
 * ---------------------------------------------------------
 *
 * Heavy daily usage increases the importance of efficiency
 * and 5-star rating.
 */
function usageFit(
  product: Product,
  answers: Answers
): number {
  const heavyUsage =
    answers.hours === "8–12 hours" ||
    answers.hours === "12+ hours";

  if (!heavyUsage) {
    return 0.60;
  }

  const stars = Number(
    product.star_rating ?? 0
  );

  const efficiency = Number(
    product.iseer ?? 0
  );

  let score = 0.50;

  if (stars === 5) {
    score += 0.25;
  }

  if (efficiency >= 5.0) {
    score += 0.25;
  } else if (efficiency >= 4.5) {
    score += 0.15;
  }

  return Math.min(1, score);
}

/**
 * ---------------------------------------------------------
 * OCCUPANCY FIT
 * ---------------------------------------------------------
 */
function occupancyFit(
  product: Product,
  answers: Answers
): number {
  const capacity = Number(
    product.capacity ?? 0
  );

  const target = targetCapacity(answers);

  if (
    (answers.people === "5+" ||
      answers.people === "3–4") &&
    capacity >= target
  ) {
    return 1.0;
  }

  if (capacity >= target) {
    return 0.85;
  }

  return 0.50;
}

/**
 * ---------------------------------------------------------
 * SCORE PRODUCT
 * ---------------------------------------------------------
 *
 * The model is intentionally weighted rather than using
 * arbitrary "+points" rules.
 *
 * Core fit:
 *
 * Capacity       30%
 * Budget         20%
 * Priority       20%
 * Efficiency     10%
 * Star rating     8%
 * Usage           6%
 * Occupancy       6%
 *
 * These weights make physical fit and the user's explicit
 * priority more important than secondary features.
 */
export function scoreProduct(
  product: Product,
  answers: Answers
): number {
  const target = targetCapacity(answers);
  const budget = budgetLimit(answers);

  const capacity = Number(
    product.capacity ?? 0
  );

  const price = Number(
    product.price ?? 0
  );

  const stars = Number(
    product.star_rating ?? 0
  );

  const iseer = Number(
    product.iseer ?? 0
  );

  const noise = Number(
    product.noise_db ?? 0
  );

  const capacityScore =
    capacityFit(capacity, target);

  const budgetScore =
    priceFit(price, budget);

  const priorityScore =
    priorityFit(product, answers);

  const efficiencyScore =
    efficiencyFit(iseer);

  const starScore =
    starFit(stars, answers);

  const usageScore =
    usageFit(product, answers);

  const occupancyScore =
    occupancyFit(product, answers);

  /*
   * -------------------------------------------------------
   * WEIGHTED MODEL
   * -------------------------------------------------------
   */

  let score =
    capacityScore * 30 +
    budgetScore * 20 +
    priorityScore * 20 +
    efficiencyScore * 10 +
    starScore * 8 +
    usageScore * 6 +
    occupancyScore * 6;

  /*
   * -------------------------------------------------------
   * EXPLICIT REQUIREMENT PENALTIES
   * -------------------------------------------------------
   *
   * These are deliberately limited.
   * We don't want one imperfect attribute to destroy an
   * otherwise good recommendation.
   */

  // User explicitly requires 5-star.
  if (
    answers.star === "Must have 5 Star" &&
    stars < 5
  ) {
    score -= 12;
  }

  // Very large capacity mismatch.
  if (
    capacity > 0 &&
    Math.abs(capacity - target) >= 1
  ) {
    score -= 8;
  }

  // Significantly outside budget.
  if (
    price > budget * 1.30
  ) {
    score -= 8;
  }

  /*
   * -------------------------------------------------------
   * PERSONAL PRIORITY BONUS
   * -------------------------------------------------------
   *
   * Give a small additional boost to products that are
   * particularly strong in the user's selected priority.
   */
  if (answers.priority === "Electricity savings") {
    if (iseer >= 5.2) score += 3;
  }

  if (answers.priority === "Quiet operation") {
    if (noise > 0 && noise <= 28) score += 3;
  }

  if (answers.priority === "Air quality") {
    if (product.air_quality) score += 3;
  }

  if (answers.priority === "Smart features") {
    if (product.smart) score += 3;
  }

  if (answers.priority === "Fast cooling") {
    if (capacity >= target) score += 3;
  }

  /*
   * -------------------------------------------------------
   * CALIBRATION
   * -------------------------------------------------------
   *
   * We don't expose the raw weighted score directly.
   *
   * A small compression toward the middle prevents the UI
   * from showing misleadingly extreme scores.
   *
   * Example:
   *
   * Raw 90 → ~88
   * Raw 75 → ~75
   * Raw 55 → ~58
   * Raw 35 → ~42
   */
  const calibrated =
    50 + (score - 50) * 0.90;

  return Math.max(
    20,
    Math.min(
      98,
      Math.round(calibrated)
    )
  );
}

/**
 * ---------------------------------------------------------
 * MATCH LABEL
 * ---------------------------------------------------------
 *
 * Use this wherever the recommendation UI needs a
 * human-readable interpretation of the score.
 */
export function matchLabel(
  score: number
): string {
  if (score >= 85) {
    return "Excellent Match";
  }

  if (score >= 75) {
    return "Very Good Match";
  }

  if (score >= 65) {
    return "Good Match";
  }

  if (score >= 50) {
    return "Fair Match";
  }

  return "Weak Match";
}
