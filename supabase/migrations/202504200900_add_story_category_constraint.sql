DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stories'
      AND column_name = 'category'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'stories_category_check'
        AND conrelid = 'public.stories'::regclass
    ) THEN
      ALTER TABLE public.stories
        ADD CONSTRAINT stories_category_check
        CHECK (
          category IS NULL
          OR category = ''
          OR category IN ('rescue', 'lost_found', 'shelter_foster', 'community')
        );
    END IF;
  END IF;
END $$;
