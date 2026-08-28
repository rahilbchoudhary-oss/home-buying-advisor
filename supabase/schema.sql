create extension if not exists "pgcrypto";

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'ac',
  brand text not null,
  name text not null,
  capacity numeric not null,
  star_rating int not null,
  price numeric not null,
  iseer numeric,
  noise_db numeric,
  smart boolean not null default false,
  air_quality boolean not null default false,
  warranty text,
  slug text unique not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  merchant text not null,
  price numeric,
  affiliate_url text not null,
  active boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(product_id,merchant)
);

create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  answers jsonb not null,
  result_product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists affiliate_clicks (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references offers(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  merchant text not null,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists products_category_active_idx on products(category,active);
create index if not exists offers_product_active_idx on offers(product_id,active);
create index if not exists affiliate_clicks_created_idx on affiliate_clicks(created_at);

alter table products enable row level security;
alter table offers enable row level security;
alter table recommendation_events enable row level security;
alter table affiliate_clicks enable row level security;

-- Public browser access is intentionally denied. The Next.js server uses the
-- service-role key for controlled reads/writes. Keep SUPABASE_SERVICE_ROLE_KEY
-- server-side only.

insert into products (brand,name,capacity,star_rating,price,iseer,noise_db,smart,air_quality,warranty,slug)
values
('AeroCool','AeroCool Pro Inverter 1.5T 5 Star',1.5,5,42999,5.2,31,true,true,'1 + 4 years','aerocool-pro-inverter-15t'),
('CoolMax','CoolMax EnergySave 1.5T 5 Star',1.5,5,38999,5.0,33,false,true,'1 + 4 years','coolmax-energysave-15t'),
('Breeze X','Breeze X Smart 1.5T 3 Star',1.5,3,34999,3.8,34,true,false,'1 + 3 years','breeze-x-smart-15t'),
('CoolPro','CoolPro Ultra 2.0T 5 Star',2,5,55999,5.1,32,true,true,'1 + 5 years','coolpro-ultra-20t'),
('SilentAir','SilentAir Comfort 1.2T 5 Star',1.2,5,41999,5.3,28,true,true,'1 + 4 years','silentair-comfort-12t')
on conflict (slug) do nothing;

-- Replace these demo URLs with your actual approved affiliate URLs.
insert into offers (product_id,merchant,price,affiliate_url)
select p.id, m.merchant, p.price + m.delta, m.url
from products p
cross join (values
 ('Amazon',0,'https://example.com/replace-with-amazon-affiliate'),
 ('Flipkart',-1000,'https://example.com/replace-with-flipkart-affiliate'),
 ('Croma',491,'https://example.com/replace-with-croma-affiliate'),
 ('Brand Store',1000,'https://example.com/replace-with-brand-affiliate')
) as m(merchant,delta,url)
on conflict (product_id,merchant) do nothing;