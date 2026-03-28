
ALTER TABLE public.payments 
ADD COLUMN is_prorata boolean NOT NULL DEFAULT false,
ADD COLUMN full_price numeric DEFAULT NULL;
