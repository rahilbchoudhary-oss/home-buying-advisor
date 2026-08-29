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
     * 2. Merchants / affiliate offers
     *
     * Both are controlled from Supabase.
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
        merchants (
          id,
          name,
          product_id,
          price,
          affiliate_url,
          active,
          last_checked_at,
          created_at,
          updated_at
        )
      `)
      .eq("category", "ac")
      .eq("active", true);

    if (error) {
      throw error;
    }

    /*
     * Calculate recommendation score.
     */
    const products = (data ?? [])
      .map((p: any) => ({
        ...p,

        match_score: scoreProduct(p, answers),

        /*
         * Supabase may return product_details
         * as an array because of the relationship.
         *
         * Convert it into the description string
         * expected by Advisor.tsx.
         */
        product_details:
          Array.isArray(p.product_details)
            ? p.product_details[0]?.description ?? null
            : p.product_details?.description ?? null,

        /*
         * Only active merchants should reach the UI.
         */
        merchants: (p.merchants ?? []).filter(
          (merchant: any) =>
            merchant.active === true
        ),
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
