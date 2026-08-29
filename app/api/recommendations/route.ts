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

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        brand,
        capacity,
        star_rating,
        price,
        iseer,
        noise_db,
        smart,
        air_quality,
        warranty,
        model_number,
        image_url,
        product_details
      `)
      .eq("category", "ac")
      .eq("active", true);

    if (error) {
      throw error;
    }

    const products = (data ?? [])
      .map((p: any) => ({
        ...p,
        match_score: scoreProduct(p, answers),
      }))
      .sort(
        (a: any, b: any) =>
          b.match_score - a.match_score
      )
      .slice(0, 3);

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
