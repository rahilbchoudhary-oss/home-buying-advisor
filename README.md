# Home Buying Advisor — production-ready AC MVP

This repository turns the original static demo into a deployable Next.js + Supabase architecture.

## Stack

- Next.js App Router + TypeScript
- Supabase/Postgres for product, offer and analytics data
- Server-side recommendation API
- Server-side affiliate redirect/tracking endpoint
- Responsive frontend
- Ready for GitHub + Vercel deployment

## 1. Create the database

Create a Supabase project, open SQL Editor, and run:

`supabase/schema.sql`

The SQL creates:
- `products` — normalized product catalog
- `offers` — merchant/affiliate offers
- `recommendation_events` — anonymous engine usage events
- `affiliate_clicks` — outbound affiliate click tracking

The seed records are intentionally demo data. Replace them with verified products and approved affiliate URLs.

## 2. Configure locally

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_SITE_URL`

Never expose the service-role key in client code or GitHub.

## 3. Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. GitHub test/deployment

Create a GitHub repository and push this folder.

Then import the repository into Vercel. Add the same environment variables in Vercel Project Settings.

Build command: `npm run build`
Output: Next.js default

## Affiliate architecture

Users click:

`/api/click?product=<id>&merchant=<merchant>`

The server:
1. validates the offer in Supabase
2. records a click
3. redirects to the stored affiliate URL

This keeps affiliate URLs out of the UI and gives you a first-party click ledger.

## Production next steps

1. Replace sample AC products with verified catalog data.
2. Replace demo URLs with approved Amazon/Flipkart/Croma/brand affiliate URLs.
3. Add merchant API/feed jobs for price updates.
4. Add product detail pages with SEO metadata.
5. Add admin authentication and a catalog management screen.
6. Add city/climate/load rules validated by HVAC expertise.
7. Add privacy policy, terms, affiliate disclosure and consent/analytics policy.
8. Add rate limiting/bot protection to API routes.
9. Add error monitoring and automated tests.
10. Add UTM/sub-ID parameters required by each affiliate network.

## Important engineering note

The scoring logic in `lib/scoring.ts` is an MVP business rule engine, not a substitute for HVAC engineering advice. Validate tonnage/load assumptions and all product specifications before publishing commercial recommendations.
