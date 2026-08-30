import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Support both parameter naming styles:
  // /api/click?product=...&merchant=...
  // /api/click?product_id=...&merchant_id=...
  const productId =
    url.searchParams.get("product") ||
    url.searchParams.get("product_id");

  const merchantId =
    url.searchParams.get("merchant") ||
    url.searchParams.get("merchant_id");

  if (!productId || !merchantId) {
    return NextResponse.json(
      {
        error: "Missing product or merchant",
        required: {
          product: "product UUID",
          merchant: "merchant UUID",
        },
      },
      { status: 400 }
    );
  }

  try {
    const supabase = supabaseAdmin();

    // --------------------------------------------------
    // 1. Find the exact active offer
    // --------------------------------------------------

    const { data: offer, error: offerError } = await supabase
      .from("product_offers")
      .select(
        "id, product_id, merchant_id, affiliate_url, active"
      )
      .eq("product_id", productId)
      .eq("merchant_id", merchantId)
      .eq("active", true)
      .single();

    if (offerError || !offer || !offer.affiliate_url) {
      console.error("Offer lookup error:", offerError);

      return NextResponse.json(
        { error: "Offer unavailable" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 2. Find the active merchant
    // --------------------------------------------------

    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .select("id, name")
      .eq("id", merchantId)
      .eq("active", true)
      .single();

    if (merchantError || !merchant) {
      console.error("Merchant lookup error:", merchantError);

      return NextResponse.json(
        { error: "Merchant unavailable" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 3. Record affiliate click
    // --------------------------------------------------

    const { error: clickError } = await supabase
      .from("affiliate_clicks")
      .insert({
        offer_id: offer.id,
        merchant: merchant.name,
        product_id: productId,
        referrer: req.headers.get("referer"),
      });

    if (clickError) {
      // Tracking failure should NOT stop the purchase redirect.
      console.error(
        "Affiliate click tracking error:",
        clickError
      );
    }

    // --------------------------------------------------
    // 4. Redirect to the exact affiliate URL
    // --------------------------------------------------

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
