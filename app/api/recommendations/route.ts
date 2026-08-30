import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { scoreProduct } from "@/lib/scoring";

export async function POST(req: Request) {
  try {
    const { answers } = await req.json();

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Invalid answers" },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin();

    /*
     * Retrieve active AC products together with:
     *
     * 1. Product details
     * 2. Product-specific offers
     * 3. Merchant information
     */
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_details_relation:product_details (
          id,
          product_id,
          description,
          created_at,
          updated_at
        ),
        product_offers (
          id,
          product_id,
          merchant_id,
          price,
          affiliate_url,
          active,
          last_checked_at,
          created_at,
          updated_at,
          merchants (
            id,
            name,
            active
          )
        )
      `)
      .eq("category", "ac")
      .eq("active", true);

    if (error) {
      throw error;
    }

    /*
     * Build recommendation dataset.
     *
     * The scoring engine should use the price that the
     * user can actually buy the product for.
     *
     * Therefore:
     *
     * active retailer offer price
     *          ↓
     * lowest active offer price
     *          ↓
     * used for budget scoring
     *
     * If no active offer exists, we fall back to the
     * product table price.
     */
    const products = (data ?? [])
      .map((p: any) => {
        /*
         * Keep only valid active retailer offers.
         */
        const merchants = (p.product_offers ?? [])
          .filter(
            (offer: any) =>
              offer.active === true &&
              offer.merchants?.active === true &&
              offer.merchants?.name?.trim() !== "" &&
              offer.price !== null &&
              offer.affiliate_url
          )
          .map((offer: any) => ({
            id: offer.merchant_id,
            name: offer.merchants.name,
            product_id: offer.product_id,
            price: offer.price,
            affiliate_url: offer.affiliate_url,
            active: offer.active,
            last_checked_at: offer.last_checked_at,
            created_at: offer.created_at,
            updated_at: offer.updated_at,
          }));

        /*
         * Find the lowest currently available retailer price.
         */
        const lowestOfferPrice = merchants.length
          ? Math.min(
              ...merchants.map((merchant: any) =>
                Number(merchant.price)
              )
            )
          : null;

        /*
         * Use the actual active retailer price when
         * available; otherwise fall back to products.price.
         */
        const effectivePrice =
          lowestOfferPrice !== null
            ? lowestOfferPrice
            : p.price;

        /*
         * Give the scoring engine the effective price.
         */
        const productForScoring = {
          ...p,
          price: effectivePrice,
        };

        return {
          ...p,

          /*
           * Personalized product-fit score.
           */
          match_score: scoreProduct(
            productForScoring,
            answers
          ),

          /*
           * Effective price used by the scoring engine.
           */
          price: effectivePrice,

          /*
           * Availability information is kept separate
           * from the match score.
           */
          has_active_offer: merchants.length > 0,
          active_offer_count: merchants.length,

          /*
           * Convert product_details relationship into
           * the description expected by Advisor.tsx.
           */
          product_details:
            p.product_details ??
            (Array.isArray(p.product_details_relation)
              ? p.product_details_relation[0]?.description ?? null
              : p.product_details_relation?.description ?? null),

          /*
           * Retailer offers shown on the results page.
           */
          merchants,
        };
      })

      /*
       * Ranking logic.
       *
       * 1. Products that can actually be purchased come first.
       * 2. Higher personalized match score comes next.
       * 3. Lower price breaks ties.
       *
       * We do NOT artificially increase the match score
       * because a product has an active offer.
       */
      .sort((a: any, b: any) => {
        if (a.has_active_offer !== b.has_active_offer) {
          return a.has_active_offer ? -1 : 1;
        }

        if (b.match_score !== a.match_score) {
          return b.match_score - a.match_score;
        }

        return (
          Number(a.price ?? Infinity) -
          Number(b.price ?? Infinity)
        );
      })

      /*
       * Keep the current result limit for this test.
       *
       * We will change this to 10 after validating
       * the ranking behaviour.
       */
      .slice(0, 7);

    /*
     * Record recommendation event.
     */
    await supabase
      .from("recommendation_events")
      .insert({
        answers,
        result_product_ids: products.map(
          (p: any) => p.id
        ),
      });

    return NextResponse.json({
      products,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        error:
          "Recommendation service unavailable. Check your Supabase configuration.",
      },
      { status: 500 }
    );
  }
}
