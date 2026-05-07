-- Migration to add comanda_id to sales table for clean POS reopening mechanics
ALTER TABLE sales ADD COLUMN comanda_id UUID REFERENCES comandas(id) ON DELETE CASCADE;

-- Performance index for fast deletion and querying
CREATE INDEX idx_sales_comanda ON sales(comanda_id);
