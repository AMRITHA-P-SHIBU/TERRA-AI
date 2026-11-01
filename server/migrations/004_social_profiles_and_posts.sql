-- Run against the Terra AI application database (the database used by DATABASE_URL).
-- This project uses its existing users/JWT-cookie identity, not auth.uid().

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE TABLE IF NOT EXISTS individual_users (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  bio VARCHAR(150),
  avatar_url TEXT,
  total_ecopoints INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_users (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ORG_ADMIN', 'MEMBER')),
  bio VARCHAR(150),
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_users_org
  ON organization_users (organization_id, status);

ALTER TABLE individual_users ADD COLUMN IF NOT EXISTS bio VARCHAR(150);
ALTER TABLE organization_users ADD COLUMN IF NOT EXISTS bio VARCHAR(150);

DO $$
BEGIN
  IF to_regclass('public.posts') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_id'
     ) THEN
    ALTER TABLE public.posts RENAME TO legacy_greenfeed_posts;
  END IF;
END;
$$;

-- Migrate existing accounts into exactly one profile table.
INSERT INTO organization_users (
  id, organization_id, full_name, email, role, status, added_by, created_at
)
SELECT DISTINCT ON (u.id) u.id, om.organization_id, u.full_name, u.email, om.role, om.status,
       NULL, COALESCE(om.joined_at, u.created_at)
FROM users u
JOIN organization_members om ON om.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM organization_users ou WHERE ou.id = u.id)
ORDER BY u.id, om.joined_at ASC
ON CONFLICT (id) DO NOTHING;

INSERT INTO individual_users (
  id, full_name, email, location, phone, status, created_at
)
SELECT u.id, u.full_name, u.email, u.location, u.phone, u.status, u.created_at
FROM users u
WHERE u.account_type = 'INDIVIDUAL'
  AND NOT EXISTS (SELECT 1 FROM organization_members om WHERE om.user_id = u.id)
  AND NOT EXISTS (SELECT 1 FROM individual_users iu WHERE iu.id = u.id)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_scope TEXT NOT NULL CHECK (author_scope IN ('INDIVIDUAL', 'ORGANIZATION')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  media_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption VARCHAR(2200) NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (author_scope = 'INDIVIDUAL' AND organization_id IS NULL)
    OR (author_scope = 'ORGANIZATION' AND organization_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_posts_author_created
  ON posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_scope_status_created
  ON posts (author_scope, organization_id, status, created_at DESC);

DO $$
BEGIN
  IF to_regclass('public.legacy_greenfeed_posts') IS NOT NULL
     AND to_regclass('public.post_likes') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.post_likes'::regclass
         AND confrelid = 'public.legacy_greenfeed_posts'::regclass
     ) THEN
    ALTER TABLE public.post_likes RENAME TO legacy_greenfeed_post_likes;
  END IF;
  IF to_regclass('public.legacy_greenfeed_posts') IS NOT NULL
     AND to_regclass('public.post_comments') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conrelid = 'public.post_comments'::regclass
         AND confrelid = 'public.legacy_greenfeed_posts'::regclass
     ) THEN
    ALTER TABLE public.post_comments RENAME TO legacy_greenfeed_post_comments;
  END IF;
END;
$$;

DO $$
DECLARE
  legacy_table TEXT;
  policy_name TEXT;
BEGIN
  FOREACH legacy_table IN ARRAY ARRAY[
    'legacy_greenfeed_posts',
    'legacy_greenfeed_post_likes',
    'legacy_greenfeed_post_comments'
  ] LOOP
    IF to_regclass(format('public.%I', legacy_table)) IS NOT NULL THEN
      FOR policy_name IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = legacy_table
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', policy_name, legacy_table);
      END LOOP;
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', legacy_table);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', legacy_table);
    END IF;
  END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS post_likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes (user_id);

CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment VARCHAR(300) NOT NULL CHECK (length(trim(comment)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_created
  ON post_comments (post_id, created_at);

CREATE TABLE IF NOT EXISTS post_review_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('APPROVED', 'REJECTED')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_review_logs_post_created
  ON post_review_logs (post_id, created_at DESC);

-- The API authenticates with its existing HttpOnly cookie and performs scope
-- checks server-side. Browser Supabase requests have no terra.user_id setting
-- and these policies fail closed; only the private server service-role client
-- bypasses RLS, and it is never exposed to the browser.
CREATE OR REPLACE FUNCTION public.terra_current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('terra.user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION public.terra_can_view_post(target_post UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM posts p
    WHERE p.id = target_post
      AND (
        p.author_id = terra_current_user_id()
        OR (
          p.status = 'APPROVED'
          AND (
            (p.author_scope = 'INDIVIDUAL' AND EXISTS (
              SELECT 1 FROM individual_users iu
              WHERE iu.id = terra_current_user_id()
            ))
            OR (p.author_scope = 'ORGANIZATION' AND EXISTS (
              SELECT 1 FROM organization_users viewer
              WHERE viewer.id = terra_current_user_id()
                AND viewer.organization_id = p.organization_id
                AND viewer.status = 'ACTIVE'
            ))
          )
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.terra_can_review_post(target_post UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM posts p
    JOIN users reviewer ON reviewer.id = terra_current_user_id()
    WHERE p.id = target_post
      AND p.status = 'PENDING'
      AND (
        (p.author_scope = 'INDIVIDUAL' AND reviewer.account_type = 'SUPER_ADMIN')
        OR (p.author_scope = 'ORGANIZATION' AND EXISTS (
          SELECT 1
          FROM organization_users ou
          WHERE ou.id = reviewer.id
            AND ou.organization_id = p.organization_id
            AND ou.role = 'ORG_ADMIN'
            AND ou.status = 'ACTIVE'
        ))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.terra_is_individual_user(target_user UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM individual_users WHERE id = target_user)
$$;

CREATE OR REPLACE FUNCTION public.terra_is_active_org_user(target_user UUID, target_org UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_users
    WHERE id = target_user AND organization_id = target_org AND status = 'ACTIVE'
  )
$$;

CREATE OR REPLACE FUNCTION public.terra_can_view_activity(
  target_user UUID,
  target_scope TEXT,
  target_org UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT target_user = terra_current_user_id()
    OR (
      target_scope = 'INDIVIDUAL'
      AND terra_is_individual_user(terra_current_user_id())
      AND terra_is_individual_user(target_user)
    )
    OR (
      target_scope = 'ORGANIZATION'
      AND terra_is_active_org_user(terra_current_user_id(), target_org)
      AND terra_is_active_org_user(target_user, target_org)
    )
$$;

CREATE OR REPLACE FUNCTION public.terra_valid_post_reviewer(target_post UUID, target_reviewer UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM posts p
    JOIN users reviewer ON reviewer.id = target_reviewer
    WHERE p.id = target_post
      AND (
        (p.author_scope = 'INDIVIDUAL' AND reviewer.account_type = 'SUPER_ADMIN')
        OR (p.author_scope = 'ORGANIZATION' AND EXISTS (
          SELECT 1 FROM organization_users ou
          WHERE ou.id = target_reviewer
            AND ou.organization_id = p.organization_id
            AND ou.role = 'ORG_ADMIN'
            AND ou.status = 'ACTIVE'
        ))
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.terra_guard_post_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
    IF OLD.status <> 'PENDING'
       OR NEW.status NOT IN ('APPROVED', 'REJECTED')
       OR NEW.reviewed_by IS DISTINCT FROM terra_current_user_id()
       OR NOT terra_can_review_post(OLD.id) THEN
      RAISE EXCEPTION 'Only the assigned reviewer may change post moderation fields'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'REJECTED' AND length(trim(COALESCE(NEW.rejection_reason, ''))) = 0 THEN
      RAISE EXCEPTION 'A rejection reason is required';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_post_review ON posts;
CREATE TRIGGER trg_guard_post_review
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION public.terra_guard_post_review();

CREATE OR REPLACE FUNCTION public.review_terra_post(
  target_post UUID,
  reviewer_id UUID,
  decision TEXT,
  review_remarks TEXT DEFAULT NULL
)
RETURNS posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target posts%ROWTYPE;
  reviewer_is_assigned BOOLEAN;
BEGIN
  IF decision NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Action must be APPROVED or REJECTED';
  END IF;
  IF decision = 'REJECTED' AND length(trim(COALESCE(review_remarks, ''))) = 0 THEN
    RAISE EXCEPTION 'A rejection reason is required';
  END IF;

  SELECT * INTO target FROM posts WHERE id = target_post FOR UPDATE;
  IF NOT FOUND OR target.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Pending post request not found';
  END IF;

  reviewer_is_assigned := terra_valid_post_reviewer(target_post, reviewer_id);
  IF NOT reviewer_is_assigned THEN
    RAISE EXCEPTION 'This request is not assigned to the reviewer';
  END IF;

  PERFORM set_config('terra.user_id', reviewer_id::TEXT, TRUE);

  UPDATE posts
  SET status = decision,
      rejection_reason = CASE WHEN decision = 'REJECTED' THEN trim(review_remarks) ELSE NULL END,
      reviewed_by = reviewer_id,
      reviewed_at = NOW()
  WHERE id = target_post
  RETURNING * INTO target;

  INSERT INTO post_review_logs (post_id, reviewer_id, action, remarks)
  VALUES (target_post, reviewer_id, decision, NULLIF(trim(review_remarks), ''));

  RETURN target;
END;
$$;

REVOKE ALL ON FUNCTION public.review_terra_post(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_terra_post(UUID, UUID, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.terra_current_user_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_can_view_post(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_can_review_post(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_is_individual_user(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_is_active_org_user(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_can_view_activity(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.terra_valid_post_reviewer(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.terra_current_user_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_can_view_post(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_can_review_post(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_is_individual_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_is_active_org_user(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_can_view_activity(UUID, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.terra_valid_post_reviewer(UUID, UUID) TO service_role;

ALTER TABLE individual_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_review_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS individual_profiles_scoped_read ON individual_users;
CREATE POLICY individual_profiles_scoped_read ON individual_users
  FOR SELECT USING (
    id = terra_current_user_id()
    OR terra_is_individual_user(terra_current_user_id())
  );
DROP POLICY IF EXISTS individual_profiles_owner_update ON individual_users;
CREATE POLICY individual_profiles_owner_update ON individual_users
  FOR UPDATE USING (id = terra_current_user_id())
  WITH CHECK (id = terra_current_user_id());

DROP POLICY IF EXISTS organization_profiles_scoped_read ON organization_users;
CREATE POLICY organization_profiles_scoped_read ON organization_users
  FOR SELECT USING (
    id = terra_current_user_id()
    OR terra_is_active_org_user(terra_current_user_id(), organization_users.organization_id)
  );
DROP POLICY IF EXISTS organization_profiles_owner_update ON organization_users;
CREATE POLICY organization_profiles_owner_update ON organization_users
  FOR UPDATE USING (id = terra_current_user_id())
  WITH CHECK (id = terra_current_user_id());

DROP POLICY IF EXISTS posts_scoped_read ON posts;
CREATE POLICY posts_scoped_read ON posts
  FOR SELECT USING (terra_can_view_post(id));
DROP POLICY IF EXISTS posts_owner_insert ON posts;
CREATE POLICY posts_owner_insert ON posts
  FOR INSERT WITH CHECK (
    author_id = terra_current_user_id()
    AND (
      (author_scope = 'INDIVIDUAL' AND organization_id IS NULL
        AND terra_is_individual_user(terra_current_user_id()))
      OR (author_scope = 'ORGANIZATION' AND EXISTS (
        SELECT 1 WHERE terra_is_active_org_user(terra_current_user_id(), posts.organization_id)
      ))
    )
  );
DROP POLICY IF EXISTS posts_owner_or_reviewer_update ON posts;
CREATE POLICY posts_owner_or_reviewer_update ON posts
  FOR UPDATE USING (
    author_id = terra_current_user_id() OR terra_can_review_post(id)
  )
  WITH CHECK (
    author_id = terra_current_user_id() OR terra_can_review_post(id)
  );
DROP POLICY IF EXISTS posts_owner_delete ON posts;
CREATE POLICY posts_owner_delete ON posts
  FOR DELETE USING (author_id = terra_current_user_id());

DROP POLICY IF EXISTS post_likes_scoped_read ON post_likes;
CREATE POLICY post_likes_scoped_read ON post_likes
  FOR SELECT USING (terra_can_view_post(post_id));
DROP POLICY IF EXISTS post_likes_owner_insert ON post_likes;
CREATE POLICY post_likes_owner_insert ON post_likes
  FOR INSERT WITH CHECK (user_id = terra_current_user_id() AND terra_can_view_post(post_id));
DROP POLICY IF EXISTS post_likes_owner_delete ON post_likes;
CREATE POLICY post_likes_owner_delete ON post_likes
  FOR DELETE USING (user_id = terra_current_user_id() AND terra_can_view_post(post_id));

DROP POLICY IF EXISTS post_comments_scoped_read ON post_comments;
CREATE POLICY post_comments_scoped_read ON post_comments
  FOR SELECT USING (terra_can_view_post(post_id));
DROP POLICY IF EXISTS post_comments_owner_insert ON post_comments;
CREATE POLICY post_comments_owner_insert ON post_comments
  FOR INSERT WITH CHECK (user_id = terra_current_user_id() AND terra_can_view_post(post_id));
DROP POLICY IF EXISTS post_comments_owner_delete ON post_comments;
CREATE POLICY post_comments_owner_delete ON post_comments
  FOR DELETE USING (
    user_id = terra_current_user_id()
    OR EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.author_id = terra_current_user_id())
  );

DROP POLICY IF EXISTS review_logs_reviewer_read ON post_review_logs;
CREATE POLICY review_logs_reviewer_read ON post_review_logs
  FOR SELECT USING (reviewer_id = terra_current_user_id());

-- Add the same scope metadata and isolation to the existing activity tables,
-- when present. Policies are reset to remove legacy globally-readable rules.
DO $$
DECLARE
  activity_table_name TEXT;
  policy_name TEXT;
  foreign_key_name TEXT;
  user_id_attnum SMALLINT;
BEGIN
  FOREACH activity_table_name IN ARRAY ARRAY[
    'marketplace_items',
    'carbon_logs',
    'seed_market',
    'seed_market_items',
    'seed_market_listings',
    'eco_exchange',
    'eco_exchange_items'
  ] LOOP
    IF to_regclass(format('public.%I', activity_table_name)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns columns_found
         WHERE columns_found.table_schema = 'public'
           AND columns_found.table_name = activity_table_name
           AND columns_found.column_name = 'user_id'
       ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS author_scope TEXT', activity_table_name);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE', activity_table_name);
      SELECT attnum INTO user_id_attnum
      FROM pg_attribute
      WHERE attrelid = to_regclass(format('public.%I', activity_table_name))
        AND attname = 'user_id'
        AND NOT attisdropped;

      FOR foreign_key_name IN
        SELECT constraint_row.conname
        FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass(format('public.%I', activity_table_name))
          AND constraint_row.contype = 'f'
          AND user_id_attnum = ANY(constraint_row.conkey)
          AND constraint_row.confrelid <> 'public.users'::regclass
      LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', activity_table_name, foreign_key_name);
      END LOOP;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint constraint_row
        WHERE constraint_row.conrelid = to_regclass(format('public.%I', activity_table_name))
          AND constraint_row.contype = 'f'
          AND constraint_row.confrelid = 'public.users'::regclass
          AND user_id_attnum = ANY(constraint_row.conkey)
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID',
          activity_table_name,
          'fk_' || activity_table_name || '_app_user'
        );
      END IF;

      EXECUTE format(
        'UPDATE public.%I activity SET author_scope = CASE WHEN org_user.id IS NOT NULL THEN ''ORGANIZATION'' ELSE ''INDIVIDUAL'' END, organization_id = org_user.organization_id FROM (SELECT id, organization_id FROM organization_users) org_user WHERE activity.user_id = org_user.id AND activity.author_scope IS NULL',
        activity_table_name
      );
      EXECUTE format('UPDATE public.%I SET author_scope = ''INDIVIDUAL'' WHERE author_scope IS NULL', activity_table_name);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN author_scope SET DEFAULT ''INDIVIDUAL''', activity_table_name);
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN author_scope SET NOT NULL', activity_table_name);
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (author_scope, organization_id)', 'idx_' || activity_table_name || '_scope', activity_table_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', activity_table_name);

      FOR policy_name IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = activity_table_name
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', policy_name, activity_table_name);
      END LOOP;

      IF EXISTS (
        SELECT 1 FROM information_schema.columns columns_found
        WHERE columns_found.table_schema = 'public'
          AND columns_found.table_name = activity_table_name
          AND columns_found.column_name = 'status'
      ) THEN
        EXECUTE format(
          'CREATE POLICY terra_activity_scoped_read ON public.%I FOR SELECT USING (((upper(status::text) = ''APPROVED'') OR user_id = terra_current_user_id()) AND terra_can_view_activity(user_id, author_scope, organization_id))',
          activity_table_name
        );
      ELSE
        EXECUTE format(
          'CREATE POLICY terra_activity_scoped_read ON public.%I FOR SELECT USING (terra_can_view_activity(user_id, author_scope, organization_id))',
          activity_table_name
        );
      END IF;
      EXECUTE format(
        'CREATE POLICY terra_activity_owner_insert ON public.%I FOR INSERT WITH CHECK (user_id = terra_current_user_id() AND ((author_scope = ''INDIVIDUAL'' AND organization_id IS NULL AND terra_is_individual_user(terra_current_user_id())) OR (author_scope = ''ORGANIZATION'' AND terra_is_active_org_user(terra_current_user_id(), organization_id))))',
        activity_table_name
      );
      EXECUTE format(
        'CREATE POLICY terra_activity_owner_update ON public.%I FOR UPDATE USING (user_id = terra_current_user_id()) WITH CHECK (user_id = terra_current_user_id())',
        activity_table_name
      );
      EXECUTE format(
        'CREATE POLICY terra_activity_owner_delete ON public.%I FOR DELETE USING (user_id = terra_current_user_id())',
        activity_table_name
      );
    END IF;
  END LOOP;
END;
$$;

-- Keep the bucket private. The server uploads with its existing service-role
-- connection and returns short-lived signed URLs only after checking post scope.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  FALSE,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
