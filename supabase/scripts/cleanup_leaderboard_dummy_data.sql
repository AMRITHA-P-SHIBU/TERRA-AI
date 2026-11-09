-- The old leaderboard fixtures existed only in client/src/data/mockData.js;
-- they were never inserted into these account tables. This intentionally
-- targets the fixture's non-UUID application ID only, not real users whose
-- names happen to match sample copy.
BEGIN;

DELETE FROM public.user_badges
WHERE user_id::TEXT = 'usr_terra_01';

DELETE FROM public.individual_users
WHERE id::TEXT = 'usr_terra_01';

DELETE FROM public.organization_users
WHERE id::TEXT = 'usr_terra_01';

DELETE FROM public.users
WHERE id::TEXT = 'usr_terra_01';

COMMIT;
