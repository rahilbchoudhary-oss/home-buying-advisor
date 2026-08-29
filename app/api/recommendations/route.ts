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
     * Get active AC products together with:
     *
     * 1. Product details
     * 2. Product-specific offers
     * 3. Merchant information for each offer
     */
    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_details (
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
     * Calculate recommendation score.
     *
     * Only active product offers are returned.
     */
    const products = (data ?? [])
      .map((p: any) => ({
        ...p,

        match_score: scoreProduct(p, answers),

        /*
         * Convert product_details relationship into
         * the description string expected by Advisor.tsx
         */
        product_details:
          Array.isArray(p.product_details)
            ? p.product_details[0]?.description ?? null
            : p.product_details?.description ?? null,

        /*
         * Convert product_offers into the merchant
         * structure expected by the frontend.
         *
         * Each offer belongs to one specific product
         * and one specific merchant.
         */
        merchants: (p.product_offers ?? [])
          .filter(
            (offer: any) =>
              offer.active === true &&
              offer.merchants?.active === true
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
          })),
      }))
      .sort(
        (a: any, b: any) =>
          b.match_score - a.match_score
      )
      .slice(0, 3);

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
