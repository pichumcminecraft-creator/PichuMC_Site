
CREATE OR REPLACE FUNCTION public.check_password(_password TEXT, _hash TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN _hash = crypt(_password, _hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_password(_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN crypt(_password, gen_salt('bf'));
END;
$$;
