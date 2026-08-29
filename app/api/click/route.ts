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

    /*
     * Find the offer for this exact:
     *
     * product + merchant
     */
    const { data: offer, error } = await supabase
      .from("product_offers")
      .select(`
        id,
        product_id,
        merchant_id,
        affiliate_url,
        active,
        merchants (
          id,
          name,
          active
        )
      `)
      .eq("product_id", productId)
      .eq("merchant_id", merchantId)
      .eq("active", true)
      .single();

    if (
      error ||
      !offer ||
      !offer.affiliate_url
    ) {
      return NextResponse.json(
        { error: "Offer unavailable" },
        { status: 404 }
      );
    }

    /*
     * Supabase can return the nested merchant
     * relationship as an array.
     */
    const merchantName = Array.isArray(offer.merchants)
      ? offer.merchants[0]?.name ?? ""
      : offer.merchants?.name ?? "";

    /*
     * Record the affiliate click.
     */
    await supabase
      .from("affiliate_clicks")
      .insert({
        offer_id: offer.id,
        merchant: merchantName,
        product_id: productId,
        referrer: req.headers.get("referer"),
      });

    /*
     * Redirect to the product-specific
     * affiliate URL.
     */
    return NextResponse.redirect(
      offer.affiliate_url,
      302
    );
  } catch (e) {
    console.error(e);

    return NextResponse.json(
      {
        error: "Affiliate redirect unavailable",
      },
      { status: 500 }
    );
  }
}
