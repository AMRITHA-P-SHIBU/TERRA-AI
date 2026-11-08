-- Allow a required text address when a user does not select a map pin.
ALTER TABLE public.eco_listings
  ALTER COLUMN location_lat DROP NOT NULL,
  ALTER COLUMN location_lng DROP NOT NULL;

ALTER TABLE public.exchange_offers
  ALTER COLUMN location_lat DROP NOT NULL,
  ALTER COLUMN location_lng DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.eco_listings'::regclass
      AND conname = 'eco_listings_location_coordinates_pair_check'
  ) THEN
    ALTER TABLE public.eco_listings
      ADD CONSTRAINT eco_listings_location_coordinates_pair_check
      CHECK ((location_lat IS NULL) = (location_lng IS NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.exchange_offers'::regclass
      AND conname = 'exchange_offers_location_coordinates_pair_check'
  ) THEN
    ALTER TABLE public.exchange_offers
      ADD CONSTRAINT exchange_offers_location_coordinates_pair_check
      CHECK ((location_lat IS NULL) = (location_lng IS NULL));
  END IF;
END;
$$;
