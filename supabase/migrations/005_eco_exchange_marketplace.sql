-- Eco Exchange marketplace. Apply in the Supabase SQL Editor.
-- Browser data access is mediated by the existing cookie-authenticated API.

CREATE TABLE IF NOT EXISTS public.eco_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 100),
  description TEXT NOT NULL CHECK (length(trim(description)) BETWEEN 10 AND 2000),
  category TEXT NOT NULL CHECK (category IN (
    'plant_pots', 'plants_seeds', 'recycled_crafts', 'coconut_products',
    'compost_bins', 'gardening_tools', 'reusable_items', 'other'
  )),
  condition TEXT NOT NULL CHECK (condition IN ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'UPCYCLED')),
  listing_type TEXT NOT NULL CHECK (listing_type IN ('EXCHANGE', 'SALE')),
  price NUMERIC(10, 2),
  wanted_in_return TEXT CHECK (wanted_in_return IS NULL OR length(wanted_in_return) <= 300),
  images TEXT[] NOT NULL CHECK (cardinality(images) BETWEEN 1 AND 5),
  location_lat DOUBLE PRECISION CHECK (location_lat BETWEEN -90 AND 90),
  location_lng DOUBLE PRECISION CHECK (location_lng BETWEEN -180 AND 180),
  location_address TEXT NOT NULL CHECK (length(trim(location_address)) BETWEEN 3 AND 300),
  area_label TEXT NOT NULL CHECK (length(trim(area_label)) BETWEEN 2 AND 120),
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
    CHECK (status IN ('AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((location_lat IS NULL) = (location_lng IS NULL)),
  CHECK (
    (listing_type = 'SALE' AND price IS NOT NULL AND price >= 0 AND wanted_in_return IS NULL)
    OR (listing_type = 'EXCHANGE' AND price IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS eco_listings_public_idx
  ON public.eco_listings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS eco_listings_owner_idx
  ON public.eco_listings (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.eco_listings(id) ON DELETE SET NULL,
  initiator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (initiator_id = buyer_id),
  CHECK (initiator_id <> owner_id),
  UNIQUE (listing_id, initiator_id)
);
CREATE INDEX IF NOT EXISTS conversations_participant_idx
  ON public.conversations (initiator_id, owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON public.messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.exchange_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.eco_listings(id) ON DELETE CASCADE,
  offerer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  offered_listing_id UUID REFERENCES public.eco_listings(id) ON DELETE SET NULL,
  offered_title TEXT NOT NULL CHECK (length(trim(offered_title)) BETWEEN 2 AND 100),
  offered_description TEXT NOT NULL CHECK (length(trim(offered_description)) BETWEEN 5 AND 1000),
  offered_images TEXT[] NOT NULL DEFAULT '{}'
    CHECK (cardinality(offered_images) <= 5),
  message TEXT CHECK (message IS NULL OR length(message) <= 1000),
  location_lat DOUBLE PRECISION CHECK (location_lat BETWEEN -90 AND 90),
  location_lng DOUBLE PRECISION CHECK (location_lng BETWEEN -180 AND 180),
  location_address TEXT NOT NULL CHECK (length(trim(location_address)) BETWEEN 3 AND 300),
  area_label TEXT NOT NULL CHECK (length(trim(area_label)) BETWEEN 2 AND 120),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'WITHDRAWN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((location_lat IS NULL) = (location_lng IS NULL))
);
CREATE INDEX IF NOT EXISTS exchange_offers_listing_created_idx
  ON public.exchange_offers (listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS exchange_offers_offerer_idx
  ON public.exchange_offers (offerer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.eco_exchange_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (reporter_id <> reported_user_id)
);

CREATE TABLE IF NOT EXISTS public.eco_exchange_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS public.eco_exchange_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('OFFER', 'OFFER_ACCEPTED', 'OFFER_DECLINED', 'MESSAGE')),
  listing_id UUID REFERENCES public.eco_listings(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS eco_exchange_notifications_unread_idx
  ON public.eco_exchange_notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- Used by the triggers below to award each activity at most once.
CREATE TABLE IF NOT EXISTS public.eco_exchange_point_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL,
  activity TEXT NOT NULL CHECK (activity IN ('LISTED', 'COMPLETED')),
  points INTEGER NOT NULL DEFAULT 3 CHECK (points = 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, activity)
);

-- Exact coordinates are intentionally not available to direct browser queries.
-- The authenticated server API returns approximate public location data and
-- only discloses exact coordinates to the owner or conversation participants.
DO $$
DECLARE
  table_name TEXT;
  policy_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'eco_listings', 'conversations', 'messages', 'exchange_offers',
    'eco_exchange_reports', 'eco_exchange_notifications', 'eco_exchange_point_awards',
    'eco_exchange_blocks'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', table_name);
    FOR policy_name IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_name, table_name);
    END LOOP;
  END LOOP;
END $$;

GRANT SELECT ON public.eco_listings, public.conversations, public.messages,
  public.eco_exchange_notifications TO authenticated;
CREATE POLICY eco_listings_owner_read
  ON public.eco_listings FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY eco_exchange_conversation_participants_read
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = initiator_id OR auth.uid() = owner_id);
CREATE POLICY eco_exchange_message_participants_read
  ON public.messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND (c.initiator_id = auth.uid() OR c.owner_id = auth.uid())
  ));
