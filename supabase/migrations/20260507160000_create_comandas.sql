-- Add migration: Create comandas and comanda_items tables
CREATE TABLE comandas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  business_type TEXT NOT NULL DEFAULT 'arena',
  name TEXT NOT NULL, -- Ex: "Mesa 4", "Pedro"
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Enable Row Level Security (RLS)
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own comandas"
  ON comandas FOR ALL USING (auth.uid() = user_id);

-- Create comanda items table
CREATE TABLE comanda_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comanda_id UUID REFERENCES comandas(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on comanda_items
ALTER TABLE comanda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own comanda_items"
  ON comanda_items FOR ALL USING (auth.uid() = user_id);

-- Performance optimization indexes
CREATE INDEX idx_comandas_user_status ON comandas(user_id, status);
CREATE INDEX idx_comanda_items_comanda ON comanda_items(comanda_id);
