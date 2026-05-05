-- Phase 3: Create products and sales tables for Quick Sales (PDV)
-- Products are the catalog, sales store snapshots of each transaction

CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  category TEXT DEFAULT 'geral',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own products"
  ON products FOR ALL USING (auth.uid() = user_id);

CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'dinheiro' CHECK (payment_method IN ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito')),
  sold_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sales"
  ON sales FOR ALL USING (auth.uid() = user_id);

-- Performance indexes
CREATE INDEX idx_products_user ON products(user_id, active);
CREATE INDEX idx_sales_user_date ON sales(user_id, sold_at);
