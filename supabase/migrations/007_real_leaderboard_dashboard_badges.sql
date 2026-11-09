-- Terra AI real leaderboard, dashboard metrics, achievement badges and safe
-- Realtime invalidation events. Apply in the Supabase SQL Editor.
--
-- The web app authenticates through its existing HttpOnly cookie. The matching
-- server endpoints call the service-role-only RPCs with that authenticated ID.

ALTER TABLE public.individual_users
  ADD COLUMN IF NOT EXISTS ecopoints_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.organization_users
  ADD COLUMN IF NOT EXISTS total_ecopoints INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ecopoints_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE public.individual_users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

UPDATE public.individual_users iu
SET ecopoints_updated_at = COALESCE(iu.created_at, NOW())
WHERE iu.total_ecopoints = 0;

UPDATE public.organization_users ou
SET ecopoints_updated_at = COALESCE(ou.created_at, NOW())
WHERE ou.total_ecopoints = 0;

CREATE TABLE IF NOT EXISTS public.badges (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🌱',
  criteria_type TEXT NOT NULL DEFAULT 'manual',
  criteria_value NUMERIC NOT NULL DEFAULT 1
);

ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS criteria_type TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS criteria_value NUMERIC NOT NULL DEFAULT 1;

UPDATE public.badges
SET code = id
WHERE code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS badges_code_unique_idx
  ON public.badges (code);

INSERT INTO public.badges (id, code, name, description, icon, criteria_type, criteria_value)
VALUES
  ('eco_warrior', 'eco_warrior', 'Eco Warrior',
   'Awarded to the member with the highest EcoPoints in their community. Overtake the leader to claim it.',
   '🏆', 'group_leader', 1),
  ('former_eco_warrior', 'former_eco_warrior', 'Former Eco Warrior',
   'Previously held the Eco Warrior title in your community.',
   '🍃', 'manual', 1),
  ('first_post', 'first_post', 'First Post',
   'Earned when your first GreenFeed post is approved.',
   '🌱', 'approved_posts', 1),
  ('eco_exchanger', 'eco_exchanger', 'Eco Exchanger',
   'Earned after your first completed Eco Exchange.',
   '♻️', 'completed_exchanges', 1),
  ('seed_sower', 'seed_sower', 'Seed Sower',
   'Earned after your first seed market activity.',
   '🌾', 'seed_activities', 1),
  ('carbon_cutter', 'carbon_cutter', 'Carbon Cutter',
   'Earned after recording 10 kg of month-over-month CO₂e reductions.',
   '🌍', 'carbon_reduction_kg', 10),
  ('community_star', 'community_star', 'Community Star',
   'Earned after receiving 50 likes on your approved GreenFeed posts.',
   '⭐', 'likes_received', 50)
ON CONFLICT (id) DO UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    criteria_type = EXCLUDED.criteria_type,
    criteria_value = EXCLUDED.criteria_value;

CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Older prototype installs referenced auth-backed profiles. The live app uses
-- public.users IDs; remove only that incompatible FK, preserving any records.
DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.user_badges'::regclass
      AND contype = 'f'
      AND confrelid = to_regclass('public.profiles')
  LOOP
    EXECUTE format('ALTER TABLE public.user_badges DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS user_badges_user_badge_unique_idx
  ON public.user_badges (user_id, badge_id);
CREATE INDEX IF NOT EXISTS user_badges_badge_user_idx
  ON public.user_badges (badge_id, user_id);

CREATE OR REPLACE FUNCTION public.terra_emit_activity_event(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_org UUID;
  target_scope TEXT;
  target_key TEXT;
BEGIN
  SELECT organization_id INTO target_org
  FROM public.organization_users
  WHERE id = target_user AND status = 'ACTIVE';

  IF target_org IS NOT NULL THEN
    target_scope := 'ORGANIZATION';
    target_key := 'ORGANIZATION:' || target_org::TEXT;
  ELSIF EXISTS (
    SELECT 1 FROM public.individual_users
    WHERE id = target_user AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = target_user AND account_type = 'SUPER_ADMIN'
  ) THEN
    target_scope := 'INDIVIDUAL';
    target_key := 'INDIVIDUAL';
    target_org := NULL;
  ELSE
    RETURN;
  END IF;

  INSERT INTO public.terra_activity_events (scope_key, scope, organization_id, updated_at)
  VALUES (target_key, target_scope, target_org, NOW())
  ON CONFLICT (scope_key) DO UPDATE
  SET updated_at = EXCLUDED.updated_at,
      scope = EXCLUDED.scope,
      organization_id = EXCLUDED.organization_id;
END;
$$;

CREATE TABLE IF NOT EXISTS public.terra_activity_events (
  scope_key TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('INDIVIDUAL', 'ORGANIZATION')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((scope = 'INDIVIDUAL' AND organization_id IS NULL)
      OR (scope = 'ORGANIZATION' AND organization_id IS NOT NULL))
);

CREATE OR REPLACE FUNCTION public.terra_can_read_activity_event(
  event_scope TEXT,
  event_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN event_scope = 'INDIVIDUAL' THEN
      EXISTS (SELECT 1 FROM public.individual_users
              WHERE id = auth.uid() AND status = 'ACTIVE')
      OR EXISTS (SELECT 1 FROM public.users
                 WHERE id = auth.uid() AND account_type = 'SUPER_ADMIN')
    WHEN event_scope = 'ORGANIZATION' THEN
      EXISTS (SELECT 1 FROM public.organization_users
              WHERE id = auth.uid()
                AND organization_id = event_organization_id
                AND status = 'ACTIVE')
    ELSE FALSE
  END
$$;

ALTER TABLE public.terra_activity_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.terra_activity_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.terra_activity_events TO authenticated;
DROP POLICY IF EXISTS terra_activity_events_group_read ON public.terra_activity_events;
CREATE POLICY terra_activity_events_group_read
  ON public.terra_activity_events
  FOR SELECT TO authenticated
  USING (public.terra_can_read_activity_event(scope, organization_id));

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.badges FROM anon, authenticated;
GRANT SELECT ON TABLE public.badges TO authenticated;
DROP POLICY IF EXISTS terra_badges_public_read ON public.badges;
CREATE POLICY terra_badges_public_read
  ON public.badges
  FOR SELECT TO authenticated
  USING (TRUE);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_badges FROM anon, authenticated;
GRANT SELECT ON TABLE public.user_badges TO authenticated;
DO $$
DECLARE policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_badges'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.user_badges', policy_name);
  END LOOP;
END;
$$;
CREATE POLICY terra_user_badges_owner_read
  ON public.user_badges
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.terra_stamp_ecopoints_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total_ecopoints IS DISTINCT FROM OLD.total_ecopoints THEN
    NEW.ecopoints_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS terra_individual_ecopoints_stamp ON public.individual_users;
CREATE TRIGGER terra_individual_ecopoints_stamp
  BEFORE UPDATE OF total_ecopoints ON public.individual_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_stamp_ecopoints_update();

DROP TRIGGER IF EXISTS terra_organization_ecopoints_stamp ON public.organization_users;
CREATE TRIGGER terra_organization_ecopoints_stamp
  BEFORE UPDATE OF total_ecopoints ON public.organization_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_stamp_ecopoints_update();

CREATE OR REPLACE FUNCTION public.terra_badge_progress(
  target_user UUID,
  target_criteria TEXT
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result NUMERIC := 0;
  carbon_reductions NUMERIC := 0;
  seed_table TEXT;
BEGIN
  CASE target_criteria
    WHEN 'approved_posts' THEN
      SELECT COUNT(*) INTO result FROM public.posts
      WHERE author_id = target_user AND UPPER(status) = 'APPROVED';
    WHEN 'completed_exchanges' THEN
      SELECT COUNT(*) INTO result FROM public.eco_listings
      WHERE owner_id = target_user AND UPPER(status) = 'COMPLETED';
    WHEN 'likes_received' THEN
      SELECT COUNT(*) INTO result
      FROM public.post_likes likes
      JOIN public.posts posts ON posts.id = likes.post_id
      WHERE posts.author_id = target_user AND UPPER(posts.status) = 'APPROVED';
    WHEN 'carbon_reduction_kg' THEN
      WITH periods AS (
        SELECT total_co2e_kg,
               LAG(total_co2e_kg) OVER (ORDER BY created_at, id) AS previous_kg
        FROM public.carbon_logs
        WHERE user_id = target_user
      )
      SELECT COALESCE(SUM(GREATEST(previous_kg - total_co2e_kg, 0)), 0)
      INTO carbon_reductions
      FROM periods;
      result := carbon_reductions;
    WHEN 'seed_activities' THEN
      FOREACH seed_table IN ARRAY ARRAY['seed_market', 'seed_market_items', 'seed_market_listings']
      LOOP
        IF to_regclass(format('public.%I', seed_table)) IS NOT NULL
           AND EXISTS (
             SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = seed_table
               AND column_name = 'user_id'
           ) THEN
          EXECUTE format(
            'SELECT $1 + COUNT(*) FROM public.%I WHERE user_id = $2',
            seed_table
          ) INTO result USING result, target_user;
        END IF;
      END LOOP;
    WHEN 'group_leader' THEN
      IF EXISTS (
        SELECT 1
        FROM public.organization_users viewer
        JOIN public.organization_users member
          ON member.organization_id = viewer.organization_id
         AND member.status = 'ACTIVE'
         AND member.total_ecopoints > 0
        WHERE viewer.id = target_user
          AND viewer.status = 'ACTIVE'
        ORDER BY member.total_ecopoints DESC, member.ecopoints_updated_at ASC, member.id ASC
        LIMIT 1
      ) THEN
        SELECT EXISTS (
          SELECT 1
          FROM public.organization_users viewer
          JOIN LATERAL (
            SELECT id FROM public.organization_users member
            WHERE member.organization_id = viewer.organization_id
              AND member.status = 'ACTIVE'
              AND member.total_ecopoints > 0
            ORDER BY member.total_ecopoints DESC, member.ecopoints_updated_at ASC, member.id ASC
            LIMIT 1
          ) leader ON leader.id = target_user
          WHERE viewer.id = target_user AND viewer.status = 'ACTIVE'
        )::INTEGER INTO result;
      ELSE
        SELECT EXISTS (
          SELECT 1
          FROM public.individual_users viewer
          JOIN LATERAL (
            SELECT id FROM public.individual_users member
            WHERE member.status = 'ACTIVE'
              AND member.total_ecopoints > 0
            ORDER BY member.total_ecopoints DESC, member.ecopoints_updated_at ASC, member.id ASC
            LIMIT 1
          ) leader ON leader.id = target_user
          WHERE viewer.id = target_user AND viewer.status = 'ACTIVE'
        )::INTEGER INTO result;
      END IF;
    WHEN 'manual' THEN
      SELECT COUNT(*) INTO result FROM public.user_badges
      WHERE user_id = target_user AND badge_id = 'former_eco_warrior';
    ELSE
      result := 0;
  END CASE;
  RETURN COALESCE(result, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.terra_award_eligible_badges(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_badges (user_id, badge_id)
  SELECT target_user, badge.id
  FROM public.badges badge
  WHERE badge.criteria_type NOT IN ('group_leader', 'manual')
    AND public.terra_badge_progress(target_user, badge.criteria_type) >= badge.criteria_value
  ON CONFLICT (user_id, badge_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.terra_refresh_eco_warrior(
  target_scope TEXT,
  target_organization UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_leader UUID;
BEGIN
  IF target_scope = 'ORGANIZATION' AND target_organization IS NOT NULL THEN
    SELECT id INTO current_leader
    FROM public.organization_users
    WHERE organization_id = target_organization AND status = 'ACTIVE'
      AND total_ecopoints > 0
    ORDER BY total_ecopoints DESC, ecopoints_updated_at ASC, id ASC
    LIMIT 1;

    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT old.user_id, 'former_eco_warrior'
    FROM public.user_badges old
    JOIN public.organization_users member ON member.id = old.user_id
    WHERE old.badge_id = 'eco_warrior'
      AND member.organization_id = target_organization
      AND old.user_id IS DISTINCT FROM current_leader
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    DELETE FROM public.user_badges old
    USING public.organization_users member
    WHERE old.user_id = member.id
      AND old.badge_id = 'eco_warrior'
      AND member.organization_id = target_organization
      AND old.user_id IS DISTINCT FROM current_leader;
  ELSE
    SELECT id INTO current_leader
    FROM public.individual_users
    WHERE status = 'ACTIVE'
      AND total_ecopoints > 0
    ORDER BY total_ecopoints DESC, ecopoints_updated_at ASC, id ASC
    LIMIT 1;

    INSERT INTO public.user_badges (user_id, badge_id)
    SELECT old.user_id, 'former_eco_warrior'
    FROM public.user_badges old
    JOIN public.individual_users member ON member.id = old.user_id
    WHERE old.badge_id = 'eco_warrior'
      AND old.user_id IS DISTINCT FROM current_leader
    ON CONFLICT (user_id, badge_id) DO NOTHING;

    DELETE FROM public.user_badges old
    USING public.individual_users member
    WHERE old.user_id = member.id
      AND old.badge_id = 'eco_warrior'
      AND old.user_id IS DISTINCT FROM current_leader;
  END IF;

  IF current_leader IS NOT NULL THEN
    INSERT INTO public.user_badges (user_id, badge_id)
    VALUES (current_leader, 'eco_warrior')
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.terra_after_ecopoints_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_scope TEXT;
  target_org UUID;
BEGIN
  IF NEW.total_ecopoints IS NOT DISTINCT FROM OLD.total_ecopoints THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'organization_users' THEN
    target_scope := 'ORGANIZATION';
    target_org := NEW.organization_id;
  ELSE
    target_scope := 'INDIVIDUAL';
  END IF;

  PERFORM public.terra_refresh_eco_warrior(target_scope, target_org);
  PERFORM public.terra_award_eligible_badges(NEW.id);
  PERFORM public.terra_emit_activity_event(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS terra_individual_ecopoints_changed ON public.individual_users;
CREATE TRIGGER terra_individual_ecopoints_changed
  AFTER UPDATE OF total_ecopoints ON public.individual_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_ecopoints_change();

DROP TRIGGER IF EXISTS terra_organization_ecopoints_changed ON public.organization_users;
CREATE TRIGGER terra_organization_ecopoints_changed
  AFTER UPDATE OF total_ecopoints ON public.organization_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_ecopoints_change();

CREATE OR REPLACE FUNCTION public.terra_after_profile_scope_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_scope TEXT;
  target_org UUID;
BEGIN
  IF TG_TABLE_NAME = 'organization_users' THEN
    target_scope := 'ORGANIZATION';
    target_org := NEW.organization_id;
  ELSE
    target_scope := 'INDIVIDUAL';
  END IF;
  PERFORM public.terra_refresh_eco_warrior(target_scope, target_org);
  PERFORM public.terra_award_eligible_badges(NEW.id);
  PERFORM public.terra_emit_activity_event(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS terra_individual_profile_scope_changed ON public.individual_users;
CREATE TRIGGER terra_individual_profile_scope_changed
  AFTER INSERT ON public.individual_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_profile_scope_change();
DROP TRIGGER IF EXISTS terra_individual_profile_status_changed ON public.individual_users;
CREATE TRIGGER terra_individual_profile_status_changed
  AFTER UPDATE OF status ON public.individual_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_profile_scope_change();

DROP TRIGGER IF EXISTS terra_organization_profile_scope_changed ON public.organization_users;
CREATE TRIGGER terra_organization_profile_scope_changed
  AFTER INSERT ON public.organization_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_profile_scope_change();
DROP TRIGGER IF EXISTS terra_organization_profile_status_changed ON public.organization_users;
CREATE TRIGGER terra_organization_profile_status_changed
  AFTER UPDATE OF status ON public.organization_users
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_profile_scope_change();

CREATE OR REPLACE FUNCTION public.terra_after_user_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_data JSONB;
  target_user UUID;
  target_post UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
  END IF;
  target_user := COALESCE(
    NULLIF(row_data->>'author_id', '')::UUID,
    NULLIF(row_data->>'owner_id', '')::UUID,
    NULLIF(row_data->>'user_id', '')::UUID
  );

  IF TG_TABLE_NAME = 'post_likes' THEN
    target_post := NULLIF(row_data->>'post_id', '')::UUID;
    SELECT author_id INTO target_user FROM public.posts WHERE id = target_post;
  END IF;

  IF target_user IS NOT NULL THEN
    IF TG_TABLE_NAME <> 'posts' OR UPPER(row_data->>'status') = 'APPROVED' THEN
      PERFORM public.terra_award_eligible_badges(target_user);
    END IF;
    PERFORM public.terra_emit_activity_event(target_user);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS terra_posts_activity_badges ON public.posts;
CREATE TRIGGER terra_posts_activity_badges
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.terra_after_user_activity();
DROP TRIGGER IF EXISTS terra_posts_status_activity ON public.posts;
CREATE TRIGGER terra_posts_status_activity
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.terra_after_user_activity();
DROP TRIGGER IF EXISTS terra_posts_delete_activity ON public.posts;
CREATE TRIGGER terra_posts_delete_activity
  AFTER DELETE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.terra_after_user_activity();

DROP TRIGGER IF EXISTS terra_listings_activity_badges ON public.eco_listings;
CREATE TRIGGER terra_listings_activity_badges
  AFTER INSERT ON public.eco_listings
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_user_activity();
DROP TRIGGER IF EXISTS terra_listings_status_activity ON public.eco_listings;
CREATE TRIGGER terra_listings_status_activity
  AFTER UPDATE OF status ON public.eco_listings
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_user_activity();
DROP TRIGGER IF EXISTS terra_listings_delete_activity ON public.eco_listings;
CREATE TRIGGER terra_listings_delete_activity
  AFTER DELETE ON public.eco_listings
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_user_activity();

DROP TRIGGER IF EXISTS terra_carbon_activity_badges ON public.carbon_logs;
CREATE TRIGGER terra_carbon_activity_badges
  AFTER INSERT ON public.carbon_logs
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_user_activity();

DROP TRIGGER IF EXISTS terra_post_likes_activity_badges ON public.post_likes;
CREATE TRIGGER terra_post_likes_activity_badges
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_user_activity();

CREATE OR REPLACE FUNCTION public.terra_after_badge_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.terra_emit_activity_event(OLD.user_id);
    RETURN OLD;
  END IF;
  PERFORM public.terra_emit_activity_event(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS terra_user_badge_activity_event ON public.user_badges;
CREATE TRIGGER terra_user_badge_activity_event
  AFTER INSERT OR UPDATE OR DELETE ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.terra_after_badge_change();

CREATE OR REPLACE FUNCTION public.terra_get_dashboard_stats(target_user UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  carbon_reductions NUMERIC := 0;
BEGIN
  WITH periods AS (
    SELECT total_co2e_kg,
           LAG(total_co2e_kg) OVER (ORDER BY created_at, id) AS previous_kg
    FROM public.carbon_logs
    WHERE user_id = target_user
  )
  SELECT COALESCE(SUM(GREATEST(previous_kg - total_co2e_kg, 0)), 0)
  INTO carbon_reductions
  FROM periods;

  SELECT jsonb_build_object(
    'carbon_offset_kg', ROUND(COALESCE(carbon_reductions, 0), 1),
    'approved_posts', (SELECT COUNT(*) FROM public.posts
                       WHERE author_id = target_user AND UPPER(status) = 'APPROVED'),
    'pending_posts', (SELECT COUNT(*) FROM public.posts
                      WHERE author_id = target_user AND UPPER(status) = 'PENDING'),
    'listings', (SELECT COUNT(*) FROM public.eco_listings WHERE owner_id = target_user),
    'completed_exchanges', (SELECT COUNT(*) FROM public.eco_listings
                            WHERE owner_id = target_user AND UPPER(status) = 'COMPLETED'),
    'earned_badges', (SELECT COUNT(*) FROM public.user_badges
                      WHERE user_id = target_user
                        AND badge_id IN (
                          'eco_warrior', 'first_post', 'eco_exchanger', 'seed_sower',
                          'carbon_cutter', 'community_star'
                        )),
    'total_badges', 6,
    'earned_badge_ids', COALESCE(
      (SELECT jsonb_agg(badge_id ORDER BY badge_id)
       FROM public.user_badges
       WHERE user_id = target_user
         AND badge_id IN (
           'eco_warrior', 'first_post', 'eco_exchanger', 'seed_sower',
           'carbon_cutter', 'community_star'
         )),
      '[]'::JSONB
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.terra_get_user_badges(target_user UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', badge.id,
      'code', badge.code,
      'name', badge.name,
      'description', badge.description,
      'icon', badge.icon,
      'criteria_type', badge.criteria_type,
      'criteria_value', badge.criteria_value,
      'progress', LEAST(
        public.terra_badge_progress(target_user, badge.criteria_type),
        badge.criteria_value
      ),
      'earned_at', earned.earned_at,
      'earned', earned.earned_at IS NOT NULL
    ) ORDER BY badge.id
  ), '[]'::JSONB)
  FROM public.badges badge
  LEFT JOIN public.user_badges earned
    ON earned.badge_id = badge.id AND earned.user_id = target_user
  WHERE badge.code IN (
    'eco_warrior', 'first_post', 'eco_exchanger', 'seed_sower',
    'carbon_cutter', 'community_star'
  )
     OR (badge.code = 'former_eco_warrior' AND earned.earned_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.terra_change_password(
  target_user UUID,
  target_password_hash TEXT,
  target_changed_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET password_hash = target_password_hash,
      must_change_password = FALSE,
      password_changed_at = target_changed_at
  WHERE id = target_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Terra AI account was not found';
  END IF;

  IF EXISTS (SELECT 1 FROM public.individual_users WHERE id = target_user) THEN
    UPDATE public.individual_users
    SET must_change_password = FALSE,
        password_changed_at = target_changed_at
    WHERE id = target_user;
  ELSIF EXISTS (SELECT 1 FROM public.organization_users WHERE id = target_user) THEN
    UPDATE public.organization_users
    SET must_change_password = FALSE,
        password_changed_at = target_changed_at
    WHERE id = target_user;
  ELSE
    RAISE EXCEPTION 'Terra AI account profile was not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.terra_get_leaderboard(
  viewer_id UUID,
  page_limit INTEGER DEFAULT 10,
  page_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  viewer_org UUID;
  target_scope TEXT;
  target_org_name TEXT;
  result JSONB;
BEGIN
  SELECT organization_id INTO viewer_org
  FROM public.organization_users
  WHERE id = viewer_id AND status = 'ACTIVE';

  IF viewer_org IS NOT NULL THEN
    target_scope := 'organization';
    SELECT name INTO target_org_name FROM public.organizations WHERE id = viewer_org;
  ELSIF EXISTS (
    SELECT 1 FROM public.individual_users
    WHERE id = viewer_id AND status = 'ACTIVE'
  ) OR EXISTS (
    SELECT 1 FROM public.users WHERE id = viewer_id AND account_type = 'SUPER_ADMIN'
  ) THEN
    target_scope := 'individual';
  ELSE
    RAISE EXCEPTION 'No active leaderboard profile exists for this account';
  END IF;

  WITH candidates AS (
    SELECT iu.id AS user_id, iu.full_name, iu.avatar_url,
           NULL::TEXT AS organization_name,
           COALESCE(iu.total_ecopoints, 0)::BIGINT AS total_ecopoints,
           iu.ecopoints_updated_at AS reached_at
    FROM public.individual_users iu
    WHERE target_scope = 'individual' AND iu.status = 'ACTIVE'
    UNION ALL
    SELECT ou.id, ou.full_name, ou.avatar_url, org.name,
           COALESCE(ou.total_ecopoints, 0)::BIGINT,
           ou.ecopoints_updated_at
    FROM public.organization_users ou
    JOIN public.organizations org ON org.id = ou.organization_id
    WHERE target_scope = 'organization'
      AND ou.organization_id = viewer_org
      AND ou.status = 'ACTIVE'
  ),
  metrics AS (
    SELECT candidate.*,
      (SELECT COUNT(*) FROM public.posts post
       WHERE post.author_id = candidate.user_id AND UPPER(post.status) = 'APPROVED') AS approved_posts,
      (SELECT COUNT(*) FROM public.eco_listings listing
       WHERE listing.owner_id = candidate.user_id) AS listings,
      (SELECT COUNT(*) FROM public.eco_listings listing
       WHERE listing.owner_id = candidate.user_id AND UPPER(listing.status) = 'COMPLETED') AS completed_exchanges,
      (SELECT COUNT(*) FROM public.user_badges badge
       WHERE badge.user_id = candidate.user_id
         AND badge.badge_id IN (
           'eco_warrior', 'first_post', 'eco_exchanger', 'seed_sower',
           'carbon_cutter', 'community_star'
         )) AS badges_earned,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object(
         'id', badge.id, 'name', badge.name, 'icon', badge.icon
       ) ORDER BY badge.name), '[]'::JSONB)
       FROM public.user_badges earned
       JOIN public.badges badge ON badge.id = earned.badge_id
       WHERE earned.user_id = candidate.user_id
         AND earned.badge_id IN (
           'eco_warrior', 'first_post', 'eco_exchanger', 'seed_sower',
           'carbon_cutter', 'community_star'
         )) AS badge_icons,
      (SELECT COALESCE(SUM(GREATEST(previous_kg - total_co2e_kg, 0)), 0)
       FROM (
         SELECT total_co2e_kg,
                LAG(total_co2e_kg) OVER (ORDER BY created_at, id) AS previous_kg
         FROM public.carbon_logs
         WHERE user_id = candidate.user_id
       ) carbon_periods) AS carbon_offset_kg
    FROM candidates candidate
  ),
  ranked AS (
    SELECT metrics.*,
      ROW_NUMBER() OVER (ORDER BY total_ecopoints DESC, reached_at ASC, user_id ASC) AS rank
    FROM metrics
  )
  SELECT jsonb_build_object(
    'scope', target_scope,
    'organization_name', target_org_name,
    'total', (SELECT COUNT(*) FROM ranked WHERE total_ecopoints > 0),
    'viewer_rank', (SELECT rank FROM ranked WHERE user_id = viewer_id),
    'viewer_points', (SELECT total_ecopoints FROM ranked WHERE user_id = viewer_id),
    'leader', (SELECT jsonb_build_object(
      'rank', rank, 'user_id', user_id, 'full_name', full_name,
      'avatar_url', avatar_url, 'organization_name', organization_name,
      'total_ecopoints', total_ecopoints, 'approved_posts', approved_posts,
      'listings', listings, 'completed_exchanges', completed_exchanges,
      'carbon_offset_kg', ROUND(carbon_offset_kg::NUMERIC, 1),
      'badges_earned', badges_earned, 'badge_icons', badge_icons
    ) FROM ranked WHERE rank = 1 AND total_ecopoints > 0),
    'leaderboard', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'rank', rank, 'user_id', user_id, 'full_name', full_name,
        'avatar_url', avatar_url, 'organization_name', organization_name,
        'total_ecopoints', total_ecopoints, 'badges_earned', badges_earned,
        'badge_icons', badge_icons
      ) ORDER BY rank)
       FROM ranked
       WHERE rank > GREATEST(page_offset, 0)
         AND rank <= GREATEST(page_offset, 0) + LEAST(GREATEST(page_limit, 1), 50)
         AND total_ecopoints > 0),
      '[]'::JSONB
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Seed-market support is optional because not every deployment has the module.
DO $$
DECLARE
  seed_table TEXT;
BEGIN
  FOREACH seed_table IN ARRAY ARRAY['seed_market', 'seed_market_items', 'seed_market_listings']
  LOOP
    IF to_regclass(format('public.%I', seed_table)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = seed_table
           AND column_name = 'user_id'
       ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS terra_seed_activity_badges ON public.%I', seed_table);
      EXECUTE format(
        'CREATE TRIGGER terra_seed_activity_badges AFTER INSERT ON public.%I '
        'FOR EACH ROW EXECUTE FUNCTION public.terra_after_user_activity()',
        seed_table
      );
    END IF;
  END LOOP;
END;
$$;

-- Refresh the current title for every existing community and award any
-- achievements whose criteria are already met.
DO $$
DECLARE
  org_id UUID;
  member_id UUID;
BEGIN
  PERFORM public.terra_refresh_eco_warrior('INDIVIDUAL');
  FOR org_id IN SELECT DISTINCT organization_id FROM public.organization_users WHERE status = 'ACTIVE'
  LOOP
    PERFORM public.terra_refresh_eco_warrior('ORGANIZATION', org_id);
  END LOOP;
  FOR member_id IN
    SELECT id FROM public.individual_users WHERE status = 'ACTIVE'
    UNION
    SELECT id FROM public.organization_users WHERE status = 'ACTIVE'
  LOOP
    PERFORM public.terra_award_eligible_badges(member_id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.terra_emit_activity_event(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_can_read_activity_event(TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.terra_badge_progress(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_award_eligible_badges(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_refresh_eco_warrior(TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_get_dashboard_stats(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_get_user_badges(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_change_password(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_get_leaderboard(UUID, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terra_can_read_activity_event(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.terra_get_dashboard_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_get_user_badges(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_change_password(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_get_leaderboard(UUID, INTEGER, INTEGER) TO service_role;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'terra_activity_events'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.terra_activity_events;
  END IF;
END;
$$;
