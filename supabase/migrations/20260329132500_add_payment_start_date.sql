-- Migration para adicionar a data do primeiro pagamento do estudante
-- Isso previne que cobranças retroativas sejam geradas indevidamente.

ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS payment_start_date date;

-- Atualizar os atuais para terem as suas próprias datas de entrada como de primeiro pagamento (Opcional, porém recomendado para manter a consistência da UI)
-- UPDATE public.students SET payment_start_date = join_date WHERE payment_start_date IS NULL AND active = true;
