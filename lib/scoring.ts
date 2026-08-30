import type { Answers } from "./questions";

type Product = {
  capacity?: number;
  price?: number;
  star_rating?: number;
  iseer?: number;
  noise_db?: number;
  smart?: boolean;
  air_quality?: boolean;
};

function targetCapacity(answers: Answers): number {
  switch (answers.room) {
    case "300+ sq ft":
    case "200–300 sq ft":
      return 2;

    case "150–200 sq ft":
    case "100–150 sq ft":
      return 1.5;

    default:
      return 1.2;
  }
}

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

function capacityScore(
  productCapacity: number,
  target: number
): number {
  if (productCapacity === target) return 1;

  const difference = Math.abs(productCapacity - target);

  if (difference <= 0.3) return 0.85;
  if (difference <= 0.5) return 0.65;
  if (difference <= 1) return 0.35;

  return 0.1;
}

function budgetScore(
  price: number,
  budget: number
): number {
  if (price <= budget) {
    // Reward products comfortably inside the budget,
    // but avoid making extremely cheap products automatically win.
    const savingRatio = (budget - price) / budget;

    return Math.min(1, 0.8 + savingRatio * 0.4);
  }

  const overBudgetRatio = (price - budget) / budget;

  if (overBudgetRatio <= 0.10) return 0.65;
  if (overBudgetRatio <= 0.20) return 0.40;
  if (overBudgetRatio <= 0.30) return 0.20;

  return 0;
}

function efficiencyScore(iseer: number): number {
  if (iseer >= 5.2) return 1;
  if (iseer >= 5.0) return 0.9;
  if (iseer >= 4.5) return 0.75;
  if (iseer >= 4.0) return 0.55;
  if (iseer >= 3.5) return 0.35;

  return 0.2;
}

function noiseScore(noise: number): number {
  if (noise <= 28) return 1;
  if (noise <= 30) return 0.9;
  if (noise <= 32) return 0.75;
  if (noise <= 34) return 0.5;
  if (noise <= 36) return 0.3;

  return 0.1;
}

function starScore(
  rating: number,
  answers: Answers
): number {
  if (rating === 5) {
    if (answers.star === "Must have 5 Star") return 1;
    if (answers.star === "Prefer 5 Star") return 0.95;

    return 0.85;
  }

  if (rating >= 4) return 0.65;
  if (rating >= 3) return 0.4;

  return 0.2;
}

export function scoreProduct(
  product: Product,
  answers: Answers
): number {
  const capacity = Number(product.capacity ?? 0);
  const price = Number(product.price ?? 0);
  const stars = Number(product.star_rating ?? 0);
  const iseer = Number(product.iseer ?? 0);
  const noise = Number(product.noise_db ?? 99);

  const target = targetCapacity(answers);
  const budget = budgetLimit(answers);

  /*
   * ---------------------------------------------------------
   * 1. BASE FIT
   * ---------------------------------------------------------
   */

  let weightedScore = 0;
  let totalWeight = 0;

  // Capacity is the most important physical-fit variable.
  weightedScore += capacityScore(capacity, target) * 35;
  totalWeight += 35;

  // Budget matters, but shouldn't dominate the recommendation.
  weightedScore += budgetScore(price, budget) * 25;
  totalWeight += 25;

  // Energy efficiency.
  weightedScore += efficiencyScore(iseer) * 15;
  totalWeight += 15;

  // Star rating.
  weightedScore += starScore(stars, answers) * 10;
  totalWeight += 10;

  /*
   * ---------------------------------------------------------
   * 2. PERSONAL PRIORITY
   * ---------------------------------------------------------
   *
   * We give the user's explicit priority more weight.
   */

  switch (answers.priority) {
    case "Electricity savings":
      weightedScore += efficiencyScore(iseer) * 15;
      totalWeight += 15;
      break;

    case "Quiet operation":
      weightedScore += noiseScore(noise) * 15;
      totalWeight += 15;
      break;

    case "Air quality":
      weightedScore += (product.air_quality ? 1 : 0.2) * 15;
      totalWeight += 15;
      break;

    case "Smart features":
      weightedScore += (product.smart ? 1 : 0.2) * 15;
      totalWeight += 15;
      break;

    case "Fast cooling":
      weightedScore +=
        (capacity >= target ? 1 : capacity >= target - 0.3 ? 0.7 : 0.25) *
        15;
      totalWeight += 15;
      break;

    default:
      weightedScore += 0.6 * 15;
      totalWeight += 15;
  }

  /*
   * ---------------------------------------------------------
   * 3. USAGE / OCCUPANCY
   * ---------------------------------------------------------
   */

  if (
    (answers.hours === "8–12 hours" ||
      answers.hours === "12+ hours") &&
    stars === 5
  ) {
    weightedScore += 5;
    totalWeight += 5;
  } else {
    weightedScore += 3;
    totalWeight += 5;
  }

  /*
   * ---------------------------------------------------------
   * 4. PEOPLE / ROOM FIT
   * ---------------------------------------------------------
   */

  if (
    (answers.people === "5+" || answers.people === "3–4") &&
    capacity >= target
  ) {
    weightedScore += 5;
    totalWeight += 5;
  } else {
    weightedScore += 3;
    totalWeight += 5;
  }

  /*
   * ---------------------------------------------------------
   * 5. NORMALIZED SCORE
   * ---------------------------------------------------------
   */

  let score = (weightedScore / totalWeight) * 100;

  /*
   * ---------------------------------------------------------
   * 6. HARD MISMATCH PENALTIES
   * ---------------------------------------------------------
   *
   * These prevent a product with attractive secondary
   * features from outranking something that actually fits.
   */

  // Severe capacity mismatch.
  if (Math.abs(capacity - target) >= 1) {
    score -= 15;
  }

  // Significant budget violation.
  if (price > budget * 1.2) {
    score -= 15;
  }

  // User explicitly requires 5 Star.
  if (
    answers.star === "Must have 5 Star" &&
    stars < 5
  ) {
    score -= 20;
  }

  /*
   * ---------------------------------------------------------
   * 7. FINAL CALIBRATION
   * ---------------------------------------------------------
   */

  return Math.max(
    0,
    Math.min(98, Math.round(score))
  );
}

export { targetCapacity };
