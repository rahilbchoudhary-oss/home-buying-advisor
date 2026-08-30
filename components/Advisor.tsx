"use client";

import { useMemo, useState } from "react";
import { questions, type Answers } from "@/lib/questions";
import { explainMatch, type MatchReason } from "@/lib/scoring";
import { matchLabel } from "@/lib/scoring";

type Merchant = {
  id: string;
  name: string;
  product_id: string;
  price: number | null;
  affiliate_url: string | null;
  active: boolean;
  last_checked_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type Product = {
  id: string;
  name: string;
  brand: string;
  capacity: number;
  star_rating: number;
  price: number;
  iseer: number;
  noise_db: number;
  smart: boolean;
  air_quality: boolean;
  warranty: string;
  model_number?: string | null;
  image_url?: string | null;
  product_details?: string | null;
  merchants?: Merchant[];
  match_score: number;
  has_active_offer?: boolean;
  active_offer_count?: number;
};

const initial: Answers = {};

export default function Advisor() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initial);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const title = useMemo(
    () => (products.length ? "Your personalized shortlist" : ""),
    [products]
  );

  function restart() {
    setStep(0);
    setAnswers({});
    setProducts([]);
    setError("");
  }

  /*
   * Results screen.
   *
   * IMPORTANT:
   * Check this before accessing questions[step].
   */
  if (step === questions.length) {
    return (
      <Results
        products={products}
        answers={answers}
        onRestart={restart}
        title={title}
      />
    );
  }

  const q = questions[step];
  const complete = Boolean(answers[q.key]);

  async function next() {
    if (!complete) return;

    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Could not calculate recommendations"
        );
      }

      if (!Array.isArray(data.products)) {
        throw new Error("Invalid recommendation response");
      }

      setProducts(data.products);
      setStep(questions.length);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function choose(value: string) {
    setAnswers((a) => ({
      ...a,
      [q.key]: value,
    }));
  }

  return (
    <div className="engine">
      <div className="progress">
        <i
          style={{
            width: `${((step + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <div className="qmeta">
        <span>
          Question {step + 1} of {questions.length}
        </span>

        <span>
          {Math.round((step / questions.length) * 100)}% complete
        </span>
      </div>

      <h2>{q.title}</h2>

      <p className="muted">{q.sub}</p>

      <div className="options">
        {q.options.map((o) => (
          <button
            key={o.value}
            className={
              "option " +
              (answers[q.key] === o.value ? "selected" : "")
            }
            onClick={() => choose(o.value)}
          >
            <b>{o.value}</b>
            <small>{o.help}</small>
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="engineFoot">
        <button
          className="button secondary"
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
        >
          ← Back
        </button>

        <button
          className="button primary"
          onClick={next}
          disabled={!complete || loading}
        >
          {loading
            ? "Calculating…"
            : step === questions.length - 1
              ? "See my matches"
              : "Continue →"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   RESULTS
   ========================================================= */

function Results({
  products,
  answers,
  onRestart,
  title,
}: {
  products: Product[];
  answers: Answers;
  onRestart: () => void;
  title: string;
}) {
  if (!products.length) {
    return (
      <div className="engine">
        <h2>No products matched yet.</h2>

        <button
          className="button primary"
          onClick={onRestart}
        >
          Try again
        </button>
      </div>
    );
  }

  /*
   * DATA-SCIENCE PRINCIPLE
   *
   * Match score = product fit.
   *
   * Availability is treated separately.
   *
   * An affiliate offer does not increase the product's
   * match score.
   */

  const availableProducts = products.filter((product) =>
    hasBuyableOffer(product)
  );

  const unavailableProducts = products.filter(
    (product) => !hasBuyableOffer(product)
  );

  /*
   * The API is responsible for ranking.
   *
   * We preserve the API ranking while separating
   * commercially available products from unavailable ones.
   */

  const top = availableProducts[0] ?? products[0];

  return (
    <div className="engine results">

      {/* =====================================================
          PERSONALIZED SHORTLIST
          ===================================================== */}

      <div className="resultHero">

        <div className="shortlistLabel">
          {title || "Your personalized shortlist"}
        </div>

        <div className="topMatch">

          <span className="match">
            🥇 {top.match_score}% MATCH
          </span>

          <h2>{top.name}</h2>

        </div>

        <p>
          Best fit for your {answers.room} room,{" "}
          {answers.people} occupants, {answers.hours} daily usage
          and {answers.budget} budget.
        </p>

        <div className="tags">

          <span>
            {top.capacity} Ton
          </span>

          <span>
            {top.star_rating} Star
          </span>

          <span>
            ISEER {top.iseer}
          </span>

          <span>
            ₹{Number(top.price).toLocaleString("en-IN")}
          </span>

        </div>

      </div>

      {/* =====================================================
          AVAILABLE PRODUCTS
          ===================================================== */}

      {availableProducts.length > 0 && (
        <>
          <div
            className="resultsSectionHeading"
            style={{
              margin: "8px 0 14px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 24,
              }}
            >
              Available to buy now
            </h2>

            <p
              className="muted"
              style={{
                margin: "5px 0 0",
              }}
            >
              Products that match your requirements and currently
              have an active retailer offer.
            </p>
          </div>

          <div className="productList">

            {availableProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={index}
                available
              />
            ))}

          </div>
        </>
      )}

      {/* =====================================================
          UNAVAILABLE PRODUCTS
          ===================================================== */}

      {unavailableProducts.length > 0 && (
        <>
          <div
            className="resultsSectionHeading"
            style={{
              margin: "30px 0 14px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 24,
              }}
            >
              Strong matches — currently unavailable
            </h2>

            <p
              className="muted"
              style={{
                margin: "5px 0 0",
              }}
            >
              These products scored well for your needs, but we
              do not have an active retailer offer right now.
            </p>
          </div>

          <div className="productList">

            {unavailableProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={-1}
                available={false}
              />
            ))}

          </div>
        </>
      )}

      {/* =====================================================
          START AGAIN
          ===================================================== */}

      <button
        className="button secondary restartButton"
        onClick={onRestart}
      >
        ↻ Start again
      </button>

      <p className="disclaimer">
        Affiliate disclosure: Home Buying Advisor may earn a
        commission from qualifying purchases. Prices, stock,
        specifications and offers should be verified on the
        retailer page before purchase.
      </p>

    </div>
  );
}

/* =========================================================
   CHECK WHETHER PRODUCT IS CURRENTLY BUYABLE
   ========================================================= */

function hasBuyableOffer(product: Product): boolean {
  if (product.has_active_offer === true) {
    return true;
  }

  return (product.merchants ?? []).some(
    (merchant) =>
      merchant.active === true &&
      merchant.price !== null &&
      Boolean(merchant.affiliate_url)
  );
}

/* =========================================================
   PRODUCT CARD
   ========================================================= */

function ProductCard({
  product: p,
  rank,
  available,
}: {
  product: Product;
  rank: number;
  available: boolean;
}) {
  /*
   * Calibrated match label.
   *
   * Examples:
   *
   * 85+  = Excellent Match
   * 75+  = Very Good Match
   * 65+  = Good Match
   * 50+  = Fair Match
   * <50  = Weak Match
   */
  const calibratedLabel = matchLabel(p.match_score);

  return (
    <article
      className="product"
      style={
        !available
          ? {
              opacity: 0.94,
            }
          : undefined
      }
    >

      {/* =================================================
          PRODUCT IMAGE
          ================================================= */}

      <div className="productImageBox">

        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="productImage"
          />
        ) : (
          <div className="productImagePlaceholder">
            AC image unavailable
          </div>
        )}

      </div>

      {/* =================================================
          PRODUCT INFORMATION
          ================================================= */}

      <div className="productInfo">

        {/* RANK + MATCH SCORE */}

        <div className="productTopRow">

          <div className="rank">

            {available ? (
              rank === 0 ? (
                "🥇 BEST MATCH"
              ) : rank === 1 ? (
                "🥈 ALTERNATIVE"
              ) : (
                `⭐ ${calibratedLabel.toUpperCase()}`
              )
            ) : (
              <>
                🔎 {calibratedLabel.toUpperCase()}{" "}
                — CURRENTLY UNAVAILABLE
              </>
            )}

          </div>

          <div className="matchScore">

            <span>
              Your match score
            </span>

            <strong>
              {p.match_score}%
            </strong>

          </div>

        </div>

        {/* PRODUCT NAME */}

        <div className="productTitleRow">

          <h3>
            {p.name}
          </h3>

        </div>

        {/* PRODUCT SPECIFICATIONS */}

        <div className="tags">

          <span>
            {p.capacity} Ton
          </span>

          <span>
            {p.star_rating} Star
          </span>

          <span>
            ISEER {p.iseer}
          </span>

          <span>
            {p.noise_db} dB
          </span>

          <span>
            {p.warranty}
          </span>

        </div>
        
        <WhyThisMatch
  product={p}
  answers={answers}
/>
        
        {/* DESCRIPTION */}

        {p.product_details && (
          <ProductDescription
            description={p.product_details}
          />
        )}

        {/* RETAILERS */}

        <Retailers product={p} />

      </div>

    </article>
  );
}

/* =========================================================
   WHY THIS MATCH

   Generates the explanation directly from the scoring engine.

   IMPORTANT:
   We do NOT manually write product-specific reasons here.

   explainMatch() uses the same scoring logic that produced
   the match score.
   ========================================================= */

function WhyThisMatch({
  product,
  answers,
}: {
  product: Product;
  answers: Answers;
}) {
  const reasons = explainMatch(product, answers);

  if (!reasons.length) {
    return null;
  }

  return (
    <div className="whyMatch">

      <div className="whyMatchHeader">

        <span className="whyMatchIcon">
          ✓
        </span>

        <div>
          <h4>
            Why this match?
          </h4>

          <p>
            Based on your answers and this product's specifications.
          </p>
        </div>

      </div>

      <ul className="whyMatchList">

        {reasons.map((reason, index) => (

          <li
            key={`${reason.text}-${index}`}
            className={`whyMatchItem ${reason.type}`}
          >

            <span className="whyMatchBullet">
              {reason.type === "negative" ? "!" : "✓"}
            </span>

            <span>
              {reason.text}
            </span>

          </li>

        ))}

      </ul>

    </div>
  );
}


/* =========================================================
   PRODUCT DESCRIPTION
   ========================================================= */

function ProductDescription({
  description,
}: {
  description: string;
}) {
  const points = description
    .split(/\r?\n|•|(?=\d+[\.\)])/)
    .map((point) =>
      point
        .replace(/^\s*\d+[\.\)]\s*/, "")
        .trim()
    )
    .filter(Boolean)
    .slice(0, 3);

  if (!points.length) {
    return null;
  }

  return (
    <div className="productDescription">

      <h4>
        Description
      </h4>

      <ul>
        {points.map((point, index) => (
          <li key={index}>
            {point}
          </li>
        ))}
      </ul>

    </div>
  );
}

/* =========================================================
   RETAILERS
   ========================================================= */

function Retailers({
  product,
}: {
  product: Product;
}) {
  const merchants = (product.merchants ?? [])
    .filter(
      (merchant) =>
        merchant.active === true &&
        merchant.name.trim() !== "" &&
        merchant.price !== null
    );

  if (!merchants.length) {
    return (
      <div className="retailers">

        <h4>
          Where to buy
        </h4>

        <p className="muted">
          No active offers available right now.
        </p>

      </div>
    );
  }

  return (
    <div className="retailers">

      <h4>
        Where to buy
      </h4>

      <div className="retailerGrid">

        {merchants.map((merchant) => (

          <div
            className="retailer"
            key={merchant.id}
          >

            <b title={merchant.name}>
              {merchant.name}
            </b>

            <span>
              ₹
              {Number(merchant.price).toLocaleString("en-IN")}
            </span>

            {merchant.affiliate_url ? (
              <a
                className="button primary small"
                href={`/api/click?product=${encodeURIComponent(
                  product.id
                )}&merchant=${encodeURIComponent(
                  merchant.id
                )}`}
                target="_blank"
                rel="nofollow sponsored noopener"
              >
                Buy
              </a>
            ) : (
              <button
                className="button primary small"
                disabled
              >
                Buy
              </button>
            )}

          </div>

        ))}

      </div>

    </div>
  );
}
