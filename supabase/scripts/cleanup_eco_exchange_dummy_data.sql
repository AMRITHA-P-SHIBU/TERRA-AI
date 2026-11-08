-- Remove the four example rows shipped with the former hardcoded Eco Exchange.
-- Review this list and add any other verified seed-only titles before running.
DO $$
BEGIN
  IF to_regclass('public.marketplace_items') IS NOT NULL THEN
    DELETE FROM public.marketplace_items
    WHERE title IN (
      'Handcrafted Coconut Shell Planter Pots (Set of 4)',
      'Terracotta 3-Tier Kitchen Compost Bin',
      'Organic Heirloom Tomato & Chilli Seedlings (10 Nos)',
      'Heavy Duty Stainless Steel Gardening Hand Trowel'
    );
  END IF;
END $$;
