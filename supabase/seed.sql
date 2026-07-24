-- Dev-only seed. Creates demo auth users + profiles + jobs.
-- Run AFTER 0001_init.sql in the Supabase SQL editor.

-- Demo auth users (password login disabled; these exist to own rows)
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111101','authenticated','authenticated','maya@demo.coop.local', now(),'{"provider":"email"}','{"full_name":"Maya Lin"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111102','authenticated','authenticated','diego@demo.coop.local',now(),'{"provider":"email"}','{"full_name":"Diego Reyes"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111103','authenticated','authenticated','sara@demo.coop.local', now(),'{"provider":"email"}','{"full_name":"Sara Kim"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111104','authenticated','authenticated','jonas@demo.coop.local',now(),'{"provider":"email"}','{"full_name":"Jonas Hale"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','11111111-1111-1111-1111-111111111105','authenticated','authenticated','tessa@demo.coop.local',now(),'{"provider":"email"}','{"full_name":"Tessa Wilder"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222201','authenticated','authenticated','hello@driftcoffee.demo',now(),'{"provider":"email"}','{"full_name":"Drift Coffee"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222202','authenticated','authenticated','team@saltandstem.demo',now(),'{"provider":"email"}','{"full_name":"Salt & Stem"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000','22222222-2222-2222-2222-222222222203','authenticated','authenticated','front@shorelinepilates.demo',now(),'{"provider":"email"}','{"full_name":"Shoreline Pilates"}', now(), now())
on conflict (id) do nothing;

-- Creatives
insert into creative_profiles (user_id, bio, neighborhood, categories, rate_min, rate_max, availability, response_time_hours) values
  ('11111111-1111-1111-1111-111111111101','Food & interiors photographer. I make small spaces look like magazine spreads.','Newport Beach','{photographer}',150,600,'Weekdays + Sat mornings',2),
  ('11111111-1111-1111-1111-111111111102','Brand designer & muralist. Logos, menus, and walls with a story.','Newport Beach','{brand_designer,muralist}',300,2500,'Flexible',4),
  ('11111111-1111-1111-1111-111111111103','Short-form video for local spots — reels that actually get watched.','Newport Beach','{content_creator,videographer}',200,900,'Evenings + weekends',1),
  ('11111111-1111-1111-1111-111111111104','Acoustic sets for patios, markets, and openings. Warm coastal covers + originals.','Newport Beach','{musician}',250,700,'Thu–Sun',6),
  ('11111111-1111-1111-1111-111111111105','Graphic designer for menus, signage, and packaging that feels handmade.','Newport Beach','{graphic_designer}',120,500,'Weekdays',3);

insert into musician_details (creative_id, venues, audio_links, rate_per_set_min, rate_per_set_max) values
  ('11111111-1111-1111-1111-111111111104','[{"name":"Lido Marina Village","event":"Summer market"},{"name":"CdM Farmers Market","event":"Weekly set"}]','{https://example.com/demo-set}',250,400);

insert into portfolio_items (creative_id, media_type, caption, source) values
  ('11111111-1111-1111-1111-111111111101','image','Latte art series — Drift Coffee','uploaded'),
  ('11111111-1111-1111-1111-111111111101','image','Golden hour patio, CdM','uploaded'),
  ('11111111-1111-1111-1111-111111111102','image','Mural — Balboa Fun Zone wall','uploaded'),
  ('11111111-1111-1111-1111-111111111103','video','Reel: 48 hours in a surf shop','uploaded'),
  ('11111111-1111-1111-1111-111111111105','image','Menu redesign — coastal botanical','uploaded');

insert into packages (creative_id, tier, title, deliverables, turnaround_days, revisions, price) values
  ('11111111-1111-1111-1111-111111111101','basic','Mini shoot','{15 edited photos,1 hour on-site}',5,1,250),
  ('11111111-1111-1111-1111-111111111101','standard','Half-day shoot','{40 edited photos,3 hours on-site,usage rights}',7,2,550),
  ('11111111-1111-1111-1111-111111111103','basic','1 reel','{1x 30s reel,trend audio,captions}',4,1,300),
  ('11111111-1111-1111-1111-111111111103','premium','Content month','{8 reels,shot list,posting calendar}',30,3,1800);

-- Businesses (two verified, one not — to demo the gate)
insert into business_profiles (user_id, business_name, category, neighborhood, needs, budget_band, brand_vibe_tags, verification_email, is_verified, verified_at) values
  ('22222222-2222-2222-2222-222222222201','Drift Coffee','Coffee shop','Newport Beach','{photographer,content_creator}','$$','{coastal,minimal,warm}','hello@driftcoffee.com',true,now()),
  ('22222222-2222-2222-2222-222222222202','Salt & Stem','Florist','Newport Beach','{photographer,graphic_designer}','$','{organic,editorial}','team@saltandstem.com',true,now()),
  ('22222222-2222-2222-2222-222222222203','Shoreline Pilates','Fitness studio','Newport Beach','{content_creator,videographer}','$$','{}',null,false,null);

insert into jobs (business_id, title, description, category, budget_min, budget_max, deadline, location, status) values
  ('22222222-2222-2222-2222-222222222201','Menu + interior photo refresh','New seasonal menu launching — need 20–30 edited photos of drinks, pastries, and the patio for web + socials.','photographer',300,600, current_date + 21,'Newport Beach','open'),
  ('22222222-2222-2222-2222-222222222201','3 reels for fall drinks','Three 30s reels featuring our fall menu. We''ll provide the drinks, you bring the eye.','content_creator',400,800, current_date + 30,'Newport Beach','open'),
  ('22222222-2222-2222-2222-222222222202','Wedding-season brand mini-kit','Updated logo lockup + 2 flyer templates + Instagram story templates.','graphic_designer',250,500, current_date + 14,'Newport Beach','open');
