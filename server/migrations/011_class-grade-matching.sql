CREATE OR REPLACE FUNCTION public.normalize_class_name(value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(btrim(coalesce(value, '')), '^(kelas|kls|class)\s*[-:]?\s*', '', 'i'))
$$;

CREATE OR REPLACE FUNCTION public.class_grade_matches(class_name TEXT, grade TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.normalize_class_name(class_name) = '' OR btrim(coalesce(grade, '')) = '' THEN FALSE
    WHEN lower(public.normalize_class_name(class_name)) = lower(btrim(grade)) THEN TRUE
    WHEN lower(left(public.normalize_class_name(class_name), char_length(btrim(grade)))) <> lower(btrim(grade)) THEN FALSE
    ELSE substring(public.normalize_class_name(class_name) FROM char_length(btrim(grade)) + 1 FOR 1) IN (' ', '-')
      OR (btrim(grade) ~ '[0-9]$'
        AND substring(public.normalize_class_name(class_name) FROM char_length(btrim(grade)) + 1 FOR 1) ~ '[A-Za-z]')
  END
$$;
