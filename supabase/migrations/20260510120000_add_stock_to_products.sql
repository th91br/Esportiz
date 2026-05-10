-- Migration to add inventory/stock control columns to products table
-- Safety check and default values ensure full backward-compatibility with existing data

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 0;