CREATE POLICY eco_exchange_notifications_owner_read
  ON public.eco_exchange_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Server-owned role never uses browser credentials. These policies are
-- deliberately fail-closed for anon/authenticated requests because the app's
-- current login uses its own HttpOnly-cookie identity.
CREATE OR REPLACE FUNCTION public.eco_exchange_award_points(target_user UUID, target_listing UUID, target_activity TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  award_count INTEGER;
BEGIN
  PERFORM 1 FROM public.users WHERE id = target_user FOR UPDATE;
  SELECT COUNT(*) INTO award_count
  FROM public.eco_exchange_point_awards
  WHERE user_id = target_user
    AND created_at >= date_trunc('day', NOW());
  IF award_count >= 5 THEN RETURN; END IF;

  INSERT INTO public.eco_exchange_point_awards (user_id, listing_id, activity)
  VALUES (target_user, target_listing, target_activity)
  ON CONFLICT (listing_id, activity) DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.individual_users
  SET total_ecopoints = COALESCE(total_ecopoints, 0) + 3
  WHERE id = target_user;
  UPDATE public.organization_users
  SET total_ecopoints = COALESCE(total_ecopoints, 0) + 3
  WHERE id = target_user;
END;
$$;
REVOKE ALL ON FUNCTION public.eco_exchange_award_points(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;

ALTER TABLE public.organization_users
  ADD COLUMN IF NOT EXISTS total_ecopoints INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.eco_exchange_on_listing_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.eco_exchange_award_points(NEW.owner_id, NEW.id, 'LISTED');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS eco_exchange_listing_created ON public.eco_listings;
CREATE TRIGGER eco_exchange_listing_created
  AFTER INSERT ON public.eco_listings
  FOR EACH ROW EXECUTE FUNCTION public.eco_exchange_on_listing_created();

CREATE OR REPLACE FUNCTION public.eco_exchange_on_listing_completed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM 'COMPLETED' AND NEW.status = 'COMPLETED' THEN
    PERFORM public.eco_exchange_award_points(NEW.owner_id, NEW.id, 'COMPLETED');
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS eco_exchange_listing_completed ON public.eco_listings;
CREATE TRIGGER eco_exchange_listing_completed
  AFTER UPDATE OF status ON public.eco_listings
  FOR EACH ROW EXECUTE FUNCTION public.eco_exchange_on_listing_completed();

CREATE OR REPLACE FUNCTION public.eco_exchange_accept_offer(
  p_offer_id UUID,
  p_owner_id UUID,
  p_decline_other_offers BOOLEAN DEFAULT TRUE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing UUID;
BEGIN
  SELECT l.id INTO target_listing
  FROM public.eco_listings l
  JOIN public.exchange_offers o ON o.listing_id = l.id
  WHERE o.id = p_offer_id AND l.owner_id = p_owner_id
    AND o.status = 'PENDING' AND l.status = 'AVAILABLE'
  FOR UPDATE OF l, o;
  IF target_listing IS NULL THEN
    RAISE EXCEPTION 'Offer or listing is no longer available';
  END IF;

  UPDATE public.eco_listings SET status = 'RESERVED', updated_at = NOW()
  WHERE id = target_listing AND status = 'AVAILABLE';
  UPDATE public.exchange_offers SET status = 'ACCEPTED'
  WHERE id = p_offer_id AND status = 'PENDING';
  IF p_decline_other_offers THEN
    UPDATE public.exchange_offers SET status = 'DECLINED'
    WHERE listing_id = target_listing AND status = 'PENDING' AND id <> p_offer_id;
  END IF;
  RETURN target_listing;
END;
$$;
REVOKE ALL ON FUNCTION public.eco_exchange_accept_offer(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.eco_exchange_accept_offer(UUID, UUID, BOOLEAN) TO service_role;

-- Storage is public-read for listing images. Uploads and deletes are performed
-- by the existing authenticated API using its server-only Supabase client.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'eco-listings', 'eco-listings', TRUE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS "Eco listing images are publicly readable" ON storage.objects;
CREATE POLICY "Eco listing images are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'eco-listings');
DROP POLICY IF EXISTS "Eco listing uploads are API managed" ON storage.objects;
CREATE POLICY "Eco listing uploads are API managed"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'eco-listings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "Eco listing deletes are API managed" ON storage.objects;
CREATE POLICY "Eco listing deletes are API managed"
  ON storage.objects FOR DELETE USING (
    bucket_id = 'eco-listings'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable publication for table-change notifications consumed by the existing
-- API-authenticated UI. Safe to rerun.
DO $$
DECLARE table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['eco_listings', 'exchange_offers', 'messages', 'eco_exchange_notifications']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;
