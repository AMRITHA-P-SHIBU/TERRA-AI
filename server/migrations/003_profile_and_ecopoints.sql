-- ============================================================
-- Migration 003: Profile Bio, EcoPoints Ledger, Posts RLS
-- Terra AI — Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Ensure profiles table has all required columns ──────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_ecopoints INTEGER NOT NULL DEFAULT 0;

-- ── 2. EcoPoints Ledger Table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.ecopoints_ledger (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT    NOT NULL CHECK (activity_type IN (
    'post_created',
    'eco_exchange_listing',
    'carbon_log',
    'seed_market'
  )),
  reference_id  UUID    DEFAULT NULL,   -- id of the triggering row (post, listing, log)
  points        INTEGER NOT NULL CHECK (points BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Prevent duplicate awards per action
CREATE UNIQUE INDEX IF NOT EXISTS uq_ecopoints_user_activity_ref
  ON public.ecopoints_ledger (user_id, activity_type, reference_id)
  WHERE reference_id IS NOT NULL;

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_ecopoints_user_id
  ON public.ecopoints_ledger (user_id);

-- ── 3. RLS for ecopoints_ledger ───────────────────────────
ALTER TABLE public.ecopoints_ledger ENABLE ROW LEVEL SECURITY;

-- Users can read only their own ledger
CREATE POLICY "Users can read own ecopoints"
  ON public.ecopoints_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- NO INSERT/UPDATE/DELETE for users — only service role & triggers

-- ── 4. Function + Trigger: award points on post insert ─────
CREATE OR REPLACE FUNCTION public.award_ecopoints_on_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  daily_count INTEGER;
BEGIN
  -- Daily cap: max 5 post awards per day per user
  SELECT COUNT(*) INTO daily_count
  FROM public.ecopoints_ledger
  WHERE user_id = NEW.user_id
    AND activity_type = 'post_created'
    AND created_at >= CURRENT_DATE;

  IF daily_count < 5 THEN
    -- Insert ledger entry (1 pt per post)
    INSERT INTO public.ecopoints_ledger (user_id, activity_type, reference_id, points)
    VALUES (NEW.user_id, 'post_created', NEW.id, 1)
    ON CONFLICT DO NOTHING;

    -- Update running total on profiles
    UPDATE public.profiles
    SET total_ecopoints = total_ecopoints + 1
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_ecopoints_post ON public.posts;
CREATE TRIGGER trg_award_ecopoints_post
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.award_ecopoints_on_post();

-- ── 5. Function + Trigger: remove points when post deleted ─
CREATE OR REPLACE FUNCTION public.revoke_ecopoints_on_post_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  awarded_pts INTEGER;
BEGIN
  SELECT points INTO awarded_pts
  FROM public.ecopoints_ledger
  WHERE user_id = OLD.user_id
    AND activity_type = 'post_created'
    AND reference_id = OLD.id;

  IF FOUND THEN
    DELETE FROM public.ecopoints_ledger
    WHERE user_id = OLD.user_id
      AND activity_type = 'post_created'
      AND reference_id = OLD.id;

    UPDATE public.profiles
    SET total_ecopoints = GREATEST(0, total_ecopoints - awarded_pts)
    WHERE id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_ecopoints_post ON public.posts;
CREATE TRIGGER trg_revoke_ecopoints_post
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_ecopoints_on_post_delete();

-- ── 6. Function + Trigger: award points on eco_exchange listing ─
CREATE OR REPLACE FUNCTION public.award_ecopoints_on_listing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.ecopoints_ledger (user_id, activity_type, reference_id, points)
  VALUES (NEW.user_id, 'eco_exchange_listing', NEW.id, 3)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET total_ecopoints = total_ecopoints + 3
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_ecopoints_listing ON public.marketplace_items;
CREATE TRIGGER trg_award_ecopoints_listing
  AFTER INSERT ON public.marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION public.award_ecopoints_on_listing();

-- ── 7. Function + Trigger: award points on carbon log ──────
-- Points scale: walking/cycling/planting=5, public_transport=4,
--               carpooling=3, low_impact=2
CREATE OR REPLACE FUNCTION public.award_ecopoints_on_carbon_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  pts INTEGER;
BEGIN
  -- Derive points from transport mode
  pts := CASE NEW.transport_mode
    WHEN 'walking'        THEN 5
    WHEN 'cycling'        THEN 5
    WHEN 'electric'       THEN 5
    WHEN 'public_transit' THEN 4
    WHEN 'carpool'        THEN 3
    WHEN 'car'            THEN 2
    ELSE                       2
  END;

  INSERT INTO public.ecopoints_ledger (user_id, activity_type, reference_id, points)
  VALUES (NEW.user_id, 'carbon_log', NEW.id, pts)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET total_ecopoints = total_ecopoints + pts
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_ecopoints_carbon ON public.carbon_logs;
CREATE TRIGGER trg_award_ecopoints_carbon
  AFTER INSERT ON public.carbon_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.award_ecopoints_on_carbon_log();

-- ── 8. Fix missing RLS policies for posts & comments ───────
-- Delete own posts
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='posts' AND policyname='Users can delete their own posts'
  ) THEN
    CREATE POLICY "Users can delete their own posts"
      ON public.posts FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- post_likes policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='post_likes' AND policyname='Users can like posts'
  ) THEN
    CREATE POLICY "Users can like posts"
      ON public.post_likes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='post_likes' AND policyname='Users can unlike posts'
  ) THEN
    CREATE POLICY "Users can unlike posts"
      ON public.post_likes FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='post_likes' AND policyname='Likes are viewable by all'
  ) THEN
    CREATE POLICY "Likes are viewable by all"
      ON public.post_likes FOR SELECT
      USING (true);
  END IF;
END $$;

-- post_comments policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='post_comments' AND policyname='Comments are viewable by all'
  ) THEN
    CREATE POLICY "Comments are viewable by all"
      ON public.post_comments FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='post_comments' AND policyname='Authenticated users can comment'
  ) THEN
    CREATE POLICY "Authenticated users can comment"
      ON public.post_comments FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='post_comments' AND policyname='Users can delete own comments'
  ) THEN
    CREATE POLICY "Users can delete own comments"
      ON public.post_comments FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 9. Storage bucket for post images ─────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-images',
  'post-images',
  true,
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg','image/jpg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='objects' AND policyname='Users can upload post images'
  ) THEN
    CREATE POLICY "Users can upload post images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'post-images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- Public read access for post images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='objects' AND policyname='Post images are publicly viewable'
  ) THEN
    CREATE POLICY "Post images are publicly viewable"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'post-images');
  END IF;
END $$;

-- Users can delete their own images
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='objects' AND policyname='Users can delete own post images'
  ) THEN
    CREATE POLICY "Users can delete own post images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'post-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- ── 10. Sync existing profiles total_ecopoints from ledger ─
UPDATE public.profiles p
SET total_ecopoints = COALESCE((
  SELECT SUM(points) FROM public.ecopoints_ledger l WHERE l.user_id = p.id
), 0);

