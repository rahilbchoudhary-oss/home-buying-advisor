import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req:Request) {
  const url=new URL(req.url);
  const productId=url.searchParams.get("product");
  const merchant=url.searchParams.get("merchant");
  if (!productId || !merchant) return NextResponse.json({error:"Missing product or merchant"},{status:400});
  try {
    const supabase=supabaseAdmin();
    const {data,error}=await supabase.from("offers").select("id,affiliate_url,active").eq("product_id",productId).eq("merchant",merchant).eq("active",true).single();
    if (error || !data?.affiliate_url) return NextResponse.json({error:"Offer unavailable"},{status:404});
    await supabase.from("affiliate_clicks").insert({offer_id:data.id,merchant,product_id:productId,referrer:req.headers.get("referer")});
    return NextResponse.redirect(data.affiliate_url,302);
  } catch(e) {
    console.error(e);
    return NextResponse.json({error:"Affiliate redirect unavailable"},{status:500});
  }
}