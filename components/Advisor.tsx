"use client";

import { useMemo, useState } from "react";
import { questions, type Answers } from "@/lib/questions";

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
  match_score: number;
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

  const top = products[0];

  return (
    <div className="engine results">

      {/* PERSONALIZED MATCH SUMMARY */}

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
          Best fit for your {answers.room} room, {answers.people} occupants,
          {answers.hours} daily usage and {answers.budget} budget.
        </p>

        <div className="tags">
          <span>{top.capacity} Ton</span>
          <span>{top.star_rating} Star</span>
          <span>ISEER {top.iseer}</span>
          <span>₹{top.price.toLocaleString("en-IN")}</span>
        </div>

      </div>

      {/* PRODUCT RESULTS */}

      <div className="productList">

        {products.map((p, i) => (

          <article
            className="product"
            key={p.id}
          >

            {/* PRODUCT IMAGE */}

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

            {/* PRODUCT INFORMATION */}

            <div className="productInfo">

              {/* RANK + SCORE ROW */}

              <div className="productTopRow">

                <div className="rank">
                  {i === 0
                    ? "🥇 BEST MATCH"
                    : i === 1
                      ? "🥈 ALTERNATIVE"
                      : "🥉 BUDGET / SPECIALTY CHOICE"}
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

              {/* PRODUCT NAME + SCORE */}

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

              {/* WHERE TO BUY */}

              <Retailers product={p} />

            </div>

          </article>

        ))}

      </div>

      {/* START AGAIN */}

      <button
        className="button secondary restartButton"
        onClick={onRestart}
      >
        ↻ Start again
      </button>

      <p className="disclaimer">
        Affiliate disclosure: Home Buying Advisor may earn a commission
        from qualifying purchases. Prices, stock, specifications and offers
        should be verified on the retailer page before purchase.
      </p>

    </div>
  );
}

function Retailers({
  product,
}: {
  product: Product;
}) {
  const rows = [
    ["Amazon", product.price],
    ["Flipkart", Math.max(product.price - 1000, 0)],
    ["Croma", product.price + 491],
    ["Brand Store", product.price + 1000],
  ];

  return (
    <div className="retailers">

      <h4>
        Where to buy
      </h4>

      <div className="retailerGrid">

        {rows.map(([name, price]) => (

          <div
            className="retailer"
            key={name}
          >

            <b>
              {name}
            </b>

            <span>
              ₹{Number(price).toLocaleString("en-IN")}
            </span>

            <a
              className="button primary small"
              href={`/api/click?product=${encodeURIComponent(
                product.id
              )}&merchant=${encodeURIComponent(
                String(name)
              )}`}
              target="_blank"
              rel="nofollow sponsored noopener"
            >
              Buy
            </a>

          </div>

        ))}

      </div>

    </div>
  );
}
