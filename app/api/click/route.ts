import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);

  const productId = url.searchParams.get("product");
  const merchantId = url.searchParams.get("merchant");

  if (!productId || !merchantId) {
    return NextResponse.json(
      { error: "Missing product or merchant" },
      { status: 400 }
    );
  }

  try {
    const supabase = supabaseAdmin();

    // Find the exact offer for this product + merchant
    const { data: offer, error: offerError } = await supabase
      .from("product_offers")
      .select("id, product_id, merchant_id, affiliate_url, active")
      .eq("product_id", productId)
      .eq("merchant_id", merchantId)
      .eq("active", true)
      .single();

    if (offerError || !offer || !offer.affiliate_url) {
      return NextResponse.json(
        { error: "Offer unavailable" },
        { status: 404 }
      );
    }

    // Get merchant name separately
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, name")
      .eq("id", merchantId)
      .eq("active", true)
      .single();

    if (merchantError || !merchant) {
      return NextResponse.json(
        { error: "Merchant unavailable" },
        { status: 404 }
      );
    }

    // Record affiliate click
    const { error: clickError } = await supabase
      .from("affiliate_clicks")
      .insert({
        offer_id: offer.id,
        merchant: merchant.name,
        product_id: productId,
        referrer: req.headers.get("referer"),
      });

    if (clickError) {
      console.error("Affiliate click tracking error:", clickError);
      // Do not block the user's purchase because tracking failed.
    }

    // Redirect to the product-specific affiliate URL
    return NextResponse.redirect(
      offer.affiliate_url,
      302
    );
  } catch (error) {
    console.error("Affiliate redirect error:", error);

    return NextResponse.json(
      { error: "Affiliate redirect unavailable" },
      { status: 500 }
    );
  }
}
